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

import { describe, expect, it } from 'vitest';
import { ThinkingStepTracker, extractTaskRow, friendlyToolLabel } from './aksAgentThinking';

describe('aksAgentThinking', () => {
  describe('friendlyToolLabel', () => {
    it('maps normal tool lines to friendly labels', () => {
      expect(friendlyToolLabel('Running tool #3 read_file: src/index.ts')).toBe('Reading file');
      expect(friendlyToolLabel('Running tool #4 list_pods: default')).toBe('Running list_pods');
    });

    it('returns null for kubectl tools', () => {
      expect(friendlyToolLabel('Running tool #1 call_kubectl: get pods')).toBeNull();
    });

    it('returns null for TodoWrite tools', () => {
      expect(friendlyToolLabel('Running tool #2 TodoWrite: planning')).toBeNull();
    });

    it('uses a custom label for web searches', () => {
      expect(friendlyToolLabel('Running tool #5 web_search: kubernetes')).toBe('Searching the web');
    });

    it('falls back to a generic label for invalid input', () => {
      expect(friendlyToolLabel('not a tool line')).toBe('Running tool');
    });
  });

  describe('extractTaskRow', () => {
    it('extracts pending rows', () => {
      expect(
        extractTaskRow('| t1 | List all pods across all namespaces in AKS cluster | [ ] pending |')
      ).toEqual({
        content: 'List all pods across all namespaces in AKS cluster',
        status: 'pending',
      });
    });

    it('extracts in-progress rows', () => {
      expect(extractTaskRow('| t2 | Investigate matching pods | [~] in_progress |')).toEqual({
        content: 'Investigate matching pods',
        status: 'in_progress',
      });
    });

    it('extracts completed rows', () => {
      expect(extractTaskRow('| t3 | Present the results | [✓] completed |')).toEqual({
        content: 'Present the results',
        status: 'completed',
      });
    });

    it('returns null for non-matching lines', () => {
      expect(extractTaskRow('Task List:')).toBeNull();
    });
  });

  describe('ThinkingStepTracker', () => {
    it('adds a completed init step for loaded models', () => {
      const tracker = new ThinkingStepTracker();
      expect(tracker.processLine("Loaded models: ['gpt-4.1']")).toBe(true);
      expect(tracker.steps).toEqual([
        expect.objectContaining({
          label: 'Model: gpt-4.1',
          status: 'completed',
          phase: 'init',
        }),
      ]);
    });

    it('adds a completed init step for toolset lines', () => {
      const tracker = new ThinkingStepTracker();
      expect(tracker.processLine('✅ Toolset Kubernetes tools')).toBe(true);
      expect(tracker.steps).toEqual([
        expect.objectContaining({
          label: 'Toolset: Kubernetes tools',
          status: 'completed',
          phase: 'init',
        }),
      ]);
    });

    it('adds planning steps from task rows', () => {
      const tracker = new ThinkingStepTracker();
      expect(tracker.processLine('| t1 | Plan the investigation | [ ] pending |')).toBe(true);
      expect(tracker.steps).toEqual([
        expect.objectContaining({
          label: 'Plan the investigation',
          status: 'pending',
          phase: 'planning',
        }),
      ]);
    });

    it('adds executing steps for running tools', () => {
      const tracker = new ThinkingStepTracker();
      expect(tracker.processLine('Running tool #7 web_search: aks workload identity')).toBe(true);
      expect(tracker.steps).toEqual([
        expect.objectContaining({
          label: 'Searching the web',
          status: 'running',
          phase: 'executing',
        }),
      ]);
    });

    it('marks running tool steps completed when the tool finishes', () => {
      const tracker = new ThinkingStepTracker();
      tracker.processLine('Running tool #8 file_read: src/index.ts');
      expect(tracker.processLine('Finished #8 in 0.4s')).toBe(true);
      expect(tracker.steps[0]).toEqual(
        expect.objectContaining({
          label: 'Reading file',
          status: 'completed',
          phase: 'executing',
        })
      );
    });

    it('ignores blank and irrelevant lines', () => {
      const tracker = new ThinkingStepTracker();
      expect(tracker.processLine('')).toBe(false);
      expect(tracker.processLine('Using model: gpt-4.1')).toBe(false);
      expect(tracker.processLine('some unrelated output')).toBe(false);
      expect(tracker.steps).toEqual([]);
    });
  });
});
