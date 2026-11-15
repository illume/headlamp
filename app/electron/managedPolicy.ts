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

import { execFileSync } from 'child_process';
import fs from 'node:fs';
import path from 'node:path';
import { getAdminSettingsName, getAdminSettingsPath } from './settings';

const WINDOWS_POLICY_KEY = String.raw`HKLM\Software\Policies`;
const MACOS_POLICY_DOMAIN = 'com.microsoft.Headlamp';
const POLICY_VALUE = 'PolicyJSON';
const POLICY_COMMAND_TIMEOUT_MS = 5000;

type PolicySource =
  | 'environment'
  | 'windows-registry'
  | 'macos-managed-preferences'
  | 'managed-file';
type PolicyValueSource = 'command-line' | 'environment' | PolicySource | 'default';

export interface ManagedPolicy {
  source?: PolicySource;
  adminSettingsPath?: string;
  backend: Record<string, unknown>;
}

export interface PolicyDiagnostic {
  key: string;
  source: PolicyValueSource;
}

const BACKEND_POLICY_TYPES: Record<string, 'boolean' | 'number' | 'string'> = {
  'cache-enabled': 'boolean',
  'default-dark-theme': 'string',
  'default-light-theme': 'string',
  'force-theme': 'string',
  'log-level': 'string',
  'node-shell-image': 'string',
  'node-shell-namespace': 'string',
  'pod-debug-image': 'string',
  'watch-plugins-changes': 'boolean',
};

function parsePolicy(raw: string, decodeManagedString = false): Record<string, any> | undefined {
  try {
    let parsed = JSON.parse(raw.trim());
    if (decodeManagedString && typeof parsed === 'string') {
      parsed = JSON.parse(parsed);
    }
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : undefined;
  } catch {
    return undefined;
  }
}

function readWindowsPolicy(
  run: typeof execFileSync,
  systemRoot: string,
  productName: string
): Record<string, any> | undefined {
  let output: string;
  try {
    output = String(
      run(
        path.win32.join(systemRoot, 'System32', 'reg.exe'),
        ['query', `${WINDOWS_POLICY_KEY}\\${getAdminSettingsName(productName)}`, '/v', POLICY_VALUE, '/reg:64'],
        {
          encoding: 'utf8',
          maxBuffer: 1024 * 1024,
          stdio: ['ignore', 'pipe', 'ignore'],
          timeout: POLICY_COMMAND_TIMEOUT_MS,
          windowsHide: true,
        }
      )
    );
  } catch {
    return undefined;
  }
  const match = output.match(/PolicyJSON\s+REG_(?:SZ|EXPAND_SZ)\s+([\s\S]+)$/);
  if (!match) {
    return undefined;
  }
  const policy = parsePolicy(match[1], true);
  if (!policy) {
    throw new Error('Windows managed PolicyJSON must contain a JSON object');
  }
  return policy;
}

function readMacOSPolicy(
  run: typeof execFileSync,
  appId: string
): Record<string, any> | undefined {
  let output: string;
  try {
    output = String(
      run(
        '/usr/bin/defaults',
        ['read', `/Library/Managed Preferences/${appId || MACOS_POLICY_DOMAIN}`, POLICY_VALUE],
        {
          encoding: 'utf8',
          maxBuffer: 1024 * 1024,
          stdio: ['ignore', 'pipe', 'ignore'],
          timeout: POLICY_COMMAND_TIMEOUT_MS,
        }
      )
    );
  } catch {
    return undefined;
  }
  const policy = parsePolicy(output, true);
  if (!policy) {
    throw new Error('macOS managed PolicyJSON must contain a JSON object');
  }
  return policy;
}

function readPolicyFile(filename: string): {
  exists: boolean;
  policy?: Record<string, any>;
} {
  try {
    return { exists: true, policy: parsePolicy(fs.readFileSync(filename, 'utf8')) };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return { exists: false };
    }
    throw error;
  }
}

function writeAdminSettings(
  policy: Record<string, any>,
  sourcePath: string | undefined,
  userDataPath: string
): string | undefined {
  if (sourcePath) {
    return sourcePath;
  }
  const adminSettings = { ...policy };
  delete adminSettings.backend;
  if (Object.keys(adminSettings).length === 0) {
    return undefined;
  }
  fs.mkdirSync(userDataPath, { recursive: true });
  const filename = path.join(userDataPath, 'managed-policy-settings.json');
  fs.writeFileSync(filename, JSON.stringify(adminSettings), { encoding: 'utf8', mode: 0o600 });
  return filename;
}

export function loadManagedPolicy(options: {
  platform?: NodeJS.Platform;
  env?: NodeJS.ProcessEnv;
  userDataPath: string;
  run?: typeof execFileSync;
  productName?: string;
  appId?: string;
}): ManagedPolicy {
  const platform = options.platform ?? process.platform;
  const env = options.env ?? process.env;
  const run = options.run ?? execFileSync;
  const productName = options.productName ?? 'Headlamp';
  const explicitPath = env.HEADLAMP_ADMIN_SETTINGS;
  const explicitResult = explicitPath
    ? readPolicyFile(explicitPath)
    : { exists: false, policy: undefined };
  const hasExplicitFile = explicitResult.exists;
  const explicitPolicy = explicitResult.policy;
  let policy = hasExplicitFile ? explicitPolicy ?? {} : undefined;
  let source: PolicySource | undefined = hasExplicitFile ? 'environment' : undefined;
  let invalidSourcePath = hasExplicitFile && !explicitPolicy ? explicitPath : undefined;

  if (!policy && platform === 'win32') {
    const systemRoot = path.win32.isAbsolute(env.SystemRoot ?? '')
      ? env.SystemRoot!
      : 'C:\\Windows';
    policy = readWindowsPolicy(run, systemRoot, productName);
    source = policy ? 'windows-registry' : undefined;
  } else if (!policy && platform === 'darwin') {
    policy = readMacOSPolicy(run, options.appId ?? MACOS_POLICY_DOMAIN);
    source = policy ? 'macos-managed-preferences' : undefined;
  }

  if (!policy) {
    const managedPath = getAdminSettingsPath(platform, {
      ...env,
      HEADLAMP_ADMIN_SETTINGS: undefined,
    }, productName);
    if (managedPath) {
      const fileResult = readPolicyFile(managedPath);
      const filePolicy = fileResult.policy;
      if (!fileResult.exists) {
        return { backend: {} };
      }
      policy = filePolicy ?? {};
      source = 'managed-file';
      invalidSourcePath = filePolicy ? undefined : managedPath;
    }
  }

  if (!policy) {
    return { backend: {} };
  }

  return {
    source,
    adminSettingsPath: writeAdminSettings(policy, invalidSourcePath, options.userDataPath),
    backend:
      policy.backend !== null &&
      typeof policy.backend === 'object' &&
      !Array.isArray(policy.backend)
        ? policy.backend
        : {},
  };
}

function environmentName(key: string): string {
  return `HEADLAMP_CONFIG_${key.replaceAll('-', '_').toUpperCase()}`;
}

function hasCommandLineValue(args: string[], key: string): boolean {
  return args.some((value, index) => {
    if (value === `--${key}` || value.startsWith(`--${key}=`)) {
      return true;
    }
    return index > 0 && args[index - 1] === `--${key}`;
  });
}

export function applyManagedBackendPolicy(
  policy: ManagedPolicy,
  environment: NodeJS.ProcessEnv,
  commandLine: string[]
): { environment: NodeJS.ProcessEnv; diagnostics: PolicyDiagnostic[] } {
  const result = { ...environment };
  const diagnostics: PolicyDiagnostic[] = [];

  for (const [key, expectedType] of Object.entries(BACKEND_POLICY_TYPES)) {
    const envName = environmentName(key);
    let source: PolicyValueSource = 'default';
    if (hasCommandLineValue(commandLine, key)) {
      source = 'command-line';
    } else if (environment[envName] !== undefined) {
      source = 'environment';
    } else if (typeof policy.backend[key] === expectedType) {
      result[envName] = String(policy.backend[key]);
      source = policy.source ?? 'managed-file';
    }
    diagnostics.push({ key: `backend.${key}`, source });
  }

  if (policy.adminSettingsPath && policy.source) {
    diagnostics.push({ key: 'settings', source: policy.source });
  }
  return { environment: result, diagnostics };
}

export function logPolicyDiagnostics(diagnostics: PolicyDiagnostic[]): void {
  for (const diagnostic of diagnostics) {
    console.info(`[managed-policy] ${diagnostic.key}: ${diagnostic.source}`);
  }
}
