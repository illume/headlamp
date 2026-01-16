#!/usr/bin/env node

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
 * This script copies example plugins from plugins/examples into
 * code-examples/ directory for bundling with headlamp-plugin package.
 */

const fs = require('fs-extra');
const path = require('path');

const scriptDir = __dirname;
const pluginDir = path.resolve(scriptDir, '..');
const examplesSourceDir = path.resolve(pluginDir, '..', 'examples');
const examplesDestDir = path.resolve(pluginDir, 'code-examples');

console.log('Bundling example plugins...');
console.log(`Source: ${examplesSourceDir}`);
console.log(`Destination: ${examplesDestDir}`);

// Remove existing code-examples directory if it exists
if (fs.existsSync(examplesDestDir)) {
  console.log('Removing existing code-examples directory...');
  fs.rmSync(examplesDestDir, { recursive: true });
}

// Create code-examples directory
fs.mkdirSync(examplesDestDir, { recursive: true });

// Get list of example plugins
const examplePlugins = fs
  .readdirSync(examplesSourceDir, { withFileTypes: true })
  .filter(dirent => dirent.isDirectory())
  .map(dirent => dirent.name);

console.log(`Found ${examplePlugins.length} example plugins to bundle`);

// Copy each example plugin
examplePlugins.forEach(pluginName => {
  const sourcePath = path.join(examplesSourceDir, pluginName);
  const destPath = path.join(examplesDestDir, pluginName);

  console.log(`Copying ${pluginName}...`);

  // Copy the plugin directory
  fs.copySync(sourcePath, destPath, {
    filter: src => {
      // Skip node_modules, dist, and other build artifacts
      const relativePath = path.relative(sourcePath, src);
      if (relativePath.includes('node_modules')) return false;
      if (relativePath.includes('dist')) return false;
      if (relativePath.includes('.eslintcache')) return false;
      if (relativePath.includes('storybook-static')) return false;
      if (relativePath.includes('package-lock.json')) return false;
      return true;
    },
  });
});

console.log(`Successfully bundled ${examplePlugins.length} example plugins to code-examples/`);
