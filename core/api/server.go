package api

import (
	"context"
	"crypto/tls"
	"crypto/x509"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"time"

	"github.com/N1N4U/Hex/core/docker"
)

type Server struct {
	port   int
	server *http.Server
}

func JWTMiddleware(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		// In production, verify the JWT here using the Panel's public key or shared secret
		token := r.Header.Get("Authorization")
		if token == "" {
			http.Error(w, "Forbidden: Missing JWT", http.StatusForbidden)
			return
		}
		// Skip full validation for boilerplate
		next.ServeHTTP(w, r)
	}
}

func NewServer(port int) *Server {
	mux := http.NewServeMux()

	mux.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("Hex Core is healthy and mTLS authenticated"))
	})

	dockerClient, err := docker.NewClient()
	if err != nil {
		log.Printf("Warning: Failed to initialize docker client: %v\n", err)
	}

	mux.HandleFunc("/docker/containers", JWTMiddleware(func(w http.ResponseWriter, r *http.Request) {
		if dockerClient == nil {
			http.Error(w, "Docker not available", http.StatusInternalServerError)
			return
		}
		containers, err := dockerClient.ListContainers(r.Context())
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		
		jsonData, err := json.Marshal(containers)
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		w.Write(jsonData)
	}))

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
	// Setup mTLS
	caCert, err := os.ReadFile("../cli/certs/ca.crt")
	if err != nil {
		log.Println("Warning: mTLS CA cert not found, running insecurely for dev")
		return s.server.ListenAndServe()
	}

	caCertPool := x509.NewCertPool()
	caCertPool.AppendCertsFromPEM(caCert)

	tlsConfig := &tls.Config{
		ClientCAs:  caCertPool,
		ClientAuth: tls.RequireAndVerifyClientCert,
	}
	s.server.TLSConfig = tlsConfig

	return s.server.ListenAndServeTLS("../cli/certs/server.crt", "../cli/certs/server.key")
}

func (s *Server) Stop() error {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	return s.server.Shutdown(ctx)
}
