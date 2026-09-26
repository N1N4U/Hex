package server

import (
	"context"
	"fmt"
	"io/fs"
	"log"
	"net"
	"net/http"
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
		log.Printf("[node] Core connected via %s", modeLabel(coreClient.Mode()))
	}
	s.coreClient = coreClient

	s.mux = http.NewServeMux()
	registerRoutes(s.mux, cfg, coreClient)
	s.registerSiteHandler()

	return s
}

func (s *Server) Listen(port int) error {
	srv := &http.Server{
		Addr:         fmt.Sprintf(":%d", port),
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
		// SPA fallback
		path := strings.TrimPrefix(r.URL.Path, "/")
		if path == "" {
			path = "index.html"
		}
		if _, err := fs.Stat(sub, path); err != nil {
			r2 := *r
			r2.URL.Path = "/"
			fileServer.ServeHTTP(w, &r2)
			return
		}
		fileServer.ServeHTTP(w, r)
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
		log.Printf("[node] %s %s %d %s", r.Method, r.URL.Path, rw.code, time.Since(start))
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