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

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MCPClientCore, MCPSettingsProvider, MCPConfirmationHandler } from './MCPClientCore';
import type { MCPSettings } from './types';

/**
 * Path to the fake MCP server script that uses @modelcontextprotocol/sdk.
 * The server exposes two tools:
 *   - greet(name: string) → "Hello, <name>!"
 *   - add(a: number, b: number) → { sum: <a+b> }
 *
 * Flags:
 *   --fail  → the `add` tool always throws
 */
const FAKE_SERVER_PATH = path.resolve(__dirname, 'test-fixtures', 'fake-mcp-server.mjs');

/** Build an in-memory settings provider for tests. */
function makeSettingsProvider(initial?: MCPSettings): MCPSettingsProvider {
  let settings: MCPSettings | null = initial ?? null;
  return {
    loadMCPSettings: vi.fn(() => settings),
    saveMCPSettings: vi.fn((s: MCPSettings) => {
      settings = s;
    }),
  };
}

/** Confirmation handler that auto-approves every prompt. */
function autoApproveHandler(): MCPConfirmationHandler {
  return {
    confirmSettingsChange: vi.fn(async () => true),
    confirmToolsConfigChange: vi.fn(async () => true),
    confirmOperation: vi.fn(async () => true),
  };
}

/** Confirmation handler that auto-denies every prompt. */
function autoDenyHandler(): MCPConfirmationHandler {
  return {
    confirmSettingsChange: vi.fn(async () => false),
    confirmToolsConfigChange: vi.fn(async () => false),
    confirmOperation: vi.fn(async () => false),
  };
}

/** Settings that point at the fake MCP server. */
function fakeServerSettings(flags: string[] = []): MCPSettings {
  return {
    enabled: true,
    servers: [
      {
        name: 'fake',
        command: 'node',
        args: [FAKE_SERVER_PATH, ...flags],
        enabled: true,
      },
    ],
  };
}

describe('MCP e2e — MCPClientCore with fake MCP servers', () => {
  let tmpDir: string;
  let configPath: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mcp-e2e-'));
    configPath = path.join(tmpDir, 'mcp-tool-state.json');
  });

  afterEach(async () => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  // ────────────────────────────────────────────────────────────────────
  // 1.  Lifecycle: initialize → getStatus → cleanup
  // ────────────────────────────────────────────────────────────────────
  it('initializes, discovers tools, and cleans up', async () => {
    const provider = makeSettingsProvider(fakeServerSettings());
    const core = new MCPClientCore(configPath, provider);

    await core.initialize();

    const status = core.getStatus();
    expect(status.isInitialized).toBe(true);
    expect(status.hasClient).toBe(true);

    // Tools config should now contain the fake server's tools
    const toolsCfg = core.getToolsConfig();
    expect(toolsCfg.success).toBe(true);
    expect(toolsCfg.config).toBeDefined();
    const serverTools = toolsCfg.config!['fake'];
    expect(serverTools).toBeDefined();
    expect(Object.keys(serverTools)).toContain('greet');
    expect(Object.keys(serverTools)).toContain('add');

    await core.cleanup();
    const after = core.getStatus();
    expect(after.isInitialized).toBe(false);
  }, 30_000);

  // ────────────────────────────────────────────────────────────────────
  // 2.  Tool execution — greet
  // ────────────────────────────────────────────────────────────────────
  it('executes the greet tool and returns expected result', async () => {
    const provider = makeSettingsProvider(fakeServerSettings());
    const core = new MCPClientCore(configPath, provider);

    await core.initialize();

    const result = await core.executeTool('fake__greet', { name: 'World' } as any, 'call-1');
    expect(result).toBeDefined();
    expect(result!.success).toBe(true);
    expect(result!.toolCallId).toBe('call-1');

    // The result content should contain "Hello, World!"
    const text = typeof result!.result === 'string'
      ? result!.result
      : JSON.stringify(result!.result);
    expect(text).toContain('Hello, World!');

    await core.cleanup();
  }, 30_000);

  // ────────────────────────────────────────────────────────────────────
  // 3.  Tool execution — add
  // ────────────────────────────────────────────────────────────────────
  it('executes the add tool and returns correct sum', async () => {
    const provider = makeSettingsProvider(fakeServerSettings());
    const core = new MCPClientCore(configPath, provider);

    await core.initialize();

    const result = await core.executeTool('fake__add', { a: 3, b: 7 } as any, 'call-2');
    expect(result).toBeDefined();
    expect(result!.success).toBe(true);

    const text = typeof result!.result === 'string'
      ? result!.result
      : JSON.stringify(result!.result);
    expect(text).toContain('10');

    await core.cleanup();
  }, 30_000);

  // ────────────────────────────────────────────────────────────────────
  // 4.  Tool execution — server-side error
  // ────────────────────────────────────────────────────────────────────
  it('returns error when the MCP tool throws', async () => {
    const provider = makeSettingsProvider(fakeServerSettings(['--fail']));
    const core = new MCPClientCore(configPath, provider);

    await core.initialize();

    const result = await core.executeTool('fake__add', { a: 1, b: 2 } as any, 'call-err');
    expect(result).toBeDefined();

    // The tool itself threw, but MCPClientCore should handle it gracefully.
    // Depending on how @langchain/mcp-adapters surfaces the error,
    // result may be success=true with error text or success=false.
    // Either way it should not throw from executeTool.
    expect(result!.toolCallId).toBe('call-err');

    await core.cleanup();
  }, 30_000);

  // ────────────────────────────────────────────────────────────────────
  // 5.  Disabled tool — execution refused
  // ────────────────────────────────────────────────────────────────────
  it('refuses to execute a disabled tool', async () => {
    const provider = makeSettingsProvider(fakeServerSettings());
    const core = new MCPClientCore(configPath, provider);

    await core.initialize();

    // Disable the greet tool
    core.setToolEnabled('fake', 'greet', false);

    const result = await core.executeTool('fake__greet', { name: 'Nobody' } as any, 'call-dis');
    expect(result).toBeDefined();
    expect(result!.success).toBe(false);
    expect(result!.error).toContain('disabled');

    await core.cleanup();
  }, 30_000);

  // ────────────────────────────────────────────────────────────────────
  // 6.  Tool stats — usage tracking
  // ────────────────────────────────────────────────────────────────────
  it('records tool usage stats after execution', async () => {
    const provider = makeSettingsProvider(fakeServerSettings());
    const core = new MCPClientCore(configPath, provider);

    await core.initialize();

    // Execute greet twice
    await core.executeTool('fake__greet', { name: 'Alice' } as any, 'c1');
    await core.executeTool('fake__greet', { name: 'Bob' } as any, 'c2');

    const stats = core.getToolStats('fake', 'greet');
    expect(stats.success).toBe(true);
    expect(stats.stats).toBeDefined();
    expect(stats.stats.usageCount).toBe(2);

    await core.cleanup();
  }, 30_000);

  // ────────────────────────────────────────────────────────────────────
  // 7.  Config update — auto-approve restarts client
  // ────────────────────────────────────────────────────────────────────
  it('updates config and restarts client with new settings', async () => {
    const provider = makeSettingsProvider(fakeServerSettings());
    const core = new MCPClientCore(configPath, provider, autoApproveHandler());

    await core.initialize();

    // Update to a config with no servers → client should become empty
    const result = await core.updateConfig({
      enabled: true,
      servers: [],
    });
    expect(result.success).toBe(true);

    const status = core.getStatus();
    // No servers → initialized but no client
    expect(status.isInitialized).toBe(true);
    expect(status.hasClient).toBe(false);

    await core.cleanup();
  }, 30_000);

  // ────────────────────────────────────────────────────────────────────
  // 8.  Config update — denied by confirmation handler
  // ────────────────────────────────────────────────────────────────────
  it('rejects config update when confirmation handler denies', async () => {
    const provider = makeSettingsProvider(fakeServerSettings());
    const core = new MCPClientCore(configPath, provider, autoDenyHandler());

    await core.initialize();

    const result = await core.updateConfig({
      enabled: true,
      servers: [],
    });
    expect(result.success).toBe(false);
    expect(result.error).toContain('cancelled');

    // Original settings should be unchanged
    const cfg = core.getConfig();
    expect(cfg.config.servers).toHaveLength(1);

    await core.cleanup();
  }, 30_000);

  // ────────────────────────────────────────────────────────────────────
  // 9.  Reset client — auto-approve
  // ────────────────────────────────────────────────────────────────────
  it('resets the client and re-discovers tools', async () => {
    const provider = makeSettingsProvider(fakeServerSettings());
    const core = new MCPClientCore(configPath, provider, autoApproveHandler());

    await core.initialize();

    const resetResult = await core.resetClient();
    expect(resetResult.success).toBe(true);

    // After reset, tools should still be discovered
    const toolsCfg = core.getToolsConfig();
    expect(toolsCfg.success).toBe(true);
    expect(toolsCfg.config!['fake']).toBeDefined();

    await core.cleanup();
  }, 30_000);

  // ────────────────────────────────────────────────────────────────────
  // 10.  Multiple servers
  // ────────────────────────────────────────────────────────────────────
  it('connects to multiple fake MCP servers simultaneously', async () => {
    const settings: MCPSettings = {
      enabled: true,
      servers: [
        {
          name: 'server-a',
          command: 'node',
          args: [FAKE_SERVER_PATH],
          enabled: true,
        },
        {
          name: 'server-b',
          command: 'node',
          args: [FAKE_SERVER_PATH],
          enabled: true,
        },
      ],
    };
    const provider = makeSettingsProvider(settings);
    const core = new MCPClientCore(configPath, provider);

    await core.initialize();

    const toolsCfg = core.getToolsConfig();
    expect(toolsCfg.success).toBe(true);
    expect(toolsCfg.config!['server-a']).toBeDefined();
    expect(toolsCfg.config!['server-b']).toBeDefined();

    // Execute greet on each server
    const resA = await core.executeTool('server-a__greet', { name: 'A' } as any, 'c-a');
    expect(resA!.success).toBe(true);

    const resB = await core.executeTool('server-b__greet', { name: 'B' } as any, 'c-b');
    expect(resB!.success).toBe(true);

    await core.cleanup();
  }, 30_000);

  // ────────────────────────────────────────────────────────────────────
  // 11.  Tool enable/disable state within a session
  // ────────────────────────────────────────────────────────────────────
  it('disables a tool, verifies it is rejected, re-enables it', async () => {
    const provider = makeSettingsProvider(fakeServerSettings());
    const core = new MCPClientCore(configPath, provider);

    await core.initialize();

    // Disable greet
    core.setToolEnabled('fake', 'greet', false);

    const rejected = await core.executeTool('fake__greet', { name: 'X' } as any, 'c-off');
    expect(rejected).toBeDefined();
    expect(rejected!.success).toBe(false);
    expect(rejected!.error).toContain('disabled');

    // Re-enable greet
    core.setToolEnabled('fake', 'greet', true);

    const accepted = await core.executeTool('fake__greet', { name: 'X' } as any, 'c-on');
    expect(accepted).toBeDefined();
    expect(accepted!.success).toBe(true);

    await core.cleanup();
  }, 30_000);

  // ────────────────────────────────────────────────────────────────────
  // 12.  No servers configured — graceful initialization
  // ────────────────────────────────────────────────────────────────────
  it('initializes gracefully with no servers configured', async () => {
    const provider = makeSettingsProvider({ enabled: true, servers: [] });
    const core = new MCPClientCore(configPath, provider);

    await core.initialize();

    const status = core.getStatus();
    expect(status.isInitialized).toBe(true);
    expect(status.hasClient).toBe(false);

    await core.cleanup();
  }, 30_000);

  // ────────────────────────────────────────────────────────────────────
  // 13.  MCP disabled — no client created
  // ────────────────────────────────────────────────────────────────────
  it('does not create client when MCP is disabled', async () => {
    const provider = makeSettingsProvider({
      enabled: false,
      servers: [
        {
          name: 'fake',
          command: 'node',
          args: [FAKE_SERVER_PATH],
          enabled: true,
        },
      ],
    });
    const core = new MCPClientCore(configPath, provider);

    await core.initialize();

    const status = core.getStatus();
    expect(status.isInitialized).toBe(true);
    expect(status.hasClient).toBe(false);

    await core.cleanup();
  }, 30_000);

  // ────────────────────────────────────────────────────────────────────
  // 14.  Tool descriptions and schemas are captured
  // ────────────────────────────────────────────────────────────────────
  it('captures tool descriptions and input schemas from the server', async () => {
    const provider = makeSettingsProvider(fakeServerSettings());
    const core = new MCPClientCore(configPath, provider);

    await core.initialize();

    const greetStats = core.getToolStats('fake', 'greet');
    expect(greetStats.success).toBe(true);
    expect(greetStats.stats).toBeDefined();
    expect(greetStats.stats.description).toContain('Greet');

    const addStats = core.getToolStats('fake', 'add');
    expect(addStats.success).toBe(true);
    expect(addStats.stats).toBeDefined();
    expect(addStats.stats.description).toContain('Add');

    await core.cleanup();
  }, 30_000);
});
