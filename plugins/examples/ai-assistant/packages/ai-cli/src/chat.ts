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

import LangChainManager from '@headlamp-k8s/ai-common/langchain/LangChainManager';
import * as readline from 'readline';
import { createKubectlTool } from './kubectl.js';

/**
 * Create a LangChainManager for the given provider and config.
 * This uses the same code path as the Headlamp UI, including
 * the generate()-based tool call extraction that handles the
 * Copilot API's multi-generation responses.
 * Binds a kubectl-backed Kubernetes tool for CLI use.
 *
 * @param allowMutations When false (default), the kubectl tool only permits GET.
 */
export async function createManager(
  providerId: string,
  config: Record<string, any>,
  options: { allowMutations?: boolean } = {}
): Promise<LangChainManager> {
  const manager = new LangChainManager(providerId, config);
  const kubectlTool = createKubectlTool({ readOnly: !options.allowMutations });
  await manager.enableDirectToolCalling([kubectlTool]);
  return manager;
}

/** Send one message via LangChainManager.userSend and return the text. */
export async function query(manager: LangChainManager, message: string): Promise<string> {
  const result = await manager.userSend(message);
  return result.content;
}

/** Run an interactive REPL session using LangChainManager. */
export async function interactiveMode(manager: LangChainManager): Promise<void> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

  console.log('Headlamp AI Assistant (interactive mode)');
  console.log('Type your questions. Press Ctrl+C or type "exit" to quit.\n');

  const ask = () => {
    rl.question('You: ', async input => {
      const trimmed = input.trim();
      if (!trimmed || ['exit', 'quit'].includes(trimmed.toLowerCase())) {
        rl.close();
        return;
      }
      try {
        const resp = await query(manager, trimmed);
        console.log(`\nAssistant: ${resp}\n`);
      } catch (err: any) {
        console.error(`\nError: ${err.message}\n`);
      }
      ask();
    });
  };

  ask();
}
