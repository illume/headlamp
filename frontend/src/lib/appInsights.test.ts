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
  getAppInsights,
  getReactPlugin,
  trackEvent,
  trackException,
} from './appInsights';

// Mock the ApplicationInsights and ReactPlugin
vi.mock('@microsoft/applicationinsights-web', () => {
  return {
    ApplicationInsights: vi.fn().mockImplementation(() => ({
      loadAppInsights: vi.fn(),
      trackPageView: vi.fn(),
      trackException: vi.fn(),
      trackEvent: vi.fn(),
    })),
  };
});

vi.mock('@microsoft/applicationinsights-react-js', () => {
  return {
    ReactPlugin: vi.fn().mockImplementation(() => ({
      identifier: 'ReactPlugin',
    })),
  };
});

describe('appInsights', () => {
  // Note: Environment variable tests are skipped because import.meta.env is evaluated at compile time
  // and cannot be easily mocked. The actual functionality is tested manually and by integration tests.

  describe('getAppInsights', () => {
    it('should return null when App Insights is not initialized', () => {
      const result = getAppInsights();
      expect(result).toBeNull();
    });
  });

  describe('getReactPlugin', () => {
    it('should return null when App Insights is not initialized', () => {
      const result = getReactPlugin();
      expect(result).toBeNull();
    });
  });

  describe('trackException', () => {
    it('should not throw when called without initialization', () => {
      expect(() => trackException(new Error('test'))).not.toThrow();
    });

    it('should handle error with severity level', () => {
      expect(() => trackException(new Error('test'), 3)).not.toThrow();
    });
  });

  describe('trackEvent', () => {
    it('should not throw when called without initialization', () => {
      expect(() => trackEvent('test-event')).not.toThrow();
    });

    it('should handle event with properties', () => {
      expect(() => trackEvent('test-event', { prop1: 'value1' })).not.toThrow();
    });
  });
});
