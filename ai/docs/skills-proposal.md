# Skills System for Headlamp AI Assistant

## Recommendation

**Support three skill types — prompt skills (Markdown documents), MCP skills (MCP server endpoints), and tool skills (TypeScript tool classes) — loaded from Git repositories, Helm values, or local directories. Prompt skills are the default for community contributions; MCP and tool skills require explicit admin approval.**

| Skill type | Format | Runtime | Trust level |
|------------|--------|---------|-------------|
| **Prompt skill** | Markdown document (`.md`) | Injected into system prompt | Low risk — no code execution |
| **MCP skill** | MCP server endpoint (HTTP/SSE) | Backend proxy (existing MCP infra) | Medium risk — tool calls go through approval |
| **Tool skill** | TypeScript `ToolBase` subclass | Compiled into plugin bundle | High risk — runs in browser/Node |

### Why this approach

- **Prompt skills are the safe default.** They contain only Markdown text — domain knowledge, procedures, troubleshooting guides — injected into the system prompt. No code runs. Community repos can publish these with minimal review burden.
- **MCP skills reuse the existing MCP infrastructure.** Headlamp already supports MCP servers (Electron stdio, backend HTTP proxy). Adding a skill that points to an MCP server is just adding a server entry — the approval, proxy, and permission-secret systems already handle security.
- **Tool skills are the most powerful but highest risk.** They compile into the plugin bundle and run in the browser or Node.js. Only pre-approved tools from trusted sources should be used.
- **Git-based distribution follows the Azure Skills and Flux agent-skills pattern.** Both Microsoft ([azure-skills](https://github.com/microsoft/azure-skills)) and the Flux project ([agent-skills](https://github.com/fluxcd/agent-skills)) distribute skills as files in Git repositories — Markdown docs, CLI tool references, and structured metadata.

### Alternatives considered

| Approach | Pros | Cons | Why not chosen |
|----------|------|------|----------------|
| **A. Three-tier skills** (chosen) | Graduated trust — text is safe, MCP is sandboxed, tools are explicit | Requires different handling per type | Risk is proportional to capability |
| **B. MCP-only skills** | Single protocol, reuses all existing infra | Can't add pure-knowledge skills without a server; overkill for "here's how to debug X" | Many useful skills are just domain knowledge (no tool calls needed) |
| **C. Plugin-only skills (npm packages)** | Full TypeScript power, familiar packaging | Every skill runs arbitrary code; npm supply-chain risk; heavyweight for simple prompts | Too much trust required for community contributions |
| **D. Marketplace with review** | Curated quality | Requires maintaining a review pipeline and registry; blocks community velocity | Headlamp is open-source; Git repos are the natural distribution channel |

---

## Skill types in detail

### 1. Prompt skills (Markdown documents)

A prompt skill is a Markdown file that provides domain knowledge to the AI assistant. It is injected into the system prompt, giving the LLM context about specific tools, platforms, or procedures.

**Format (compatible with Azure Skills convention):**

```
skills/
  azure-kubernetes/
    SKILL.md           # Metadata + entry point
    docs/
      troubleshooting.md
      best-practices.md
```

**SKILL.md structure:**

```markdown
---
name: azure-kubernetes
description: AKS cluster management guidance
version: 1.0.0
author: Microsoft
license: MIT
tags: [azure, aks, kubernetes]
---

# Azure Kubernetes Skills

Guide the AI assistant on Azure Kubernetes Service operations.

## Prompt

Include the contents of `docs/troubleshooting.md` and `docs/best-practices.md`
as context when the user asks about AKS.
```

**How it works:**
1. User adds a skill source (Git URL or local path) in Headlamp settings.
2. Headlamp fetches the repository and reads `SKILL.md` files.
3. The Markdown content is concatenated into the system prompt as additional context.
4. No code executes — pure text injection.

**Security:** Prompt injection is the main risk (see STRIDE analysis below). Mitigated by scoping skill content to a clearly-delimited section in the system prompt and by admin-only installation.

### 2. MCP skills (MCP server endpoints)

An MCP skill adds an MCP server that provides tools to the AI assistant. This reuses Headlamp's existing MCP infrastructure — the backend proxy, permission secrets, and tool approval flow.

**Format:**

```markdown
---
name: flux-gitops
description: GitOps operations via Flux MCP server
version: 2.0.0
author: Flux project
license: Apache-2.0
tags: [flux, gitops, kubernetes]
mcp:
  transport: http
  url: https://mcp.fluxcd.io/v1
  # Or for local: command: flux-operator-mcp, args: ["serve"]
---

# Flux GitOps Skills

Provides tools for managing Flux GitOps resources.
```

**How it works:**
1. Admin adds the skill source.
2. Headlamp reads the `mcp` section and registers the MCP server.
3. Tools from the MCP server appear in the tool approval UI.
4. Users approve/deny tool calls through the existing consent flow.

**Security:** Same security model as manually-configured MCP servers — backend proxy, permission secrets, tool approval. The skill just automates the server registration.

### 3. Tool skills (TypeScript tool classes)

A tool skill is a TypeScript class that extends `ToolBase` and compiles into the plugin bundle. This is the most powerful skill type — it can make API calls, process data, and interact with Kubernetes directly.

**Format:**

```typescript
// skills/cost-analyzer/CostAnalyzerTool.ts
import { ToolBase } from '@headlamp-k8s/ai/langchain';
import { z } from 'zod';

export class CostAnalyzerTool extends ToolBase {
  readonly config = {
    name: 'cost_analyzer',
    description: 'Analyze Kubernetes resource costs',
    schema: z.object({
      namespace: z.string().optional(),
    }),
  };

  async handler(args: { namespace?: string }) {
    // ... implementation
    return { content: 'Cost analysis results...' };
  }
}
```

**How it works:**
1. The tool class is imported and registered in the plugin's tool registry.
2. It compiles into the plugin bundle alongside the ai-assistant plugin.
3. At runtime, it goes through the same tool approval flow as built-in tools.

**Security:** Highest risk — runs arbitrary TypeScript. Only for first-party or explicitly trusted tools. Not suitable for community distribution without code review.

---

## Skill sources

Skills can be loaded from four sources, in order of trust:

| Source | Trust | Who manages | Example |
|--------|-------|-------------|---------|
| **Built-in** | Highest | Headlamp maintainers | `kubernetes_api_request` tool |
| **Local directory** | High | Cluster admin | `/etc/headlamp/skills/` |
| **Git repository** | Medium | Repo maintainers | `github.com/microsoft/azure-skills` |
| **Helm values** | High | Cluster admin | `ai.skills[]` in `values.yaml` |

### Git repository loading

```yaml
# Headlamp config or Helm values
ai:
  skills:
    sources:
      - url: https://github.com/microsoft/azure-skills
        ref: main
        path: skills/azure-kubernetes  # Optional: specific skill
        type: prompt                   # prompt | mcp
        enabled: true
      - url: https://github.com/fluxcd/agent-skills
        ref: v1.2.0                    # Pin to tag for stability
        path: skills/gitops-knowledge
        type: prompt
        enabled: true
```

**Fetching strategy:**
- **Desktop/headless:** Backend clones or fetches the repo at startup and on config change. Caches locally. Checks for updates periodically (configurable, default: daily).
- **In-cluster:** Init container or CronJob fetches repos into a shared volume. Skills ConfigMap is generated from the fetched content.
- **CLI:** Fetches at invocation time, caches in `~/.config/headlamp-ai/skills/`.

### High-quality repositories to support

| Repository | Type | Description |
|------------|------|-------------|
| [microsoft/azure-skills](https://github.com/microsoft/azure-skills) | Prompt | Azure service guidance (AKS, networking, etc.) |
| [fluxcd/agent-skills](https://github.com/fluxcd/agent-skills) | Prompt + MCP | GitOps knowledge, manifest generation, cluster debugging |
| [MicrosoftDocs/Agent-Skills](https://github.com/MicrosoftDocs/Agent-Skills) | Prompt | Azure cloud development skills |
| [kubernetes/website](https://github.com/kubernetes/website) | Prompt | Official K8s documentation (subset) |
| Custom enterprise repos | Any | Internal runbooks, compliance guides, custom tools |

---

## STRIDE security analysis

### Threat model scope

The system under analysis is: "Headlamp AI assistant loads skill definitions from external Git repositories and uses them to augment LLM behavior."

### S — Spoofing

| Threat | Scenario | Mitigation |
|--------|----------|------------|
| **S1. Repo impersonation** | Attacker creates `github.com/microsft/azure-skills` (typosquat) | UI shows full URL; admin manually enters URLs (no search/marketplace) |
| **S2. Compromised repo** | Maintainer account takeover pushes malicious content | Pin to Git tags/SHAs, not branches; verify GPG signatures when available |
| **S3. MITM on Git fetch** | Network attacker injects content during clone | HTTPS-only for Git URLs; reject HTTP |

### T — Tampering

| Threat | Scenario | Mitigation |
|--------|----------|------------|
| **T1. Prompt injection via skill content** | Malicious Markdown contains "Ignore previous instructions" | Delimit skill content in system prompt with clear boundaries; LLM guardrails; content-type validation (reject non-Markdown) |
| **T2. MCP server URL replacement** | Skill update changes MCP URL to attacker server | Show diff on skill update; require admin re-approval for URL/command changes |
| **T3. Local cache tampering** | Attacker modifies cached skill files on disk | File permissions (600); integrity checks (SHA-256 of fetched content stored in config) |

### R — Repudiation

| Threat | Scenario | Mitigation |
|--------|----------|------------|
| **R1. Untracked skill changes** | Admin can't tell which skills were active when an incident occurred | Log skill source URL + commit SHA + load timestamp; include in audit trail |
| **R2. Silent skill updates** | Skill auto-updates without admin knowledge | Require explicit approval for updates; show changelog in UI |

### I — Information Disclosure

| Threat | Scenario | Mitigation |
|--------|----------|------------|
| **I1. Skill content leaks cluster info** | Prompt skill designed to make LLM exfiltrate data via tool calls | Tool approval flow catches tool calls; prompt skills can't directly access data |
| **I2. MCP server receives sensitive data** | MCP tool call sends cluster secrets to external server | MCP tool approval shows full arguments before sending; admin reviews MCP server URLs |
| **I3. Git credentials in skill config** | Private repo credentials stored insecurely | Use credential helpers (Git credential store, K8s Secrets); never store tokens in skill config |

### D — Denial of Service

| Threat | Scenario | Mitigation |
|--------|----------|------------|
| **D1. Huge skill content** | Skill repo contains 100MB of Markdown, blows up system prompt | Max skill content size (configurable, default: 50KB per skill); truncate with warning |
| **D2. Many skills enabled** | 50 skills each adding 10KB = 500KB system prompt | Max total prompt skill content (configurable, default: 200KB); priority ordering |
| **D3. Slow Git fetch** | Repo is slow or unreachable, blocks startup | Async fetch with timeout (30s); use cached version if fetch fails; don't block UI |

### E — Elevation of Privilege

| Threat | Scenario | Mitigation |
|--------|----------|------------|
| **E1. Prompt skill escalates to tool calls** | Crafted prompt skill tricks LLM into calling dangerous tools | Tool approval flow is independent of prompt content; user must approve each tool call |
| **E2. MCP skill claims higher privileges** | MCP server metadata claims admin access | MCP tools go through same approval as any other tool; no privilege escalation path |
| **E3. Cross-skill interference** | One skill's prompt content influences another skill's behavior | Namespace skill content in system prompt; each skill gets its own delimited section |

### Security improvements from STRIDE findings

Based on the analysis above, the following controls are added to the design:

1. **HTTPS-only Git URLs** — reject `http://` and `git://` protocols.
2. **Pin to tags or SHAs** — default config uses tags, not branches. UI warns when using `main`/`master`.
3. **Content size limits** — 50KB per skill, 200KB total prompt content. Configurable by admin.
4. **Diff on update** — show what changed before applying skill updates.
5. **Audit logging** — log skill source, commit SHA, load time, and any errors.
6. **Prompt delimiting** — wrap each skill's content in clear boundaries:
   ```
   <skill name="azure-kubernetes" source="github.com/microsoft/azure-skills@v1.0">
   ... skill content ...
   </skill>
   ```
7. **Admin-only installation** — only cluster admins can add skill sources. Regular users can enable/disable individual skills from the approved set.
8. **Integrity checking** — store SHA-256 of fetched content; verify on load.

---

## UI proposal

### Skills settings page

The skills management UI lives in the AI Assistant settings (gear icon → Skills tab).

```
┌─────────────────────────────────────────────────────┐
│ AI Assistant Settings                            ✕  │
├──────────┬──────────────────────────────────────────│
│ Provider │                                          │
│ Skills   │  Skills                                  │
│ MCP      │                                          │
│          │  ┌─ Skill Sources ──────────────────────┐│
│          │  │                                      ││
│          │  │  📦 microsoft/azure-skills    v1.0 ✅ ││
│          │  │     azure-kubernetes ✅               ││
│          │  │     azure-networking ☐               ││
│          │  │                                      ││
│          │  │  📦 fluxcd/agent-skills    main ⚠️    ││
│          │  │     gitops-knowledge ✅               ││
│          │  │     gitops-cluster-debug ✅  (MCP)    ││
│          │  │                                      ││
│          │  │  [+ Add Skill Source]                 ││
│          │  └──────────────────────────────────────┘│
│          │                                          │
│          │  Total prompt size: 45KB / 200KB         │
│          │  Last updated: 2 hours ago  [↻ Refresh]  │
│          │                                          │
├──────────┴──────────────────────────────────────────│
│                            [Cancel]  [Save]         │
└─────────────────────────────────────────────────────┘
```

### Adding a skill source

```
┌────────────────────────────────────────────────┐
│ Add Skill Source                            ✕  │
│                                                │
│  Repository URL                                │
│  ┌────────────────────────────────────────────┐│
│  │ https://github.com/microsoft/azure-skills  ││
│  └────────────────────────────────────────────┘│
│                                                │
│  Version (tag, SHA, or branch)                 │
│  ┌────────────────────────────────────────────┐│
│  │ v1.0.0                                    ││
│  └────────────────────────────────────────────┘│
│                                                │
│  Path (optional — specific skill directory)    │
│  ┌────────────────────────────────────────────┐│
│  │ skills/azure-kubernetes                    ││
│  └────────────────────────────────────────────┘│
│                                                │
│  ⚠️  Using a branch (not a tag) means content  │
│     may change without notice.                 │
│                                                │
│                         [Cancel]  [Add Source]  │
└────────────────────────────────────────────────┘
```

### Skill detail view

Clicking a skill shows its content, metadata, and status:

```
┌────────────────────────────────────────────────┐
│ azure-kubernetes                            ✕  │
│                                                │
│  Author: Microsoft                             │
│  License: MIT                                  │
│  Version: 1.0.0                                │
│  Source: github.com/microsoft/azure-skills      │
│  Commit: a1b2c3d                               │
│  Size: 12KB                                    │
│  Type: Prompt skill                            │
│  Tags: azure, aks, kubernetes                  │
│                                                │
│  ── Preview ──────────────────────────────────  │
│  # Azure Kubernetes Skills                     │
│  Guide the AI assistant on Azure Kubernetes    │
│  Service operations...                         │
│  ──────────────────────────────────────────── │
│                                                │
│  [Disable]  [Remove]  [View on GitHub]         │
└────────────────────────────────────────────────┘
```

### UI design principles

1. **Progressive disclosure** — show sources first, then individual skills on expand.
2. **Trust indicators** — green checkmark for pinned versions, warning for branches, badge for verified publishers.
3. **Size budget** — always show how much of the prompt budget is used.
4. **Preview before enable** — users can read skill content before activating it.
5. **One-click disable** — individual skills can be toggled without removing the source.
6. **MCP skills are clearly labeled** — "(MCP)" badge distinguishes them from prompt-only skills.

---

## Implementation phases

### Phase 1: Prompt skills (lowest risk)
- Add `skills` config section to Headlamp settings.
- Implement Git fetching in the backend (Go) with caching.
- Inject skill content into system prompt with delimiters.
- Build settings UI for managing sources and individual skills.
- Support `SKILL.md` metadata parsing.

### Phase 2: MCP skills
- Extend `SKILL.md` format with `mcp:` section.
- Auto-register MCP servers from skill definitions.
- Reuse existing MCP proxy, approval, and permission-secret systems.
- Add "(MCP)" badge in skills UI.

### Phase 3: Skill updates and integrity
- Check for skill updates (daily by default).
- Show diff before applying updates.
- Store and verify content SHA-256.
- Audit logging of skill loads and changes.

### Phase 4: In-cluster skills
- Load skills from ConfigMap or shared volume.
- Helm `ai.skills` section for declarative skill configuration.
- Init container or CronJob for Git fetching.

### Phase 5: Tool skills (highest risk)
- Define `ToolSkill` interface extending `ToolBase`.
- Compile tool skills into the plugin bundle.
- Code review and signing requirements.
- Registry of trusted tool skill publishers.

---

## Open questions

1. **Should skills support private Git repos?** If yes, how are credentials managed? (Git credential helpers, K8s Secrets, OAuth tokens)
2. **Skill versioning conflicts** — what happens if two skill sources define the same skill name? (Namespace by source: `azure-skills/azure-kubernetes`)
3. **Skill dependencies** — can one skill depend on another? (Keep it simple: no dependencies for now)
4. **Rate limiting on Git fetches** — how to avoid hitting GitHub API rate limits? (Cache aggressively, use conditional requests with ETags)
5. **Skill-specific tool approval** — should skills be able to declare "this skill's tools are safe for auto-approval"? (No — approval is always user/admin controlled)
