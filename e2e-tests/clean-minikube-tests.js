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

const { execSync } = require('child_process');

const MINIKUBE_PROFILE = 'headlamp-e2e-test';

console.log('============================================');
console.log('Cleaning up Minikube E2E Test Cluster');
console.log('============================================');
console.log(`Profile: ${MINIKUBE_PROFILE}`);
console.log('');

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

// Check if minikube is installed
if (!commandExists('minikube')) {
  console.error('Error: minikube is not installed.');
  process.exit(1);
}

// Check if profile exists
const { output } = runCommand('minikube profile list', { silent: true, ignoreError: true });

if (output.includes(MINIKUBE_PROFILE)) {
  console.log(`Deleting minikube profile: ${MINIKUBE_PROFILE}`);
  runCommand(`minikube delete -p ${MINIKUBE_PROFILE}`);
  console.log('✓ Cluster deleted successfully');
} else {
  console.log(`Profile '${MINIKUBE_PROFILE}' does not exist. Nothing to clean up.`);
}
