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

/**
 * Parsed metadata from a SKILL.md YAML front-matter block.
 *
 * Compatible with the agentskills.io / GitHub Copilot SKILL.md standard.
 * @see https://agentskills.io/specification
 */
export interface SkillMetadata {
  /** Unique name used to identify and reference the skill. */
  name: string;
  /** Short summary describing what the skill does (shown in listings). */
  description: string;
  /** Semantic version string for the skill content. */
  version?: string;
  /** Author or organization that created the skill. */
  author?: string;
  /** SPDX license identifier. */
  license?: string;
  /** Tags for categorization and discoverability. */
  tags?: string[];
  /** Tool identifier for cross-tool filtering (e.g. "headlamp"). */
  tool?: string;
  /** MCP server configuration for MCP-type skills. */
  mcp?: {
    /** Transport protocol: "http" or "stdio". */
    transport: 'http' | 'stdio';
    /** URL for HTTP transport. */
    url?: string;
    /** Command for stdio transport. */
    command?: string;
    /** Arguments for stdio transport command. */
    args?: string[];
  };
}

/**
 * A fully parsed skill with metadata and content ready for prompt injection.
 */
export interface ParsedSkill {
  /** Parsed metadata from the YAML front-matter. */
  metadata: SkillMetadata;
  /** Markdown content body (everything after the front-matter). */
  content: string;
  /** Size of the content in bytes (UTF-8). */
  contentSizeBytes: number;
  /** Absolute path or URL where this skill was loaded from. */
  source: string;
}

/** Maximum allowed content size per skill in bytes (default: 50KB). */
export const DEFAULT_MAX_SKILL_SIZE_BYTES = 50 * 1024;

/** Maximum total prompt skill content in bytes (default: 200KB). */
export const DEFAULT_MAX_TOTAL_SKILL_SIZE_BYTES = 200 * 1024;

/**
 * Parses YAML front-matter from a Markdown string.
 *
 * Front-matter must be delimited by `---` lines at the very start of the file.
 * Uses a simple line-by-line parser — no YAML library dependency.
 *
 * @param raw - The raw Markdown string to parse.
 * @returns A tuple of [frontMatterObject, remainingContent].
 */
export function parseFrontMatter(raw: string): [Record<string, any>, string] {
  const lines = raw.split('\n');

  // Front-matter must start at line 0 with ---
  if (lines.length === 0 || lines[0].trim() !== '---') {
    return [{}, raw];
  }

  // Find closing ---
  let closingIndex = -1;
  for (let i = 1; i < lines.length; i++) {
    if (lines[i].trim() === '---') {
      closingIndex = i;
      break;
    }
  }

  if (closingIndex === -1) {
    return [{}, raw];
  }

  const frontMatterLines = lines.slice(1, closingIndex);
  const content = lines.slice(closingIndex + 1).join('\n').trim();
  const parsed = parseSimpleYaml(frontMatterLines);

  return [parsed, content];
}

/**
 * Minimal YAML parser for front-matter fields.
 *
 * Handles flat key-value pairs, inline arrays `[a, b, c]`, block arrays
 * (lines starting with `- `), and nested objects (one level deep).
 * Deliberately limited to avoid pulling in a full YAML library.
 *
 * @param lines - Lines of YAML text (without the `---` delimiters).
 * @returns Parsed key-value object.
 */
export function parseSimpleYaml(lines: string[]): Record<string, any> {
  const result: Record<string, any> = {};
  let currentKey: string | null = null;
  let currentArray: string[] | null = null;
  let currentObject: Record<string, any> | null = null;
  let objectKey: string | null = null;

  for (const line of lines) {
    // Skip empty lines and comments
    if (line.trim() === '' || line.trim().startsWith('#')) {
      continue;
    }

    const indent = line.length - line.trimStart().length;

    // Nested object value (indented key: value under a parent key)
    if (indent >= 2 && objectKey && currentObject !== null) {
      const trimmed = line.trim();

      // Array item — could be a top-level block array or nested object array
      if (trimmed.startsWith('- ')) {
        const val = trimmed.slice(2).trim();

        // If no nested key has been set yet, this is a top-level block array
        // (e.g. tags:\n  - item1\n  - item2)
        if (currentKey === null || currentKey === objectKey) {
          // Convert from nested object to top-level array
          objectKey = null;
          currentObject = null;
          if (currentArray === null) {
            currentArray = [];
          }
          currentArray.push(unquote(val));
          result[currentKey!] = currentArray;
          continue;
        }

        // Otherwise it's an array under a nested object key
        if (currentArray === null) {
          currentArray = [];
        }
        currentArray.push(unquote(val));
        currentObject[currentKey] = currentArray;
        continue;
      }

      const colonIdx = trimmed.indexOf(':');
      if (colonIdx > 0) {
        // Flush any pending array
        if (currentArray !== null && currentKey) {
          currentObject[currentKey] = currentArray;
          currentArray = null;
        }

        const key = trimmed.slice(0, colonIdx).trim();
        const value = trimmed.slice(colonIdx + 1).trim();
        currentKey = key;

        if (value === '') {
          currentArray = [];
        } else {
          currentObject[key] = parseValue(value);
          currentKey = key;
        }
      }
      continue;
    }

    // Top-level array item (indented, starts with -)
    if (indent >= 2 && currentKey && line.trim().startsWith('- ')) {
      const val = line.trim().slice(2).trim();
      if (currentArray === null) {
        currentArray = [];
      }
      currentArray.push(unquote(val));
      result[currentKey] = currentArray;
      continue;
    }

    // Flush pending nested object
    if (objectKey && currentObject !== null) {
      if (currentArray !== null && currentKey) {
        currentObject[currentKey] = currentArray;
        currentArray = null;
      }
      result[objectKey] = currentObject;
      objectKey = null;
      currentObject = null;
    }

    // Flush pending array
    if (currentArray !== null && currentKey) {
      result[currentKey] = currentArray;
      currentArray = null;
    }

    // Top-level key: value
    const trimmedLine = line.trim();
    const colonIdx = trimmedLine.indexOf(':');
    if (colonIdx > 0) {
      const key = trimmedLine.slice(0, colonIdx).trim();
      const value = trimmedLine.slice(colonIdx + 1).trim();

      currentKey = key;

      if (value === '') {
        // Could be start of nested object or array — peek ahead handled by indent check
        objectKey = key;
        currentObject = {};
        currentArray = null;
        continue;
      }

      // Inline array: [a, b, c]
      if (value.startsWith('[') && value.endsWith(']')) {
        const items = value
          .slice(1, -1)
          .split(',')
          .map(s => unquote(s.trim()))
          .filter(s => s.length > 0);
        result[key] = items;
        objectKey = null;
        currentObject = null;
      } else {
        result[key] = parseValue(value);
        objectKey = null;
        currentObject = null;
      }
    }
  }

  // Flush remaining nested object
  if (objectKey && currentObject !== null) {
    if (currentArray !== null && currentKey) {
      currentObject[currentKey] = currentArray;
    }
    result[objectKey] = currentObject;
  }

  // Flush remaining array
  if (currentArray !== null && currentKey && objectKey === null) {
    result[currentKey] = currentArray;
  }

  return result;
}

/** Removes surrounding quotes from a string value. */
function unquote(s: string): string {
  if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
    return s.slice(1, -1);
  }
  return s;
}

/** Parses a simple YAML scalar value (string, number, boolean). */
function parseValue(value: string): string | number | boolean {
  const unquoted = unquote(value);
  if (unquoted === 'true') return true;
  if (unquoted === 'false') return false;
  const num = Number(unquoted);
  if (!isNaN(num) && unquoted !== '') return num;
  return unquoted;
}

/**
 * Parses a SKILL.md file into a {@link ParsedSkill}.
 *
 * Validates required fields (`name`, `description`) and enforces the
 * content size limit. Compatible with the agentskills.io SKILL.md standard
 * and GitHub Copilot's `.github/skills/` format.
 *
 * @param raw - Raw file content.
 * @param source - Path or URL the file was loaded from.
 * @param maxSizeBytes - Maximum content size in bytes (default: 50KB).
 * @returns The parsed skill.
 * @throws If required fields are missing or content exceeds the size limit.
 */
export function parseSkillFile(
  raw: string,
  source: string,
  maxSizeBytes: number = DEFAULT_MAX_SKILL_SIZE_BYTES
): ParsedSkill {
  const [frontMatter, content] = parseFrontMatter(raw);

  if (!frontMatter.name || typeof frontMatter.name !== 'string') {
    throw new Error(`Skill file ${source} is missing required 'name' field in front-matter`);
  }

  if (!frontMatter.description || typeof frontMatter.description !== 'string') {
    throw new Error(
      `Skill file ${source} is missing required 'description' field in front-matter`
    );
  }

  const contentSizeBytes = new TextEncoder().encode(content).length;

  if (contentSizeBytes > maxSizeBytes) {
    throw new Error(
      `Skill '${frontMatter.name}' content is ${contentSizeBytes} bytes, ` +
        `exceeding the ${maxSizeBytes} byte limit`
    );
  }

  const metadata: SkillMetadata = {
    name: String(frontMatter.name),
    description: String(frontMatter.description),
  };

  if (frontMatter.version) metadata.version = String(frontMatter.version);
  if (frontMatter.author) metadata.author = String(frontMatter.author);
  if (frontMatter.license) metadata.license = String(frontMatter.license);
  if (frontMatter.tool) metadata.tool = String(frontMatter.tool);

  if (Array.isArray(frontMatter.tags)) {
    metadata.tags = frontMatter.tags.map(String);
  }

  if (frontMatter.mcp && typeof frontMatter.mcp === 'object') {
    metadata.mcp = {
      transport: frontMatter.mcp.transport === 'stdio' ? 'stdio' : 'http',
      ...(frontMatter.mcp.url && { url: String(frontMatter.mcp.url) }),
      ...(frontMatter.mcp.command && { command: String(frontMatter.mcp.command) }),
      ...(frontMatter.mcp.args &&
        Array.isArray(frontMatter.mcp.args) && { args: frontMatter.mcp.args.map(String) }),
    };
  }

  return {
    metadata,
    content,
    contentSizeBytes,
    source,
  };
}

/**
 * Parses a GitHub Copilot instructions file (`.instructions.md` or `copilot-instructions.md`).
 *
 * These files may have optional YAML front-matter with `applyTo` glob patterns.
 * If no front-matter is present, the file content is used as-is with the
 * filename as the skill name.
 *
 * @param raw - Raw file content.
 * @param filename - The file name (used for deriving skill name).
 * @param source - Path or URL the file was loaded from.
 * @returns The parsed skill.
 */
export function parseCopilotInstructionsFile(
  raw: string,
  filename: string,
  source: string
): ParsedSkill {
  const [frontMatter, content] = parseFrontMatter(raw);

  const name =
    frontMatter.name ||
    filename
      .replace(/\.instructions\.md$/, '')
      .replace(/\.md$/, '')
      .replace(/[^a-zA-Z0-9-]/g, '-');

  const description = frontMatter.description || `GitHub Copilot instructions: ${name}`;

  const contentSizeBytes = new TextEncoder().encode(content || raw).length;

  return {
    metadata: {
      name: String(name),
      description: String(description),
      tags: frontMatter.tags ? frontMatter.tags.map(String) : ['copilot', 'instructions'],
    },
    content: content || raw,
    contentSizeBytes,
    source,
  };
}

/**
 * Formats loaded skills into a delimited block for system prompt injection.
 *
 * Each skill is wrapped in `<skill>` tags with metadata attributes so the
 * LLM can identify the source and purpose of each skill. This also helps
 * prevent cross-skill interference.
 *
 * @param skills - Array of parsed skills to inject.
 * @param maxTotalBytes - Maximum total content size (default: 200KB).
 * @returns Formatted string ready for injection into the system prompt.
 */
export function formatSkillsForPrompt(
  skills: ParsedSkill[],
  maxTotalBytes: number = DEFAULT_MAX_TOTAL_SKILL_SIZE_BYTES
): string {
  if (skills.length === 0) return '';

  let totalBytes = 0;
  const included: string[] = [];

  for (const skill of skills) {
    if (totalBytes + skill.contentSizeBytes > maxTotalBytes) {
      console.warn(
        `Skill '${skill.metadata.name}' skipped: would exceed total prompt budget ` +
          `(${totalBytes + skill.contentSizeBytes} > ${maxTotalBytes} bytes)`
      );
      continue;
    }

    totalBytes += skill.contentSizeBytes;

    const attrs = [
      `name="${skill.metadata.name}"`,
      `source="${skill.source}"`,
      ...(skill.metadata.version ? [`version="${skill.metadata.version}"`] : []),
    ].join(' ');

    included.push(`<skill ${attrs}>\n${skill.content}\n</skill>`);
  }

  if (included.length === 0) return '';

  return (
    '\n\nSKILLS:\n' +
    'The following skills provide additional context and guidance. ' +
    'Use this information when relevant to the user\'s questions.\n\n' +
    included.join('\n\n')
  );
}
