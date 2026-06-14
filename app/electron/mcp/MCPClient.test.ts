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

import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterEach, beforeEach, describe, expect, it, type Mock, vi } from 'vitest';
import MCPClient from './MCPClient';

function tmpPath(): string {
  return path.join(os.tmpdir(), `mcp-test-${Date.now()}-${Math.random()}.json`);
}

describe('MCPClient (Electron wrapper)', () => {
  let client: MCPClient;
  let infoSpy: Mock;

  let cfgPath: string;
  let settingsPath: string;

  beforeEach(() => {
    cfgPath = tmpPath();
    settingsPath = tmpPath();
    try {
      if (fs.existsSync(cfgPath)) fs.unlinkSync(cfgPath);
    } catch {
      // ignore
    }
    try {
      if (fs.existsSync(settingsPath)) fs.unlinkSync(settingsPath);
    } catch {
      // ignore
    }
  });

  afterEach(() => {
    try {
      if (fs.existsSync(cfgPath)) fs.unlinkSync(cfgPath);
    } catch {
      // ignore
    }
    try {
      if (fs.existsSync(settingsPath)) fs.unlinkSync(settingsPath);
    } catch {
      // ignore
    }
  });

  beforeEach(() => {
    client = new MCPClient(cfgPath, settingsPath);
    // spy on console.info to avoid noisy output and to assert calls
    infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {}) as unknown as Mock;
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('throws from handleClustersChange if not initialized', async () => {
    await expect(client.handleClustersChange(['cluster-a'])).rejects.toThrow(
      'MCPClientCore: not initialized'
    );
  });

  it('initialize is idempotent and logs exactly once', async () => {
    await client.initialize();
    await client.initialize(); // second call should be a no-op

    expect(infoSpy).toHaveBeenCalledTimes(1);
    expect(infoSpy).toHaveBeenCalledWith('MCPClientCore: initialized');
  });

  it('core is set after construction', () => {
    expect((client as any).core).not.toBeNull();
  });

  it('handleClustersChange resolves when initialized and logs clusters', async () => {
    await client.initialize();
    await expect(client.handleClustersChange(['cluster-1'])).resolves.toBeUndefined();

    expect(infoSpy).toHaveBeenCalledWith('MCPClientCore: clusters changed ->', ['cluster-1']);
  });

  it('setMainWindow accepts a BrowserWindow-like object and cleanup resets state', async () => {
    const fakeWin = { id: 42 } as unknown as Electron.BrowserWindow;

    await client.initialize();
    client.setMainWindow(fakeWin);

    await expect(client.handleClustersChange(['c-x'])).resolves.toBeUndefined();

    await client.cleanup();
    expect(infoSpy).toHaveBeenCalledWith('MCPClientCore: cleaned up');

    await expect(client.handleClustersChange(['after-cleanup'])).rejects.toThrow(
      'MCPClientCore: not initialized'
    );
  });

  it('cleanup is safe to call when not initialized', async () => {
    await expect(client.cleanup()).resolves.toBeUndefined();
    expect(infoSpy).not.toHaveBeenCalledWith('MCPClientCore: cleaned up');
  });

  it('handleClustersChange does nothing when clusters array is identical', async () => {
    await client.initialize();

    // First call sets currentClusters in the core
    await client.handleClustersChange(['same-cluster']);

    // Second call with identical clusters should be a no-op
    const core = (client as any).core;
    const closeSpy = vi.fn();
    core.client = { close: closeSpy };

    await client.handleClustersChange(['same-cluster']);
    expect(closeSpy).not.toHaveBeenCalled();
  });
});

describe('MCPClient logging behavior', () => {
  it('logs clusters change even when not initialized', async () => {
    const cfgPath = tmpPath();
    const client = new MCPClient(cfgPath, cfgPath);

    const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {}) as unknown as Mock;
    vi.spyOn(console, 'log').mockImplementation(() => {});

    await expect(client.handleClustersChange(['cluster-log'])).rejects.toThrow(
      'MCPClientCore: not initialized'
    );

    expect(infoSpy).toHaveBeenCalledWith('MCPClientCore: clusters changed ->', ['cluster-log']);

    infoSpy.mockRestore();
  });
});
