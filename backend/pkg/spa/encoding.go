package spa

import (
	"net/http"
	"strings"
)

// pickEncoding returns the best precompressed encoding to serve for a request
// based on its Accept-Encoding header. It returns "br" or "".
//
// Only brotli is supported: every browser Headlamp targets ships with brotli,
// the build pipeline only emits `.br` sidecars, and serving gzip would
// require a parallel set of files for no real-world benefit. Encodings whose
// quality value (`q=`) is explicitly 0 are never selected. The function does
// not parse the full RFC 7231 grammar; it implements just enough to recognise
// the common cases produced by browsers and well-behaved HTTP clients.
func pickEncoding(acceptEncoding string) string {
	if acceptEncoding == "" {
		return ""
	}

	for _, raw := range strings.Split(acceptEncoding, ",") {
		token := strings.TrimSpace(raw)
		if token == "" {
			continue
		}

		// Split off the parameters (e.g. "br;q=0.5").
		name := token
		params := ""
		if i := strings.Index(token, ";"); i >= 0 {
			name = strings.TrimSpace(token[:i])
			params = token[i+1:]
		}

		// q=0 disables this encoding even if it would otherwise match.
		if hasZeroQ(params) {
			continue
		}

		switch strings.ToLower(name) {
		case "br", "*":
			return "br"
		}
	}

	return ""
}

// hasZeroQ reports whether an Accept-Encoding parameter list contains q=0
// (or any case/whitespace variant such as "Q = 0", "q=0.0", "q=0.000").
func hasZeroQ(params string) bool {
	for _, p := range strings.Split(params, ";") {
		p = strings.TrimSpace(p)
		eq := strings.IndexByte(p, '=')
		if eq < 0 {
			continue
		}

		key := strings.ToLower(strings.TrimSpace(p[:eq]))
		val := strings.TrimSpace(p[eq+1:])

		if key != "q" {
			continue
		}

		// "0", "0.", "0.0", "0.000" all mean disabled. Anything with a
		// non-zero digit anywhere means a positive (or malformed) weight.
		if val == "" {
			continue
		}

		isZero := true

		for _, r := range val {
			if r >= '1' && r <= '9' {
				isZero = false
				break
			}
		}

		if isZero {
			return true
		}
	}

	return false
}

// encodingExt returns the filename suffix (".br") for a given negotiated
// encoding, or "" if no precompressed sidecar should be served.
func encodingExt(encoding string) string {
	if encoding == "br" {
		return ".br"
	}

	return ""
}

// setEncodingHeaders writes the response headers required when serving a
// precompressed sidecar. The original Content-Type (derived from the
// non-compressed filename) must already be set on w.
func setEncodingHeaders(w http.ResponseWriter, encoding string) {
	// Vary is set unconditionally so caches keep separate entries per
	// Accept-Encoding even for clients that ended up with the identity
	// representation.
	w.Header().Add("Vary", "Accept-Encoding")

	if encoding != "" {
		w.Header().Set("Content-Encoding", encoding)
	}
}
