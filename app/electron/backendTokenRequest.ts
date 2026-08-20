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

// Keep this spelling in sync with backend/pkg/auth/backendtoken.go.
const BACKEND_TOKEN_HEADER = 'X-HEADLAMP_BACKEND-TOKEN';

type RequestDetails = {
  url: string;
  requestHeaders: Record<string, string>;
};

type RequestCallback = (response: { requestHeaders: Record<string, string> }) => void;

/**
 * Creates an Electron request handler that authenticates renderer requests to the bundled backend.
 *
 * @param backendOrigin Origin of the bundled backend.
 * @param backendToken Per-launch backend token.
 * @returns The request handler.
 */
export function createBackendTokenRequestHandler(
  backendOrigin: string,
  backendToken: string
): (details: RequestDetails, callback: RequestCallback) => void {
  return (details, callback) => {
    const requestHeaders = { ...details.requestHeaders };

    if (new URL(details.url).origin === backendOrigin) {
      for (const header of Object.keys(requestHeaders)) {
        if (header.toLowerCase() === BACKEND_TOKEN_HEADER.toLowerCase()) {
          delete requestHeaders[header];
        }
      }
      requestHeaders[BACKEND_TOKEN_HEADER] = backendToken;
    }

    callback({ requestHeaders });
  };
}
