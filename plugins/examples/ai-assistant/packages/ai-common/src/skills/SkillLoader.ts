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

import {
  ParsedSkill,
  parseCopilotInstructionsFile,
  parseSkillFile,
  DEFAULT_MAX_SKILL_SIZE_BYTES,
} from './skillParser';

/**
 * Configuration for a skill source that tells the loader where to find skills.
 */
export interface SkillSource {
  /** Type of source: local directory or Git repository. */
  type: 'local' | 'git';
  /**
   * Location of the skill source.
   * - For `local` sources: absolute filesystem path to a directory.
   * - For `git` sources: HTTPS URL to a Git repository.
   */
  url: string;
  /** Git ref (tag, branch, or SHA) to fetch. Only used for Git sources. */
  ref?: string;
  /** Optional subdirectory within the source to scan for skills. */
  path?: string;
  /** Whether this source is active. */
  enabled: boolean;
}

/** Well-known directories that may contain skills in a project. */
export const WELL_KNOWN_SKILL_DIRS = [
  /** GitHub Copilot skills. */
  '.github/skills',
  /** GitHub Copilot instructions. */
  '.github/instructions',
  /** Claude Code project skills. */
  '.claude/skills',
  /** Generic skills directory. */
  'skills',
] as const;

/**
 * Validates that a URL is safe for fetching.
 *
 * Only HTTPS URLs to github.com are allowed. This prevents SSRF and
 * ensures all fetches go through authenticated, encrypted channels.
 *
 * @param url - The URL to validate.
 * @returns True if the URL is safe to fetch.
 */
export function isValidGitUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    // Only allow HTTPS
    if (parsed.protocol !== 'https:') {
      return false;
    }
    // Only allow known Git hosting providers
    const allowedHosts = [
      'github.com',
      'gitlab.com',
      'bitbucket.org',
    ];
    // Exact match or legitimate subdomain (e.g. api.github.com).
    // The dot prefix in `.${host}` prevents matching look-alikes like fakegithub.com.
    return allowedHosts.some(host =>
      parsed.hostname === host || parsed.hostname.endsWith(`.${host}`)
    );
  } catch {
    return false;
  }
}

/**
 * Constructs the GitHub API zipball URL for a repository.
 *
 * @param repoUrl - Repository URL (e.g. "https://github.com/owner/repo").
 * @param ref - Git ref to download (tag, branch, or SHA). Defaults to "main".
 * @returns The zipball download URL.
 * @throws If the URL is not a valid GitHub repository URL.
 */
export function buildGitHubZipUrl(repoUrl: string, ref: string = 'main'): string {
  const parsed = new URL(repoUrl);
  if (parsed.hostname !== 'github.com') {
    throw new Error(`Only GitHub URLs are supported for zip download: ${repoUrl}`);
  }

  // Extract owner/repo from path like /owner/repo or /owner/repo.git
  const pathParts = parsed.pathname
    .replace(/\.git$/, '')
    .split('/')
    .filter(Boolean);

  if (pathParts.length < 2) {
    throw new Error(`Invalid GitHub repository URL: ${repoUrl}`);
  }

  const owner = pathParts[0];
  const repo = pathParts[1];

  return `https://api.github.com/repos/${owner}/${repo}/zipball/${ref}`;
}

/**
 * Filesystem abstraction for loading skill files.
 *
 * This interface allows the SkillLoader to work in different environments
 * (Node.js filesystem, Electron, browser with virtual filesystem, tests).
 */
export interface SkillFileSystem {
  /** Checks if a path exists. */
  exists(path: string): Promise<boolean>;
  /** Lists files and directories at a path. */
  readdir(path: string): Promise<string[]>;
  /** Reads a file as UTF-8 text. */
  readFile(path: string): Promise<string>;
  /** Checks if a path is a directory. */
  isDirectory(path: string): Promise<boolean>;
  /** Joins path segments. */
  joinPath(...segments: string[]): string;
}

/**
 * HTTP client abstraction for fetching remote skill sources.
 *
 * Decoupled from `fetch` to allow testing and environment-specific
 * implementations (e.g., Electron net module, proxy support).
 */
export interface SkillHttpClient {
  /** Downloads a URL and returns the response as an ArrayBuffer. */
  fetchZip(url: string): Promise<ArrayBuffer>;
}

/**
 * ZIP extraction abstraction.
 *
 * Allows swapping in different ZIP implementations for different platforms.
 */
export interface SkillZipExtractor {
  /**
   * Extracts text files from a ZIP archive.
   *
   * @param data - ZIP file content as ArrayBuffer.
   * @param pathFilter - Optional filter to only extract files under a specific path prefix.
   * @returns Map of relative file paths to their text content.
   */
  extractTextFiles(data: ArrayBuffer, pathFilter?: string): Promise<Map<string, string>>;
}

/**
 * Loads skills from local directories and remote Git repositories.
 *
 * Scans for SKILL.md files (agentskills.io standard), `.instructions.md`
 * files (GitHub Copilot format), and plain `.md` files in well-known
 * skill directories.
 */
export class SkillLoader {
  private fs: SkillFileSystem;
  private httpClient?: SkillHttpClient;
  private zipExtractor?: SkillZipExtractor;
  private maxSkillSizeBytes: number;

  /**
   * Creates a new SkillLoader.
   *
   * @param fs - Filesystem implementation for reading local files.
   * @param httpClient - HTTP client for fetching remote repos (optional).
   * @param zipExtractor - ZIP extractor for processing downloaded archives (optional).
   * @param maxSkillSizeBytes - Maximum content size per skill in bytes.
   */
  constructor(
    fs: SkillFileSystem,
    httpClient?: SkillHttpClient,
    zipExtractor?: SkillZipExtractor,
    maxSkillSizeBytes: number = DEFAULT_MAX_SKILL_SIZE_BYTES
  ) {
    this.fs = fs;
    this.httpClient = httpClient;
    this.zipExtractor = zipExtractor;
    this.maxSkillSizeBytes = maxSkillSizeBytes;
  }

  /**
   * Loads skills from a configured source.
   *
   * Dispatches to local directory scanning or Git zip download based on
   * the source type.
   *
   * @param source - The skill source configuration.
   * @returns Array of parsed skills from the source.
   */
  async loadFromSource(source: SkillSource): Promise<ParsedSkill[]> {
    if (!source.enabled) {
      return [];
    }

    switch (source.type) {
      case 'local':
        return this.loadFromDirectory(source.url, source.path);
      case 'git':
        return this.loadFromGitRepo(source.url, source.ref, source.path);
      default:
        console.warn(`Unknown skill source type: ${(source as any).type}`);
        return [];
    }
  }

  /**
   * Loads skills from a local directory.
   *
   * Scans for:
   * 1. `SKILL.md` files (agentskills.io format) — highest priority.
   * 2. Subdirectories containing `SKILL.md` files.
   * 3. `.instructions.md` files (GitHub Copilot format).
   * 4. Plain `.md` files with front-matter.
   *
   * @param dirPath - Absolute path to the directory to scan.
   * @param subPath - Optional subdirectory within dirPath.
   * @returns Array of parsed skills found in the directory.
   */
  async loadFromDirectory(dirPath: string, subPath?: string): Promise<ParsedSkill[]> {
    const scanPath = subPath ? this.fs.joinPath(dirPath, subPath) : dirPath;

    if (!(await this.fs.exists(scanPath))) {
      return [];
    }

    if (!(await this.fs.isDirectory(scanPath))) {
      // Single file — parse directly
      return this.loadSingleFile(scanPath);
    }

    const skills: ParsedSkill[] = [];
    const entries = await this.fs.readdir(scanPath);

    for (const entry of entries) {
      const fullPath = this.fs.joinPath(scanPath, entry);

      try {
        if (await this.fs.isDirectory(fullPath)) {
          // Check for SKILL.md in subdirectory
          const skillMdPath = this.fs.joinPath(fullPath, 'SKILL.md');
          if (await this.fs.exists(skillMdPath)) {
            const content = await this.fs.readFile(skillMdPath);
            const skill = parseSkillFile(content, skillMdPath, this.maxSkillSizeBytes);
            skills.push(skill);
          }
        } else if (entry === 'SKILL.md') {
          const content = await this.fs.readFile(fullPath);
          const skill = parseSkillFile(content, fullPath, this.maxSkillSizeBytes);
          skills.push(skill);
        } else if (entry.endsWith('.instructions.md')) {
          const content = await this.fs.readFile(fullPath);
          const skill = parseCopilotInstructionsFile(content, entry, fullPath);
          skills.push(skill);
        } else if (entry.endsWith('.md') && entry !== 'README.md' && entry !== 'CONTRIBUTING.md') {
          // Try to parse as a skill file with front-matter
          const content = await this.fs.readFile(fullPath);
          try {
            const skill = parseSkillFile(content, fullPath, this.maxSkillSizeBytes);
            skills.push(skill);
          } catch {
            // Not a valid skill file (missing front-matter) — skip silently
          }
        }
      } catch (error) {
        console.warn(`Error loading skill from ${fullPath}:`, error);
      }
    }

    return skills;
  }

  /**
   * Scans well-known skill directories relative to a project root.
   *
   * Checks `.github/skills/`, `.github/instructions/`, `.claude/skills/`,
   * and `skills/` directories.
   *
   * @param projectRoot - Absolute path to the project root.
   * @returns Array of all skills found in well-known directories.
   */
  async loadFromWellKnownDirs(projectRoot: string): Promise<ParsedSkill[]> {
    const skills: ParsedSkill[] = [];

    for (const dir of WELL_KNOWN_SKILL_DIRS) {
      const fullPath = this.fs.joinPath(projectRoot, dir);
      if (await this.fs.exists(fullPath)) {
        const dirSkills = await this.loadFromDirectory(fullPath);
        skills.push(...dirSkills);
      }
    }

    return skills;
  }

  /**
   * Downloads and extracts skills from a GitHub repository via zip archive.
   *
   * Security: Only HTTPS URLs to github.com are allowed. Content size limits
   * are enforced per skill. The zip is extracted in memory — no files are
   * written to disk.
   *
   * @param repoUrl - GitHub repository URL (e.g. "https://github.com/owner/repo").
   * @param ref - Git ref to download (tag, branch, or SHA).
   * @param subPath - Optional subdirectory within the repo to scan.
   * @returns Array of parsed skills from the repository.
   * @throws If the URL is invalid, HTTP client is not configured, or download fails.
   */
  async loadFromGitRepo(
    repoUrl: string,
    ref: string = 'main',
    subPath?: string
  ): Promise<ParsedSkill[]> {
    if (!this.httpClient || !this.zipExtractor) {
      throw new Error(
        'HTTP client and ZIP extractor are required for Git repository skill loading'
      );
    }

    if (!isValidGitUrl(repoUrl)) {
      throw new Error(
        `Invalid or disallowed Git URL: ${repoUrl}. Only HTTPS URLs to github.com, gitlab.com, or bitbucket.org are allowed.`
      );
    }

    const zipUrl = buildGitHubZipUrl(repoUrl, ref);

    const zipData = await this.httpClient.fetchZip(zipUrl);
    const files = await this.zipExtractor.extractTextFiles(zipData, subPath);

    const skills: ParsedSkill[] = [];
    const sourcePrefix = `${repoUrl}@${ref}`;

    for (const [filePath, content] of files) {
      const fileName = filePath.split('/').pop() || filePath;

      try {
        if (fileName === 'SKILL.md') {
          const skill = parseSkillFile(
            content,
            `${sourcePrefix}/${filePath}`,
            this.maxSkillSizeBytes
          );
          skills.push(skill);
        } else if (fileName.endsWith('.instructions.md')) {
          const skill = parseCopilotInstructionsFile(
            content,
            fileName,
            `${sourcePrefix}/${filePath}`
          );
          skills.push(skill);
        } else if (
          fileName.endsWith('.md') &&
          fileName !== 'README.md' &&
          fileName !== 'CONTRIBUTING.md'
        ) {
          try {
            const skill = parseSkillFile(
              content,
              `${sourcePrefix}/${filePath}`,
              this.maxSkillSizeBytes
            );
            skills.push(skill);
          } catch {
            // Not a valid skill file — skip
          }
        }
      } catch (error) {
        console.warn(`Error parsing skill from ${filePath}:`, error);
      }
    }

    return skills;
  }

  /**
   * Loads a single file as a skill.
   *
   * @param filePath - Absolute path to the file.
   * @returns Array containing the parsed skill, or empty if parsing fails.
   */
  private async loadSingleFile(filePath: string): Promise<ParsedSkill[]> {
    const content = await this.fs.readFile(filePath);
    const fileName = filePath.split('/').pop() || filePath;

    try {
      if (fileName.endsWith('.instructions.md')) {
        return [parseCopilotInstructionsFile(content, fileName, filePath)];
      }
      return [parseSkillFile(content, filePath, this.maxSkillSizeBytes)];
    } catch (error) {
      console.warn(`Error loading skill from ${filePath}:`, error);
      return [];
    }
  }
}
