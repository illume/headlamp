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

const MINIKUBE_PROFILE_1 = 'test';
const MINIKUBE_PROFILE_2 = 'test2';

console.log('============================================');
console.log('Cleaning up Minikube E2E Test Clusters');
console.log('============================================');
console.log(`Profiles: ${MINIKUBE_PROFILE_1}, ${MINIKUBE_PROFILE_2}`);
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

// Check if profiles exist and delete them
const { output } = runCommand('minikube profile list', { silent: true, ignoreError: true });

let deleted = false;

for (const profile of [MINIKUBE_PROFILE_1, MINIKUBE_PROFILE_2]) {
  if (output.includes(profile)) {
    console.log(`Deleting minikube profile: ${profile}`);
    runCommand(`minikube delete -p ${profile}`);
    deleted = true;
  }
}

if (deleted) {
  console.log('✓ Clusters deleted successfully');
} else {
  console.log(`Profiles '${MINIKUBE_PROFILE_1}' and '${MINIKUBE_PROFILE_2}' do not exist. Nothing to clean up.`);
}
