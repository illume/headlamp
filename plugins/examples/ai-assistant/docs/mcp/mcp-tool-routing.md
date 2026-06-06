# MCP Tool Routing

When many MCP servers expose dozens of tools, sending every tool schema to
the LLM wastes context and slows responses. MCP tool routing selects only
the tools relevant to each user query — the same approach used by the
[skills router](../skills/skills-router.md) for prompt-based skills.

## Architecture

```
User query
    │
    ├── MCPEmbeddingRouter (semantic, if configured)
    │       ↓ fallback on failure
    └── MCPToolRouter (keyword-based)
            │
            ▼
    Filtered tool list → bound to LLM via ToolManager
```

Two routers are available:

| Router | Module | How it works |
|--------|--------|-------------|
| **Keyword** | `MCPToolRouter` | Tokenise query and tool metadata, compute TF-based overlap score |
| **Embedding** | `MCPEmbeddingRouter` | Embed metadata at discovery time, embed query at request time, rank by cosine similarity. Falls back to keyword router on any failure |

Both accept an `MCPToolRouterConfig`:

```typescript
interface MCPToolRouterConfig {
  maxTools: number;   // default 10
  minScore: number;   // default 0.1
}
```

## Tool metadata used for routing

Each tool is represented as `MCPToolInfo`:

```typescript
interface MCPToolInfo {
  name: string;          // e.g. "kubectl-server__get_pods"
  description: string;   // from MCP server
  serverName: string;    // e.g. "kubectl-server"
  inputSchema?: Record<string, unknown>;
}
```

The search text is built from:
- Tool name (split on `__` and `_`)
- Server name
- Description
- Schema property names (e.g. `namespace`, `query`)

## Keyword router

```typescript
import { routeMCPTools, scoreMCPTools } from '@headlamp-k8s/ai-common/mcp/MCPToolRouter';

// Route: returns only the most relevant tools
const selected = routeMCPTools(userQuery, allTools, { maxTools: 5, minScore: 0.1 });

// Score: returns all tools with scores (for debugging / UI)
const scored = scoreMCPTools(userQuery, allTools);
```

Scoring uses the same TF algorithm as the skills keyword router:
1. Tokenise query → remove stop words → deduplicate
2. Tokenise tool metadata the same way
3. For each query token found in the tool tokens, add `1/queryLength`
4. Partial matches (substring containment) add `0.5/queryLength`
5. Clamp to `[0, 1]`

### When routing is skipped

If the number of available tools is ≤ `maxTools`, all tools are returned
without scoring. This avoids unnecessary work for small tool sets.

## Embedding router

Requires a LangChain `Embeddings` instance — any provider works
(OpenAI, Ollama, Azure, Cohere, etc.).

```typescript
import { MCPEmbeddingRouter } from '@headlamp-k8s/ai-common/mcp/MCPEmbeddingRouter';
import { OpenAIEmbeddings } from '@langchain/openai';

const embeddings = new OpenAIEmbeddings({ model: 'text-embedding-3-small' });
const router = new MCPEmbeddingRouter(embeddings);

// Index once after tool discovery
await router.indexTools(allTools);

// Route per query
const selected = await router.route(userQuery, allTools, { maxTools: 5, minScore: 0.1 });

// Debug scores
const scored = await router.scoreTools(userQuery);
```

### Design decisions

| Decision | Rationale |
|----------|-----------|
| Embed metadata, not full schemas | Schemas can be large; the routing signal is name + description |
| Embed at discovery time | Tool metadata rarely changes; only the short query is embedded per request |
| Automatic keyword fallback | Embedding failures (rate limit, network, missing model) never block the LLM call |

## Integration with ToolManager

`ToolManager` discovers MCP tools at initialisation and binds them to the
LangChain model. Routing can be applied before binding to reduce the
number of tools the model sees per query:

```typescript
import { routeMCPTools } from '@headlamp-k8s/ai-common/mcp/MCPToolRouter';

// Inside per-query logic
const allMCPTools = toolManager.getMCPTools();
const toolInfos = allMCPTools.map(t => ({
  name: t.name,
  description: t.description,
  serverName: t.name.split('__')[0],
}));

const relevant = routeMCPTools(userQuery, toolInfos, { maxTools: 8, minScore: 0.1 });
const relevantNames = new Set(relevant.map(t => t.name));

// Filter LangChain tools to only the relevant ones
const filteredTools = allMCPTools.filter(t => relevantNames.has(t.name));
```

## Comparison with skills routing

| Aspect | Skills router | MCP tool router |
|--------|--------------|----------------|
| Input data | Parsed markdown files with front-matter | MCP tool schemas from servers |
| Output | Prompt text injected into system message | Filtered tool list bound to model |
| Byte budget | Yes (`maxTotalBytes`) | No (tool schemas are small) |
| Embedding router | `EmbeddingRouter` | `MCPEmbeddingRouter` |
| Keyword router | `routeSkills()` | `routeMCPTools()` |

## API reference

### MCPToolRouter

| Export | Description |
|--------|-------------|
| `routeMCPTools(query, tools, config?)` | Route query → filtered tool list |
| `scoreMCPTools(query, tools)` | Score all tools (for debugging) |
| `buildToolSearchText(tool)` | Build searchable text from tool metadata |
| `tokenize(text)` | Tokenise text into unique lowercase tokens |
| `computeRelevanceScore(queryTokens, docTokens)` | TF-based score between token sets |

### MCPEmbeddingRouter

| Method | Description |
|--------|-------------|
| `constructor(embeddings)` | Create with any LangChain `Embeddings` instance |
| `indexTools(tools)` | Embed tool metadata (call once after discovery) |
| `route(query, tools, config?)` | Route query → filtered tool list |
| `scoreTools(query)` | Score all indexed tools |
| `clearIndex()` | Clear embedding cache |
| `hasIndex()` | Check if index is valid |

## Tests

```bash
cd plugins/examples/ai-assistant/packages/ai-common
npx vitest run src/mcp/MCPToolRouter.test.ts src/mcp/MCPEmbeddingRouter.test.ts
```

## References

- [LangChain Embeddings](https://js.langchain.com/docs/concepts/embedding_models/)
- [LangChain Dynamic Tool Selection](https://python.langchain.com/docs/how_to/custom_tools/)
- [Skills Router](../skills/skills-router.md) — the analogous system for prompt-based skills
