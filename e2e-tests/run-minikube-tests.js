#!/usr/bin/env node
/**
 * Copyright 2025 The Kubernetes Authors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

const { execSync, spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const http = require('http');

// In CI, the GitHub Action already starts minikube with the default profile
// Locally, we use a custom profile to avoid conflicts
const IS_CI = process.env.CI === 'true' || process.env.GITHUB_ACTIONS === 'true';
const MINIKUBE_PROFILE = IS_CI ? 'minikube' : 'headlamp-e2e-test';
const SCRIPT_DIR = __dirname;
const PROJECT_ROOT = path.join(SCRIPT_DIR, '..');

// Check if DELETE_CLUSTER environment variable is set
// Default is to NOT delete the cluster (except in CI where the action handles it)
const DELETE_CLUSTER = process.env.DELETE_CLUSTER === 'true';

console.log('============================================');
console.log('Headlamp E2E Tests with Minikube');
console.log('============================================');
console.log(`Environment: ${IS_CI ? 'CI' : 'Local'}`);
console.log(`Profile: ${MINIKUBE_PROFILE}`);
console.log('============================================');
console.log(`Profile: ${MINIKUBE_PROFILE}`);
console.log(`Delete cluster after tests: ${DELETE_CLUSTER}`);
console.log('');

// Helper function to run commands
function runCommand(command, options = {}) {
  try {
    const result = execSync(command, {
      encoding: 'utf-8',
      stdio: options.silent ? 'pipe' : 'inherit',
      ...options,
    });
    return { success: true, output: result };
  } catch (error) {
    if (options.ignoreError) {
      return { success: false, output: error.stdout || '' };
    }
    throw error;
  }
}

// Helper function to check if command exists
function commandExists(command) {
  try {
    const cmd = process.platform === 'win32' ? `where ${command}` : `command -v ${command}`;
    execSync(cmd, { stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

// Helper function to check HTTP status
function checkHttpStatus(url) {
  return new Promise((resolve) => {
    const urlObj = new URL(url);
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port || 80,
      path: urlObj.pathname,
      method: 'GET',
      timeout: 2000,
    };

    const req = http.request(options, (res) => {
      resolve(res.statusCode === 200);
    });

    req.on('error', () => resolve(false));
    req.on('timeout', () => {
      req.destroy();
      resolve(false);
    });

    req.end();
  });
}

// Helper function to sleep
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Cleanup function
function cleanup() {
  if (DELETE_CLUSTER && !IS_CI) {
    // Only delete cluster locally; in CI the action manages it
    console.log('');
    console.log('============================================');
    console.log('Cleaning up...');
    console.log('============================================');
    
    const { output } = runCommand('minikube profile list', { silent: true, ignoreError: true });
    if (output.includes(MINIKUBE_PROFILE)) {
      console.log(`Deleting minikube profile: ${MINIKUBE_PROFILE}`);
      runCommand(`minikube delete -p ${MINIKUBE_PROFILE}`, { ignoreError: true });
    }
  } else if (IS_CI) {
    console.log('');
    console.log('============================================');
    console.log('Running in CI - cluster managed by GitHub Action');
    console.log('============================================');
  } else {
    console.log('');
    console.log('============================================');
    console.log('Cluster preserved for debugging');
    console.log('============================================');
    console.log('To delete the cluster later, run: make e2e-minikube-clean');
    console.log('Or: npm run e2e:minikube:clean');
  }
}

// Main function
async function main() {
  let exitCode = 0;

  try {
    // Check if required tools are installed
    console.log('Checking prerequisites...');
    if (!commandExists('minikube')) {
      console.error('Error: minikube is not installed. Please install minikube first.');
      console.error('See: https://minikube.sigs.k8s.io/docs/start/');
      process.exit(1);
    }

    if (!commandExists('kubectl')) {
      console.error('Error: kubectl is not installed. Please install kubectl first.');
      process.exit(1);
    }

    if (!commandExists('docker')) {
      console.error('Error: docker is not installed. Please install docker first.');
      process.exit(1);
    }

    // In CI, minikube is already started by the GitHub Action
    if (IS_CI) {
      console.log('Running in CI - minikube should already be started by GitHub Action');
      
      // Verify minikube is running
      const { output: statusOutput } = runCommand(
        `minikube status -p ${MINIKUBE_PROFILE} --format='{{.Host}}'`,
        { silent: true, ignoreError: true }
      );
      
      if (!statusOutput.includes('Running')) {
        console.error('Error: Minikube is not running in CI. The setup-minikube action may have failed.');
        process.exit(1);
      }
      console.log('✓ Minikube is running');
    } else {
      // Local development: check if minikube profile already exists
      const { output: profileList } = runCommand('minikube profile list', {
        silent: true,
        ignoreError: true,
      });

      if (profileList.includes(MINIKUBE_PROFILE)) {
        console.log(`Minikube profile '${MINIKUBE_PROFILE}' already exists. Reusing existing cluster.`);
        console.log('To start fresh, delete the cluster first with: make e2e-minikube-clean');

        // Ensure the cluster is running - check host status specifically
        const { output: statusOutput } = runCommand(
          `minikube status -p ${MINIKUBE_PROFILE} --format='{{.Host}}'`,
          { silent: true, ignoreError: true }
        );

        if (!statusOutput.includes('Running')) {
          console.log(`Starting existing minikube profile: ${MINIKUBE_PROFILE}`);
          runCommand(`minikube start -p ${MINIKUBE_PROFILE} --driver=docker`);
        } else {
          console.log('Cluster is already running.');
        }
      } else {
        // Start minikube with a dedicated profile
        console.log(`Starting new minikube with profile: ${MINIKUBE_PROFILE}`);
        runCommand(`minikube start -p ${MINIKUBE_PROFILE} --driver=docker --wait=all`);
      }
    }

    // Rename the context to 'test' to match e2e test expectations
    console.log("Ensuring kubectl context is named 'test' (required by e2e tests)");
    
    // Check if context 'test' already exists
    const { success: contextExists } = runCommand('kubectl config get-contexts test', {
      silent: true,
      ignoreError: true,
    });

    if (contextExists) {
      // Context exists, verify it's our cluster
      const { output: currentCluster } = runCommand(
        `kubectl config view -o jsonpath="{.contexts[?(@.name=='test')].context.cluster}"`,
        { silent: true, ignoreError: true }
      );

      if (currentCluster.trim() !== MINIKUBE_PROFILE) {
        // It's a different cluster, try to delete it first
        runCommand('kubectl config delete-context test', { silent: true, ignoreError: true });
        runCommand(`kubectl config rename-context ${MINIKUBE_PROFILE} test`, {
          silent: true,
          ignoreError: true,
        });
      }
    } else {
      // Context doesn't exist, rename from profile name
      runCommand(`kubectl config rename-context ${MINIKUBE_PROFILE} test`, {
        silent: true,
        ignoreError: true,
      });
    }
    runCommand('kubectl config use-context test');

    // Build Docker images if they don't exist
    console.log('');
    console.log('============================================');
    console.log('Building Docker images...');
    console.log('============================================');

    const { output: imageList } = runCommand("docker images --format '{{.Repository}}:{{.Tag}}'", {
      silent: true,
    });

    if (!imageList.includes('ghcr.io/headlamp-k8s/headlamp:latest')) {
      console.log('Building Headlamp image...');
      runCommand('make image', { cwd: PROJECT_ROOT, env: { ...process.env, DOCKER_IMAGE_VERSION: 'latest' } });
    } else {
      console.log('Headlamp image already exists, skipping build.');
    }

    if (!imageList.includes('ghcr.io/headlamp-k8s/headlamp-plugins-test:latest')) {
      console.log('Building plugins test image...');
      // Build plugin example for testing
      runCommand('npm ci', { cwd: path.join(PROJECT_ROOT, 'plugins/examples/pod-counter') });
      runCommand('npm run build', { cwd: path.join(PROJECT_ROOT, 'plugins/examples/pod-counter') });

      runCommand('npm ci', { cwd: path.join(PROJECT_ROOT, 'plugins/headlamp-plugin') });
      runCommand(
        'node bin/headlamp-plugin.js extract ../examples/pod-counter ../../.plugins/',
        { cwd: path.join(PROJECT_ROOT, 'plugins/headlamp-plugin') }
      );

      runCommand('make build-plugins-container', {
        cwd: PROJECT_ROOT,
        env: { ...process.env, DOCKER_IMAGE_VERSION: 'latest', DOCKER_PLUGINS_IMAGE_NAME: 'headlamp-plugins-test' },
      });
    } else {
      console.log('Plugins test image already exists, skipping build.');
    }

    // Load images into minikube
    console.log('');
    console.log('============================================');
    console.log('Loading Docker images into minikube...');
    console.log('============================================');
    runCommand(`minikube -p ${MINIKUBE_PROFILE} image load ghcr.io/headlamp-k8s/headlamp:latest`);
    runCommand(`minikube -p ${MINIKUBE_PROFILE} image load ghcr.io/headlamp-k8s/headlamp-plugins-test:latest`);

    // Create service account and RBAC
    console.log('');
    console.log('============================================');
    console.log('Setting up RBAC...');
    console.log('============================================');
    
    // Create service account if it doesn't exist
    const { success: saExists } = runCommand(
      `minikube -p ${MINIKUBE_PROFILE} kubectl -- get serviceaccount headlamp-admin --namespace kube-system`,
      { silent: true, ignoreError: true }
    );
    
    if (!saExists) {
      runCommand(`minikube -p ${MINIKUBE_PROFILE} kubectl -- create serviceaccount headlamp-admin --namespace kube-system`);
    } else {
      console.log('Service account headlamp-admin already exists, skipping creation.');
    }
    
    // Create cluster role binding if it doesn't exist
    const { success: crbExists } = runCommand(
      `minikube -p ${MINIKUBE_PROFILE} kubectl -- get clusterrolebinding headlamp-admin`,
      { silent: true, ignoreError: true }
    );
    
    if (!crbExists) {
      runCommand(`minikube -p ${MINIKUBE_PROFILE} kubectl -- create clusterrolebinding headlamp-admin --serviceaccount=kube-system:headlamp-admin --clusterrole=cluster-admin`);
    } else {
      console.log('ClusterRoleBinding headlamp-admin already exists, skipping creation.');
    }

    // Generate token for tests
    console.log('Generating service account token...');
    const { output: token } = runCommand(
      `minikube -p ${MINIKUBE_PROFILE} kubectl -- create token headlamp-admin --duration 24h -n kube-system`,
      { silent: true }
    );
    process.env.HEADLAMP_TEST_TOKEN = token.trim();

    // Get cluster info for kubeconfig
    const { output: caData } = runCommand(
      `minikube -p ${MINIKUBE_PROFILE} kubectl -- config view --raw --minify -o jsonpath='{.clusters[0].cluster.certificate-authority-data}'`,
      { silent: true }
    );
    process.env.TEST_CA_DATA = caData.trim();

    const { output: server } = runCommand(
      `minikube -p ${MINIKUBE_PROFILE} kubectl -- config view --raw --minify -o jsonpath='{.clusters[0].cluster.server}'`,
      { silent: true }
    );
    process.env.TEST_SERVER = server.trim();

    // Create a second dummy cluster configuration for multi-cluster tests
    process.env.TEST2_CA_DATA = process.env.TEST_CA_DATA;
    process.env.TEST2_SERVER = process.env.TEST_SERVER;
    process.env.HEADLAMP_TEST2_TOKEN = process.env.HEADLAMP_TEST_TOKEN;

    // Deploy Headlamp
    console.log('');
    console.log('============================================');
    console.log('Deploying Headlamp to minikube...');
    console.log('============================================');

    const manifestPath = path.join(SCRIPT_DIR, 'kubernetes-headlamp-ci.yaml');
    const manifestContent = fs.readFileSync(manifestPath, 'utf-8');
    const expandedManifest = manifestContent
      .replace(/\${TEST_SERVER}/g, process.env.TEST_SERVER)
      .replace(/\${TEST_CA_DATA}/g, process.env.TEST_CA_DATA)
      .replace(/\${TEST2_SERVER}/g, process.env.TEST2_SERVER)
      .replace(/\${TEST2_CA_DATA}/g, process.env.TEST2_CA_DATA);

    // Use unique temporary filename with random component
    const crypto = require('crypto');
    const randomSuffix = crypto.randomBytes(8).toString('hex');
    const tempManifest = path.join(SCRIPT_DIR, `.temp-manifest-${randomSuffix}.yaml`);
    fs.writeFileSync(tempManifest, expandedManifest);

    try {
      runCommand(`minikube -p ${MINIKUBE_PROFILE} kubectl -- apply -f ${tempManifest}`);
    } finally {
      if (fs.existsSync(tempManifest)) {
        fs.unlinkSync(tempManifest);
      }
    }

    // Wait for deployment to be ready
    console.log('Waiting for Headlamp deployment to be ready...');
    runCommand(
      `minikube -p ${MINIKUBE_PROFILE} kubectl -- wait deployment -n kube-system headlamp --for condition=Available=True --timeout=120s`
    );

    // Get service URL
    console.log('');
    console.log('============================================');
    console.log('Getting service URL...');
    console.log('============================================');

    const { output: servicePort } = runCommand(
      `minikube -p ${MINIKUBE_PROFILE} kubectl -- get services headlamp -n kube-system -o=jsonpath='{.spec.ports[0].nodePort}'`,
      { silent: true }
    );

    const { output: minikubeIp } = runCommand(`minikube ip -p ${MINIKUBE_PROFILE}`, {
      silent: true,
    });

    const SERVICE_URL = `http://${minikubeIp.trim()}:${servicePort.trim()}`;
    process.env.HEADLAMP_TEST_URL = SERVICE_URL;

    console.log(`Headlamp URL: ${SERVICE_URL}`);

    // Test that Headlamp is accessible
    console.log('Testing Headlamp accessibility...');
    const maxAttempts = 30;
    let accessible = false;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      if (await checkHttpStatus(SERVICE_URL)) {
        console.log('✓ Headlamp is accessible (HTTP 200)');
        accessible = true;
        break;
      }

      if (attempt === maxAttempts) {
        console.error(`Error: Headlamp is not accessible after ${maxAttempts} attempts`);
        runCommand(
          `minikube -p ${MINIKUBE_PROFILE} kubectl -- get pods -n kube-system -l app.kubernetes.io/name=headlamp`
        );
        runCommand(
          `minikube -p ${MINIKUBE_PROFILE} kubectl -- logs -n kube-system -l app.kubernetes.io/name=headlamp --tail=50`
        );
        process.exit(1);
      }

      console.log(`Waiting for Headlamp to be accessible (attempt ${attempt}/${maxAttempts})...`);
      await sleep(2000);
    }

    // Install playwright dependencies
    console.log('');
    console.log('============================================');
    console.log('Installing test dependencies...');
    console.log('============================================');

    if (!fs.existsSync(path.join(SCRIPT_DIR, 'node_modules'))) {
      runCommand('npm ci', { cwd: SCRIPT_DIR });
    }
    runCommand('npx playwright install --with-deps', { cwd: SCRIPT_DIR });

    // Run e2e tests
    console.log('');
    console.log('============================================');
    console.log('Running Playwright e2e tests...');
    console.log('============================================');

    try {
      runCommand('npx playwright test', { cwd: SCRIPT_DIR });
      console.log('');
      console.log('============================================');
      console.log('✓ All E2E tests passed successfully!');
      console.log('============================================');
    } catch (error) {
      exitCode = error.status || 1;
      console.log('');
      console.log('============================================');
      console.log(`❌ E2E tests failed with exit code ${exitCode}`);
      console.log('============================================');
      console.log('Debugging information:');
      runCommand(
        `minikube -p ${MINIKUBE_PROFILE} kubectl -- get pods -n kube-system -l app.kubernetes.io/name=headlamp`,
        { ignoreError: true }
      );
      runCommand(
        `minikube -p ${MINIKUBE_PROFILE} kubectl -- logs -n kube-system -l app.kubernetes.io/name=headlamp --tail=100`,
        { ignoreError: true }
      );
    }
  } catch (error) {
    console.error('Error:', error.message);
    exitCode = 1;
  } finally {
    cleanup();
  }

  process.exit(exitCode);
}

// Run main function
main();
