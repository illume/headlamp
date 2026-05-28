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

import { describe, expect, it, vi } from 'vitest';

vi.mock('./debugLog', () => ({
  detailLog: vi.fn(),
  dumpForTestCase: vi.fn(),
  verboseLog: vi.fn(),
  warnLog: vi.fn(),
  debugLog: vi.fn(),
}));

import {
  blockContainsCode,
  collapseTerminalBlankLines,
  extractAIAnswer,
  hasShellSyntax,
  hasStructuredCodeContext,
  isAgentNoiseLine,
  isBoldFileHeading,
  isFileHeaderComment,
  isProseHeadingEndingWithColon,
  looksLikeShellOrDockerCodeLine,
  looksLikeYaml,
  normalizeBullets,
  stripAgentNoise,
  stripAnsi,
  stripCommandEcho,
} from './aksAgentParsing';

describe('aksAgentParsing', () => {
  describe('stripAnsi', () => {
    it('strips ANSI escape codes and carriage returns', () => {
      expect(stripAnsi('\u001b[31mred\u001b[0m\r\nnext')).toBe('red\nnext');
    });

    it('removes orphaned ANSI fragments without touching content', () => {
      expect(stripAnsi('97;40m success')).toBe('success');
    });

    it('returns an empty string unchanged', () => {
      expect(stripAnsi('')).toBe('');
    });
  });

  describe('normalizeBullets', () => {
    it('converts unicode bullets to markdown dashes while preserving indentation', () => {
      expect(normalizeBullets('• one\n  · two\n▪ three\n▸ four\n– five')).toBe(
        '- one\n  - two\n- three\n- four\n- five'
      );
    });

    it('leaves existing markdown bullets unchanged', () => {
      expect(normalizeBullets('- one\n- two')).toBe('- one\n- two');
    });

    it('returns an empty string unchanged', () => {
      expect(normalizeBullets('')).toBe('');
    });
  });

  describe('blockContainsCode', () => {
    it('detects keyword-based code lines', () => {
      expect(blockContainsCode(['import os', 'plain text'])).toBe(true);
    });

    it('detects brace and parenthesis code patterns', () => {
      expect(blockContainsCode(['if (ready) {', '}'])).toBe(true);
    });

    it('returns false for prose-only blocks and empty input', () => {
      expect(blockContainsCode(['plain text', 'another sentence'])).toBe(false);
      expect(blockContainsCode([])).toBe(false);
    });
  });

  describe('isProseHeadingEndingWithColon', () => {
    it('matches prose headings that end with a colon', () => {
      expect(isProseHeadingEndingWithColon('Also confirm:')).toBe(true);
    });

    it('does not match yaml-style keys', () => {
      expect(isProseHeadingEndingWithColon('metadata:')).toBe(false);
    });

    it('does not match code-like headings', () => {
      expect(isProseHeadingEndingWithColon('if [ -f file ]:')).toBe(false);
    });

    it('returns false for empty input', () => {
      expect(isProseHeadingEndingWithColon('')).toBe(false);
    });
  });

  describe('hasShellSyntax', () => {
    it('detects command flags and file paths', () => {
      expect(hasShellSyntax('cat ./config.yaml --verbose')).toBe(true);
    });

    it('detects quoted arguments and environment assignments', () => {
      expect(hasShellSyntax('env NODE_ENV=production echo "hi"')).toBe(true);
    });

    it('does not treat leading URLs as shell syntax', () => {
      expect(hasShellSyntax('http://example.com/path')).toBe(false);
    });

    it('returns false for plain prose', () => {
      expect(hasShellSyntax('This is just a sentence')).toBe(false);
    });
  });

  describe('isFileHeaderComment', () => {
    it('detects commented file paths with extensions', () => {
      expect(isFileHeaderComment('# main.py')).toBe(true);
      expect(isFileHeaderComment('// src/lib.rs')).toBe(true);
    });

    it('detects well-known extensionless filenames', () => {
      expect(isFileHeaderComment('# Dockerfile')).toBe(true);
    });

    it('does not match yaml file headers', () => {
      expect(isFileHeaderComment('# values.yaml')).toBe(false);
    });

    it('does not match ordinary comments', () => {
      expect(isFileHeaderComment('# just a comment')).toBe(false);
    });
  });

  describe('isBoldFileHeading', () => {
    it('detects standalone file headings', () => {
      expect(isBoldFileHeading('src/main.py')).toBe(true);
      expect(isBoldFileHeading('.env')).toBe(true);
    });

    it('detects well-known extensionless filenames', () => {
      expect(isBoldFileHeading('Dockerfile')).toBe(true);
    });

    it('does not match prose headings', () => {
      expect(isBoldFileHeading('main.py contents')).toBe(false);
    });
  });

  describe('looksLikeShellOrDockerCodeLine', () => {
    it('detects shell commands by known command names', () => {
      expect(looksLikeShellOrDockerCodeLine('kubectl get pods -A')).toBe(true);
    });

    it('detects structural shell syntax', () => {
      expect(looksLikeShellOrDockerCodeLine('./deploy.sh')).toBe(true);
    });

    it('detects shell comments with URLs', () => {
      expect(looksLikeShellOrDockerCodeLine('# open http://localhost:8080')).toBe(true);
    });

    it('returns false for prose and empty input', () => {
      expect(looksLikeShellOrDockerCodeLine('This is a sentence')).toBe(false);
      expect(looksLikeShellOrDockerCodeLine('')).toBe(false);
    });
  });

  describe('collapseTerminalBlankLines', () => {
    it('removes a single terminal-artifact blank line between code lines', () => {
      expect(collapseTerminalBlankLines(' kubectl get pods\n\n kubectl get ns')).toBe(
        ' kubectl get pods\n kubectl get ns'
      );
    });

    it('collapses repeated prose blank lines to a single blank line', () => {
      expect(collapseTerminalBlankLines('alpha\n\n\n\nbeta')).toBe('alpha\n\nbeta');
    });

    it('preserves blank lines inside existing fenced code blocks', () => {
      expect(collapseTerminalBlankLines('```sh\na\n\n\n b\n```')).toBe('```sh\na\n\n\n b\n```');
    });
  });

  describe('looksLikeYaml', () => {
    it('treats empty and comment lines as yaml-compatible', () => {
      expect(looksLikeYaml('')).toBe(true);
      expect(looksLikeYaml('# a comment')).toBe(true);
    });

    it('detects common yaml structures', () => {
      expect(looksLikeYaml('apiVersion: v1')).toBe(true);
      expect(looksLikeYaml('- name: app')).toBe(true);
    });

    it('does not treat helm template expressions as yaml block starts', () => {
      expect(looksLikeYaml('{{- if .Values.enabled }}')).toBe(false);
    });

    it('returns false for plain prose', () => {
      expect(looksLikeYaml('This is a sentence')).toBe(false);
    });
  });

  describe('hasStructuredCodeContext', () => {
    it('detects python-style structure', () => {
      expect(hasStructuredCodeContext(['def main():', '    pass'])).toBe(true);
    });

    it('detects go-style structure', () => {
      expect(hasStructuredCodeContext(['package main', 'func main() {'])).toBe(true);
    });

    it('returns false for yaml and shell content', () => {
      expect(hasStructuredCodeContext(['metadata:', 'kubectl get pods'])).toBe(false);
      expect(hasStructuredCodeContext([])).toBe(false);
    });
  });

  describe('isAgentNoiseLine', () => {
    it('detects shell prompts and task list noise', () => {
      expect(isAgentNoiseLine('root@aks-agent:/app#')).toBe(true);
      expect(isAgentNoiseLine('Task List:')).toBe(true);
    });

    it('does not remove markdown table separators', () => {
      expect(isAgentNoiseLine('|---|---|')).toBe(false);
    });

    it('returns false for normal answer content', () => {
      expect(isAgentNoiseLine('Regular answer line')).toBe(false);
    });
  });

  describe('stripAgentNoise', () => {
    it('removes noise lines and collapses blank lines', () => {
      expect(stripAgentNoise(['Task List:', 'Answer', '', '', 'More'])).toEqual([
        'Answer',
        '',
        'More',
      ]);
    });

    it('preserves noise-like content inside code fences', () => {
      expect(stripAgentNoise(['```', 'Task List:', 'root@aks-agent:/app#', '```'])).toEqual([
        '```',
        'Task List:',
        'root@aks-agent:/app#',
        '```',
      ]);
    });
  });

  describe('stripCommandEcho', () => {
    it('removes the echoed python command and continuation lines', () => {
      expect(
        stripCommandEcho([
          'before',
          'python /app/aks-agent.py ask',
          '> line 1',
          '  > line 2',
          'AI: hi',
        ])
      ).toEqual(['before', 'AI: hi']);
    });

    it('returns the input unchanged when no command echo is present', () => {
      expect(stripCommandEcho(['AI: hi'])).toEqual(['AI: hi']);
    });
  });

  describe('extractAIAnswer', () => {
    it('extracts inline AI content after stripping command echo, ANSI codes, and prompt lines', () => {
      const rawOutput = [
        'python /app/aks-agent.py ask',
        '> quoted history',
        'AI: \u001b[31mHello\u001b[0m',
        '',
        'root@aks-agent:/app#',
      ].join('\n');

      expect(extractAIAnswer(rawOutput)).toBe('Hello');
    });

    it('extracts multiline AI content and normalizes unicode bullets', () => {
      const rawOutput = [
        'Task List:',
        '+---+',
        '| t1 | inspect | [ ] pending |',
        'AI:',
        '• First',
        '  · Nested',
        'root@aks-agent:/app#',
      ].join('\n');

      expect(extractAIAnswer(rawOutput)).toBe('- First\n  - Nested');
    });

    it('falls back to cleaned content when no AI prefix exists', () => {
      const rawOutput = ['User: ignored question', 'Result line', 'root@aks-agent:/app#'].join('\n');
      expect(extractAIAnswer(rawOutput)).toBe('Result line');
    });
  });
});
