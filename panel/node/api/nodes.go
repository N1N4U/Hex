package api

import (
	"bytes"
	"crypto/rand"
	"crypto/tls"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"net/http"
	"sync"
	"time"

	"github.com/N1N4U/Hex/panel/users"
)

type NodesHandler struct{}

func NewNodesHandler() *NodesHandler {
	return &NodesHandler{}
}

// httpClient returns a client configured for core checks, supporting HTTP and HTTPS (with mTLS/custom certs)
func getCheckClient(protocol string) *http.Client {
	tr := &http.Transport{
		TLSClientConfig: &tls.Config{InsecureSkipVerify: true},
	}
	return &http.Client{
		Transport: tr,
		Timeout:   3 * time.Second,
	}
}

// checkCoreHealth tests connectivity to a Hex Core.
func checkCoreHealth(protocol, ip string, port int, apiKey string) string {
	baseURL := fmt.Sprintf("%s://%s:%d", protocol, ip, port)
	client := getCheckClient(protocol)

	// 1. If API Key provided, exchange at /auth/token
	if apiKey != "" {
		tokenBody, _ := json.Marshal(map[string]string{"api_key": apiKey})
		req, err := http.NewRequest(http.MethodPost, baseURL+"/auth/token", bytes.NewReader(tokenBody))
		if err == nil {
			req.Header.Set("Content-Type", "application/json")
			resp, err := client.Do(req)
			if err == nil {
				defer resp.Body.Close()
				if resp.StatusCode == http.StatusOK {
					return "online"
				}
			}
		}
	}

	// 2. Fallback: test /health or root
	req, err := http.NewRequest(http.MethodGet, baseURL+"/health", nil)
	if err == nil {
		if apiKey != "" {
			req.Header.Set("Authorization", "Bearer "+apiKey)
		}
		resp, err := client.Do(req)
		if err == nil {
			defer resp.Body.Close()
			if resp.StatusCode < 500 {
				return "online"
			}
		}
	}

	return "offline"
}

// GET /api/v1/nodes - List all registered cores/nodes with live connectivity check
func (h *NodesHandler) List(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}
	nodes, err := users.ListNodes()
	if err != nil {
		http.Error(w, "Failed to load nodes", http.StatusInternalServerError)
		return
	}
	if nodes == nil {
		nodes = []users.Node{}
	}

	// Parallel live status check (fast 1.5s timeout)
	var wg sync.WaitGroup
	for i := range nodes {
		wg.Add(1)
		go func(idx int) {
			defer wg.Done()
			status := checkCoreHealth(nodes[idx].Protocol, nodes[idx].IPAddress, nodes[idx].Port, nodes[idx].APIKey)
			nodes[idx].Status = status
			nodes[idx].APIKey = "" // Never leak API key to client
		}(i)
	}
	wg.Wait()

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(nodes)
}

// POST /api/v1/nodes - Add a new node & verify connection
func (h *NodesHandler) Add(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req struct {
		Name      string `json:"name"`
		IPAddress string `json:"ip_address"`
		Port      int    `json:"port"`
		Protocol  string `json:"protocol"`
		APIKey    string `json:"api_key"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if req.Name == "" || req.IPAddress == "" {
		http.Error(w, "Name and IP address are required", http.StatusBadRequest)
		return
	}
	if req.Port <= 0 {
		req.Port = 8080
	}
	if req.Protocol == "" {
		req.Protocol = "http"
	}

	// Verify connection to the core
	status := checkCoreHealth(req.Protocol, req.IPAddress, req.Port, req.APIKey)

	idBytes := make([]byte, 8)
	rand.Read(idBytes)
	nodeID := "node_" + hex.EncodeToString(idBytes)

	node := &users.Node{
		ID:        nodeID,
		Name:      req.Name,
		IPAddress: req.IPAddress,
		Port:      req.Port,
		Protocol:  req.Protocol,
		APIKey:    req.APIKey,
		Status:    status,
		LastSeen:  time.Now(),
		CreatedAt: time.Now(),
	}

	if err := users.AddNode(node); err != nil {
		http.Error(w, "Failed to save node: "+err.Error(), http.StatusInternalServerError)
		return
	}

	// Redact API key in response
	node.APIKey = ""
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(node)
}

// DELETE /api/v1/nodes?id=xxx - Remove a node
func (h *NodesHandler) Delete(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodDelete && r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}
	id := r.URL.Query().Get("id")
	if id == "" {
		http.Error(w, "Node ID required", http.StatusBadRequest)
		return
	}

	if err := users.DeleteNode(id); err != nil {
		http.Error(w, "Failed to remove node: "+err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]bool{"ok": true})
}

// GET /api/v1/activities - Get recent audit activities
func (h *NodesHandler) Activities(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}
	logs, err := users.GetRecentActivities(50)
	if err != nil {
		http.Error(w, "Failed to fetch activities", http.StatusInternalServerError)
		return
	}
	if logs == nil {
		logs = []users.ActivityLog{}
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(logs)
}
