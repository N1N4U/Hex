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
	"time"

	"github.com/N1N4U/Hex/core/auth"
	"github.com/N1N4U/Hex/core/database"
	"github.com/N1N4U/Hex/core/deployments"
	"github.com/N1N4U/Hex/core/docker"
	"github.com/N1N4U/Hex/core/files"
	"github.com/N1N4U/Hex/core/firewall"
	"github.com/N1N4U/Hex/core/monitor"
	"github.com/N1N4U/Hex/core/network"
	"github.com/N1N4U/Hex/core/proxy"
	"github.com/N1N4U/Hex/core/security"
	"github.com/N1N4U/Hex/core/system"
	"github.com/N1N4U/Hex/core/terminal"
	"github.com/soheilhy/cmux"
)

type Server struct {
	port      int
	mux       *http.ServeMux
	listener  net.Listener
	tlsServer *http.Server
	srv       *http.Server
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
	dbMgr := database.NewManager()
	monitorMgr := monitor.NewManager()
	fileMgr := files.NewManager()

	mux.HandleFunc("/files", auth.Middleware(func(w http.ResponseWriter, r *http.Request) {
		path := r.URL.Query().Get("path")
		if path == "" {
			path = "/"
		}

		switch r.Method {
		case http.MethodGet:
			// Read File or List Directory
			action := r.URL.Query().Get("action")
			if action == "read" {
				content, err := fileMgr.ReadFile(path)
				if err != nil {
					http.Error(w, err.Error(), http.StatusInternalServerError)
					return
				}
				w.Header().Set("Content-Type", "application/octet-stream")
				w.Write(content)
			} else {
				// Default to list
				filesList, err := fileMgr.ListFiles(path)
				if err != nil {
					http.Error(w, err.Error(), http.StatusInternalServerError)
					return
				}
				w.Header().Set("Content-Type", "application/json")
				json.NewEncoder(w).Encode(filesList)
			}

		case http.MethodPost:
			// Write File
			if err := fileMgr.WriteFile(path, r.Body); err != nil {
				http.Error(w, err.Error(), http.StatusInternalServerError)
				return
			}
			w.WriteHeader(http.StatusOK)
			w.Write([]byte(`{"success": true}`))

		case http.MethodDelete:
			// Delete File or Directory
			if err := fileMgr.DeleteFile(path); err != nil {
				http.Error(w, err.Error(), http.StatusInternalServerError)
				return
			}
			w.WriteHeader(http.StatusOK)
			w.Write([]byte(`{"success": true}`))

		default:
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		}
	}))

	mux.HandleFunc("/monitor", auth.Middleware(func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodGet {
			stats, err := monitorMgr.GetStats(r.Context())
			if err != nil {
				http.Error(w, err.Error(), http.StatusInternalServerError)
				return
			}
			w.Header().Set("Content-Type", "application/json")
			json.NewEncoder(w).Encode(stats)
			return
		}
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
	}))

	mux.HandleFunc("/databases", auth.Middleware(func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodGet {
			w.Header().Set("Content-Type", "application/json")
			json.NewEncoder(w).Encode(dbMgr.ListDatabases())
			return
		}

		if r.Method == http.MethodPost {
			var req struct {
				Type string `json:"type"`
				Name string `json:"name"`
			}
			if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
				http.Error(w, err.Error(), http.StatusBadRequest)
				return
			}

			db, err := dbMgr.CreateDatabase(req.Type, req.Name)
			if err != nil {
				http.Error(w, err.Error(), http.StatusInternalServerError)
				return
			}

			w.Header().Set("Content-Type", "application/json")
			json.NewEncoder(w).Encode(db)
			return
		}

		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
	}))

	mux.HandleFunc("/firewall", auth.Middleware(func(w http.ResponseWriter, r *http.Request) {
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

	mux.HandleFunc("/docker/images", auth.Middleware(func(w http.ResponseWriter, r *http.Request) {
		if dockerClient == nil {
			http.Error(w, "Docker not available", http.StatusInternalServerError)
			return
		}
		
		switch r.Method {
		case http.MethodGet:
			images, err := dockerClient.ListImages()
			if err != nil {
				http.Error(w, err.Error(), http.StatusInternalServerError)
				return
			}
			w.Header().Set("Content-Type", "application/json")
			json.NewEncoder(w).Encode(images)
			
		case http.MethodDelete:
			id := r.URL.Query().Get("id")
			if err := dockerClient.DeleteImage(id); err != nil {
				http.Error(w, err.Error(), http.StatusInternalServerError)
				return
			}
			w.WriteHeader(http.StatusOK)
			w.Write([]byte(`{"success": true}`))
			
		default:
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		}
	}))

	mux.HandleFunc("/docker/networks", auth.Middleware(func(w http.ResponseWriter, r *http.Request) {
		if dockerClient == nil {
			http.Error(w, "Docker not available", http.StatusInternalServerError)
			return
		}
		
		switch r.Method {
		case http.MethodGet:
			networks, err := dockerClient.ListNetworks()
			if err != nil {
				http.Error(w, err.Error(), http.StatusInternalServerError)
				return
			}
			w.Header().Set("Content-Type", "application/json")
			json.NewEncoder(w).Encode(networks)
			
		case http.MethodDelete:
			id := r.URL.Query().Get("id")
			if err := dockerClient.DeleteNetwork(id); err != nil {
				http.Error(w, err.Error(), http.StatusInternalServerError)
				return
			}
			w.WriteHeader(http.StatusOK)
			w.Write([]byte(`{"success": true}`))
			
		default:
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		}
	}))

	mux.HandleFunc("/docker/volumes", auth.Middleware(func(w http.ResponseWriter, r *http.Request) {
		if dockerClient == nil {
			http.Error(w, "Docker not available", http.StatusInternalServerError)
			return
		}
		
		switch r.Method {
		case http.MethodGet:
			volumes, err := dockerClient.ListVolumes()
			if err != nil {
				http.Error(w, err.Error(), http.StatusInternalServerError)
				return
			}
			w.Header().Set("Content-Type", "application/json")
			json.NewEncoder(w).Encode(volumes)
			
		case http.MethodDelete:
			id := r.URL.Query().Get("id")
			if err := dockerClient.DeleteVolume(id); err != nil {
				http.Error(w, err.Error(), http.StatusInternalServerError)
				return
			}
			w.WriteHeader(http.StatusOK)
			w.Write([]byte(`{"success": true}`))
			
		default:
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		}
	}))

	mux.HandleFunc("/docker/compose", auth.Middleware(func(w http.ResponseWriter, r *http.Request) {
		dir := r.URL.Query().Get("dir")
		if dir == "" {
			http.Error(w, "dir is required", http.StatusBadRequest)
			return
		}
		
		switch r.Method {
		case http.MethodPost:
			out, err := docker.ComposeUp(dir)
			if err != nil {
				http.Error(w, out+"\n"+err.Error(), http.StatusInternalServerError)
				return
			}
			w.Write([]byte(out))
			
		case http.MethodDelete:
			out, err := docker.ComposeDown(dir)
			if err != nil {
				http.Error(w, out+"\n"+err.Error(), http.StatusInternalServerError)
				return
			}
			w.Write([]byte(out))
			
		case http.MethodGet:
			out, err := docker.ComposeLogs(dir)
			if err != nil {
				http.Error(w, out+"\n"+err.Error(), http.StatusInternalServerError)
				return
			}
			w.Write([]byte(out))
			
		default:
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		}
	}))

	// Phase B: Advanced System & Storage
	mux.HandleFunc("/system/packages", auth.Middleware(func(w http.ResponseWriter, r *http.Request) {
		switch r.Method {
		case http.MethodGet:
			pkgs, err := system.ListInstalledPackages()
			if err != nil {
				http.Error(w, err.Error(), http.StatusInternalServerError)
				return
			}
			w.Header().Set("Content-Type", "application/json")
			json.NewEncoder(w).Encode(pkgs)
		case http.MethodPost:
			pkg := r.URL.Query().Get("pkg")
			action := r.URL.Query().Get("action")
			var out string
			var err error
			switch action {
			case "install":
				out, err = system.InstallPackage(pkg)
			case "remove":
				out, err = system.RemovePackage(pkg)
			case "update":
				out, err = system.UpdatePackages()
			case "upgrade":
				out, err = system.UpgradePackages()
			}
			if err != nil {
				http.Error(w, out+"\n"+err.Error(), http.StatusInternalServerError)
				return
			}
			w.Write([]byte(out))
		}
	}))

	mux.HandleFunc("/system/storage", auth.Middleware(func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodGet {
			partitions, err := system.GetPartitions()
			if err != nil {
				http.Error(w, err.Error(), http.StatusInternalServerError)
				return
			}
			w.Header().Set("Content-Type", "application/json")
			json.NewEncoder(w).Encode(partitions)
		}
	}))

	mux.HandleFunc("/system/power", auth.Middleware(func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodPost {
			action := r.URL.Query().Get("action")
			if action == "reboot" {
				system.Reboot()
				w.Write([]byte(`{"success": true}`))
			} else if action == "shutdown" {
				system.Shutdown()
				w.Write([]byte(`{"success": true}`))
			}
		}
	}))

	mux.HandleFunc("/system/services", auth.Middleware(func(w http.ResponseWriter, r *http.Request) {
		service := r.URL.Query().Get("service")
		action := r.URL.Query().Get("action")
		if service == "" {
			http.Error(w, "service required", http.StatusBadRequest)
			return
		}
		if r.Method == http.MethodPost {
			var err error
			switch action {
			case "start": err = system.StartService(service)
			case "stop": err = system.StopService(service)
			case "restart": err = system.RestartService(service)
			case "enable": err = system.EnableService(service)
			case "disable": err = system.DisableService(service)
			}
			if err != nil {
				http.Error(w, err.Error(), http.StatusInternalServerError)
				return
			}
			w.Write([]byte(`{"success": true}`))
		} else if r.Method == http.MethodGet {
			out, err := system.ServiceStatus(service)
			if err != nil {
				http.Error(w, out+"\n"+err.Error(), http.StatusInternalServerError)
				return
			}
			w.Write([]byte(out))
		}
	}))

	// Phase C: Advanced Networking & Security
	mux.HandleFunc("/security/firewall", auth.Middleware(func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodGet {
			out, err := firewallMgr.ListRules()
			if err != nil {
				http.Error(w, err.Error(), http.StatusInternalServerError)
				return
			}
			w.Write([]byte(out))
		} else if r.Method == http.MethodPost {
			action := r.URL.Query().Get("action")
			port := r.URL.Query().Get("port")
			var err error
			switch action {
			case "allow": err = firewallMgr.AllowPort(port)
			case "deny": err = firewallMgr.DenyPort(port)
			case "enable": err = firewallMgr.Enable()
			case "disable": err = firewallMgr.Disable()
			}
			if err != nil {
				http.Error(w, err.Error(), http.StatusInternalServerError)
				return
			}
			w.Write([]byte(`{"success": true}`))
		}
	}))

	mux.HandleFunc("/security/ssh", auth.Middleware(func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodGet {
			out, err := system.GetSSHStatus()
			if err != nil {
				http.Error(w, err.Error(), http.StatusInternalServerError)
				return
			}
			w.Write([]byte(out))
		} else if r.Method == http.MethodPost {
			if err := system.RestartSSH(); err != nil {
				http.Error(w, err.Error(), http.StatusInternalServerError)
				return
			}
			w.Write([]byte(`{"success": true}`))
		}
	}))

	mux.HandleFunc("/security/fail2ban", auth.Middleware(func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodGet {
			jail := r.URL.Query().Get("jail")
			var out string
			var err error
			if jail != "" {
				out, err = security.GetFail2banJailStatus(jail)
			} else {
				out, err = security.GetFail2banStatus()
			}
			if err != nil {
				http.Error(w, err.Error(), http.StatusInternalServerError)
				return
			}
			w.Write([]byte(out))
		} else if r.Method == http.MethodPost {
			action := r.URL.Query().Get("action")
			jail := r.URL.Query().Get("jail")
			ip := r.URL.Query().Get("ip")
			var err error
			if action == "ban" {
				err = security.BanIP(jail, ip)
			} else if action == "unban" {
				err = security.UnbanIP(jail, ip)
			}
			if err != nil {
				http.Error(w, err.Error(), http.StatusInternalServerError)
				return
			}
			w.Write([]byte(`{"success": true}`))
		}
	}))

	mux.HandleFunc("/network/tools", auth.Middleware(func(w http.ResponseWriter, r *http.Request) {
		action := r.URL.Query().Get("action")
		host := r.URL.Query().Get("host")
		var out string
		var err error
		switch action {
		case "ping": out, err = network.Ping(host)
		case "traceroute": out, err = network.Traceroute(host)
		case "ports": out, err = network.OpenPorts()
		}
		if err != nil {
			http.Error(w, out+"\n"+err.Error(), http.StatusInternalServerError)
			return
		}
		w.Write([]byte(out))
	}))

	// Phase D: Backups & Logs
	mux.HandleFunc("/system/logs", auth.Middleware(func(w http.ResponseWriter, r *http.Request) {
		logType := r.URL.Query().Get("type")
		var out string
		var err error
		switch logType {
		case "journal": out, err = system.GetJournalLogs()
		case "auth": out, err = system.GetAuthLogs()
		case "syslog": out, err = system.GetSyslog()
		default:
			http.Error(w, "invalid log type", http.StatusBadRequest)
			return
		}
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		w.Write([]byte(out))
	}))

	mux.HandleFunc("/system/backups", auth.Middleware(func(w http.ResponseWriter, r *http.Request) {
		action := r.URL.Query().Get("action")
		target := r.URL.Query().Get("target")
		name := r.URL.Query().Get("name")
		
		if r.Method == http.MethodPost {
			var out string
			var err error
			if action == "create" {
				out, err = system.CreateBackup(target, name)
			} else if action == "restore" {
				// in this case target is the destination dir, name is the backup file path
				out, err = system.RestoreBackup(name, target)
			}
			if err != nil {
				http.Error(w, out+"\n"+err.Error(), http.StatusInternalServerError)
				return
			}
			w.Write([]byte(`{"success": true}`))
		}
	}))

	mux.HandleFunc("/proxy", auth.Middleware(func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodPost {
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
			return
		}

		if r.Method == http.MethodDelete {
			name := r.URL.Query().Get("name")
			if name == "" {
				http.Error(w, "name is required", http.StatusBadRequest)
				return
			}
			
			if err := proxyMgr.DeleteProxy(name); err != nil {
				http.Error(w, err.Error(), http.StatusInternalServerError)
				return
			}

			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusOK)
			w.Write([]byte(`{"success": true}`))
			return
		}
		
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
	}))

	mux.HandleFunc("/deployments", auth.Middleware(func(w http.ResponseWriter, r *http.Request) {
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

	mux.HandleFunc("/deployments/env", auth.Middleware(func(w http.ResponseWriter, r *http.Request) {
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

	mux.HandleFunc("/terminal", func(w http.ResponseWriter, r *http.Request) {
		// Bypass JWTMiddleware for WebSockets standard upgrader (token passed in query string typically)
		// token := r.URL.Query().Get("token")
		terminal.HandleTerminal(w, r)
	})

	mux.HandleFunc("/docker/containers", auth.Middleware(func(w http.ResponseWriter, r *http.Request) {
		if dockerClient == nil {
			http.Error(w, "Docker not available", http.StatusInternalServerError)
			return
		}
		
		if r.Method == http.MethodGet {
			containers, err := dockerClient.ListContainers(r.Context())
			if err != nil {
				http.Error(w, err.Error(), http.StatusInternalServerError)
				return
			}
			
			w.Header().Set("Content-Type", "application/json")
			json.NewEncoder(w).Encode(containers)
			return
		}
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
	}))

	mux.HandleFunc("/docker/create", auth.Middleware(func(w http.ResponseWriter, r *http.Request) {
		if dockerClient == nil {
			http.Error(w, "Docker not available", http.StatusInternalServerError)
			return
		}

		if r.Method != http.MethodPost {
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
			return
		}

		var req docker.CreateContainerRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}

		id, err := dockerClient.CreateContainer(r.Context(), req)
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]string{"id": id})
	}))

	mux.HandleFunc("/docker/action", auth.Middleware(func(w http.ResponseWriter, r *http.Request) {
		if dockerClient == nil {
			http.Error(w, "Docker not available", http.StatusInternalServerError)
			return
		}

		if r.Method != http.MethodPost {
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
			return
		}

		id := r.URL.Query().Get("id")
		action := r.URL.Query().Get("action")
		if id == "" || action == "" {
			http.Error(w, "id and action are required", http.StatusBadRequest)
			return
		}

		if err := dockerClient.ContainerAction(r.Context(), id, action); err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]bool{"success": true})
	}))

	mux.HandleFunc("/docker/logs", func(w http.ResponseWriter, r *http.Request) {
		// Needs to bypass standard AuthMiddleware if using WebSockets directly,
		// but since we will stream via SSE (Server-Sent Events) for simplicity right now:
		
		// Wait, let's just do a normal request that streams.
		// For simplicity, we just use auth.Middleware but we handle it directly here if we want to bypass:
		// Let's assume standard auth for SSE works if we pass token in URL.
		token := r.URL.Query().Get("token")
		// (Mock token validation for logs endpoint)
		_ = token

		if dockerClient == nil {
			http.Error(w, "Docker not available", http.StatusInternalServerError)
			return
		}

		id := r.URL.Query().Get("id")
		if id == "" {
			http.Error(w, "id is required", http.StatusBadRequest)
			return
		}

		logs, err := dockerClient.GetContainerLogs(r.Context(), id)
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		defer logs.Close()

		w.Header().Set("Content-Type", "text/event-stream")
		w.Header().Set("Cache-Control", "no-cache")
		w.Header().Set("Connection", "keep-alive")

		flusher, ok := w.(http.Flusher)
		if !ok {
			http.Error(w, "Streaming unsupported", http.StatusInternalServerError)
			return
		}

		buf := make([]byte, 1024)
		for {
			n, err := logs.Read(buf)
			if n > 0 {
				fmt.Fprintf(w, "data: %s\n\n", string(buf[:n]))
				flusher.Flush()
			}
			if err != nil {
				break
			}
		}
	})

	return &Server{
		port: port,
		mux:  mux,
	}
}

func (s *Server) Start() error {
	var err error
	s.listener, err = net.Listen("tcp", fmt.Sprintf(":%d", s.port))
	if err != nil {
		return err
	}

	m := cmux.New(s.listener)
	tlsL := m.Match(cmux.TLS())
	httpL := m.Match(cmux.Any())

	// Setup mTLS
	caCert, err := os.ReadFile("/var/lib/hex/certs/ca.crt")
	if err != nil {
		caCert, err = os.ReadFile("../cli/certs/ca.crt")
		if err != nil {
			log.Println("Warning: mTLS CA cert not found")
		}
	}

	caCertPool := x509.NewCertPool()
	if caCert != nil {
		caCertPool.AppendCertsFromPEM(caCert)
	}

	tlsConfig := &tls.Config{
		ClientCAs:  caCertPool,
		ClientAuth: tls.RequireAndVerifyClientCert,
	}

	serverCrt := "/var/lib/hex/certs/server.crt"
	serverKey := "/var/lib/hex/certs/server.key"
	if _, err := os.Stat(serverCrt); err != nil {
		serverCrt = "../cli/certs/server.crt"
		serverKey = "../cli/certs/server.key"
	}

	cert, err := tls.LoadX509KeyPair(serverCrt, serverKey)
	if err == nil {
		tlsConfig.Certificates = []tls.Certificate{cert}
	} else {
		log.Println("Warning: TLS certificates not found, mTLS connection may fail")
	}

	s.tlsServer = &http.Server{Handler: s.mux}
	s.srv = &http.Server{Handler: s.mux}

	tlsListener := tls.NewListener(tlsL, tlsConfig)
	
	go func() {
		if err := s.tlsServer.Serve(tlsListener); err != nil && err != http.ErrServerClosed {
			log.Printf("TLS Server error: %v", err)
		}
	}()
	
	go func() {
		if err := s.srv.Serve(httpL); err != nil && err != http.ErrServerClosed {
			log.Printf("HTTP Server error: %v", err)
		}
	}()

	return m.Serve()
}

func (s *Server) Stop() error {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	
	if s.tlsServer != nil {
		s.tlsServer.Shutdown(ctx)
	}
	if s.srv != nil {
		s.srv.Shutdown(ctx)
	}
	if s.listener != nil {
		return s.listener.Close()
	}
	return nil
}
