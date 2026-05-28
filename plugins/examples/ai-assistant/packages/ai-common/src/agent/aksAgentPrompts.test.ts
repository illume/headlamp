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

import { describe, expect, it } from 'vitest';
import {
  BASE_AKS_AGENT_PROMPT,
  buildEnrichedPrompt,
  shellEscapeSingleQuote,
} from './aksAgentPrompts';

describe('aksAgentPrompts', () => {
  describe('shellEscapeSingleQuote', () => {
    it('wraps strings without quotes in single quotes', () => {
      expect(shellEscapeSingleQuote('hello world')).toBe("'hello world'");
    });

    it('escapes embedded single quotes', () => {
      expect(shellEscapeSingleQuote("it's fine")).toBe("'it'\\''s fine'");
    });

    it('returns empty strings as an empty quoted string', () => {
      expect(shellEscapeSingleQuote('')).toBe("''");
    });

    it('escapes multiple single quotes', () => {
      expect(shellEscapeSingleQuote("a'b'c")).toBe("'a'\\''b'\\''c'");
    });
  });

  describe('buildEnrichedPrompt', () => {
    it('builds the base prompt with the new question when there is no history', () => {
      expect(buildEnrichedPrompt('How do I list pods?', [])).toBe(
        `${BASE_AKS_AGENT_PROMPT}Now answer the following new question:\nHow do I list pods?`
      );
    });

    it('includes labeled conversation history before the new question', () => {
      const prompt = buildEnrichedPrompt('What about deployments?', [
        { role: 'user', content: 'How do I list pods?' },
        { role: 'assistant', content: 'Use kubectl get pods.' },
      ]);

      expect(prompt).toContain('--- CONVERSATION HISTORY ---');
      expect(prompt).toContain('User: How do I list pods?');
      expect(prompt).toContain('Assistant: Use kubectl get pods.');
      expect(prompt).toContain('--- END OF CONVERSATION HISTORY ---');
      expect(prompt).toContain('Now answer the following new question:\nWhat about deployments?');
    });

    it('preserves user and assistant labels in order', () => {
      const prompt = buildEnrichedPrompt('Third question?', [
        { role: 'user', content: 'First question?' },
        { role: 'assistant', content: 'First answer.' },
        { role: 'user', content: 'Second question?' },
      ]);

      expect(prompt.indexOf('User: First question?')).toBeLessThan(
        prompt.indexOf('Assistant: First answer.')
      );
      expect(prompt.indexOf('Assistant: First answer.')).toBeLessThan(
        prompt.indexOf('User: Second question?')
      );
    });
  });
});
