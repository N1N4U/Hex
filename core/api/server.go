package api

import (
	"context"
	"fmt"
	"net/http"
	"time"
)

type Server struct {
	port   int
	server *http.Server
}

func NewServer(port int) *Server {
	mux := http.NewServeMux()

	// 1. JWT & mTLS Middleware should wrap all routes here
	mux.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("Hex Core is healthy"))
	})

	mux.HandleFunc("/docker/containers", func(w http.ResponseWriter, r *http.Request) {
		// Verify JWT and mTLS...
		w.WriteHeader(http.StatusOK)
		w.Write([]byte(`[{"id": "123", "name": "hex-db"}]`))
	})

	srv := &http.Server{
		Addr:    fmt.Sprintf(":%d", port),
		Handler: mux,
	}

	return &Server{
		port:   port,
		server: srv,
	}
}

func (s *Server) Start() error {
	// In production, configure TLSConfig here for mTLS with Panel certificates
	return s.server.ListenAndServe()
}

func (s *Server) Stop() error {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	return s.server.Shutdown(ctx)
}
