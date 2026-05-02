package spa_test

import (
	"context"
	"io/fs"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"testing"
	"testing/fstest"

	"github.com/kubernetes-sigs/headlamp/backend/pkg/spa"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// writeFile is a small helper to create an arbitrary file under dir.
func writeFile(t *testing.T, dir, name string, content []byte) {
	t.Helper()

	full := filepath.Join(dir, name)
	require.NoError(t, os.MkdirAll(filepath.Dir(full), 0o750))
	require.NoError(t, os.WriteFile(full, content, 0o644)) //nolint:gosec
}

// TestSpaHandlerServesPrecompressedSidecar verifies that the on-disk
// spaHandler picks the brotli sidecar when it exists and the client
// advertises support, and falls back to identity when it doesn't.
func TestSpaHandlerServesPrecompressedSidecar(t *testing.T) {
	dir := t.TempDir()

	originalJS := []byte("// big readable javascript here\n" +
		"function hello() { console.log('hi'); }\n")
	brBytes := []byte("BROTLI-PAYLOAD") // contents are arbitrary; handler must not decode them

	writeFile(t, dir, "index.html", []byte("the-index"))
	writeFile(t, dir, "app.js", originalJS)
	writeFile(t, dir, "app.js.br", brBytes)

	handler := spa.NewHandler(dir, "index.html", "/headlamp")

	tests := []struct {
		name           string
		acceptEncoding string
		wantBody       []byte
		wantEncoding   string
	}{
		{"prefers brotli when offered", "br, gzip", brBytes, "br"},
		{"identity when client only offers gzip", "gzip", originalJS, ""},
		{"explicit brotli only", "br", brBytes, "br"},
		{"identity when no encoding header", "", originalJS, ""},
		{"identity when brotli is disabled", "br;q=0", originalJS, ""},
		{"brotli via wildcard", "*", brBytes, "br"},
		{"q=0 for br with wildcard later still disables br", "br;q=0, *;q=0.5", originalJS, ""},
		{"unsupported encoding falls through to identity", "deflate", originalJS, ""},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			req, err := http.NewRequestWithContext(
				context.Background(), "GET", "/headlamp/app.js", nil)
			require.NoError(t, err)

			if tc.acceptEncoding != "" {
				req.Header.Set("Accept-Encoding", tc.acceptEncoding)
			}

			rr := httptest.NewRecorder()
			handler.ServeHTTP(rr, req)

			assert.Equal(t, http.StatusOK, rr.Code)
			assert.Equal(t, string(tc.wantBody), rr.Body.String())
			assert.Equal(t, tc.wantEncoding, rr.Header().Get("Content-Encoding"))
			// Vary must always be present so caches keep per-encoding entries.
			assert.Contains(t, rr.Header().Get("Vary"), "Accept-Encoding")
			// Content-Type must reflect the original (.js) regardless of encoding.
			assert.Contains(t, rr.Header().Get("Content-Type"), "javascript")
		})
	}
}

// TestSpaHandlerNoSidecarUsesIdentity ensures we don't break files that
// don't have a precompressed sidecar even when the client supports brotli.
func TestSpaHandlerNoSidecarUsesIdentity(t *testing.T) {
	dir := t.TempDir()

	writeFile(t, dir, "index.html", []byte("the-index"))
	writeFile(t, dir, "small.css", []byte(".x{}"))

	handler := spa.NewHandler(dir, "index.html", "/headlamp")

	req, err := http.NewRequestWithContext(
		context.Background(), "GET", "/headlamp/small.css", nil)
	require.NoError(t, err)
	req.Header.Set("Accept-Encoding", "br")

	rr := httptest.NewRecorder()
	handler.ServeHTTP(rr, req)

	assert.Equal(t, http.StatusOK, rr.Code)
	assert.Equal(t, ".x{}", rr.Body.String())
	assert.Empty(t, rr.Header().Get("Content-Encoding"))
	assert.Contains(t, rr.Header().Get("Vary"), "Accept-Encoding")
}

// TestEmbeddedSpaHandlerServesPrecompressedSidecar verifies the embed.FS
// handler does the same brotli negotiation for non-index assets.
func TestEmbeddedSpaHandlerServesPrecompressedSidecar(t *testing.T) {
	files := map[string]*fstest.MapFile{
		"static/index.html": {Data: []byte(getTestHTML())},
		"static/app.js":     {Data: []byte("function hi() {}")},
		"static/app.js.br":  {Data: []byte("BROTLI-PAYLOAD")},
	}

	handler := spa.NewEmbeddedHandler(fs.FS(fstest.MapFS(files)), "index.html", "/headlamp")

	tests := []struct {
		name           string
		acceptEncoding string
		wantBody       string
		wantEncoding   string
	}{
		{"brotli", "br, gzip", "BROTLI-PAYLOAD", "br"},
		{"identity when only gzip offered", "gzip", "function hi() {}", ""},
		{"identity", "", "function hi() {}", ""},
		{"identity when brotli disabled", "br;q=0", "function hi() {}", ""},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			req, err := http.NewRequestWithContext(
				context.Background(), "GET", "/headlamp/app.js", nil)
			require.NoError(t, err)

			if tc.acceptEncoding != "" {
				req.Header.Set("Accept-Encoding", tc.acceptEncoding)
			}

			rr := httptest.NewRecorder()
			handler.ServeHTTP(rr, req)

			assert.Equal(t, http.StatusOK, rr.Code)
			assert.Equal(t, tc.wantBody, rr.Body.String())
			assert.Equal(t, tc.wantEncoding, rr.Header().Get("Content-Encoding"))
			assert.Contains(t, rr.Header().Get("Vary"), "Accept-Encoding")
			assert.Contains(t, rr.Header().Get("Content-Type"), "javascript")
		})
	}
}

// TestEmbeddedSpaHandlerNeverServesEncodedIndex makes sure we don't try to
// serve the index.html via a precompressed sidecar, because the handler
// rewrites its body for baseURL substitution.
func TestEmbeddedSpaHandlerNeverServesEncodedIndex(t *testing.T) {
	files := map[string]*fstest.MapFile{
		"static/index.html": {Data: []byte(getTestHTML())},
		// A bogus index.html.br that, if served, would produce wrong bytes.
		"static/index.html.br": {Data: []byte("SHOULD-NEVER-BE-SERVED")},
	}

	handler := spa.NewEmbeddedHandler(fs.FS(fstest.MapFS(files)), "index.html", "/headlamp")

	req, err := http.NewRequestWithContext(
		context.Background(), "GET", "/headlamp/index.html", nil)
	require.NoError(t, err)
	req.Header.Set("Accept-Encoding", "br")

	rr := httptest.NewRecorder()
	handler.ServeHTTP(rr, req)

	assert.Equal(t, http.StatusOK, rr.Code)
	assert.Empty(t, rr.Header().Get("Content-Encoding"),
		"index.html must be served as identity so baseURL rewriting works")
	assert.Contains(t, rr.Body.String(), "__baseUrl__ = '/headlamp';")
	assert.Contains(t, rr.Header().Get("Vary"), "Accept-Encoding")
}

// TestEmbeddedSpaHandlerMissingSidecarFallsThrough ensures a missing sidecar
// doesn't break the response: we still serve the identity bytes with the
// correct content-type and no Content-Encoding header.
func TestEmbeddedSpaHandlerMissingSidecarFallsThrough(t *testing.T) {
	files := map[string]*fstest.MapFile{
		"static/index.html": {Data: []byte(getTestHTML())},
		"static/app.js":     {Data: []byte("function hi() {}")},
	}

	handler := spa.NewEmbeddedHandler(fs.FS(fstest.MapFS(files)), "index.html", "/headlamp")

	req, err := http.NewRequestWithContext(
		context.Background(), "GET", "/headlamp/app.js", nil)
	require.NoError(t, err)
	req.Header.Set("Accept-Encoding", "br")

	rr := httptest.NewRecorder()
	handler.ServeHTTP(rr, req)

	assert.Equal(t, http.StatusOK, rr.Code)
	assert.Equal(t, "function hi() {}", rr.Body.String())
	assert.Empty(t, rr.Header().Get("Content-Encoding"))
	assert.Contains(t, rr.Header().Get("Content-Type"), "javascript")
	assert.Contains(t, rr.Header().Get("Vary"), "Accept-Encoding")
}
