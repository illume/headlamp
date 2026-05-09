#!/bin/env node

/*
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

const { execFile } = require('child_process');
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const envPaths = require('env-paths');
const { startMockServer } = require('./test-mock-server.js');

/**
 * Runs a CLI command asynchronously and returns the output.
 * Uses execFile (non-blocking, no shell) so the mock HTTP server can handle requests.
 */
function runCommand(args, env = {}) {
  return new Promise((resolve, reject) => {
    execFile(
      'node',
      args,
      {
        encoding: 'utf8',
        env: { ...process.env, ...env },
        timeout: 30000,
      },
      (error, stdout, stderr) => {
        if (error) {
          console.error(`Error running command "node ${args.join(' ')}":`, stderr || error.message);
          reject(error);
          return;
        }
        resolve(stdout);
      }
    );
  });
}

// Helper function to get the default plugins directory
function defaultPluginsDir() {
  const paths = envPaths('Headlamp', { suffix: '' });
  const configDir = fs.existsSync(paths.data) ? paths.data : paths.config;
  return path.join(configDir, 'plugins');
}

async function main() {
  // Use prometheus_headlamp_plugin as the ArtifactHub package name,
  // which installs as "prometheus" (the name from the tarball's package.json).
  // This exercises the real-world case where the package name differs
  // from the installed plugin folder name.
  const packageName = 'prometheus_headlamp_plugin';
  const installedPluginName = 'prometheus';

  // Start shared mock server
  const { server, baseURL } = await startMockServer();
  const testEnv = { HEADLAMP_TEST_ARTIFACTHUB_URL: baseURL };

  console.log(`Mock server started at ${baseURL}`);

  try {
    // Create default plugins directory if it doesn't exist
    const pluginsDir = defaultPluginsDir();
    if (!fs.existsSync(pluginsDir)) {
      fs.mkdirSync(pluginsDir, { recursive: true });
    }

    // List plugins initially
    let output = await runCommand(['../bin/pluginctl.js', 'list', '--json'], testEnv);
    console.log('Initial list output:', output);
    let plugins = JSON.parse(output);
    console.log('Initial plugins:', plugins);

    // Ensure the plugin is not installed
    let pluginExists = plugins.some(plugin => plugin.pluginName === installedPluginName);
    assert.strictEqual(pluginExists, false, 'Plugin should not be initially installed');

    // Install the plugin using the ArtifactHub package name (different from installed name)
    const pluginURL = `${baseURL}/packages/headlamp/test-123/${packageName}`;
    output = await runCommand(['../bin/pluginctl.js', 'install', pluginURL], testEnv);
    console.log('Install output:', output);

    // List plugins to verify installation
    output = await runCommand(['../bin/pluginctl.js', 'list', '--json'], testEnv);
    plugins = JSON.parse(output);
    console.log('Plugins after install:', plugins);
    pluginExists = plugins.some(plugin => plugin.pluginName === installedPluginName);
    assert.strictEqual(pluginExists, true, 'Plugin should be installed');

    // Update the plugin (should report no updates since version matches)
    output = await runCommand(['../bin/pluginctl.js', 'update', installedPluginName], testEnv);
    console.log('Update output:', output);

    // List plugins to verify update
    output = await runCommand(['../bin/pluginctl.js', 'list', '--json'], testEnv);
    plugins = JSON.parse(output);
    console.log('Plugins after update:', plugins);
    pluginExists = plugins.some(plugin => plugin.pluginName === installedPluginName);
    assert.strictEqual(pluginExists, true, 'Plugin should still be installed after update');

    // Uninstall the plugin
    output = await runCommand(
      ['../bin/pluginctl.js', 'uninstall', installedPluginName],
      testEnv
    );
    console.log('Uninstall output:', output);

    // List plugins to verify uninstallation
    output = await runCommand(['../bin/pluginctl.js', 'list', '--json'], testEnv);
    console.log('Final list output:', output);
    plugins = JSON.parse(output);
    console.log('Plugins after uninstall:', plugins);
    pluginExists = plugins.some(plugin => plugin.pluginName === installedPluginName);
    assert.strictEqual(pluginExists, false, 'Plugin should be uninstalled');

    console.log('All tests passed successfully.');
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
}

main().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
