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

import { afterEach, beforeEach, describe, expect, it, type Mock, vi } from 'vitest';
import { loadSettings, saveSettings } from '../settings';
import { loadMCPSettings, saveMCPSettings } from './MCPSettings';
import * as MCP from './MCPSettings';

vi.mock('../settings', () => ({
  loadSettings: vi.fn(),
  saveSettings: vi.fn(),
}));

beforeEach(() => {
  vi.resetAllMocks();
});

describe('MCPSettings', () => {
  it('loadMCPSettings returns mcp settings when present', () => {
    const expected = {
      enabled: true,
      servers: [{ name: 's1', command: 'cmd', args: ['-v'], enabled: true }],
    };
    (loadSettings as Mock).mockReturnValue({ mcp: expected });

    const result = loadMCPSettings('/path/to/settings.json');

    expect(loadSettings).toHaveBeenCalledWith('/path/to/settings.json');
    expect(result).toEqual(expected);
  });

  it('loadMCPSettings returns null when no mcp settings', () => {
    (loadSettings as Mock).mockReturnValue({ other: 123 });

    const result = loadMCPSettings('/settings');

    expect(loadSettings).toHaveBeenCalledWith('/settings');
    expect(result).toBeNull();
  });

  it('saveMCPSettings sets mcp on loaded settings and calls saveSettings', () => {
    const existing = { someKey: 'value' };
    (loadSettings as Mock).mockReturnValue(existing);

    const newMCP = {
      enabled: false,
      servers: [{ name: 's', command: 'c', args: [], enabled: false }],
    };

    saveMCPSettings('/cfg', newMCP);

    expect(loadSettings).toHaveBeenCalledWith('/cfg');
    expect((existing as any).mcp).toBe(newMCP);
    expect(saveSettings).toHaveBeenCalledWith('/cfg', existing);
  });
});

describe('makeMcpServersFromSettings', () => {
  beforeEach(() => {
    process.env.TEST_ORIG_ENV = 'orig';
    vi.resetAllMocks();
  });

  afterEach(() => {
    delete process.env.TEST_ORIG_ENV;
  });

  it('returns empty when no mcp settings', () => {
    vi.spyOn(MCP, 'loadMCPSettings').mockReturnValue(null);

    const result = MCP.makeMcpServersFromSettings('/cfg', ['cluster1']);

    expect(result).toEqual({});
  });

  it('returns empty when mcp is disabled or has no servers', () => {
    vi.spyOn(MCP, 'loadMCPSettings').mockReturnValue({ enabled: false, servers: [] });
    expect(MCP.makeMcpServersFromSettings('/cfg', ['c'])).toEqual({});

    vi.spyOn(MCP, 'loadMCPSettings').mockReturnValue({ enabled: true, servers: [] });
    expect(MCP.makeMcpServersFromSettings('/cfg', ['c'])).toEqual({});
  });

  it('loads settings from file and delegates to makeMcpServers', () => {
    const mcpSettings = {
      enabled: true,
      servers: [
        {
          name: 'valid',
          command: 'cmd',
          args: ['arg1'],
          enabled: true,
          env: { MCP_VAR: 'mcp' },
        },
      ],
    };

    (loadSettings as Mock).mockReturnValue({ mcp: mcpSettings });

    const result = MCP.makeMcpServersFromSettings('/cfg', ['clusterA']);

    expect(result).toHaveProperty('valid');
    const entry = result['valid'] as any;
    expect(entry.transport).toBe('stdio');
    expect(entry.command).toBe('cmd');
    expect(entry.args).toEqual(['arg1']);
    expect(entry.env.MCP_VAR).toBe('mcp');
  });
});
