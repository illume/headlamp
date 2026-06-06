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
 * headlamp-ai CLI
 *
 * A command-line interface for querying AI models using the same
 * configuration as the Headlamp app and ai-assistant plugin.
 *
 * The CLI automatically discovers the Headlamp app's config directory
 * to load MCP settings. It also supports explicit config files,
 * CLI flags, and environment variables.
 *
 * Usage:
 *   headlamp-ai "What pods are running?"
 *   headlamp-ai --config ./ai-config.json "Explain Kubernetes services"
 *   echo "List namespaces" | headlamp-ai --provider openai --model gpt-4o
 *   headlamp-ai --interactive
 *
 * Config file format (same as ai-assistant plugin):
 *   {
 *     "provider": "openai",
 *     "config": {
 *       "apiKey": "sk-...",
 *       "model": "gpt-4o"
 *     },
 *     "mcp": {
 *       "enabled": true,
 *       "servers": [
 *         {
 *           "name": "my-server",
 *           "command": "npx",
 *           "args": ["-y", "@modelcontextprotocol/server-everything"],
 *           "enabled": true
 *         }
 *       ]
 *     }
 *   }
 *
 * Environment variables:
 *   HEADLAMP_AI_PROVIDER  - Provider ID (openai, anthropic, gemini, etc.)
 *   HEADLAMP_AI_MODEL     - Model name (gpt-4o, claude-sonnet-4-6, etc.)
 *   HEADLAMP_AI_API_KEY   - API key for the provider
 *   HEADLAMP_AI_BASE_URL  - Base URL for local/custom providers
 *   HEADLAMP_AI_CONFIG    - Path to config file
 */

import { ChatAnthropic } from '@langchain/anthropic';
import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { ChatDeepSeek } from '@langchain/deepseek';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { MultiServerMCPClient } from '@langchain/mcp-adapters';
import { ChatMistralAI } from '@langchain/mistralai';
import { ChatOllama } from '@langchain/ollama';
import { AzureChatOpenAI, ChatOpenAI } from '@langchain/openai';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as readline from 'readline';
import { createMockTestingModel } from '@headlamp-k8s/ai-common/mock-testing-model/MockTestingModel';

/**
 * CLI configuration format — compatible with the ai-assistant plugin's
 * StoredProviderConfig and the app's MCPSettings.
 */
interface CLIConfig {
  provider: string;
  config: Record<string, any>;
  mcp?: {
    enabled: boolean;
    servers: Array<{
      name: string;
      command: string;
      args: string[];
      enabled: boolean;
      env?: Record<string, string>;
    }>;
  };
  systemPrompt?: string;
}

const DEFAULT_SYSTEM_PROMPT = `You are a helpful AI assistant for Kubernetes management.
You help users understand and manage their Kubernetes clusters.
Be concise and precise in your responses.`;

/**
 * Get the Headlamp app data directory.
 *
 * Uses the same paths as Electron's app.getPath('userData') for the "Headlamp" app:
 * - Linux:   ~/.config/Headlamp/
 * - macOS:   ~/Library/Application Support/Headlamp/
 * - Windows: %APPDATA%/Headlamp/
 */
function getHeadlampDataDir(): string {
  switch (process.platform) {
    case 'win32':
      return path.join(
        process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming'),
        'Headlamp'
      );
    case 'darwin':
      return path.join(os.homedir(), 'Library', 'Application Support', 'Headlamp');
    default:
      return path.join(
        process.env.XDG_CONFIG_HOME || path.join(os.homedir(), '.config'),
        'Headlamp'
      );
  }
}

/**
 * Attempt to load MCP settings from the Headlamp app's config directory.
 * Returns the MCP config if found, or undefined.
 */
function loadAppMCPSettings(): CLIConfig['mcp'] | undefined {
  const dataDir = getHeadlampDataDir();
  const settingsPath = path.join(dataDir, 'mcp-tools-settings.json');

  try {
    if (!fs.existsSync(settingsPath)) {
      return undefined;
    }
    const content = fs.readFileSync(settingsPath, 'utf-8');
    const settings = JSON.parse(content);
    // The app stores MCP settings under the 'mcp' key in settings.json,
    // but mcp-tools-settings.json is the MCPSettings object directly.
    if (settings && typeof settings === 'object') {
      if (settings.servers) {
        return settings as CLIConfig['mcp'];
      }
      if (settings.mcp) {
        return settings.mcp as CLIConfig['mcp'];
      }
    }
    return undefined;
  } catch {
    return undefined;
  }
}

/**
 * Try to load AI provider config from the Headlamp app's config directory.
 * Checks for a headlamp-ai.json file in the data dir.
 */
function loadAppConfig(): CLIConfig | null {
  const dataDir = getHeadlampDataDir();
  const configPath = path.join(dataDir, 'headlamp-ai.json');

  try {
    if (!fs.existsSync(configPath)) {
      return null;
    }
    const content = fs.readFileSync(configPath, 'utf-8');
    return JSON.parse(content) as CLIConfig;
  } catch {
    return null;
  }
}

/**
 * Create a LangChain chat model from provider ID and config.
 * Uses the same provider/config format as the ai-assistant plugin.
 */
function createModel(providerId: string, config: Record<string, any>): BaseChatModel {
  switch (providerId) {
    case 'openai':
      if (!config.apiKey) throw new Error('API key is required for OpenAI');
      return new ChatOpenAI({
        apiKey: config.apiKey,
        model: config.model || 'gpt-4o',
      });
    case 'azure':
      if (!config.apiKey || !config.endpoint || !config.deploymentName) {
        throw new Error('apiKey, endpoint, and deploymentName are required for Azure OpenAI');
      }
      return new AzureChatOpenAI({
        azureOpenAIEndpoint: config.endpoint,
        azureOpenAIApiKey: config.apiKey,
        azureOpenAIApiDeploymentName: config.deploymentName,
        azureOpenAIApiVersion: '2025-04-01-preview',
        model: config.model || 'gpt-4o',
      });
    case 'anthropic':
      if (!config.apiKey) throw new Error('API key is required for Anthropic');
      return new ChatAnthropic({
        apiKey: config.apiKey,
        model: config.model || 'claude-sonnet-4-6',
      });
    case 'mistral':
      if (!config.apiKey) throw new Error('API key is required for Mistral AI');
      return new ChatMistralAI({
        apiKey: config.apiKey,
        model: config.model || 'mistral-large-latest',
      });
    case 'gemini':
      if (!config.apiKey) throw new Error('API key is required for Google Gemini');
      return new ChatGoogleGenerativeAI({
        apiKey: config.apiKey,
        model: config.model || 'gemini-2.5-flash',
      });
    case 'deepseek':
      if (!config.apiKey) throw new Error('API key is required for DeepSeek');
      return new ChatDeepSeek({
        apiKey: config.apiKey,
        model: config.model || 'deepseek-chat',
      });
    case 'local': {
      if (!config.baseUrl) throw new Error('Base URL is required for local models');
      const headers: Record<string, string> = {};
      if (config.apiKey) {
        headers['Authorization'] = `Bearer ${config.apiKey}`;
      }
      return new ChatOllama({
        baseUrl: config.baseUrl,
        model: config.model || 'llama3.1',
        headers: Object.keys(headers).length ? headers : undefined,
      });
    }
    case 'mock-testing-model':
      return createMockTestingModel({
        sequenceName: config.sequenceName,
        fixturesDir: config.fixturesDir,
        fallbackResponse: config.fallbackResponse,
      });
    default:
      throw new Error(
        `Unsupported provider: ${providerId}. ` +
          `Supported: openai, azure, anthropic, mistral, gemini, deepseek, local, mock-testing-model`
      );
  }
}

/**
 * Load config from a JSON file.
 */
function loadConfigFile(configPath: string): CLIConfig {
  const resolved = path.resolve(configPath);
  const content = fs.readFileSync(resolved, 'utf-8');
  return JSON.parse(content) as CLIConfig;
}

/**
 * Build config from environment variables.
 */
function configFromEnv(): CLIConfig | null {
  const provider = process.env.HEADLAMP_AI_PROVIDER;
  if (!provider) return null;

  return {
    provider,
    config: {
      apiKey: process.env.HEADLAMP_AI_API_KEY || '',
      model: process.env.HEADLAMP_AI_MODEL || '',
      baseUrl: process.env.HEADLAMP_AI_BASE_URL || '',
      endpoint: process.env.HEADLAMP_AI_ENDPOINT || '',
      deploymentName: process.env.HEADLAMP_AI_DEPLOYMENT_NAME || '',
    },
  };
}

/**
 * Initialize MCP tools from config, returns bound model with tools or null.
 */
async function initMCPTools(
  model: BaseChatModel,
  mcpConfig: CLIConfig['mcp']
): Promise<{ model: BaseChatModel; cleanup: () => Promise<void> }> {
  const noop = async () => {};
  if (!mcpConfig?.enabled || !mcpConfig.servers?.length) {
    return { model, cleanup: noop };
  }

  const mcpServers: Record<string, any> = {};
  for (const server of mcpConfig.servers) {
    if (!server.enabled || !server.name || !server.command) continue;
    mcpServers[server.name] = {
      transport: 'stdio',
      command: server.command,
      args: server.args || [],
      env: server.env ? { ...process.env, ...server.env } : (process.env as Record<string, string>),
      restart: { enabled: true, maxAttempts: 3, delayMs: 2000 },
    };
  }

  if (Object.keys(mcpServers).length === 0) {
    return { model, cleanup: noop };
  }

  const client = new MultiServerMCPClient({ mcpServers });
  const tools = client.getTools();
  if (!tools || (await tools).length === 0) {
    await client.close();
    return { model, cleanup: noop };
  }

  const boundModel = model.bindTools(await tools) as BaseChatModel;
  return {
    model: boundModel,
    cleanup: async () => {
      try {
        await client.close();
      } catch {
        // ignore close errors
      }
    },
  };
}

/**
 * Send a single query to the model and print the response.
 */
async function query(
  model: BaseChatModel,
  message: string,
  systemPrompt: string,
  history: Array<{ role: string; content: string }>
): Promise<string> {
  const messages: any[] = [new SystemMessage(systemPrompt)];

  // Add conversation history
  for (const msg of history) {
    if (msg.role === 'user') {
      messages.push(new HumanMessage(msg.content));
    } else {
      messages.push(new SystemMessage(msg.content));
    }
  }

  messages.push(new HumanMessage(message));

  const response = await model.invoke(messages);
  const content =
    typeof response.content === 'string'
      ? response.content
      : Array.isArray(response.content)
      ? response.content
          .filter((c: any) => c.type === 'text')
          .map((c: any) => c.text)
          .join('')
      : String(response.content);

  return content;
}

function printUsage() {
  const dataDir = getHeadlampDataDir();
  console.log(`headlamp-ai - CLI for Headlamp AI assistant

Usage:
  headlamp-ai [options] [query]

Options:
  --config <path>       Path to config JSON file
  --provider <id>       Provider: openai, anthropic, gemini, mistral, deepseek, local, mock-testing-model
  --model <name>        Model name (e.g. gpt-4o, claude-sonnet-4-6)
  --api-key <key>       API key for the provider
  --base-url <url>      Base URL for local/custom providers
  --system-prompt <p>   Custom system prompt
  --interactive, -i     Start interactive chat session
  --help, -h            Show this help message

Auto-discovered config paths (same as Headlamp app):
  ${path.join(dataDir, 'headlamp-ai.json')}     AI provider config
  ${path.join(dataDir, 'mcp-tools-settings.json')}   MCP server settings

Environment variables:
  HEADLAMP_AI_PROVIDER        Provider ID
  HEADLAMP_AI_MODEL           Model name
  HEADLAMP_AI_API_KEY         API key
  HEADLAMP_AI_BASE_URL        Base URL for local models
  HEADLAMP_AI_CONFIG          Path to config file
  HEADLAMP_AI_ENDPOINT        Azure endpoint
  HEADLAMP_AI_DEPLOYMENT_NAME Azure deployment name

Config file format:
  {
    "provider": "openai",
    "config": {
      "apiKey": "sk-...",
      "model": "gpt-4o"
    },
    "mcp": {
      "enabled": true,
      "servers": [{ "name": "srv", "command": "cmd", "args": [], "enabled": true }]
    }
  }

Examples:
  headlamp-ai --provider openai --api-key sk-... "What is a Pod?"
  headlamp-ai --config ./ai-config.json "Explain services"
  headlamp-ai -i --provider anthropic --api-key sk-ant-...
  echo "List resources" | headlamp-ai --config ./config.json`);
}

function parseArgs(argv: string[]): {
  configPath?: string;
  provider?: string;
  model?: string;
  apiKey?: string;
  baseUrl?: string;
  endpoint?: string;
  deploymentName?: string;
  systemPrompt?: string;
  interactive: boolean;
  help: boolean;
  query: string;
} {
  const result: ReturnType<typeof parseArgs> = {
    interactive: false,
    help: false,
    query: '',
  };

  const args = argv.slice(2); // skip node and script
  const queryParts: string[] = [];

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    switch (arg) {
      case '--config':
        result.configPath = args[++i];
        break;
      case '--provider':
        result.provider = args[++i];
        break;
      case '--model':
        result.model = args[++i];
        break;
      case '--api-key':
        result.apiKey = args[++i];
        break;
      case '--base-url':
        result.baseUrl = args[++i];
        break;
      case '--endpoint':
        result.endpoint = args[++i];
        break;
      case '--deployment-name':
        result.deploymentName = args[++i];
        break;
      case '--system-prompt':
        result.systemPrompt = args[++i];
        break;
      case '--interactive':
      case '-i':
        result.interactive = true;
        break;
      case '--help':
      case '-h':
        result.help = true;
        break;
      default:
        if (!arg.startsWith('--')) {
          queryParts.push(arg);
        }
        break;
    }
  }

  result.query = queryParts.join(' ');
  return result;
}

/**
 * Read all of stdin as a string (for piped input).
 */
async function readStdin(): Promise<string> {
  return new Promise(resolve => {
    let data = '';
    process.stdin.setEncoding('utf-8');
    process.stdin.on('data', chunk => {
      data += chunk;
    });
    process.stdin.on('end', () => resolve(data.trim()));
  });
}

/**
 * Run an interactive chat session.
 */
async function interactiveMode(model: BaseChatModel, systemPrompt: string) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const history: Array<{ role: string; content: string }> = [];

  console.log('Headlamp AI Assistant (interactive mode)');
  console.log('Type your questions. Press Ctrl+C or type "exit" to quit.\n');

  const askQuestion = () => {
    rl.question('You: ', async input => {
      const trimmed = input.trim();
      if (!trimmed || trimmed.toLowerCase() === 'exit' || trimmed.toLowerCase() === 'quit') {
        rl.close();
        return;
      }

      try {
        const response = await query(model, trimmed, systemPrompt, history);
        history.push({ role: 'user', content: trimmed });
        history.push({ role: 'assistant', content: response });
        console.log(`\nAssistant: ${response}\n`);
      } catch (error: any) {
        console.error(`\nError: ${error.message}\n`);
      }

      askQuestion();
    });
  };

  askQuestion();
}

async function main() {
  const parsed = parseArgs(process.argv);

  if (parsed.help) {
    printUsage();
    process.exit(0);
  }

  const dataDir = getHeadlampDataDir();
  const appConfigPath = path.join(dataDir, 'headlamp-ai.json');
  const mcpSettingsPath = path.join(dataDir, 'mcp-tools-settings.json');

  // Resolve configuration with priority: CLI flags > explicit config file > env vars > app config
  let config: CLIConfig | null = null;

  // 1. Try explicit config file (from flag or env)
  const configPath = parsed.configPath || process.env.HEADLAMP_AI_CONFIG;
  if (configPath) {
    try {
      config = loadConfigFile(configPath);
    } catch (error: any) {
      console.error(`Error loading config file: ${error.message}`);
      process.exit(1);
    }
  }

  // 2. Try env vars
  if (!config) {
    config = configFromEnv();
  }

  // 3. Try Headlamp app's config directory
  if (!config) {
    config = loadAppConfig();
    if (config) {
      console.error(`Using config from ${appConfigPath}`);
    }
  }

  // 4. Apply CLI flag overrides
  if (parsed.provider) {
    if (!config) config = { provider: parsed.provider, config: {} };
    else config.provider = parsed.provider;
  }
  if (parsed.model) {
    if (!config) config = { provider: 'openai', config: { model: parsed.model } };
    else config.config.model = parsed.model;
  }
  if (parsed.apiKey) {
    if (!config) config = { provider: 'openai', config: { apiKey: parsed.apiKey } };
    else config.config.apiKey = parsed.apiKey;
  }
  if (parsed.baseUrl) {
    if (!config) config = { provider: 'local', config: { baseUrl: parsed.baseUrl } };
    else config.config.baseUrl = parsed.baseUrl;
  }
  if (parsed.endpoint) {
    if (!config) config = { provider: 'azure', config: { endpoint: parsed.endpoint } };
    else config.config.endpoint = parsed.endpoint;
  }
  if (parsed.deploymentName) {
    if (!config) config = { provider: 'azure', config: { deploymentName: parsed.deploymentName } };
    else config.config.deploymentName = parsed.deploymentName;
  }

  if (!config || !config.provider) {
    console.error(
      'Error: No AI provider configured.\n' +
        'Use --provider, --config, or set HEADLAMP_AI_PROVIDER env var.\n' +
        `You can also place a config file at: ${appConfigPath}\n` +
        'Run with --help for usage information.'
    );
    process.exit(1);
  }

  // If no MCP config in explicit config, try loading from Headlamp app's settings
  if (!config.mcp) {
    const appMCP = loadAppMCPSettings();
    if (appMCP) {
      config.mcp = appMCP;
      console.error(`Using MCP settings from ${mcpSettingsPath}`);
    }
  }

  const systemPrompt = parsed.systemPrompt || config.systemPrompt || DEFAULT_SYSTEM_PROMPT;

  // Create the model
  let model: BaseChatModel;
  try {
    model = createModel(config.provider, config.config);
  } catch (error: any) {
    console.error(`Error creating model: ${error.message}`);
    process.exit(1);
  }

  // Initialize MCP tools if configured
  let mcpCleanup: (() => Promise<void>) | undefined;
  if (config.mcp) {
    try {
      const mcp = await initMCPTools(model, config.mcp);
      model = mcp.model;
      mcpCleanup = mcp.cleanup;
    } catch (error: any) {
      console.error(`Warning: Failed to initialize MCP tools: ${error.message}`);
    }
  }

  // Interactive mode
  if (parsed.interactive) {
    await interactiveMode(model, systemPrompt);
    await mcpCleanup?.();
    return;
  }

  // Get query from args or stdin
  let userQuery = parsed.query;
  if (!userQuery && !process.stdin.isTTY) {
    userQuery = await readStdin();
  }

  if (!userQuery) {
    console.error(
      'Error: No query provided.\n' +
        'Provide a query as an argument, pipe from stdin, or use --interactive mode.\n' +
        'Run with --help for usage information.'
    );
    await mcpCleanup?.();
    process.exit(1);
  }

  try {
    const response = await query(model, userQuery, systemPrompt, []);
    console.log(response);
  } catch (error: any) {
    console.error(`Error: ${error.message}`);
    await mcpCleanup?.();
    process.exit(1);
  }

  await mcpCleanup?.();
}

main()
  .then(() => {
    // Force exit to ensure MCP child processes don't keep the event loop alive
    process.exit(0);
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
