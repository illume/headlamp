/*
Copyright 2026 The Kubernetes Authors.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

package auth

import (
	"context"
	"encoding/base64"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestCheckBackendToken(t *testing.T) {
	tests := []struct {
		name         string
		useInCluster bool
		envToken     string
		headerToken  string
		wantStatus   int
		wantError    bool
	}{
		{
			name:        "valid token",
			envToken:    "desktop-token",
			headerToken: "desktop-token",
			wantStatus:  http.StatusOK,
		},
		{
			name:        "wrong token",
			envToken:    "desktop-token",
			headerToken: "wrong-token",
			wantStatus:  http.StatusForbidden,
			wantError:   true,
		},
		{
			name:        "empty configured token",
			headerToken: "desktop-token",
			wantStatus:  http.StatusForbidden,
			wantError:   true,
		},
		{
			name:         "in-cluster bypass",
			useInCluster: true,
			envToken:     "desktop-token",
			headerToken:  "wrong-token",
			wantStatus:   http.StatusOK,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Setenv("HEADLAMP_BACKEND_TOKEN", tt.envToken)

			req := httptest.NewRequestWithContext(context.Background(), http.MethodGet, "/", nil)
			req.Header.Set(backendTokenHeader, tt.headerToken)
			recorder := httptest.NewRecorder()

			err := CheckBackendToken(tt.useInCluster, recorder, req)

			assert.Equal(t, tt.wantError, err != nil)
			assert.Equal(t, tt.wantStatus, recorder.Code)
		})
	}
}

//nolint:funlen
func TestNewBackendTokenMiddleware(t *testing.T) {
	const validToken = "desktop-token"

	tokenProtocol := backendTokenProtocolPrefix + base64.RawURLEncoding.EncodeToString([]byte(validToken))

	tests := []struct {
		name                string
		useInCluster        bool
		configuredToken     string
		tokenHeader         string
		protocolHeaders     []string
		wantStatus          int
		wantProtocol        string
		wantTokenDownstream string
	}{
		{
			name:            "valid header",
			configuredToken: validToken,
			tokenHeader:     validToken,
			wantStatus:      http.StatusNoContent,
		},
		{
			name:            "valid protocol",
			configuredToken: validToken,
			protocolHeaders: []string{"v4.channel.k8s.io, " + tokenProtocol},
			wantStatus:      http.StatusNoContent,
			wantProtocol:    "v4.channel.k8s.io",
		},
		{
			name:            "valid protocol across header values",
			configuredToken: validToken,
			protocolHeaders: []string{"v4.channel.k8s.io", tokenProtocol},
			wantStatus:      http.StatusNoContent,
			wantProtocol:    "v4.channel.k8s.io",
		},
		{
			name:            "malformed protocol",
			configuredToken: validToken,
			protocolHeaders: []string{backendTokenProtocolPrefix + "%"},
			wantStatus:      http.StatusForbidden,
		},
		{
			name:            "duplicate protocol",
			configuredToken: validToken,
			protocolHeaders: []string{tokenProtocol + ", " + tokenProtocol},
			wantStatus:      http.StatusForbidden,
		},
		{
			name:            "conflicting header and protocol",
			configuredToken: validToken,
			tokenHeader:     "different-token",
			protocolHeaders: []string{tokenProtocol},
			wantStatus:      http.StatusForbidden,
		},
		{
			name:            "matching header and protocol",
			configuredToken: validToken,
			tokenHeader:     validToken,
			protocolHeaders: []string{tokenProtocol},
			wantStatus:      http.StatusNoContent,
		},
		{
			name:            "missing token",
			configuredToken: validToken,
			wantStatus:      http.StatusForbidden,
		},
		{
			name:                "in-cluster bypass preserves transports",
			useInCluster:        true,
			configuredToken:     validToken,
			tokenHeader:         "unvalidated-token",
			protocolHeaders:     []string{backendTokenProtocolPrefix + "%"},
			wantStatus:          http.StatusNoContent,
			wantProtocol:        backendTokenProtocolPrefix + "%",
			wantTokenDownstream: "unvalidated-token",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Setenv("HEADLAMP_BACKEND_TOKEN", tt.configuredToken)

			next := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				assert.Equal(t, tt.wantProtocol, r.Header.Get("Sec-WebSocket-Protocol"))
				assert.Equal(t, tt.wantTokenDownstream, r.Header.Get(backendTokenHeader))
				w.WriteHeader(http.StatusNoContent)
			})
			req := httptest.NewRequestWithContext(context.Background(), http.MethodGet, "/", nil)

			if tt.tokenHeader != "" {
				req.Header.Set(backendTokenHeader, tt.tokenHeader)
			}

			for _, protocolHeader := range tt.protocolHeaders {
				req.Header.Add("Sec-WebSocket-Protocol", protocolHeader)
			}

			recorder := httptest.NewRecorder()
			NewBackendTokenMiddleware(tt.useInCluster)(next).ServeHTTP(recorder, req)

			assert.Equal(t, tt.wantStatus, recorder.Code)

			if tt.wantStatus == http.StatusForbidden {
				assert.NotContains(t, recorder.Body.String(), validToken)
			}
		})
	}
}
