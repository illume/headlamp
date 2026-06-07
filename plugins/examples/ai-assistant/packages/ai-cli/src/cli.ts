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
 * headlamp-ai CLI — thin entry point.
 *
 * Business logic lives in sibling modules:
 *   config.ts  — CLIConfig, Headlamp data-dir helpers, env/file loading
 *   model.ts   — model creation, Copilot sentinel resolution
 *   mcp.ts     — MCP tool initialisation
 *   chat.ts    — query() and interactiveMode()
 *   args.ts    — CLI argument parsing and usage text
 */

import * as path from 'path';
import { parseArgs, printUsage, readStdin } from './args.js';
import { DEFAULT_SYSTEM_PROMPT, interactiveMode, query } from './chat.js';
import {
  type CLIConfig,
  configFromEnv,
  getHeadlampDataDir,
  loadAppConfig,
  loadAppMCPSettings,
  loadConfigFile,
} from './config.js';
import { initMCPTools } from './mcp.js';
import { createModel, tryAutoDetectCopilot } from './model.js';

async function main() {
  const parsed = parseArgs(process.argv);
  if (parsed.help) {
    printUsage();
    process.exit(0);
  }

  const dataDir = getHeadlampDataDir();
  const appConfigPath = path.join(dataDir, 'headlamp-ai.json');
  const mcpSettingsPath = path.join(dataDir, 'mcp-tools-settings.json');

  let config: CLIConfig | null = null;

  const configFilePath = parsed.configPath || process.env.HEADLAMP_AI_CONFIG;
  if (configFilePath) {
    try {
      config = loadConfigFile(configFilePath);
    } catch (err: any) {
      console.error(`Error loading config file: ${err.message}`);
      process.exit(1);
    }
  }

  if (!config) config = configFromEnv();
  if (!config) {
    config = loadAppConfig();
    if (config) console.error(`Using config from ${appConfigPath}`);
  }

  // Apply CLI flag overrides
  if (parsed.provider) {
    config ??= { provider: parsed.provider, config: {} };
    config.provider = parsed.provider;
  }
  if (parsed.model) {
    config ??= { provider: 'openai', config: {} };
    config.config.model = parsed.model;
  }
  if (parsed.apiKey) {
    config ??= { provider: 'openai', config: {} };
    config.config.apiKey = parsed.apiKey;
  }
  if (parsed.baseUrl) {
    config ??= { provider: 'local', config: {} };
    config.config.baseUrl = parsed.baseUrl;
  }
  if (parsed.endpoint) {
    config ??= { provider: 'azure', config: {} };
    config.config.endpoint = parsed.endpoint;
  }
  if (parsed.deploymentName) {
    config ??= { provider: 'azure', config: {} };
    config.config.deploymentName = parsed.deploymentName;
  }

  if (!config?.provider) {
    const detected = await tryAutoDetectCopilot();
    if (detected) {
      console.error('Auto-detected GitHub Copilot via `gh auth token`.');
      config = detected as CLIConfig;
    }
  }

  if (!config?.provider) {
    console.error(
      `Error: No AI provider configured.\nUse --provider, --config, or HEADLAMP_AI_PROVIDER.\nConfig path: ${appConfigPath}\nRun --help for usage.`
    );
    process.exit(1);
  }

  if (!config.mcp) {
    const appMCP = loadAppMCPSettings();
    if (appMCP) {
      config.mcp = appMCP;
      console.error(`Using MCP settings from ${mcpSettingsPath}`);
    }
  }

  const systemPrompt = parsed.systemPrompt || config.systemPrompt || DEFAULT_SYSTEM_PROMPT;

  let model = await createModel(config.provider, config.config).catch((err: any) => {
    console.error(`Error creating model: ${err.message}`);
    process.exit(1);
  });

  let mcpCleanup: (() => Promise<void>) | undefined;
  if (config.mcp) {
    const mcp = await initMCPTools(model, config.mcp).catch((err: any) => {
      console.error(`Warning: MCP init failed: ${err.message}`);
      return null;
    });
    if (mcp) {
      model = mcp.model;
      mcpCleanup = mcp.cleanup;
    }
  }

  if (parsed.interactive) {
    await interactiveMode(model, systemPrompt);
    await mcpCleanup?.();
    return;
  }

  let userQuery = parsed.query;
  if (!userQuery && !process.stdin.isTTY) userQuery = await readStdin();
  if (!userQuery) {
    console.error(
      'Error: No query provided. Use --interactive or pipe from stdin. Run --help for usage.'
    );
    await mcpCleanup?.();
    process.exit(1);
  }

  try {
    console.log(await query(model, userQuery, systemPrompt, []));
  } catch (err: any) {
    console.error(`Error: ${err.message}`);
  }

  await mcpCleanup?.();
}

main()
  .then(() => process.exit(0))
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
