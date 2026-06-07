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

import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import * as readline from 'readline';

export const DEFAULT_SYSTEM_PROMPT = `You are a helpful AI assistant for Kubernetes management.
You help users understand and manage their Kubernetes clusters.
Be concise and precise in your responses.`;

type History = Array<{ role: string; content: string }>;

/** Send one message and return the model's text response. */
export async function query(
  model: BaseChatModel,
  message: string,
  systemPrompt: string,
  history: History = []
): Promise<string> {
  const messages: any[] = [new SystemMessage(systemPrompt)];
  for (const msg of history) {
    messages.push(
      msg.role === 'user' ? new HumanMessage(msg.content) : new SystemMessage(msg.content)
    );
  }
  messages.push(new HumanMessage(message));

  const response = await model.invoke(messages);
  return typeof response.content === 'string'
    ? response.content
    : Array.isArray(response.content)
    ? response.content
        .filter((c: any) => c.type === 'text')
        .map((c: any) => c.text)
        .join('')
    : String(response.content);
}

/** Run an interactive REPL session. */
export async function interactiveMode(model: BaseChatModel, systemPrompt: string): Promise<void> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const history: History = [];

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
        const resp = await query(model, trimmed, systemPrompt, history);
        history.push({ role: 'user', content: trimmed });
        history.push({ role: 'assistant', content: resp });
        console.log(`\nAssistant: ${resp}\n`);
      } catch (err: any) {
        console.error(`\nError: ${err.message}\n`);
      }
      ask();
    });
  };

  ask();
}
