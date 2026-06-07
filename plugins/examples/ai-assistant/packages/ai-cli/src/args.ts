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

import * as path from 'path';
import { getHeadlampDataDir } from './config.js';

export interface ParsedArgs {
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
}

export function parseArgs(argv: string[]): ParsedArgs {
  const result: ParsedArgs = { interactive: false, help: false, query: '' };
  const args = argv.slice(2);
  const queryParts: string[] = [];

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
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
        if (!args[i].startsWith('--')) queryParts.push(args[i]);
    }
  }

  result.query = queryParts.join(' ');
  return result;
}

export function printUsage(): void {
  const dataDir = getHeadlampDataDir();
  console.log(`headlamp-ai - CLI for Headlamp AI assistant

Usage:
  headlamp-ai [options] [query]

Options:
  --config <path>       Path to config JSON file
  --provider <id>       Provider: openai, anthropic, gemini, mistral, deepseek, copilot, local, mock-testing-model
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

Examples:
  headlamp-ai --provider openai --api-key sk-... "What is a Pod?"
  headlamp-ai --config ./ai-config.json "Explain services"
  headlamp-ai -i --provider anthropic --api-key sk-ant-...
  echo "List resources" | headlamp-ai --config ./config.json`);
}

export async function readStdin(): Promise<string> {
  return new Promise(resolve => {
    let data = '';
    process.stdin.setEncoding('utf-8');
    process.stdin.on('data', chunk => {
      data += chunk;
    });
    process.stdin.on('end', () => resolve(data.trim()));
  });
}
