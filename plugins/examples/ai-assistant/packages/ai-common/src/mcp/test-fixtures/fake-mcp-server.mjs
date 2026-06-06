#!/usr/bin/env node

/**
 * Fake MCP server for e2e testing.
 *
 * Exposes two tools over stdio:
 *   - greet(name: string) → "Hello, <name>!"
 *   - add(a: number, b: number) → { sum: <a+b> }
 *
 * Usage:
 *   node fake-mcp-server.mjs            # default: greet + add
 *   node fake-mcp-server.mjs --slow     # add tool sleeps 2 s (for timeout tests)
 *   node fake-mcp-server.mjs --fail     # add tool always throws
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

const args = process.argv.slice(2);
const slow = args.includes('--slow');
const fail = args.includes('--fail');

const server = new McpServer({
  name: 'fake-test-server',
  version: '1.0.0',
});

server.tool('greet', 'Greet a person by name', { name: z.string() }, async ({ name }) => {
  return { content: [{ type: 'text', text: `Hello, ${name}!` }] };
});

server.tool(
  'add',
  'Add two numbers',
  { a: z.number(), b: z.number() },
  async ({ a, b }) => {
    if (fail) {
      throw new Error('intentional failure for testing');
    }
    if (slow) {
      await new Promise(r => setTimeout(r, 2000));
    }
    return { content: [{ type: 'text', text: JSON.stringify({ sum: a + b }) }] };
  }
);

const transport = new StdioServerTransport();
await server.connect(transport);
