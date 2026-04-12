# @headlamp-k8s/ai-library

Shared AI assistant, MCP (Model Context Protocol), and LangChain library for Headlamp.

This library provides the core AI infrastructure used by both the Headlamp desktop app (Electron) and the ai-assistant plugin.

## Modules

### MCP (`@headlamp-k8s/ai-library/mcp`)

Types and utilities for the Model Context Protocol:

- **Types**: `MCPSettings`, `MCPServer`, `MCPToolState`, `MCPServerToolState`, `MCPToolsConfig`
- **Utilities**: `expandEnvAndResolvePaths`, `settingsChanges`, `parseServerNameToolName`, `validateToolArgs`, `summarizeMcpToolStateChanges`

### LangChain (`@headlamp-k8s/ai-library/langchain`)

LangChain integration for AI-powered Kubernetes management:

- **LangChainManager**: Main manager class for LangChain-based AI interactions
- **Prompt Templates**: Reusable prompt templates for Kubernetes operations
- **Output Parsers**: Structured output parsers for AI responses
- **Tools**: Tool management, orchestration, and Kubernetes-specific tools
- **Formatters**: MCP output formatting utilities

### AI (`@headlamp-k8s/ai-library/ai`)

AI manager and configuration:

- **AIManager**: Abstract base class for AI manager implementations
- **ElectronMCPClient**: Client for MCP operations in the Electron environment
- **Prompts**: System prompts for the AI assistant

## Usage

```typescript
// Import MCP types and utilities
import { MCPSettings, validateToolArgs } from '@headlamp-k8s/ai-library';

// Import from specific submodules
import { LangChainManager } from '@headlamp-k8s/ai-library/langchain';
import { ElectronMCPClient } from '@headlamp-k8s/ai-library/ai';
```

## Building

```bash
npm install
npm run build
```
