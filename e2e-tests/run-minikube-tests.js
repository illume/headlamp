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
// Locally, we use custom profiles to avoid conflicts
// We need two profiles to match the test/test2 cluster names expected by e2e tests
const IS_CI = process.env.CI === 'true' || process.env.GITHUB_ACTIONS === 'true';
const MINIKUBE_PROFILE_1 = IS_CI ? 'minikube' : 'test';
const MINIKUBE_PROFILE_2 = IS_CI ? 'minikube' : 'test2';
const SCRIPT_DIR = __dirname;
const PROJECT_ROOT = path.join(SCRIPT_DIR, '..');

// Check if DELETE_CLUSTER environment variable is set
// Default is to NOT delete the cluster (except in CI where the action handles it)
const DELETE_CLUSTER = process.env.DELETE_CLUSTER === 'true';

console.log('============================================');
console.log('Headlamp E2E Tests with Minikube');
console.log('============================================');
console.log(`Environment: ${IS_CI ? 'CI' : 'Local'}`);
console.log(`Profiles: ${MINIKUBE_PROFILE_1}, ${MINIKUBE_PROFILE_2}`);
console.log(`Delete clusters after tests: ${DELETE_CLUSTER}`);
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
    // Only delete clusters locally; in CI the action manages it
    console.log('');
    console.log('============================================');
    console.log('Cleaning up...');
    console.log('============================================');
    
    const { output } = runCommand('minikube profile list', { silent: true, ignoreError: true });
    for (const profile of [MINIKUBE_PROFILE_1, MINIKUBE_PROFILE_2]) {
      if (output.includes(profile)) {
        console.log(`Deleting minikube profile: ${profile}`);
        runCommand(`minikube delete -p ${profile}`, { ignoreError: true });
      }
    }
  } else if (IS_CI) {
    console.log('');
    console.log('============================================');
    console.log('Running in CI - cluster managed by GitHub Action');
    console.log('============================================');
  } else {
    console.log('');
    console.log('============================================');
    console.log('Clusters preserved for debugging');
    console.log('============================================');
    console.log('To delete the clusters later, run: make e2e-minikube-clean');
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

    // Start/verify minikube clusters
    if (IS_CI) {
      // In CI, use the single minikube instance created by GitHub Action
      // We'll configure it to have both test and test2 contexts pointing to the same cluster
      console.log('Running in CI - using minikube instance from GitHub Action');
      
      // Verify minikube is running (uses default 'minikube' profile)
      const { output: statusOutput } = runCommand(
        `minikube status --format='{{.Host}}'`,
        { silent: true, ignoreError: true }
      );
      
      if (!statusOutput.includes('Running')) {
        console.error('Error: Minikube is not running in CI. The setup-minikube action may have failed.');
        process.exit(1);
      }
      console.log('✓ Minikube is running');
      
      // Rename default minikube context to test
      console.log('Configuring contexts...');
      runCommand('kubectl config rename-context minikube test', { silent: true, ignoreError: true });
      runCommand('kubectl config use-context test');
    } else {
      // Local development: create two separate minikube clusters named test and test2
      console.log('Local development - creating two minikube profiles: test and test2');
      
      const { output: profileList } = runCommand('minikube profile list', {
        silent: true,
        ignoreError: true,
      });

      // Start or verify first cluster (test)
      if (profileList.includes(MINIKUBE_PROFILE_1)) {
        console.log(`Profile '${MINIKUBE_PROFILE_1}' already exists. Checking if running...`);
        const { output: status1 } = runCommand(
          `minikube status -p ${MINIKUBE_PROFILE_1} --format='{{.Host}}'`,
          { silent: true, ignoreError: true }
        );
        if (!status1.includes('Running')) {
          console.log(`Starting profile: ${MINIKUBE_PROFILE_1}`);
          runCommand(`minikube start -p ${MINIKUBE_PROFILE_1} --driver=docker`);
        } else {
          console.log(`✓ Profile ${MINIKUBE_PROFILE_1} is running`);
        }
      } else {
        console.log(`Creating new profile: ${MINIKUBE_PROFILE_1}`);
        runCommand(`minikube start -p ${MINIKUBE_PROFILE_1} --driver=docker --wait=all`);
      }

      // Start or verify second cluster (test2)
      if (profileList.includes(MINIKUBE_PROFILE_2)) {
        console.log(`Profile '${MINIKUBE_PROFILE_2}' already exists. Checking if running...`);
        const { output: status2 } = runCommand(
          `minikube status -p ${MINIKUBE_PROFILE_2} --format='{{.Host}}'`,
          { silent: true, ignoreError: true }
        );
        if (!status2.includes('Running')) {
          console.log(`Starting profile: ${MINIKUBE_PROFILE_2}`);
          runCommand(`minikube start -p ${MINIKUBE_PROFILE_2} --driver=docker`);
        } else {
          console.log(`✓ Profile ${MINIKUBE_PROFILE_2} is running`);
        }
      } else {
        console.log(`Creating new profile: ${MINIKUBE_PROFILE_2}`);
        runCommand(`minikube start -p ${MINIKUBE_PROFILE_2} --driver=docker --wait=all`);
      }
      
      // Set test as the active profile
      runCommand(`kubectl config use-context ${MINIKUBE_PROFILE_1}`);
    }

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
    runCommand(`minikube -p ${MINIKUBE_PROFILE_1} image load ghcr.io/headlamp-k8s/headlamp:latest`);
    runCommand(`minikube -p ${MINIKUBE_PROFILE_1} image load ghcr.io/headlamp-k8s/headlamp-plugins-test:latest`);

    // Create service account and RBAC
    console.log('');
    console.log('============================================');
    console.log('Setting up RBAC...');
    console.log('============================================');
    
    // Create service account if it doesn't exist
    const { success: saExists } = runCommand(
      `minikube -p ${MINIKUBE_PROFILE_1} kubectl -- get serviceaccount headlamp-admin --namespace kube-system`,
      { silent: true, ignoreError: true }
    );
    
    if (!saExists) {
      runCommand(`minikube -p ${MINIKUBE_PROFILE_1} kubectl -- create serviceaccount headlamp-admin --namespace kube-system`);
    } else {
      console.log('Service account headlamp-admin already exists, skipping creation.');
    }
    
    // Create cluster role binding if it doesn't exist
    const { success: crbExists } = runCommand(
      `minikube -p ${MINIKUBE_PROFILE_1} kubectl -- get clusterrolebinding headlamp-admin`,
      { silent: true, ignoreError: true }
    );
    
    if (!crbExists) {
      runCommand(`minikube -p ${MINIKUBE_PROFILE_1} kubectl -- create clusterrolebinding headlamp-admin --serviceaccount=kube-system:headlamp-admin --clusterrole=cluster-admin`);
    } else {
      console.log('ClusterRoleBinding headlamp-admin already exists, skipping creation.');
    }

    // Generate token for tests
    console.log('Generating service account token for cluster 1 (test)...');
    const { output: token } = runCommand(
      `minikube -p ${MINIKUBE_PROFILE_1} kubectl -- create token headlamp-admin --duration 24h -n kube-system`,
      { silent: true }
    );
    process.env.HEADLAMP_TEST_TOKEN = token.trim();

    // Get cluster info for kubeconfig (cluster 1)
    const { output: caData } = runCommand(
      `minikube -p ${MINIKUBE_PROFILE_1} kubectl -- config view --raw --minify -o jsonpath='{.clusters[0].cluster.certificate-authority-data}'`,
      { silent: true }
    );
    process.env.TEST_CA_DATA = caData.trim();

    const { output: server } = runCommand(
      `minikube -p ${MINIKUBE_PROFILE_1} kubectl -- config view --raw --minify -o jsonpath='{.clusters[0].cluster.server}'`,
      { silent: true }
    );
    process.env.TEST_SERVER = server.trim();

    // Set up second cluster (test2) configuration
    if (IS_CI) {
      // In CI, test2 uses the same cluster as test
      console.log('In CI: test2 uses same cluster as test');
      process.env.TEST2_CA_DATA = process.env.TEST_CA_DATA;
      process.env.TEST2_SERVER = process.env.TEST_SERVER;
      process.env.HEADLAMP_TEST2_TOKEN = process.env.HEADLAMP_TEST_TOKEN;
    } else {
      // Locally, set up RBAC for second cluster
      console.log('Setting up RBAC for cluster 2 (test2)...');
      
      // Create service account if it doesn't exist
      const { success: sa2Exists } = runCommand(
        `minikube -p ${MINIKUBE_PROFILE_2} kubectl -- get serviceaccount headlamp-admin --namespace kube-system`,
        { silent: true, ignoreError: true }
      );
      
      if (!sa2Exists) {
        runCommand(`minikube -p ${MINIKUBE_PROFILE_2} kubectl -- create serviceaccount headlamp-admin --namespace kube-system`);
      } else {
        console.log('Service account headlamp-admin already exists in test2, skipping creation.');
      }
      
      // Create cluster role binding if it doesn't exist
      const { success: crb2Exists } = runCommand(
        `minikube -p ${MINIKUBE_PROFILE_2} kubectl -- get clusterrolebinding headlamp-admin`,
        { silent: true, ignoreError: true }
      );
      
      if (!crb2Exists) {
        runCommand(`minikube -p ${MINIKUBE_PROFILE_2} kubectl -- create clusterrolebinding headlamp-admin --serviceaccount=kube-system:headlamp-admin --clusterrole=cluster-admin`);
      } else {
        console.log('ClusterRoleBinding headlamp-admin already exists in test2, skipping creation.');
      }

      // Generate token for test2
      console.log('Generating service account token for cluster 2 (test2)...');
      const { output: token2 } = runCommand(
        `minikube -p ${MINIKUBE_PROFILE_2} kubectl -- create token headlamp-admin --duration 24h -n kube-system`,
        { silent: true }
      );
      process.env.HEADLAMP_TEST2_TOKEN = token2.trim();

      // Get cluster info for test2
      const { output: caData2 } = runCommand(
        `minikube -p ${MINIKUBE_PROFILE_2} kubectl -- config view --raw --minify -o jsonpath='{.clusters[0].cluster.certificate-authority-data}'`,
        { silent: true }
      );
      process.env.TEST2_CA_DATA = caData2.trim();

      const { output: server2 } = runCommand(
        `minikube -p ${MINIKUBE_PROFILE_2} kubectl -- config view --raw --minify -o jsonpath='{.clusters[0].cluster.server}'`,
        { silent: true }
      );
      process.env.TEST2_SERVER = server2.trim();
    }

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
      runCommand(`minikube -p ${MINIKUBE_PROFILE_1} kubectl -- apply -f ${tempManifest}`);
    } finally {
      if (fs.existsSync(tempManifest)) {
        fs.unlinkSync(tempManifest);
      }
    }

    // Wait for deployment to be ready
    console.log('Waiting for Headlamp deployment to be ready...');
    runCommand(
      `minikube -p ${MINIKUBE_PROFILE_1} kubectl -- wait deployment -n kube-system headlamp --for condition=Available=True --timeout=120s`
    );

    // Get service URL
    console.log('');
    console.log('============================================');
    console.log('Getting service URL...');
    console.log('============================================');

    const { output: servicePort } = runCommand(
      `minikube -p ${MINIKUBE_PROFILE_1} kubectl -- get services headlamp -n kube-system -o=jsonpath='{.spec.ports[0].nodePort}'`,
      { silent: true }
    );

    const { output: minikubeIp } = runCommand(`minikube ip -p ${MINIKUBE_PROFILE_1}`, {
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
          `minikube -p ${MINIKUBE_PROFILE_1} kubectl -- get pods -n kube-system -l app.kubernetes.io/name=headlamp`
        );
        runCommand(
          `minikube -p ${MINIKUBE_PROFILE_1} kubectl -- logs -n kube-system -l app.kubernetes.io/name=headlamp --tail=50`
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

    // Prepare kubeconfig with certificate files for e2e tests
    console.log('');
    console.log('============================================');
    console.log('Preparing kubeconfig for e2e tests...');
    console.log('============================================');
    
    const kubeconfigPath = path.join(process.env.HOME || process.env.USERPROFILE, '.kube', 'config');
    process.env.KUBECONFIG = kubeconfigPath;
    
    // Get IP address
    const { output: ipAddress } = runCommand(
      `minikube -p ${MINIKUBE_PROFILE_1} kubectl -- get nodes -o=jsonpath='{.items[0].status.addresses[?(@.type=="InternalIP")].address}'`,
      { silent: true }
    );
    const IP_ADDRESS = ipAddress.trim();
    
    // Extract and write certificates to files
    console.log('Extracting certificates from kubeconfig...');
    
    // CA certificate
    const { output: caCertB64 } = runCommand(
      `minikube -p ${MINIKUBE_PROFILE_1} kubectl -- config view --raw --minify -o jsonpath='{.clusters[0].cluster.certificate-authority-data}'`,
      { silent: true }
    );
    const caCertData = Buffer.from(caCertB64.trim(), 'base64').toString('utf-8');
    const caCertPath = path.join(PROJECT_ROOT, 'ca.crt');
    fs.writeFileSync(caCertPath, caCertData);
    
    // Client certificate
    const { output: clientCertB64 } = runCommand(
      `minikube -p ${MINIKUBE_PROFILE_1} kubectl -- config view --raw --minify -o jsonpath='{.users[0].user.client-certificate-data}'`,
      { silent: true }
    );
    const clientCertData = Buffer.from(clientCertB64.trim(), 'base64').toString('utf-8');
    const clientCertPath = path.join(PROJECT_ROOT, 'client.crt');
    fs.writeFileSync(clientCertPath, clientCertData);
    
    // Client key
    const { output: clientKeyB64 } = runCommand(
      `minikube -p ${MINIKUBE_PROFILE_1} kubectl -- config view --raw --minify -o jsonpath='{.users[0].user.client-key-data}'`,
      { silent: true }
    );
    const clientKeyData = Buffer.from(clientKeyB64.trim(), 'base64').toString('utf-8');
    const clientKeyPath = path.join(PROJECT_ROOT, 'client.key');
    fs.writeFileSync(clientKeyPath, clientKeyData);
    
    // Get the context name (minikube or test depending on environment)
    const contextName = IS_CI ? 'minikube' : 'test';
    const clusterName = IS_CI ? 'minikube' : 'test';
    const userName = IS_CI ? 'minikube' : `admin@${clusterName}`;
    
    // Update kubeconfig to use file paths instead of embedded data
    console.log('Updating kubeconfig to use certificate files...');
    runCommand(`kubectl config set-cluster ${clusterName} --certificate-authority=${caCertPath} --server=https://${IP_ADDRESS}:${servicePort.trim()}`);
    runCommand(`kubectl config unset clusters.${clusterName}.certificate-authority-data`, { ignoreError: true });
    runCommand(`kubectl config set-credentials ${userName} --client-certificate=${clientCertPath} --client-key=${clientKeyPath}`);
    runCommand(`kubectl config unset users.${userName}.client-certificate-data`, { ignoreError: true });
    runCommand(`kubectl config unset users.${userName}.client-key-data`, { ignoreError: true });
    
    console.log('Modified kubeconfig:');
    runCommand('cat $KUBECONFIG');

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
        `minikube -p ${MINIKUBE_PROFILE_1} kubectl -- get pods -n kube-system -l app.kubernetes.io/name=headlamp`,
        { ignoreError: true }
      );
      runCommand(
        `minikube -p ${MINIKUBE_PROFILE_1} kubectl -- logs -n kube-system -l app.kubernetes.io/name=headlamp --tail=100`,
        { ignoreError: true }
      );
    }
  } catch (error) {
    console.error('Error:', error.message);
    exitCode = 1;
  } finally {
    // Clean up certificate files
    try {
      const caCertPath = path.join(PROJECT_ROOT, 'ca.crt');
      const clientCertPath = path.join(PROJECT_ROOT, 'client.crt');
      const clientKeyPath = path.join(PROJECT_ROOT, 'client.key');
      if (fs.existsSync(caCertPath)) fs.unlinkSync(caCertPath);
      if (fs.existsSync(clientCertPath)) fs.unlinkSync(clientCertPath);
      if (fs.existsSync(clientKeyPath)) fs.unlinkSync(clientKeyPath);
    } catch (e) {
      // Ignore cleanup errors
    }
    cleanup();
  }

  process.exit(exitCode);
}

// Run main function
main();
