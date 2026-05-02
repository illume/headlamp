package spa

import (
	"mime"
	"net/http"
	"os"
	"path/filepath"
	"strings"

	"github.com/kubernetes-sigs/headlamp/backend/pkg/logger"
)

type spaHandler struct {
	// staticPath is the path to the static files.
	staticPath string
	// indexPath is the path to the index.html file.
	indexPath string
	// baseURL is the base URL of the application.
	baseURL string
}

func (h spaHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	if strings.Contains(r.URL.Path, "..") {
		http.Error(w, "Contains unexpected '..'", http.StatusBadRequest)
		return
	}

	absStaticPath, err := filepath.Abs(h.staticPath)
	if err != nil {
		logger.Log(logger.LevelError, nil, err, "getting absolute static path")
		http.Error(w, err.Error(), http.StatusInternalServerError)

		return
	}

	// Clean the path to prevent directory traversal
	path := filepath.Clean(r.URL.Path)
	path = strings.TrimPrefix(path, h.baseURL)

	// prepend the path with the path to the static directory
	path = filepath.Join(absStaticPath, path)

	// This is defensive, for preventing using files outside of the staticPath
	// if in the future we touch the code.
	absPath, err := filepath.Abs(path)
	if err != nil || !strings.HasPrefix(absPath, absStaticPath) {
		http.Error(w, "Invalid file name (file to serve is outside of the static dir!)", http.StatusBadRequest)
		return
	}

	// check whether a file exists at the given path
	_, err = os.Stat(path)
	if os.IsNotExist(err) {
		// file does not exist, serve index.html
		h.serveStatic(w, r, filepath.Join(absStaticPath, h.indexPath))
		return
	} else if err != nil {
		// if we got an error (that wasn't that the file doesn't exist) stating the
		// file, return a 500 internal server error and stop
		logger.Log(logger.LevelError, nil, err, "stating file")
		http.Error(w, err.Error(), http.StatusInternalServerError)

		return
	}

	// The file does exist, so we serve that.
	h.serveStatic(w, r, path)
}

// serveStatic serves a static file, transparently swapping in a precompressed
// `.br`/`.gz` sidecar when the client advertises support and the sidecar
// exists on disk. The Content-Type is always derived from the original
// filename so the encoding handshake is invisible to the client.
func (h spaHandler) serveStatic(w http.ResponseWriter, r *http.Request, path string) {
	// `Vary: Accept-Encoding` must be set on every response from this
	// handler so caches keep per-encoding entries even when we end up
	// serving the identity representation.
	setEncodingHeaders(w, "")

	if encoding := pickEncoding(r.Header.Get("Accept-Encoding")); encoding != "" {
		sidecar := path + encodingExt(encoding)
		if info, err := os.Stat(sidecar); err == nil && !info.IsDir() {
			ctype := mime.TypeByExtension(filepath.Ext(path))
			if ctype != "" {
				w.Header().Set("Content-Type", ctype)
			}

			setEncodingHeaders(w, encoding)
			http.ServeFile(w, r, sidecar)

			return
		}
	}

	http.ServeFile(w, r, path)
}

// NewHandler creates a new handler.
func NewHandler(staticPath, indexPath, baseURL string) *spaHandler {
	return &spaHandler{
		staticPath: staticPath,
		indexPath:  indexPath,
		baseURL:    baseURL,
	}
}
