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
import { useEffect, useRef } from 'react';
import { useHistory } from 'react-router-dom';

let appInsights: ApplicationInsights | null = null;
let reactPlugin: ReactPlugin | null = null;

/**
 * Gets the Application Insights connection string from environment variable.
 * @returns The connection string or undefined if not set.
 */
export function getAppInsightsConnectionString(): string | undefined {
  return import.meta.env.REACT_APP_HEADLAMP_APP_INSIGHTS_CONNECTION;
}

/**
 * Checks if Application Insights is enabled.
 * @returns True if enabled, false otherwise.
 */
export function isAppInsightsEnabled(): boolean {
  const connectionString = getAppInsightsConnectionString();
  return !!connectionString && connectionString.trim().length > 0;
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
      enableRequestHeaderTracking: true,
      enableResponseHeaderTracking: true,
    },
  });

  appInsights.loadAppInsights();
  appInsights.trackPageView();

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
 * @param error - The error to track.
 * @param severityLevel - Optional severity level (0-4, where 0 is Verbose, 4 is Critical).
 */
export function trackException(error: Error, severityLevel?: number): void {
  if (appInsights) {
    appInsights.trackException({ exception: error, severityLevel });
  }
}

/**
 * Tracks a custom event in Application Insights.
 * @param name - The name of the event.
 * @param properties - Optional custom properties.
 */
export function trackEvent(name: string, properties?: Record<string, string>): void {
  if (appInsights) {
    appInsights.trackEvent({ name }, properties);
  }
}

/**
 * React component that initializes Application Insights.
 * Must be rendered inside a Router context to access history.
 * Renders nothing (null).
 */
export function AppInsightsInitializer(): null {
  const history = useHistory();
  const initialized = useRef(false);

  useEffect(() => {
    if (!initialized.current && isAppInsightsEnabled()) {
      initializeAppInsights(history);
      initialized.current = true;
    }
  }, [history]);

  return null;
}
