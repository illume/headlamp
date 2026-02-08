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
  getAppInsightsConnectionString,
  getReactPlugin,
  initializeAppInsights,
  isAppInsightsConfigured,
  isAppInsightsEnabled,
  isTelemetryEnabled,
  setTelemetryEnabled,
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
      config: {
        disableTelemetry: false,
      },
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
  let originalEnv: string | undefined;

  beforeEach(() => {
    localStorage.clear();
    originalEnv = import.meta.env.REACT_APP_INSIGHTS_CONNECTION;
  });

  afterEach(() => {
    if (originalEnv !== undefined) {
      (import.meta.env as any).REACT_APP_INSIGHTS_CONNECTION = originalEnv;
    } else {
      delete (import.meta.env as any).REACT_APP_INSIGHTS_CONNECTION;
    }
  });

  describe('getAppInsightsConnectionString', () => {
    it('should return undefined when env var is not set', () => {
      delete (import.meta.env as any).REACT_APP_INSIGHTS_CONNECTION;
      expect(getAppInsightsConnectionString()).toBeUndefined();
    });

    it('should return the connection string when set', () => {
      (import.meta.env as any).REACT_APP_INSIGHTS_CONNECTION = 'test-connection-string';
      expect(getAppInsightsConnectionString()).toBe('test-connection-string');
    });
  });

  describe('isAppInsightsConfigured', () => {
    it('should return false when env var is not set', () => {
      delete (import.meta.env as any).REACT_APP_INSIGHTS_CONNECTION;
      expect(isAppInsightsConfigured()).toBe(false);
    });

    it('should return false when env var is empty', () => {
      (import.meta.env as any).REACT_APP_INSIGHTS_CONNECTION = '';
      expect(isAppInsightsConfigured()).toBe(false);
    });

    it('should return false when env var is whitespace', () => {
      (import.meta.env as any).REACT_APP_INSIGHTS_CONNECTION = '   ';
      expect(isAppInsightsConfigured()).toBe(false);
    });

    it('should return true when env var is set', () => {
      (import.meta.env as any).REACT_APP_INSIGHTS_CONNECTION = 'test-connection-string';
      expect(isAppInsightsConfigured()).toBe(true);
    });
  });

  describe('isAppInsightsEnabled', () => {
    it('should return false when not configured', () => {
      delete (import.meta.env as any).REACT_APP_INSIGHTS_CONNECTION;
      expect(isAppInsightsEnabled()).toBe(false);
    });

    it('should return false when configured but telemetry not enabled', () => {
      (import.meta.env as any).REACT_APP_INSIGHTS_CONNECTION = 'test-connection-string';
      localStorage.removeItem('headlamp-app-insights-enabled');
      expect(isAppInsightsEnabled()).toBe(false);
    });

    it('should return true when configured and telemetry enabled', () => {
      (import.meta.env as any).REACT_APP_INSIGHTS_CONNECTION = 'test-connection-string';
      localStorage.setItem('headlamp-app-insights-enabled', 'true');
      expect(isAppInsightsEnabled()).toBe(true);
    });
  });

  describe('initializeAppInsights', () => {
    it('should return null when connection string is not set', () => {
      delete (import.meta.env as any).REACT_APP_INSIGHTS_CONNECTION;
      expect(initializeAppInsights()).toBeNull();
    });

    it('should return null when connection string is empty', () => {
      (import.meta.env as any).REACT_APP_INSIGHTS_CONNECTION = '';
      expect(initializeAppInsights()).toBeNull();
    });
  });

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

  describe('telemetry settings', () => {
    beforeEach(() => {
      localStorage.clear();
    });

    it('should return false by default for isTelemetryEnabled', () => {
      expect(isTelemetryEnabled()).toBe(false);
    });

    it('should persist telemetry enabled setting', () => {
      setTelemetryEnabled(true);
      expect(isTelemetryEnabled()).toBe(true);
    });

    it('should persist telemetry disabled setting', () => {
      setTelemetryEnabled(true);
      setTelemetryEnabled(false);
      expect(isTelemetryEnabled()).toBe(false);
    });
  });
});
