package server

import (
	"context"
	"fmt"
	"io"
	"io/fs"
	"log"
	"net"
	"net/http"
	"path/filepath"
	"strings"
	"time"

	"github.com/N1N4U/Hex/panel/config"
	hexcore "github.com/N1N4U/Hex/panel/core"
	"github.com/N1N4U/Hex/panel/static"
)

type Server struct {
	cfg        *config.Config
	coreClient *hexcore.Client
	mux        *http.ServeMux
}

func New(cfg *config.Config) *Server {
	s := &Server{cfg: cfg}

	coreClient, err := hexcore.NewClient(cfg.CoreSocket, cfg.CoreURL, cfg.CoreAPIKey)
	if err != nil {
		log.Printf("[node] WARNING: could not connect to core: %v", err)
	} else {
		s.coreClient = coreClient
		log.Printf("[node] Core connected via %s", modeLabel(coreClient.Mode()))
	}

	mux := http.NewServeMux()
	registerRoutes(mux, s.cfg, s.coreClient)
	s.mux = mux
	s.registerSiteHandler()

	return s
}

func (s *Server) Listen(port int) error {
	addr := fmt.Sprintf(":%d", port)
	srv := &http.Server{
		Addr:         addr,
		Handler:      withLogger(s.mux),
		ReadTimeout:  60 * time.Second,
		WriteTimeout: 60 * time.Second,
		IdleTimeout:  120 * time.Second,
		BaseContext:  func(_ net.Listener) context.Context { return context.Background() },
	}
	return srv.ListenAndServe()
}

func (s *Server) registerSiteHandler() {
	sub, err := fs.Sub(static.Dist, "dist")
	if err != nil {
		log.Printf("[node] No embedded site — API-only mode")
		return
	}
	fileServer := http.FileServer(http.FS(sub))
	s.mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		if strings.HasPrefix(r.URL.Path, "/api/") {
			http.NotFound(w, r)
			return
		}

		cleanPath := strings.TrimPrefix(r.URL.Path, "/")
		if cleanPath == "" {
			cleanPath = "index.html"
		}

		// 1. Direct file match in embedded static dist
		if f, err := sub.Open(cleanPath); err == nil {
			f.Close()
			fileServer.ServeHTTP(w, r)
			return
		}

		// 2. Missing asset with file extension (e.g. bad .js, .css, .png link) -> 404
		if strings.Contains(filepath.Base(cleanPath), ".") {
			http.NotFound(w, r)
			return
		}

		// 3. SPA client-side route fallback -> serve index.html
		indexFile, err := sub.Open("index.html")
		if err != nil {
			http.NotFound(w, r)
			return
		}
		defer indexFile.Close()

		w.Header().Set("Content-Type", "text/html; charset=utf-8")
		io.Copy(w, indexFile)
	})
}

func modeLabel(m hexcore.TransportMode) string {
	switch m {
	case hexcore.ModeUnixSocket:
		return "unix socket (same machine)"
	case hexcore.ModeRemoteHTTP:
		return "HTTP remote"
	case hexcore.ModeRemoteHTTPS:
		return "HTTPS+mTLS remote"
	default:
		return "unknown"
	}
}

func withLogger(h http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()
		rw := &responseRecorder{ResponseWriter: w, code: 200}
		h.ServeHTTP(rw, r)

		// Filter out static asset requests (_app/) to avoid console flooding unless there is an error
		isStaticAsset := strings.HasPrefix(r.URL.Path, "/_app/")
		if !isStaticAsset || rw.code >= 400 {
			duration := time.Since(start)
			log.Printf("[node] %-6s %-32s -> %3d (%v)", r.Method, r.URL.Path, rw.code, duration)
		}
	})
}

type responseRecorder struct {
	http.ResponseWriter
	code int
}

func (r *responseRecorder) WriteHeader(code int) {
	r.code = code
	r.ResponseWriter.WriteHeader(code)
}
