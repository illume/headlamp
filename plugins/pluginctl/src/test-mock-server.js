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

/**
 * Shared mock server utilities for plugin management tests.
 * Provides a local HTTP server that mimics ArtifactHub API responses.
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const tar = require('tar');

/**
 * Creates a mock plugin tarball (tar.gz) containing main.js and package.json.
 * @param {string} pluginName - The name of the plugin.
 * @returns {{ tarball: Buffer, checksum: string }}
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
  fs.rmSync(tmpDir, { recursive: true, force: true });
  return { tarball, checksum };
}

/**
 * Plugin definitions for testing.
 */
const TEST_PLUGINS = {
  appcatalog_headlamp_plugin: {
    name: 'appcatalog_headlamp_plugin',
    displayName: 'App Catalog',
    version: '0.0.3',
    repoName: 'test-123',
    folderPluginName: 'app-catalog',
  },
  ai_plugin: {
    name: 'ai_plugin',
    displayName: 'AI Plugin',
    version: '0.0.2',
    repoName: 'test-123',
    folderPluginName: 'ai-plugin',
  },
  prometheus_headlamp_plugin: {
    name: 'prometheus_headlamp_plugin',
    displayName: 'Prometheus Plugin',
    version: '0.0.3',
    repoName: 'test-123',
    folderPluginName: 'prometheus',
  },
};

/**
 * Starts a mock HTTP server serving ArtifactHub-like API responses and plugin tarballs.
 * @returns {Promise<{ server: http.Server, port: number, baseURL: string }>}
 */
function startMockServer() {
  // Pre-create tarballs for all test plugins
  const tarballs = {};
  for (const [key, plugin] of Object.entries(TEST_PLUGINS)) {
    tarballs[key] = createMockPluginTarball(plugin.folderPluginName);
  }

  return new Promise(resolve => {
    const server = http.createServer((req, res) => {
      const url = new URL(req.url, `http://${req.headers.host}`);

      // Match API metadata requests: /api/v1/packages/headlamp/{repo}/{plugin}
      const apiMatch = url.pathname.match(
        /^\/api\/v1\/packages\/headlamp\/([^/]+)\/([^/]+)(?:\/([^/]+))?$/
      );
      if (apiMatch) {
        const pluginKey = apiMatch[2];
        const plugin = TEST_PLUGINS[pluginKey];
        const tarballData = tarballs[pluginKey];
        if (plugin && tarballData) {
          const metadata = {
            name: plugin.name,
            display_name: plugin.displayName,
            version: plugin.version,
            repository: {
              name: plugin.repoName,
              user_alias: 'test-user',
            },
            data: {
              'headlamp/plugin/archive-url': `http://127.0.0.1:${server.address().port}/archive/${plugin.name}.tar.gz`,
              'headlamp/plugin/archive-checksum': `sha256:${tarballData.checksum}`,
            },
          };
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(metadata));
          return;
        }
      }

      // Match archive download requests: /archive/{plugin}.tar.gz
      const archiveMatch = url.pathname.match(/^\/archive\/([^/]+)\.tar\.gz$/);
      if (archiveMatch) {
        const pluginKey = archiveMatch[1];
        const tarballData = tarballs[pluginKey];
        if (tarballData) {
          res.writeHead(200, { 'Content-Type': 'application/gzip' });
          res.end(tarballData.tarball);
          return;
        }
      }

      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ message: 'Not found' }));
    });

    server.listen(0, '127.0.0.1', () => {
      const port = server.address().port;
      resolve({ server, port, baseURL: `http://127.0.0.1:${port}` });
    });
  });
}

module.exports = { startMockServer, createMockPluginTarball, TEST_PLUGINS };
