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

import { describe, it, expect, beforeEach } from 'vitest';
import { SkillManager } from './SkillManager';
import { SkillsConfig, DEFAULT_SKILLS_CONFIG } from './SkillConfigManager';
import { SkillFileSystem } from './SkillLoader';

/** Creates a mock filesystem for testing. */
function createMockFs(files: Record<string, string | 'DIR'>): SkillFileSystem {
  return {
    exists: async (path: string) => path in files,
    readdir: async (path: string) => {
      const prefix = path.endsWith('/') ? path : path + '/';
      const entries = new Set<string>();
      for (const key of Object.keys(files)) {
        if (key.startsWith(prefix)) {
          const rest = key.slice(prefix.length);
          const firstPart = rest.split('/')[0];
          if (firstPart) entries.add(firstPart);
        }
      }
      return [...entries];
    },
    readFile: async (path: string) => {
      const content = files[path];
      if (typeof content !== 'string' || content === 'DIR') {
        throw new Error(`Cannot read: ${path}`);
      }
      return content;
    },
    isDirectory: async (path: string) => files[path] === 'DIR',
    joinPath: (...segments: string[]) => segments.join('/'),
  };
}

const SKILL_1 = `---
name: skill-one
description: First skill
tags: [testing]
---
Content for skill one`;

const SKILL_2 = `---
name: skill-two
description: Second skill
---
Content for skill two`;

describe('SkillManager', () => {
  let manager: SkillManager;
  let config: SkillsConfig;

  beforeEach(() => {
    const fs = createMockFs({
      '/skills': 'DIR',
      '/skills/SKILL.md': SKILL_1,
      '/other-skills': 'DIR',
      '/other-skills/SKILL.md': SKILL_2,
    });

    manager = new SkillManager(fs);
    config = {
      ...DEFAULT_SKILLS_CONFIG,
      sources: [
        { type: 'local', url: '/skills', enabled: true },
        { type: 'local', url: '/other-skills', enabled: true },
      ],
    };
  });

  describe('loadAllSkills', () => {
    it('should load skills from all enabled sources', async () => {
      const skills = await manager.loadAllSkills(config);
      expect(skills).toHaveLength(2);
      const names = skills.map(s => s.metadata.name);
      expect(names).toContain('skill-one');
      expect(names).toContain('skill-two');
    });

    it('should skip disabled sources', async () => {
      config.sources[1].enabled = false;
      const skills = await manager.loadAllSkills(config);
      expect(skills).toHaveLength(1);
      expect(skills[0].metadata.name).toBe('skill-one');
    });

    it('should cache results', async () => {
      const skills1 = await manager.loadAllSkills(config);
      const skills2 = await manager.loadAllSkills(config);
      expect(skills1).toEqual(skills2);
    });
  });

  describe('getEnabledSkills', () => {
    it('should return all skills when none disabled', async () => {
      await manager.loadAllSkills(config);
      const enabled = manager.getEnabledSkills(config);
      expect(enabled).toHaveLength(2);
    });

    it('should filter disabled skills', async () => {
      await manager.loadAllSkills(config);
      config.disabledSkills = ['skill-two'];
      const enabled = manager.getEnabledSkills(config);
      expect(enabled).toHaveLength(1);
      expect(enabled[0].metadata.name).toBe('skill-one');
    });
  });

  describe('getSkillsPromptText', () => {
    it('should generate prompt text for enabled skills', async () => {
      await manager.loadAllSkills(config);
      const text = manager.getSkillsPromptText(config);
      expect(text).toContain('SKILLS:');
      expect(text).toContain('<skill name="skill-one"');
      expect(text).toContain('<skill name="skill-two"');
      expect(text).toContain('Content for skill one');
    });

    it('should return empty string when no skills', () => {
      const text = manager.getSkillsPromptText(config);
      expect(text).toBe('');
    });

    it('should exclude disabled skills', async () => {
      await manager.loadAllSkills(config);
      config.disabledSkills = ['skill-one'];
      const text = manager.getSkillsPromptText(config);
      expect(text).toContain('skill-two');
      expect(text).not.toContain('skill-one');
    });
  });

  describe('getEnabledSkillsSize', () => {
    it('should return total size of enabled skills', async () => {
      await manager.loadAllSkills(config);
      const size = manager.getEnabledSkillsSize(config);
      expect(size).toBeGreaterThan(0);
    });

    it('should return 0 when no skills loaded', () => {
      expect(manager.getEnabledSkillsSize(config)).toBe(0);
    });
  });

  describe('getSkillsSummary', () => {
    it('should return correct summary', async () => {
      await manager.loadAllSkills(config);
      config.disabledSkills = ['skill-two'];
      const summary = manager.getSkillsSummary(config);
      expect(summary.totalSkills).toBe(2);
      expect(summary.enabledSkills).toBe(1);
      expect(summary.totalSizeBytes).toBeGreaterThan(0);
      expect(summary.maxTotalSizeBytes).toBe(config.maxTotalSkillSizeBytes);
    });
  });

  describe('invalidateCache', () => {
    it('should force reload on next call', async () => {
      await manager.loadAllSkills(config);
      manager.invalidateCache();

      // After invalidation, skills should still load correctly
      const skills = await manager.loadAllSkills(config);
      expect(skills).toHaveLength(2);
    });
  });

  describe('loadFromWellKnownDirs', () => {
    it('should scan well-known directories', async () => {
      const fs = createMockFs({
        '/project/.github/skills': 'DIR',
        '/project/.github/skills/SKILL.md': SKILL_1,
      });

      const mgr = new SkillManager(fs);
      const skills = await mgr.loadFromWellKnownDirs('/project');
      expect(skills).toHaveLength(1);
      expect(skills[0].metadata.name).toBe('skill-one');
    });
  });
});
