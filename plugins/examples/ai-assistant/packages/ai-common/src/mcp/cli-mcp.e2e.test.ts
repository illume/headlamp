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

import { execFileSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { afterEach, describe, expect, it } from 'vitest';

/**
 * End-to-end tests for the headlamp-ai CLI with MCP (Model Context Protocol) servers.
 *
 * These tests verify that the CLI correctly:
 * - Connects to MCP servers defined in a config file
 * - Completes and exits cleanly (no hanging processes from MCP child processes)
 * - Works with the fake MCP server from ai-common test fixtures
 *
 * Run with: npx vitest run --config vitest.e2e.config.ts src/mcp/cli-mcp.e2e.test.ts
 */
describe('CLI e2e with MCP', () => {
  const cliPath = path.resolve(__dirname, '..', '..', '..', 'ai-cli', 'src', 'cli.ts');
  const fakeMcpServerPath = path.resolve(__dirname, 'test-fixtures', 'fake-mcp-server.mjs');

  let tmpDir: string;

  afterEach(() => {
    if (tmpDir) {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  function writeConfig(config: Record<string, unknown>): string {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'headlamp-ai-mcp-test-'));
    const configPath = path.join(tmpDir, 'config.json');
    fs.writeFileSync(configPath, JSON.stringify(config));
    return configPath;
  }

  function runCLI(args: string[], timeoutMs = 30_000): string {
    const result = execFileSync('npx', ['tsx', cliPath, ...args], {
      encoding: 'utf-8',
      timeout: timeoutMs,
      cwd: path.resolve(__dirname, '..', '..', '..', 'ai-cli'),
    });
    return result.trim();
  }

  it('runs with a fake MCP server and exits cleanly', () => {
    const configPath = writeConfig({
      provider: 'mock-testing-model',
      config: {},
      mcp: {
        enabled: true,
        servers: [
          {
            name: 'fake',
            command: 'node',
            args: [fakeMcpServerPath],
            enabled: true,
          },
        ],
      },
    });

    const output = runCLI(['--config', configPath, 'Hello']);
    expect(output).toContain('Headlamp AI assistant');
  });

  it('runs with MCP disabled and exits cleanly', () => {
    const configPath = writeConfig({
      provider: 'mock-testing-model',
      config: {},
      mcp: {
        enabled: false,
        servers: [
          {
            name: 'fake',
            command: 'node',
            args: [fakeMcpServerPath],
            enabled: true,
          },
        ],
      },
    });

    const output = runCLI(['--config', configPath, 'Hello']);
    expect(output).toContain('Headlamp AI assistant');
  });

  it('runs with multiple MCP servers', () => {
    const configPath = writeConfig({
      provider: 'mock-testing-model',
      config: {},
      mcp: {
        enabled: true,
        servers: [
          {
            name: 'fake1',
            command: 'node',
            args: [fakeMcpServerPath],
            enabled: true,
          },
          {
            name: 'fake2',
            command: 'node',
            args: [fakeMcpServerPath],
            enabled: true,
          },
        ],
      },
    });

    const output = runCLI(['--config', configPath, 'Hello']);
    expect(output).toContain('Headlamp AI assistant');
  });

  it('handles MCP config with no servers gracefully', () => {
    const configPath = writeConfig({
      provider: 'mock-testing-model',
      config: {},
      mcp: {
        enabled: true,
        servers: [],
      },
    });

    const output = runCLI(['--config', configPath, 'Hello']);
    expect(output).toContain('Headlamp AI assistant');
  });
});
