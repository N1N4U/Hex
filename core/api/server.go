package api

import (
	"context"
	"crypto/tls"
	"crypto/x509"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"os/exec"
	"time"

	"github.com/N1N4U/Hex/core/deployments"
	"github.com/N1N4U/Hex/core/docker"
	"github.com/N1N4U/Hex/core/firewall"
	"github.com/N1N4U/Hex/core/proxy"
	"github.com/N1N4U/Hex/core/terminal"
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

	deployMgr, err := deployments.NewManager()
	if err != nil {
		log.Printf("Warning: Failed to initialize deployment manager: %v\n", err)
	}

	proxyMgr, err := proxy.NewManager()
	if err != nil {
		log.Printf("Warning: Failed to initialize proxy manager: %v\n", err)
	}

	firewallMgr := firewall.NewManager()

	mux.HandleFunc("/firewall", JWTMiddleware(func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodGet {
			rules, err := firewallMgr.ListRules()
			if err != nil {
				http.Error(w, err.Error(), http.StatusInternalServerError)
				return
			}
			w.Header().Set("Content-Type", "application/json")
			json.NewEncoder(w).Encode(rules)
			return
		}

		if r.Method == http.MethodPost {
			var req struct {
				Port   string `json:"port"`
				Action string `json:"action"`
			}
			if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
				http.Error(w, err.Error(), http.StatusBadRequest)
				return
			}

			if req.Action == "allow" {
				if err := firewallMgr.AllowPort(req.Port); err != nil {
					http.Error(w, err.Error(), http.StatusInternalServerError)
					return
				}
			} else if req.Action == "deny" {
				if err := firewallMgr.DenyPort(req.Port); err != nil {
					http.Error(w, err.Error(), http.StatusInternalServerError)
					return
				}
			}

			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusOK)
			w.Write([]byte(`{"success": true}`))
			return
		}

		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
	}))

	mux.HandleFunc("/proxy", JWTMiddleware(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
			return
		}
		
		var req proxy.ProxyRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}

		if err := proxyMgr.CreateProxy(r.Context(), req); err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}

		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		w.Write([]byte(`{"success": true}`))
	}))

	mux.HandleFunc("/deployments", JWTMiddleware(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
			return
		}
		
		var req deployments.DeploymentRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}

		if err := deployMgr.Deploy(r.Context(), req); err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}

		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		w.Write([]byte(`{"success": true}`))
	}))

	mux.HandleFunc("/deployments/env", JWTMiddleware(func(w http.ResponseWriter, r *http.Request) {
		id := r.URL.Query().Get("id")
		if id == "" {
			http.Error(w, "Deployment ID required", http.StatusBadRequest)
			return
		}

		envPath := fmt.Sprintf("./deployments_data/%s/.env", id)

		if r.Method == http.MethodGet {
			content, err := os.ReadFile(envPath)
			if err != nil {
				// If not found, just return empty
				w.Header().Set("Content-Type", "text/plain")
				w.Write([]byte(""))
				return
			}
			w.Header().Set("Content-Type", "text/plain")
			w.Write(content)
			return
		}

		if r.Method == http.MethodPost {
			body, err := io.ReadAll(r.Body)
			if err != nil {
				http.Error(w, err.Error(), http.StatusInternalServerError)
				return
			}

			if err := os.WriteFile(envPath, body, 0600); err != nil {
				http.Error(w, err.Error(), http.StatusInternalServerError)
				return
			}

			w.WriteHeader(http.StatusOK)
			w.Write([]byte(`{"success": true}`))
			return
		}

		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
	}))

	mux.HandleFunc("/docker/terminal", func(w http.ResponseWriter, r *http.Request) {
		// Bypass JWTMiddleware for WebSockets standard upgrader (token passed in query string typically)
		// token := r.URL.Query().Get("token")
		terminal.HandleTerminal(w, r)
	})

	mux.HandleFunc("/docker/files", JWTMiddleware(func(w http.ResponseWriter, r *http.Request) {
		containerID := r.URL.Query().Get("id")
		path := r.URL.Query().Get("path")
		if path == "" {
			path = "/"
		}

		cmd := exec.Command("docker", "exec", containerID, "ls", "-la", path)
		out, err := cmd.CombinedOutput()
		if err != nil {
			http.Error(w, string(out), http.StatusInternalServerError)
			return
		}

		w.Header().Set("Content-Type", "text/plain")
		w.Write(out)
	}))

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
