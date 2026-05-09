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

const { exec } = require('child_process');
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const http = require('http');
const crypto = require('crypto');
const tar = require('tar');
const envPaths = require('env-paths');

/**
 * Runs a CLI command asynchronously and returns the output.
 * Uses exec (non-blocking) so the mock HTTP server can handle requests.
 */
function runCommand(command, env = {}) {
  return new Promise((resolve, reject) => {
    exec(
      command,
      {
        encoding: 'utf8',
        env: { ...process.env, ...env },
        timeout: 30000,
      },
      (error, stdout, stderr) => {
        if (error) {
          console.error(`Error running command "${command}":`, stderr || error.message);
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

/**
 * Creates a mock plugin tarball (tar.gz) containing main.js and package.json.
 * Returns the tarball buffer and its SHA256 checksum.
 */
function createMockPluginTarball(pluginName) {
  const tmpDir = fs.mkdtempSync(path.join(require('os').tmpdir(), 'mock-plugin-'));
  const pluginDir = path.join(tmpDir, pluginName);
  fs.mkdirSync(pluginDir, { recursive: true });

  fs.writeFileSync(
    path.join(pluginDir, 'package.json'),
    JSON.stringify({ name: pluginName, version: '0.0.1' }, null, 2)
  );
  fs.writeFileSync(path.join(pluginDir, 'main.js'), '// mock plugin\n');

  // Create tar.gz synchronously
  tar.create(
    {
      gzip: true,
      sync: true,
      file: path.join(tmpDir, 'plugin.tar.gz'),
      cwd: tmpDir,
    },
    [pluginName]
  );

  const tarball = fs.readFileSync(path.join(tmpDir, 'plugin.tar.gz'));
  const checksum = crypto.createHash('sha256').update(tarball).digest('hex');

  // Clean up temp files
  fs.rmSync(tmpDir, { recursive: true, force: true });

  return { tarball, checksum };
}

/**
 * Starts a mock HTTP server that serves ArtifactHub-like API responses
 * and plugin tarballs for testing.
 */
function startMockServer(pluginName, tarball, checksum) {
  return new Promise(resolve => {
    const server = http.createServer((req, res) => {
      const url = new URL(req.url, `http://${req.headers.host}`);

      if (url.pathname === `/api/v1/packages/headlamp/test-123/${pluginName}`) {
        // Serve mock ArtifactHub API metadata
        const metadata = {
          name: pluginName,
          display_name: 'Prometheus Plugin',
          version: '0.0.3',
          repository: {
            name: 'test-123',
            user_alias: 'test-user',
          },
          data: {
            'headlamp/plugin/archive-url': `http://127.0.0.1:${server.address().port}/archive/${pluginName}.tar.gz`,
            'headlamp/plugin/archive-checksum': `sha256:${checksum}`,
          },
        };
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(metadata));
      } else if (url.pathname === `/archive/${pluginName}.tar.gz`) {
        // Serve mock plugin tarball
        res.writeHead(200, { 'Content-Type': 'application/gzip' });
        res.end(tarball);
      } else {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ message: 'Not found' }));
      }
    });

    server.listen(0, '127.0.0.1', () => {
      const port = server.address().port;
      resolve({ server, port });
    });
  });
}

async function main() {
  const pluginName = 'prometheus';

  // Create mock plugin tarball
  const { tarball, checksum } = createMockPluginTarball(pluginName);

  // Start mock server
  const { server, port } = await startMockServer(pluginName, tarball, checksum);
  const mockBaseURL = `http://127.0.0.1:${port}`;
  const testEnv = { HEADLAMP_TEST_ARTIFACTHUB_URL: mockBaseURL };

  console.log(`Mock server started on port ${port}`);

  try {
    // Create default plugins directory if it doesn't exist
    const pluginsDir = defaultPluginsDir();
    if (!fs.existsSync(pluginsDir)) {
      fs.mkdirSync(pluginsDir, { recursive: true });
    }

    // List plugins initially
    let output = await runCommand('node ../bin/pluginctl.js list --json', testEnv);
    console.log('Initial list output:', output);
    let plugins = JSON.parse(output);
    console.log('Initial plugins:', plugins);

    // Ensure the plugin is not installed
    let pluginExists = plugins.some(plugin => plugin.pluginName === pluginName);
    assert.strictEqual(pluginExists, false, 'Plugin should not be initially installed');

    // Install the plugin
    const pluginURL = `${mockBaseURL}/packages/headlamp/test-123/${pluginName}`;
    output = await runCommand(`node ../bin/pluginctl.js install ${pluginURL}`, testEnv);
    console.log('Install output:', output);

    // List plugins to verify installation
    output = await runCommand('node ../bin/pluginctl.js list --json', testEnv);
    plugins = JSON.parse(output);
    console.log('Plugins after install:', plugins);
    pluginExists = plugins.some(plugin => plugin.pluginName === pluginName);
    assert.strictEqual(pluginExists, true, 'Plugin should be installed');

    // Update the plugin (should report no updates since version matches)
    output = await runCommand(`node ../bin/pluginctl.js update ${pluginName}`, testEnv);
    console.log('Update output:', output);

    // List plugins to verify update
    output = await runCommand('node ../bin/pluginctl.js list --json', testEnv);
    plugins = JSON.parse(output);
    console.log('Plugins after update:', plugins);
    pluginExists = plugins.some(plugin => plugin.pluginName === pluginName);
    assert.strictEqual(pluginExists, true, 'Plugin should still be installed after update');

    // Uninstall the plugin
    output = await runCommand(`node ../bin/pluginctl.js uninstall ${pluginName}`, testEnv);
    console.log('Uninstall output:', output);

    // List plugins to verify uninstallation
    output = await runCommand('node ../bin/pluginctl.js list --json', testEnv);
    console.log('Final list output:', output);
    plugins = JSON.parse(output);
    console.log('Plugins after uninstall:', plugins);
    pluginExists = plugins.some(plugin => plugin.pluginName === pluginName);
    assert.strictEqual(pluginExists, false, 'Plugin should be uninstalled');

    console.log('All tests passed successfully.');
  } finally {
    server.close();
  }
}

main().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
