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

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { createMockTestingModel } from '../mock-testing-model/MockTestingModel';
import { SkillLoader, SkillFileSystem } from './SkillLoader';
import { SkillManager } from './SkillManager';
import { SkillsConfig, DEFAULT_SKILLS_CONFIG } from './SkillConfigManager';
import { formatSkillsForPrompt, parseSkillFile } from './skillParser';

/**
 * Creates a real Node.js filesystem adapter for SkillLoader.
 */
function createNodeFs(): SkillFileSystem {
  return {
    exists: async (p: string) => fs.existsSync(p),
    readdir: async (p: string) => fs.readdirSync(p),
    readFile: async (p: string) => fs.readFileSync(p, 'utf-8'),
    isDirectory: async (p: string) => fs.statSync(p).isDirectory(),
    joinPath: (...segments: string[]) => path.join(...segments),
  };
}

describe('Skills e2e — filesystem loading with mock model', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'skills-e2e-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  // ──────────────────────────────────────────────────────────────────────
  // Helper: write a skill file into the temp directory tree
  // ──────────────────────────────────────────────────────────────────────
  function writeSkill(relPath: string, content: string) {
    const fullPath = path.join(tmpDir, relPath);
    fs.mkdirSync(path.dirname(fullPath), { recursive: true });
    fs.writeFileSync(fullPath, content, 'utf-8');
  }

  // ──────────────────────────────────────────────────────────────────────
  // 1. Load a single SKILL.md from a directory
  // ──────────────────────────────────────────────────────────────────────
  it('loads a SKILL.md from a flat directory', async () => {
    writeSkill(
      'my-skills/SKILL.md',
      `---
name: greeting-skill
description: Teaches the assistant to greet users warmly
tags: [greeting, demo]
---

# Greeting Skill

When the user says hello, respond warmly and mention Kubernetes.
`
    );

    const loader = new SkillLoader(createNodeFs());
    const skills = await loader.loadFromDirectory(path.join(tmpDir, 'my-skills'));

    expect(skills).toHaveLength(1);
    expect(skills[0].metadata.name).toBe('greeting-skill');
    expect(skills[0].metadata.tags).toEqual(['greeting', 'demo']);
    expect(skills[0].content).toContain('Greeting Skill');
    expect(skills[0].contentSizeBytes).toBeGreaterThan(0);
  });

  // ──────────────────────────────────────────────────────────────────────
  // 2. Load multiple skills from subdirectories (agentskills.io layout)
  // ──────────────────────────────────────────────────────────────────────
  it('loads skills from nested subdirectories', async () => {
    writeSkill(
      'skills/troubleshooting/SKILL.md',
      `---
name: troubleshooting
description: K8s troubleshooting guide
version: 1.0.0
---

# Troubleshooting

Check pod logs first.
`
    );

    writeSkill(
      'skills/security/SKILL.md',
      `---
name: security
description: Security best practices
version: 2.0.0
---

# Security

Use RBAC always.
`
    );

    const loader = new SkillLoader(createNodeFs());
    const skills = await loader.loadFromDirectory(path.join(tmpDir, 'skills'));

    expect(skills).toHaveLength(2);
    const names = skills.map(s => s.metadata.name).sort();
    expect(names).toEqual(['security', 'troubleshooting']);
  });

  // ──────────────────────────────────────────────────────────────────────
  // 3. Load .instructions.md files (GitHub Copilot format)
  // ──────────────────────────────────────────────────────────────────────
  it('loads .instructions.md files from a directory', async () => {
    writeSkill(
      'instructions/coding-style.instructions.md',
      'Always use TypeScript strict mode and prefer const over let.'
    );

    writeSkill(
      'instructions/testing.instructions.md',
      `---
name: testing-rules
description: Testing conventions
---

Use vitest for all tests. Write descriptive test names.
`
    );

    const loader = new SkillLoader(createNodeFs());
    const skills = await loader.loadFromDirectory(path.join(tmpDir, 'instructions'));

    expect(skills).toHaveLength(2);

    const codingStyle = skills.find(s => s.metadata.name === 'coding-style');
    expect(codingStyle).toBeDefined();
    expect(codingStyle!.content).toContain('TypeScript strict mode');

    const testing = skills.find(s => s.metadata.name === 'testing-rules');
    expect(testing).toBeDefined();
    expect(testing!.content).toContain('vitest');
  });

  // ──────────────────────────────────────────────────────────────────────
  // 4. Well-known directories (.github/skills, .claude/skills, etc.)
  // ──────────────────────────────────────────────────────────────────────
  it('scans well-known skill directories from a project root', async () => {
    writeSkill(
      'project/.github/skills/SKILL.md',
      `---
name: copilot-skill
description: From .github/skills
---
Copilot content
`
    );

    writeSkill(
      'project/.claude/skills/SKILL.md',
      `---
name: claude-skill
description: From .claude/skills
---
Claude content
`
    );

    writeSkill(
      'project/.github/instructions/style.instructions.md',
      'Use 2-space indentation.'
    );

    const loader = new SkillLoader(createNodeFs());
    const skills = await loader.loadFromWellKnownDirs(path.join(tmpDir, 'project'));

    expect(skills.length).toBeGreaterThanOrEqual(3);
    const names = skills.map(s => s.metadata.name);
    expect(names).toContain('copilot-skill');
    expect(names).toContain('claude-skill');
    expect(names).toContain('style');
  });

  // ──────────────────────────────────────────────────────────────────────
  // 5. SkillManager full lifecycle: load → filter → inject into prompt
  // ──────────────────────────────────────────────────────────────────────
  it('SkillManager loads, filters, and generates prompt text', async () => {
    writeSkill(
      'skills-a/SKILL.md',
      `---
name: skill-alpha
description: Alpha skill
---
Alpha instructions for the assistant.
`
    );

    writeSkill(
      'skills-b/SKILL.md',
      `---
name: skill-beta
description: Beta skill
---
Beta instructions for the assistant.
`
    );

    const manager = new SkillManager(createNodeFs());
    const config: SkillsConfig = {
      ...DEFAULT_SKILLS_CONFIG,
      sources: [
        { type: 'local', url: path.join(tmpDir, 'skills-a'), enabled: true },
        { type: 'local', url: path.join(tmpDir, 'skills-b'), enabled: true },
      ],
    };

    const all = await manager.loadAllSkills(config);
    expect(all).toHaveLength(2);

    // All enabled — both appear in prompt
    const promptAll = manager.getSkillsPromptText(config);
    expect(promptAll).toContain('skill-alpha');
    expect(promptAll).toContain('skill-beta');
    expect(promptAll).toContain('Alpha instructions');
    expect(promptAll).toContain('Beta instructions');
    expect(promptAll).toContain('<skill name="skill-alpha"');
    expect(promptAll).toContain('</skill>');

    // Disable one skill
    config.disabledSkills = ['skill-beta'];
    const promptFiltered = manager.getSkillsPromptText(config);
    expect(promptFiltered).toContain('skill-alpha');
    expect(promptFiltered).not.toContain('skill-beta');

    // Summary reflects the filter
    const summary = manager.getSkillsSummary(config);
    expect(summary.totalSkills).toBe(2);
    expect(summary.enabledSkills).toBe(1);
    expect(summary.totalSizeBytes).toBeGreaterThan(0);
  });

  // ──────────────────────────────────────────────────────────────────────
  // 6. Skills injected into system prompt used with mock model
  // ──────────────────────────────────────────────────────────────────────
  it('skills are injected into system prompt and reach the mock model', async () => {
    writeSkill(
      'nav-skill/SKILL.md',
      `---
name: headlamp-nav
description: Headlamp navigation guide
---

# Navigation
- Pods: Sidebar → Workloads → Pods
- Services: Sidebar → Network → Services
`
    );

    // Load skills and generate prompt
    const loader = new SkillLoader(createNodeFs());
    const skills = await loader.loadFromDirectory(path.join(tmpDir, 'nav-skill'));
    const skillsPrompt = formatSkillsForPrompt(skills);

    expect(skillsPrompt).toContain('SKILLS:');
    expect(skillsPrompt).toContain('headlamp-nav');
    expect(skillsPrompt).toContain('Pods: Sidebar');

    // Create mock model and send a query with the skills-augmented system prompt
    const model = createMockTestingModel();
    const systemPrompt = `You are a Kubernetes assistant.\n${skillsPrompt}`;

    const response = await model.invoke([
      new SystemMessage(systemPrompt),
      new HumanMessage('Hello'),
    ]);

    // The mock model should match the "Hello" fixture regardless of system prompt
    const content =
      typeof response.content === 'string'
        ? response.content
        : String(response.content);
    expect(content).toContain('Headlamp AI assistant');
  });

  // ──────────────────────────────────────────────────────────────────────
  // 7. Built-in skills load from the bundled .md files
  // ──────────────────────────────────────────────────────────────────────
  it('loads the built-in skills shipped with ai-common', () => {
    const builtinDir = path.resolve(__dirname, 'builtin');

    // Verify the built-in skill files exist
    expect(fs.existsSync(path.join(builtinDir, 'kubernetes-troubleshooting.md'))).toBe(true);
    expect(fs.existsSync(path.join(builtinDir, 'headlamp-navigation.md'))).toBe(true);
    expect(fs.existsSync(path.join(builtinDir, 'kubernetes-security.md'))).toBe(true);

    // Parse each one
    const files = ['kubernetes-troubleshooting.md', 'headlamp-navigation.md', 'kubernetes-security.md'];
    const skills = files.map(f => {
      const content = fs.readFileSync(path.join(builtinDir, f), 'utf-8');
      return parseSkillFile(content, path.join(builtinDir, f));
    });

    expect(skills).toHaveLength(3);
    expect(skills[0].metadata.name).toBe('kubernetes-troubleshooting');
    expect(skills[0].metadata.tags).toContain('troubleshooting');
    expect(skills[0].content).toContain('CrashLoopBackOff');

    expect(skills[1].metadata.name).toBe('headlamp-navigation');
    expect(skills[1].content).toContain('Sidebar');

    expect(skills[2].metadata.name).toBe('kubernetes-security');
    expect(skills[2].content).toContain('RBAC');

    // Format all three into a prompt
    const prompt = formatSkillsForPrompt(skills);
    expect(prompt).toContain('SKILLS:');
    expect(prompt).toContain('<skill name="kubernetes-troubleshooting"');
    expect(prompt).toContain('<skill name="headlamp-navigation"');
    expect(prompt).toContain('<skill name="kubernetes-security"');
  });

  // ──────────────────────────────────────────────────────────────────────
  // 8. Built-in skills with mock model — full pipeline
  // ──────────────────────────────────────────────────────────────────────
  it('built-in skills + mock model: full prompt injection pipeline', async () => {
    const builtinDir = path.resolve(__dirname, 'builtin');
    const files = fs.readdirSync(builtinDir).filter(f => f.endsWith('.md'));

    const skills = files.map(f => {
      const content = fs.readFileSync(path.join(builtinDir, f), 'utf-8');
      return parseSkillFile(content, path.join(builtinDir, f));
    });

    const skillsPrompt = formatSkillsForPrompt(skills);
    const systemPrompt = `You are a Kubernetes assistant.\n${skillsPrompt}`;

    // The system prompt should contain all three skill blocks
    expect(systemPrompt).toContain('<skill name="kubernetes-troubleshooting"');
    expect(systemPrompt).toContain('CrashLoopBackOff');
    expect(systemPrompt).toContain('RBAC');
    expect(systemPrompt).toContain('Sidebar');

    // Send queries through the mock model with this augmented prompt
    const model = createMockTestingModel();

    const r1 = await model.invoke([
      new SystemMessage(systemPrompt),
      new HumanMessage('What is a Pod?'),
    ]);
    expect(String(r1.content)).toContain('Pod');
    expect(String(r1.content)).toContain('Kubernetes resource');

    const r2 = await model.invoke([
      new SystemMessage(systemPrompt),
      new HumanMessage('What is a Deployment?'),
    ]);
    expect(String(r2.content)).toContain('Deployment');
  });

  // ──────────────────────────────────────────────────────────────────────
  // 9. Size budget enforcement
  // ──────────────────────────────────────────────────────────────────────
  it('enforces per-skill and total size budgets', async () => {
    // Create a skill that's too big for a tight budget
    const bigContent = 'x'.repeat(5000);
    writeSkill(
      'big/SKILL.md',
      `---
name: big-skill
description: A very large skill
---
${bigContent}
`
    );

    writeSkill(
      'small/SKILL.md',
      `---
name: small-skill
description: A small skill
---
Small content.
`
    );

    const manager = new SkillManager(createNodeFs());
    const config: SkillsConfig = {
      ...DEFAULT_SKILLS_CONFIG,
      sources: [
        { type: 'local', url: path.join(tmpDir, 'small'), enabled: true },
        { type: 'local', url: path.join(tmpDir, 'big'), enabled: true },
      ],
      maxTotalSkillSizeBytes: 100, // Very tight budget
    };

    const all = await manager.loadAllSkills(config);
    expect(all).toHaveLength(2);

    // The prompt should only include the small skill (big one exceeds budget)
    const prompt = manager.getSkillsPromptText(config);
    expect(prompt).toContain('small-skill');
    expect(prompt).not.toContain('big-skill');
  });

  // ──────────────────────────────────────────────────────────────────────
  // 10. Skips README.md and CONTRIBUTING.md
  // ──────────────────────────────────────────────────────────────────────
  it('ignores README.md and CONTRIBUTING.md', async () => {
    writeSkill('mixed/README.md', '# My Repo\nThis is a readme.');
    writeSkill('mixed/CONTRIBUTING.md', '# Contributing\nPlease contribute.');
    writeSkill(
      'mixed/SKILL.md',
      `---
name: real-skill
description: The actual skill
---
Real content.
`
    );

    const loader = new SkillLoader(createNodeFs());
    const skills = await loader.loadFromDirectory(path.join(tmpDir, 'mixed'));

    expect(skills).toHaveLength(1);
    expect(skills[0].metadata.name).toBe('real-skill');
  });

  // ──────────────────────────────────────────────────────────────────────
  // 11. Cache invalidation
  // ──────────────────────────────────────────────────────────────────────
  it('cache invalidation causes reload from disk', async () => {
    writeSkill(
      'evolving/SKILL.md',
      `---
name: evolving-skill
description: Will change
---
Version 1
`
    );

    const manager = new SkillManager(createNodeFs(), undefined, undefined, 60_000);
    const config: SkillsConfig = {
      ...DEFAULT_SKILLS_CONFIG,
      sources: [{ type: 'local', url: path.join(tmpDir, 'evolving'), enabled: true }],
    };

    const v1 = await manager.loadAllSkills(config);
    expect(v1[0].content).toBe('Version 1');

    // Update the file on disk
    writeSkill(
      'evolving/SKILL.md',
      `---
name: evolving-skill
description: Will change
---
Version 2
`
    );

    // Without invalidation, cache returns old content
    const cached = await manager.loadAllSkills(config);
    expect(cached[0].content).toBe('Version 1');

    // After invalidation, reload picks up new content
    manager.invalidateCache();
    const v2 = await manager.loadAllSkills(config);
    expect(v2[0].content).toBe('Version 2');
  });

  // ──────────────────────────────────────────────────────────────────────
  // 12. Disabled source is skipped entirely
  // ──────────────────────────────────────────────────────────────────────
  it('disabled sources are not loaded', async () => {
    writeSkill(
      'enabled/SKILL.md',
      `---
name: on-skill
description: Enabled
---
On
`
    );
    writeSkill(
      'disabled/SKILL.md',
      `---
name: off-skill
description: Disabled
---
Off
`
    );

    const manager = new SkillManager(createNodeFs());
    const config: SkillsConfig = {
      ...DEFAULT_SKILLS_CONFIG,
      sources: [
        { type: 'local', url: path.join(tmpDir, 'enabled'), enabled: true },
        { type: 'local', url: path.join(tmpDir, 'disabled'), enabled: false },
      ],
    };

    const all = await manager.loadAllSkills(config);
    expect(all).toHaveLength(1);
    expect(all[0].metadata.name).toBe('on-skill');
  });

  // ──────────────────────────────────────────────────────────────────────
  // 13. Mixed skill formats in one directory
  // ──────────────────────────────────────────────────────────────────────
  it('loads mixed SKILL.md and .instructions.md from one directory', async () => {
    writeSkill(
      'mixed-formats/SKILL.md',
      `---
name: standard-skill
description: Standard format
---
Standard content.
`
    );
    writeSkill(
      'mixed-formats/extra.instructions.md',
      'Always prefer declarative YAML over imperative commands.'
    );

    const loader = new SkillLoader(createNodeFs());
    const skills = await loader.loadFromDirectory(path.join(tmpDir, 'mixed-formats'));

    expect(skills).toHaveLength(2);
    const names = skills.map(s => s.metadata.name);
    expect(names).toContain('standard-skill');
    expect(names).toContain('extra');
  });
});

// ════════════════════════════════════════════════════════════════════════
// Vendored real-world skills — loaded directly from vendored SKILL.md files
// sourced from public open-source repositories.
// ════════════════════════════════════════════════════════════════════════

describe('Vendored real-world skills', () => {
  const vendoredDir = path.resolve(__dirname, 'vendored');

  // ──────────────────────────────────────────────────────────────────────
  // tldraw/tldraw — multi-skill repo with nested SKILL.md per skill
  // Source: https://github.com/tldraw/tldraw  (Apache-2.0)
  // ──────────────────────────────────────────────────────────────────────
  describe('tldraw/tldraw', () => {
    const tldrawDir = path.join(vendoredDir, 'tldraw');

    it('loads pr skill', () => {
      const raw = fs.readFileSync(path.join(tldrawDir, 'pr', 'SKILL.md'), 'utf-8');
      const skill = parseSkillFile(raw, 'tldraw/pr/SKILL.md');

      expect(skill.metadata.name).toBe('pr');
      expect(skill.metadata.description).toContain('pull request');
      expect(skill.content).toContain('Workflow');
      expect(skill.content).toContain('gh pr create');
      expect(skill.contentSizeBytes).toBeGreaterThan(100);
    });

    it('loads write-unit-tests skill', () => {
      const raw = fs.readFileSync(path.join(tldrawDir, 'write-unit-tests', 'SKILL.md'), 'utf-8');
      const skill = parseSkillFile(raw, 'tldraw/write-unit-tests/SKILL.md');

      expect(skill.metadata.name).toBe('write-unit-tests');
      expect(skill.metadata.description).toContain('Vitest');
      expect(skill.content).toContain('TestEditor');
    });

    it('loads issue skill', () => {
      const raw = fs.readFileSync(path.join(tldrawDir, 'issue', 'SKILL.md'), 'utf-8');
      const skill = parseSkillFile(raw, 'tldraw/issue/SKILL.md');

      expect(skill.metadata.name).toBe('issue');
      expect(skill.metadata.description).toContain('GitHub issue');
      expect(skill.content).toContain('gh issue create');
    });

    it('loads all tldraw skills from directory tree', async () => {
      const loader = new SkillLoader(createNodeFs());
      const skills = await loader.loadFromDirectory(tldrawDir);

      expect(skills.length).toBe(3);
      const names = skills.map(s => s.metadata.name).sort();
      expect(names).toEqual(['issue', 'pr', 'write-unit-tests']);
    });
  });

  // ──────────────────────────────────────────────────────────────────────
  // upstash/ratelimit-js — single SKILL.md with code examples
  // Source: https://github.com/upstash/ratelimit-js  (MIT)
  // ──────────────────────────────────────────────────────────────────────
  describe('upstash/ratelimit-js', () => {
    const upstashDir = path.join(vendoredDir, 'upstash-ratelimit');

    it('loads the ratelimit skill with code blocks', () => {
      const raw = fs.readFileSync(path.join(upstashDir, 'SKILL.md'), 'utf-8');
      const skill = parseSkillFile(raw, 'upstash/SKILL.md');

      expect(skill.metadata.name).toBe('upstash-ratelimit-ts');
      expect(skill.metadata.description).toContain('Rate Limit');
      expect(skill.content).toContain('@upstash/ratelimit');
      expect(skill.content).toContain('slidingWindow');
    });

    it('loads as a directory source', async () => {
      const loader = new SkillLoader(createNodeFs());
      const skills = await loader.loadFromDirectory(upstashDir);

      expect(skills).toHaveLength(1);
      expect(skills[0].metadata.name).toBe('upstash-ratelimit-ts');
    });
  });

  // ──────────────────────────────────────────────────────────────────────
  // alibaba/arthas — nested skills with Unicode (Chinese) content
  // Source: https://github.com/alibaba/arthas  (Apache-2.0)
  // ──────────────────────────────────────────────────────────────────────
  describe('alibaba/arthas', () => {
    const arthasDir = path.join(vendoredDir, 'arthas');

    it('loads the root arthas skill with Chinese content', () => {
      const raw = fs.readFileSync(path.join(arthasDir, 'SKILL.md'), 'utf-8');
      const skill = parseSkillFile(raw, 'arthas/SKILL.md');

      expect(skill.metadata.name).toBe('arthas');
      expect(skill.metadata.description).toContain('arthas');
      // Verify Unicode content is preserved
      expect(skill.content).toContain('诊断');
      expect(skill.content).toContain('CPU');
      expect(skill.contentSizeBytes).toBeGreaterThan(0);
    });

    it('loads the nested cpu-high sub-skill', () => {
      const raw = fs.readFileSync(path.join(arthasDir, 'cpu-high', 'SKILL.md'), 'utf-8');
      const skill = parseSkillFile(raw, 'arthas/cpu-high/SKILL.md');

      expect(skill.metadata.name).toBe('arthas-cpu-high');
      expect(skill.content).toContain('dashboard');
      expect(skill.content).toContain('thread');
    });

    it('loads all arthas skills from directory tree', async () => {
      const loader = new SkillLoader(createNodeFs());
      const skills = await loader.loadFromDirectory(arthasDir);

      expect(skills.length).toBe(2);
      const names = skills.map(s => s.metadata.name).sort();
      expect(names).toEqual(['arthas', 'arthas-cpu-high']);
    });
  });

  // ──────────────────────────────────────────────────────────────────────
  // Cross-repo: load all vendored skills together via SkillManager
  // ──────────────────────────────────────────────────────────────────────
  describe('all vendored skills together', () => {
    it('loads all vendored skills across repos via SkillManager', async () => {
      const manager = new SkillManager(createNodeFs());
      const config: SkillsConfig = {
        ...DEFAULT_SKILLS_CONFIG,
        sources: [
          { type: 'local', url: path.join(vendoredDir, 'tldraw'), enabled: true },
          { type: 'local', url: path.join(vendoredDir, 'upstash-ratelimit'), enabled: true },
          { type: 'local', url: path.join(vendoredDir, 'arthas'), enabled: true },
        ],
      };

      const all = await manager.loadAllSkills(config);
      expect(all.length).toBe(6); // 3 tldraw + 1 upstash + 2 arthas

      const names = all.map(s => s.metadata.name).sort();
      expect(names).toEqual([
        'arthas',
        'arthas-cpu-high',
        'issue',
        'pr',
        'upstash-ratelimit-ts',
        'write-unit-tests',
      ]);
    });

    it('generates a valid prompt from all vendored skills', async () => {
      const manager = new SkillManager(createNodeFs());
      const config: SkillsConfig = {
        ...DEFAULT_SKILLS_CONFIG,
        sources: [
          { type: 'local', url: path.join(vendoredDir, 'tldraw'), enabled: true },
          { type: 'local', url: path.join(vendoredDir, 'upstash-ratelimit'), enabled: true },
          { type: 'local', url: path.join(vendoredDir, 'arthas'), enabled: true },
        ],
      };

      await manager.loadAllSkills(config);
      const prompt = manager.getSkillsPromptText(config);

      // Prompt should contain all 6 skill blocks
      expect(prompt).toContain('SKILLS:');
      expect(prompt).toContain('<skill name="pr"');
      expect(prompt).toContain('<skill name="write-unit-tests"');
      expect(prompt).toContain('<skill name="issue"');
      expect(prompt).toContain('<skill name="upstash-ratelimit-ts"');
      expect(prompt).toContain('<skill name="arthas"');
      expect(prompt).toContain('<skill name="arthas-cpu-high"');
      expect(prompt).toContain('END OF SKILLS.');
    });

    it('can selectively disable vendored skills', async () => {
      const manager = new SkillManager(createNodeFs());
      const config: SkillsConfig = {
        ...DEFAULT_SKILLS_CONFIG,
        sources: [
          { type: 'local', url: path.join(vendoredDir, 'tldraw'), enabled: true },
          { type: 'local', url: path.join(vendoredDir, 'upstash-ratelimit'), enabled: true },
          { type: 'local', url: path.join(vendoredDir, 'arthas'), enabled: true },
        ],
        disabledSkills: ['pr', 'arthas-cpu-high'],
      };

      await manager.loadAllSkills(config);
      const prompt = manager.getSkillsPromptText(config);

      // Disabled skills should not appear
      expect(prompt).not.toContain('<skill name="pr"');
      expect(prompt).not.toContain('<skill name="arthas-cpu-high"');

      // Enabled skills should appear
      expect(prompt).toContain('<skill name="issue"');
      expect(prompt).toContain('<skill name="write-unit-tests"');
      expect(prompt).toContain('<skill name="upstash-ratelimit-ts"');
      expect(prompt).toContain('<skill name="arthas"');
    });

    it('sends all vendored skills through the mock model', async () => {
      const manager = new SkillManager(createNodeFs());
      const config: SkillsConfig = {
        ...DEFAULT_SKILLS_CONFIG,
        sources: [
          { type: 'local', url: path.join(vendoredDir, 'tldraw'), enabled: true },
          { type: 'local', url: path.join(vendoredDir, 'upstash-ratelimit'), enabled: true },
          { type: 'local', url: path.join(vendoredDir, 'arthas'), enabled: true },
        ],
      };

      await manager.loadAllSkills(config);
      const skillsPrompt = manager.getSkillsPromptText(config);
      const systemPrompt = `You are a Kubernetes assistant.\n${skillsPrompt}`;

      const model = createMockTestingModel();
      const response = await model.invoke([
        new SystemMessage(systemPrompt),
        new HumanMessage('Hello'),
      ]);

      const content = typeof response.content === 'string'
        ? response.content
        : String(response.content);
      expect(content).toContain('Headlamp AI assistant');
    });

    it('summary reflects correct counts across all vendored repos', async () => {
      const manager = new SkillManager(createNodeFs());
      const config: SkillsConfig = {
        ...DEFAULT_SKILLS_CONFIG,
        sources: [
          { type: 'local', url: path.join(vendoredDir, 'tldraw'), enabled: true },
          { type: 'local', url: path.join(vendoredDir, 'upstash-ratelimit'), enabled: true },
          { type: 'local', url: path.join(vendoredDir, 'arthas'), enabled: true },
        ],
        disabledSkills: ['pr'],
      };

      await manager.loadAllSkills(config);
      const summary = manager.getSkillsSummary(config);

      expect(summary.totalSkills).toBe(6);
      expect(summary.enabledSkills).toBe(5);
      expect(summary.totalSizeBytes).toBeGreaterThan(0);
    });
  });
});
