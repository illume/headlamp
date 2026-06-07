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
 * AKS agent prompt construction and shell-escaping utilities.
 *
 * Pure business logic — no headlamp-plugin dependency.
 */

/**
 * Escape a string for safe use inside a bash single-quoted argument.
 * Single quotes prevent all shell interpretation (no variable expansion,
 * no command substitution). The only special case is the single quote
 * itself, which is handled by ending the string, adding an escaped
 * single quote, and starting a new single-quoted string.
 */
export function shellEscapeSingleQuote(s: string): string {
  return "'" + s.replace(/'/g, "'\\''") + "'";
}

/**
 * Base system prompt prepended before every AKS agent question.
 * Instructs the LLM to return all code inside markdown code blocks and
 * to honour the conversation history that follows.
 */
export const BASE_AKS_AGENT_PROMPT = `IMPORTANT INSTRUCTIONS:
- ALWAYS wrap code in a raw markdown code block with the correct language tag. This applies to ALL code types including yaml, json, bash, sh, python, dockerfile, go, javascript, typescript, hcl, toml, ini, xml, sql, and any other language or configuration format.
- NEVER output bare/unformatted code outside a code block.

✓ Correct:
\`\`\`yaml
apiVersion: v1
kind: Pod
\`\`\`

✗ Wrong:
apiVersion: v1
kind: Pod

✓ Correct:
\`\`\`python
import yaml
config = yaml.safe_load(data)
\`\`\`

✗ Wrong:
import yaml
config = yaml.safe_load(data)

- The conversation history below shows all previously asked questions and your answers. Keep that context in mind and answer accordingly — do not repeat information already provided unless the user explicitly asks for it.
`;

/** Represents a single exchange (question + answer) from the conversation history. */
export interface ConversationEntry {
  /** Origin of the conversation entry. */
  role: 'user' | 'assistant';
  /** Message text for this turn. */
  content: string;
}

/**
 * Builds the full prompt sent to the AKS agent:
 *   BASE_AKS_AGENT_PROMPT + conversation history + current question
 */
export function buildEnrichedPrompt(
  question: string,
  conversationHistory: ConversationEntry[]
): string {
  let enriched = BASE_AKS_AGENT_PROMPT;

  // Append prior conversation turns so the agent has full context
  if (conversationHistory.length > 0) {
    enriched += '\n--- CONVERSATION HISTORY ---\n';
    for (const entry of conversationHistory) {
      const label = entry.role === 'user' ? 'User' : 'Assistant';
      enriched += `${label}: ${entry.content}\n\n`;
    }
    enriched += '--- END OF CONVERSATION HISTORY ---\n\n';
  }

  enriched += `Now answer the following new question:\n${question}`;
  return enriched;
}
