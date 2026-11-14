/*
 * Copyright 2026 The Kubernetes Authors
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

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { applyManagedBackendPolicy, loadManagedPolicy } from './managedPolicy';

const temporaryDirectories: string[] = [];

function temporaryDirectory(): string {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'headlamp-policy-'));
  temporaryDirectories.push(directory);
  return directory;
}

afterEach(() => {
  temporaryDirectories
    .splice(0)
    .forEach(directory => fs.rmSync(directory, { recursive: true, force: true }));
});

describe('managed desktop policy', () => {
  it('loads Windows registry policy and materializes admin settings', () => {
    const run = vi.fn(() =>
      Buffer.from(
        '    PolicyJSON    REG_SZ    {"defaults":{"theme":"dark"},"backend":{"log-level":"warn"}}'
      )
    ) as any;
    const directory = temporaryDirectory();

    const policy = loadManagedPolicy({
      platform: 'win32',
      env: {},
      userDataPath: directory,
      run,
    });

    expect(policy.source).toBe('windows-registry');
    expect(policy.backend).toEqual({ 'log-level': 'warn' });
    expect(JSON.parse(fs.readFileSync(policy.adminSettingsPath!, 'utf8'))).toEqual({
      defaults: { theme: 'dark' },
    });
  });

  it('loads multiline JSON from a Windows registry value', () => {
    const run = vi.fn(() =>
      Buffer.from(
        '    PolicyJSON    REG_SZ    {\n      "backend": {\n        "log-level": "warn"\n      }\n    }'
      )
    ) as any;

    const policy = loadManagedPolicy({
      platform: 'win32',
      env: {},
      userDataPath: temporaryDirectory(),
      run,
    });

    expect(policy.backend).toEqual({ 'log-level': 'warn' });
  });

  it('rejects malformed enterprise policy instead of falling back', () => {
    expect(() =>
      loadManagedPolicy({
        platform: 'win32',
        env: {},
        userDataPath: temporaryDirectory(),
        run: vi.fn(() => Buffer.from('PolicyJSON    REG_SZ    []')) as any,
      })
    ).toThrow(/must contain a JSON object/);

    expect(() =>
      loadManagedPolicy({
        platform: 'darwin',
        env: {},
        userDataPath: temporaryDirectory(),
        run: vi.fn(() => 'not-json') as any,
      })
    ).toThrow(/must contain a JSON object/);
  });

  it('loads a macOS managed preference', () => {
    const run = vi.fn(() => '{"backend":{"cache-enabled":true}}') as any;

    const policy = loadManagedPolicy({
      platform: 'darwin',
      env: {},
      userDataPath: temporaryDirectory(),
      run,
    });

    expect(policy.source).toBe('macos-managed-preferences');
    expect(policy.backend).toEqual({ 'cache-enabled': true });
  });

  it('passes an invalid explicit file to the backend for fail-closed validation', () => {
    const directory = temporaryDirectory();
    const filename = path.join(directory, 'invalid.json');
    fs.writeFileSync(filename, 'not json');

    const policy = loadManagedPolicy({
      platform: 'win32',
      env: { HEADLAMP_ADMIN_SETTINGS: filename },
      userDataPath: directory,
      run: vi.fn() as any,
    });

    expect(policy.source).toBe('environment');
    expect(policy.adminSettingsPath).toBe(filename);
  });

  it('keeps backend policy out of the browser admin settings document', () => {
    const directory = temporaryDirectory();
    const filename = path.join(directory, 'policy.json');
    fs.writeFileSync(filename, '{"defaults":{"theme":"dark"},"backend":{"log-level":"warn"}}');

    const policy = loadManagedPolicy({
      platform: 'linux',
      env: { HEADLAMP_ADMIN_SETTINGS: filename },
      userDataPath: directory,
    });

    expect(JSON.parse(fs.readFileSync(policy.adminSettingsPath!, 'utf8'))).toEqual({
      defaults: { theme: 'dark' },
    });
  });

  it('applies command line, environment, policy, then default precedence', () => {
    const result = applyManagedBackendPolicy(
      {
        source: 'windows-registry',
        backend: {
          'log-level': 'warn',
          'cache-enabled': true,
          'watch-plugins-changes': false,
        },
      },
      { HEADLAMP_CONFIG_CACHE_ENABLED: 'false' },
      ['--log-level=debug']
    );

    expect(result.environment.HEADLAMP_CONFIG_CACHE_ENABLED).toBe('false');
    expect(result.environment.HEADLAMP_CONFIG_WATCH_PLUGINS_CHANGES).toBe('false');
    expect(result.environment.HEADLAMP_CONFIG_LOG_LEVEL).toBeUndefined();
    expect(result.diagnostics).toEqual(
      expect.arrayContaining([
        { key: 'backend.log-level', source: 'command-line' },
        { key: 'backend.cache-enabled', source: 'environment' },
        { key: 'backend.watch-plugins-changes', source: 'windows-registry' },
        { key: 'backend.pod-debug-image', source: 'default' },
      ])
    );
  });

  it('ignores backend options outside the allowlist or with the wrong type', () => {
    const result = applyManagedBackendPolicy(
      {
        source: 'managed-file',
        backend: { 'listen-addr': '0.0.0.0', 'cache-enabled': 'yes' },
      },
      {},
      []
    );

    expect(result.environment).toEqual({});
  });

  it('treats a null backend policy as empty', () => {
    const directory = temporaryDirectory();
    const filename = path.join(directory, 'policy.json');
    fs.writeFileSync(filename, '{"backend":null}');

    const policy = loadManagedPolicy({
      platform: 'linux',
      env: { HEADLAMP_ADMIN_SETTINGS: filename },
      userDataPath: directory,
    });

    expect(policy.backend).toEqual({});
    expect(() => applyManagedBackendPolicy(policy, {}, [])).not.toThrow();
  });
});
