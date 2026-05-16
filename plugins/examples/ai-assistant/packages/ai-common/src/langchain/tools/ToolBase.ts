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

import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import { Prompt } from '../../ai/manager';

export interface ToolConfig {
  name: string;
  shortDescription: string;
  description: string;
  schema: z.ZodSchema;
}

export interface ToolResponse {
  content: string;
  shouldAddToHistory: boolean;
  shouldProcessFollowUp: boolean;
  metadata?: Record<string, any>;
}

export interface ToolHandler {
  (args: Record<string, any>, toolCallId?: string, pendingPrompt?: Prompt): Promise<ToolResponse>;
}

export abstract class ToolBase {
  abstract readonly config: ToolConfig;
  abstract handler: ToolHandler;

  createLangChainTool() {
    return tool(
      async args => {
        try {
          const response = await this.handler(args);
          // Return just the content for LangChain, metadata is handled by ToolManager
          return response.content;
        } catch (error) {
          console.error(`Error in ${this.config.name} tool:`, error);
          const message = error instanceof Error ? error.message : String(error);
          return JSON.stringify({
            error: true,
            message,
          });
        }
      },
      {
        name: this.config.name,
        description: this.config.description,
        schema: this.config.schema,
      }
    );
  }
}
