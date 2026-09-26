package api

import (
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"github.com/N1N4U/Hex/panel/users"
)

type NodesHandler struct{}

func NewNodesHandler() *NodesHandler {
	return &NodesHandler{}
}

// GET /api/v1/nodes - List all registered cores/nodes
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

	// Test connection to the core's health endpoint
	targetURL := fmt.Sprintf("%s://%s:%d/health", req.Protocol, req.IPAddress, req.Port)
	client := &http.Client{Timeout: 5 * time.Second}
	testReq, err := http.NewRequest(http.MethodGet, targetURL, nil)
	if req.APIKey != "" {
		testReq.Header.Set("Authorization", "Bearer "+req.APIKey)
	}

	status := "online"
	if err == nil {
		resp, err := client.Do(testReq)
		if err != nil || resp.StatusCode >= 500 {
			status = "offline"
		} else {
			resp.Body.Close()
		}
	} else {
		status = "offline"
	}

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
		http.Error(w, "Failed to delete node", http.StatusInternalServerError)
		return
	}
	w.WriteHeader(http.StatusNoContent)
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
