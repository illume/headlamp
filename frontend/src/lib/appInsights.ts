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

import { ReactPlugin } from '@microsoft/applicationinsights-react-js';
import { ApplicationInsights } from '@microsoft/applicationinsights-web';
import type { History } from 'history';
import { useEffect } from 'react';
import { useHistory } from 'react-router-dom';

let appInsights: ApplicationInsights | null = null;
let reactPlugin: ReactPlugin | null = null;

const APP_INSIGHTS_ENABLED_KEY = 'headlamp-app-insights-enabled';

/**
 * Gets the Application Insights connection string from environment variable.
 * @returns The connection string or undefined if not set.
 */
export function getAppInsightsConnectionString(): string | undefined {
  return import.meta.env.REACT_APP_INSIGHTS_CONNECTION;
}

/**
 * Checks if the App Insights connection string is configured.
 * @returns True if the connection string env var is set, false otherwise.
 */
export function isAppInsightsConfigured(): boolean {
  const connectionString = getAppInsightsConnectionString();
  return !!connectionString && connectionString.trim().length > 0;
}

/**
 * Gets the telemetry enabled setting from localStorage.
 * @returns True if telemetry is enabled, false otherwise. Defaults to false.
 */
export function isTelemetryEnabled(): boolean {
  try {
    return localStorage.getItem(APP_INSIGHTS_ENABLED_KEY) === 'true';
  } catch {
    return false;
  }
}

/**
 * Sets the telemetry enabled setting in localStorage and updates the SDK's disableTelemetry flag.
 * Same-tab changes are handled immediately here; other-tab changes are handled via storage event.
 * @param enabled - Whether telemetry should be enabled.
 */
export function setTelemetryEnabled(enabled: boolean): void {
  try {
    localStorage.setItem(APP_INSIGHTS_ENABLED_KEY, enabled ? 'true' : 'false');
    // Update SDK telemetry state if already initialized
    if (appInsights) {
      appInsights.config.disableTelemetry = !enabled;
      if (enabled) {
        appInsights.trackPageView();
      }
    }
  } catch {
    // Ignore localStorage errors
  }
}

/**
 * Checks if Application Insights should be active.
 * Requires both the connection string to be configured AND telemetry to be enabled in settings.
 * @returns True if enabled, false otherwise.
 */
export function isAppInsightsEnabled(): boolean {
  return isAppInsightsConfigured() && isTelemetryEnabled();
}

/**
 * Initializes Application Insights with the given history object.
 * This should be called once when the app starts.
 *
 * @param history - The browser history object from react-router for tracking navigation.
 * @returns The ReactPlugin instance for use with withAITracking HOC, or null if not enabled.
 */
export function initializeAppInsights(history?: History): ReactPlugin | null {
  const connectionString = getAppInsightsConnectionString();

  if (!connectionString || connectionString.trim().length === 0) {
    return null;
  }

  // Prevent re-initialization
  if (appInsights) {
    // Update telemetry state based on current setting
    appInsights.config.disableTelemetry = !isTelemetryEnabled();
    return reactPlugin;
  }

  reactPlugin = new ReactPlugin();

  appInsights = new ApplicationInsights({
    config: {
      connectionString,
      extensions: [reactPlugin],
      extensionConfig: {
        [reactPlugin.identifier]: { history },
      },
      enableAutoRouteTracking: true,
      disableFetchTracking: false,
      disableAjaxTracking: false,
      autoTrackPageVisitTime: true,
      enableCorsCorrelation: true,
      // Disable header tracking to avoid capturing sensitive auth/session headers
      enableRequestHeaderTracking: false,
      enableResponseHeaderTracking: false,
      // Start with telemetry disabled if user hasn't opted in
      disableTelemetry: !isTelemetryEnabled(),
    },
  });

  appInsights.loadAppInsights();
  if (isTelemetryEnabled()) {
    appInsights.trackPageView();
  }

  return reactPlugin;
}

/**
 * Gets the Application Insights instance.
 * @returns The Application Insights instance or null if not initialized.
 */
export function getAppInsights(): ApplicationInsights | null {
  return appInsights;
}

/**
 * Gets the React plugin instance.
 * @returns The React plugin instance or null if not initialized.
 */
export function getReactPlugin(): ReactPlugin | null {
  return reactPlugin;
}

/**
 * Tracks an exception in Application Insights.
 * Only sends if telemetry is enabled.
 * @param error - The error to track.
 * @param severityLevel - Optional severity level (0-4, where 0 is Verbose, 4 is Critical).
 */
export function trackException(error: Error, severityLevel?: number): void {
  if (appInsights && isTelemetryEnabled()) {
    appInsights.trackException({ exception: error, severityLevel });
  }
}

/**
 * Tracks a custom event in Application Insights.
 * Only sends if telemetry is enabled.
 * @param name - The name of the event.
 * @param properties - Optional custom properties.
 */
export function trackEvent(name: string, properties?: Record<string, string>): void {
  if (appInsights && isTelemetryEnabled()) {
    appInsights.trackEvent({ name }, properties);
  }
}

/**
 * React component that initializes Application Insights.
 * Must be rendered inside a Router context to access history.
 * Listens for telemetry setting changes from other tabs.
 * Same-tab changes are handled directly in setTelemetryEnabled().
 * Renders nothing (null).
 */
export function AppInsightsInitializer(): null {
  const history = useHistory();

  // Initialize App Insights on mount (always initialize SDK, but with telemetry disabled if not opted in)
  useEffect(() => {
    initializeAppInsights(history);
  }, [history]);

  // Listen for localStorage changes from other tabs
  useEffect(() => {
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === APP_INSIGHTS_ENABLED_KEY && appInsights) {
        const enabled = event.newValue === 'true';
        appInsights.config.disableTelemetry = !enabled;
        if (enabled) {
          appInsights.trackPageView();
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  return null;
}
