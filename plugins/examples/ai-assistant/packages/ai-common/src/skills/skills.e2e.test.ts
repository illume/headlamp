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
// Vendored real-world Kubernetes skills — loaded directly from vendored
// SKILL.md files sourced from public open-source repositories.
// ════════════════════════════════════════════════════════════════════════

describe('Vendored real-world Kubernetes skills', () => {
  const vendoredDir = path.resolve(__dirname, 'vendored');

  // ──────────────────────────────────────────────────────────────────────
  // kubeshark/kubeshark — network traffic analysis for Kubernetes
  // Source: https://github.com/kubeshark/kubeshark  (Apache-2.0)
  // ──────────────────────────────────────────────────────────────────────
  describe('kubeshark/kubeshark', () => {
    const kubesharkDir = path.join(vendoredDir, 'kubeshark');

    it('loads install skill', () => {
      const raw = fs.readFileSync(path.join(kubesharkDir, 'install', 'SKILL.md'), 'utf-8');
      const skill = parseSkillFile(raw, 'kubeshark/install/SKILL.md');

      expect(skill.metadata.name).toBe('install');
      expect(skill.metadata.description).toContain('Kubeshark');
      expect(skill.content).toContain('helm');
      expect(skill.content).toContain('kubeshark tap');
      expect(skill.contentSizeBytes).toBeGreaterThan(100);
    });

    it('loads network-rca skill (large real-world skill)', () => {
      const raw = fs.readFileSync(path.join(kubesharkDir, 'network-rca', 'SKILL.md'), 'utf-8');
      const skill = parseSkillFile(raw, 'kubeshark/network-rca/SKILL.md');

      expect(skill.metadata.name).toBe('network-rca');
      expect(skill.metadata.description).toContain('network');
      expect(skill.metadata.description).toContain('root cause');
      expect(skill.content).toContain('snapshot');
      expect(skill.content).toContain('KFL');
      // This is a large real-world skill — verify it parses within limits
      expect(skill.contentSizeBytes).toBeGreaterThan(5000);
      expect(skill.contentSizeBytes).toBeLessThan(50000);
    });

    it('loads all kubeshark skills from directory tree', async () => {
      const loader = new SkillLoader(createNodeFs());
      const skills = await loader.loadFromDirectory(kubesharkDir);

      expect(skills.length).toBe(2);
      const names = skills.map(s => s.metadata.name).sort();
      expect(names).toEqual(['install', 'network-rca']);
    });
  });

  // ──────────────────────────────────────────────────────────────────────
  // helmfile/helmfile — declarative Helm chart deployment
  // Source: https://github.com/helmfile/helmfile  (MIT)
  // ──────────────────────────────────────────────────────────────────────
  describe('helmfile/helmfile', () => {
    const helmfileDir = path.join(vendoredDir, 'helmfile');

    it('loads helmfile skill with rich Helm configuration content', () => {
      const raw = fs.readFileSync(path.join(helmfileDir, 'helmfile', 'SKILL.md'), 'utf-8');
      const skill = parseSkillFile(raw, 'helmfile/helmfile/SKILL.md');

      expect(skill.metadata.name).toBe('helmfile');
      expect(skill.metadata.description).toContain('Helmfile');
      expect(skill.content).toContain('releases');
      expect(skill.content).toContain('repositories');
      // Helmfile skill is quite large — good stress test
      expect(skill.contentSizeBytes).toBeGreaterThan(10000);
    });

    it('loads as a directory source', async () => {
      const loader = new SkillLoader(createNodeFs());
      const skills = await loader.loadFromDirectory(helmfileDir);

      expect(skills).toHaveLength(1);
      expect(skills[0].metadata.name).toBe('helmfile');
    });
  });

  // ──────────────────────────────────────────────────────────────────────
  // openshift/lightspeed-service — K8s/OpenShift troubleshooting skills
  // Source: https://github.com/openshift/lightspeed-service  (Apache-2.0)
  // ──────────────────────────────────────────────────────────────────────
  describe('openshift/lightspeed-service', () => {
    const lightspeedDir = path.join(vendoredDir, 'openshift-lightspeed');

    it('loads node-not-ready troubleshooting skill', () => {
      const raw = fs.readFileSync(path.join(lightspeedDir, 'node-not-ready', 'SKILL.md'), 'utf-8');
      const skill = parseSkillFile(raw, 'lightspeed/node-not-ready/SKILL.md');

      expect(skill.metadata.name).toBe('node-not-ready');
      expect(skill.metadata.description).toContain('NotReady');
      expect(skill.content).toContain('MemoryPressure');
      expect(skill.content).toContain('DiskPressure');
      expect(skill.content).toContain('kubelet');
    });

    it('loads pod-failure-diagnosis troubleshooting skill', () => {
      const raw = fs.readFileSync(path.join(lightspeedDir, 'pod-failure-diagnosis', 'SKILL.md'), 'utf-8');
      const skill = parseSkillFile(raw, 'lightspeed/pod-failure-diagnosis/SKILL.md');

      expect(skill.metadata.name).toBe('pod-failure-diagnosis');
      expect(skill.metadata.description).toContain('CrashLoopBackOff');
      expect(skill.content).toContain('ImagePullBackOff');
      expect(skill.content).toContain('OOMKilled');
      expect(skill.content).toContain('Pending');
    });

    it('loads all lightspeed skills from directory tree', async () => {
      const loader = new SkillLoader(createNodeFs());
      const skills = await loader.loadFromDirectory(lightspeedDir);

      expect(skills.length).toBe(2);
      const names = skills.map(s => s.metadata.name).sort();
      expect(names).toEqual(['node-not-ready', 'pod-failure-diagnosis']);
    });
  });

  // ──────────────────────────────────────────────────────────────────────
  // Cross-repo: load all vendored K8s skills together via SkillManager
  // ──────────────────────────────────────────────────────────────────────
  describe('all vendored Kubernetes skills together', () => {
    const vendoredSources: SkillsConfig['sources'] = [
      { type: 'local', url: path.join(vendoredDir, 'kubeshark'), enabled: true },
      { type: 'local', url: path.join(vendoredDir, 'helmfile'), enabled: true },
      { type: 'local', url: path.join(vendoredDir, 'openshift-lightspeed'), enabled: true },
    ];

    it('loads all vendored K8s skills across repos via SkillManager', async () => {
      const manager = new SkillManager(createNodeFs());
      const config: SkillsConfig = {
        ...DEFAULT_SKILLS_CONFIG,
        sources: vendoredSources,
      };

      const all = await manager.loadAllSkills(config);
      expect(all.length).toBe(5); // 2 kubeshark + 1 helmfile + 2 openshift

      const names = all.map(s => s.metadata.name).sort();
      expect(names).toEqual([
        'helmfile',
        'install',
        'network-rca',
        'node-not-ready',
        'pod-failure-diagnosis',
      ]);
    });

    it('generates a valid prompt from all vendored K8s skills', async () => {
      const manager = new SkillManager(createNodeFs());
      const config: SkillsConfig = {
        ...DEFAULT_SKILLS_CONFIG,
        sources: vendoredSources,
      };

      await manager.loadAllSkills(config);
      const prompt = manager.getSkillsPromptText(config);

      // Prompt should contain all 5 skill blocks
      expect(prompt).toContain('SKILLS:');
      expect(prompt).toContain('<skill name="install"');
      expect(prompt).toContain('<skill name="network-rca"');
      expect(prompt).toContain('<skill name="helmfile"');
      expect(prompt).toContain('<skill name="node-not-ready"');
      expect(prompt).toContain('<skill name="pod-failure-diagnosis"');
      expect(prompt).toContain('END OF SKILLS.');
    });

    it('can selectively disable vendored K8s skills', async () => {
      const manager = new SkillManager(createNodeFs());
      const config: SkillsConfig = {
        ...DEFAULT_SKILLS_CONFIG,
        sources: vendoredSources,
        disabledSkills: ['install', 'pod-failure-diagnosis'],
      };

      await manager.loadAllSkills(config);
      const prompt = manager.getSkillsPromptText(config);

      // Disabled skills should not appear
      expect(prompt).not.toContain('<skill name="install"');
      expect(prompt).not.toContain('<skill name="pod-failure-diagnosis"');

      // Enabled skills should appear
      expect(prompt).toContain('<skill name="network-rca"');
      expect(prompt).toContain('<skill name="helmfile"');
      expect(prompt).toContain('<skill name="node-not-ready"');
    });

    it('sends all vendored K8s skills through the mock model', async () => {
      const manager = new SkillManager(createNodeFs());
      const config: SkillsConfig = {
        ...DEFAULT_SKILLS_CONFIG,
        sources: vendoredSources,
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

    it('summary reflects correct counts across all vendored K8s repos', async () => {
      const manager = new SkillManager(createNodeFs());
      const config: SkillsConfig = {
        ...DEFAULT_SKILLS_CONFIG,
        sources: vendoredSources,
        disabledSkills: ['install'],
      };

      await manager.loadAllSkills(config);
      const summary = manager.getSkillsSummary(config);

      expect(summary.totalSkills).toBe(5);
      expect(summary.enabledSkills).toBe(4);
      expect(summary.totalSizeBytes).toBeGreaterThan(0);
    });
  });
});
