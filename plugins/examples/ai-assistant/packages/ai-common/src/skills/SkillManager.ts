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

import { SkillLoader, SkillSource, SkillFileSystem, SkillHttpClient, SkillZipExtractor } from './SkillLoader';
import { SkillsConfig, isSkillEnabled } from './SkillConfigManager';
import { ParsedSkill, formatSkillsForPrompt } from './skillParser';

/**
 * Coordinates skill loading, caching, filtering, and prompt injection.
 *
 * This is the main entry point for the skills system. It uses a
 * {@link SkillLoader} to fetch skills from configured sources, filters
 * them based on the user's enabled/disabled preferences, and generates
 * the prompt text to inject into the system prompt.
 */
export class SkillManager {
  private loader: SkillLoader;
  private cachedSkills: Map<string, ParsedSkill[]> = new Map();
  private lastLoadTimestamp: number = 0;
  private lastSourcesKey: string = '';

  /** Cache TTL in milliseconds (default: 1 hour). */
  private cacheTtlMs: number;

  private fs: SkillFileSystem;
  private httpClient?: SkillHttpClient;
  private zipExtractor?: SkillZipExtractor;

  /**
   * Creates a new SkillManager.
   *
   * @param fs - Filesystem implementation for reading local files.
   * @param httpClient - HTTP client for fetching remote repos (optional).
   * @param zipExtractor - ZIP extractor for processing downloaded archives (optional).
   * @param cacheTtlMs - How long to cache loaded skills in milliseconds (default: 1 hour).
   */
  constructor(
    fs: SkillFileSystem,
    httpClient?: SkillHttpClient,
    zipExtractor?: SkillZipExtractor,
    cacheTtlMs: number = 60 * 60 * 1000
  ) {
    this.fs = fs;
    this.httpClient = httpClient;
    this.zipExtractor = zipExtractor;
    this.loader = new SkillLoader(fs, httpClient, zipExtractor);
    this.cacheTtlMs = cacheTtlMs;
  }

  /**
   * Builds a cache key from the current sources config to detect changes.
   */
  private buildSourcesKey(config: SkillsConfig): string {
    return config.sources
      .filter(s => s.enabled)
      .map(s => `${s.type}:${s.url}:${s.ref || ''}:${s.path || ''}`)
      .sort()
      .join('|');
  }

  /**
   * Loads all skills from the configured sources.
   *
   * Results are cached for {@link cacheTtlMs}. The cache is automatically
   * invalidated when sources change. Call {@link invalidateCache}
   * to force a reload.
   *
   * @param config - The current skills configuration.
   * @returns Array of all loaded skills (before filtering by enabled state).
   */
  async loadAllSkills(config: SkillsConfig): Promise<ParsedSkill[]> {
    const now = Date.now();
    const sourcesKey = this.buildSourcesKey(config);

    // Invalidate cache if sources have changed
    if (sourcesKey !== this.lastSourcesKey) {
      this.cachedSkills.clear();
      this.lastSourcesKey = sourcesKey;
    }

    if (this.cachedSkills.size > 0 && now - this.lastLoadTimestamp < this.cacheTtlMs) {
      return this.getAllCachedSkills();
    }

    this.cachedSkills.clear();

    // Rebuild loader with config-specified size limit
    this.loader = new SkillLoader(
      this.fs,
      this.httpClient,
      this.zipExtractor,
      config.maxSkillSizeBytes
    );

    for (const source of config.sources) {
      if (!source.enabled) continue;

      try {
        const sourceKey = `${source.type}:${source.url}:${source.path || ''}`;
        const skills = await this.loader.loadFromSource(source);
        this.cachedSkills.set(sourceKey, skills);
      } catch (error) {
        console.warn(`Error loading skills from ${source.url}:`, error);
      }
    }

    this.lastLoadTimestamp = now;
    return this.getAllCachedSkills();
  }

  /**
   * Returns all loaded skills filtered by the user's enabled/disabled preferences.
   *
   * @param config - The current skills configuration.
   * @returns Array of enabled skills.
   */
  getEnabledSkills(config: SkillsConfig): ParsedSkill[] {
    return this.getAllCachedSkills().filter(skill =>
      isSkillEnabled(config, skill.metadata.name)
    );
  }

  /**
   * Generates the prompt injection text for all enabled skills.
   *
   * @param config - The current skills configuration.
   * @returns Formatted string ready for injection into the system prompt, or empty string.
   */
  getSkillsPromptText(config: SkillsConfig): string {
    const enabledSkills = this.getEnabledSkills(config);
    return formatSkillsForPrompt(enabledSkills, config.maxTotalSkillSizeBytes);
  }

  /**
   * Returns the total content size of all enabled skills in bytes.
   *
   * @param config - The current skills configuration.
   * @returns Total size in bytes.
   */
  getEnabledSkillsSize(config: SkillsConfig): number {
    return this.getEnabledSkills(config).reduce(
      (total, skill) => total + skill.contentSizeBytes,
      0
    );
  }

  /**
   * Returns a summary of loaded skills for display in the UI.
   *
   * @param config - The current skills configuration.
   * @returns Object with counts and size information.
   */
  getSkillsSummary(config: SkillsConfig): {
    totalSkills: number;
    enabledSkills: number;
    totalSizeBytes: number;
    maxTotalSizeBytes: number;
  } {
    const all = this.getAllCachedSkills();
    const enabled = this.getEnabledSkills(config);
    const totalSizeBytes = enabled.reduce((sum, s) => sum + s.contentSizeBytes, 0);

    return {
      totalSkills: all.length,
      enabledSkills: enabled.length,
      totalSizeBytes,
      maxTotalSizeBytes: config.maxTotalSkillSizeBytes,
    };
  }

  /** Clears the skill cache, forcing a reload on the next call. */
  invalidateCache(): void {
    this.cachedSkills.clear();
    this.lastLoadTimestamp = 0;
  }

  /**
   * Loads skills from well-known directories relative to a project root.
   *
   * This is a convenience method that scans `.github/skills/`,
   * `.github/instructions/`, `.claude/skills/`, and `skills/` directories.
   *
   * @param projectRoot - Absolute path to the project root.
   * @returns Array of parsed skills found.
   */
  async loadFromWellKnownDirs(projectRoot: string): Promise<ParsedSkill[]> {
    const skills = await this.loader.loadFromWellKnownDirs(projectRoot);
    this.cachedSkills.set(`wellknown:${projectRoot}`, skills);
    this.lastLoadTimestamp = Date.now();
    return skills;
  }

  /** Returns all cached skills as a flat array. */
  private getAllCachedSkills(): ParsedSkill[] {
    const all: ParsedSkill[] = [];
    for (const skills of this.cachedSkills.values()) {
      all.push(...skills);
    }
    return all;
  }
}
