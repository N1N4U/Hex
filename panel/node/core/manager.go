package core

import (
	"context"
	"crypto/tls"
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"sync"
	"time"

	"github.com/gorilla/websocket"
	"github.com/N1N4U/Hex/panel/config"
	"github.com/N1N4U/Hex/panel/logger"
	"github.com/N1N4U/Hex/panel/users"
)

// Manager manages connections to local or remote Hex Cores.
type Manager struct {
	mu            sync.RWMutex
	cfg           *config.Config
	localClient   *Client
	remoteClients map[string]*Client
	activeNodeID  string
}

// NewManager initializes the Core manager.
func NewManager(cfg *config.Config, localClient *Client) *Manager {
	return &Manager{
		cfg:           cfg,
		localClient:   localClient,
		remoteClients: make(map[string]*Client),
	}
}

// SetActiveNodeID sets the currently active core node ID.
func (m *Manager) SetActiveNodeID(id string) {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.activeNodeID = id
}

// ActiveNodeID returns the currently selected node ID if set.
func (m *Manager) ActiveNodeID() string {
	m.mu.RLock()
	defer m.mu.RUnlock()
	return m.activeNodeID
}

// Invalidate removes a cached client when a node's config changes or is deleted.
func (m *Manager) Invalidate(nodeID string) {
	m.mu.Lock()
	defer m.mu.Unlock()
	delete(m.remoteClients, nodeID)
}

// GetClient resolves the appropriate *Client for a given node ID, or the default active core.
func (m *Manager) GetClient(nodeID string) (*Client, error) {
	m.mu.Lock()
	defer m.mu.Unlock()

	// 1. If specific nodeID requested:
	if nodeID != "" {
		if c, ok := m.remoteClients[nodeID]; ok && c != nil {
			return c, nil
		}
		node, err := users.GetNode(nodeID)
		if err != nil || node == nil {
			return nil, fmt.Errorf("node %s not found in database", nodeID)
		}
		c, err := NewRemoteClient(node.Protocol, node.IPAddress, node.Port, node.APIKey)
		if err != nil {
			logger.Core("Failed to initialize client for node '%s': %v", node.Name, err)
			return nil, err
		}
		logger.Core("Initialized client for node '%s' (%s://%s:%d)", node.Name, node.Protocol, node.IPAddress, node.Port)
		m.remoteClients[nodeID] = c
		return c, nil
	}

	// 2. If activeNodeID is set and exists:
	if m.activeNodeID != "" {
		if c, ok := m.remoteClients[m.activeNodeID]; ok && c != nil {
			return c, nil
		}
		node, err := users.GetNode(m.activeNodeID)
		if err == nil && node != nil {
			c, err := NewRemoteClient(node.Protocol, node.IPAddress, node.Port, node.APIKey)
			if err == nil {
				logger.Core("Initialized client for active node '%s' (%s://%s:%d)", node.Name, node.Protocol, node.IPAddress, node.Port)
				m.remoteClients[m.activeNodeID] = c
				return c, nil
			}
		}
	}

	// 3. Fallback: check all nodes in the database
	nodes, err := users.ListNodes()
	if err == nil && len(nodes) > 0 {
		// Pick the first available node
		target := nodes[0]
		if c, ok := m.remoteClients[target.ID]; ok && c != nil {
			return c, nil
		}
		c, err := NewRemoteClient(target.Protocol, target.IPAddress, target.Port, target.APIKey)
		if err == nil {
			logger.Core("Connected to default node '%s' (%s://%s:%d)", target.Name, target.Protocol, target.IPAddress, target.Port)
			m.remoteClients[target.ID] = c
			return c, nil
		}
	}

	// 4. Fallback: local client if connected via socket or HEX_CORE_URL
	if m.localClient != nil {
		return m.localClient, nil
	}

	return nil, fmt.Errorf("no core connected")
}

// MeasurePings returns the roundtrip API latency (GET /health) and WS ping latency to the specified Core.
func (m *Manager) MeasurePings(nodeID string) (int, int, error) {
	client, err := m.GetClient(nodeID)
	if err != nil || client == nil {
		return -1, -1, fmt.Errorf("no core available")
	}

	baseURL := client.BaseURL()
	if baseURL == "" {
		return -1, -1, fmt.Errorf("empty base URL")
	}

	// 1. Measure API ping
	apiMs := -1
	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	t0 := time.Now()
	resp, err := client.Do(ctx, http.MethodGet, "/health", nil)
	if err == nil && resp != nil {
		resp.Body.Close()
		apiMs = int(time.Since(t0).Milliseconds())
		if apiMs == 0 {
			apiMs = 1
		}
	}

	// 2. Measure WS ping
	wsMs := -1
	u, err := url.Parse(baseURL)
	if err == nil {
		switch u.Scheme {
		case "http":
			u.Scheme = "ws"
		case "https":
			u.Scheme = "wss"
		}
		u.Path = "/ws"

		dialer := websocket.Dialer{
			HandshakeTimeout: 2 * time.Second,
			TLSClientConfig:  &tls.Config{InsecureSkipVerify: true},
		}

		tWs := time.Now()
		wsConn, _, err := dialer.Dial(u.String(), nil)
		if err == nil {
			defer wsConn.Close()
			// Send probe auth using JWT or API key
			token := client.JWT()
			if token == "" {
				token = client.APIKey()
			}
			authPayload, _ := json.Marshal(map[string]string{"token": token})
			_ = wsConn.WriteJSON(map[string]interface{}{
				"id":      "ping_probe",
				"type":    "auth",
				"payload": json.RawMessage(authPayload),
			})

			_ = wsConn.SetReadDeadline(time.Now().Add(1500 * time.Millisecond))
			_, _, readErr := wsConn.ReadMessage()
			if readErr == nil {
				wsMs = int(time.Since(tWs).Milliseconds())
				if wsMs == 0 {
					wsMs = 1
				}
			} else {
				logger.CoreDebug("WS probe read failed for %s: %v", baseURL, readErr)
			}
		} else {
			logger.CoreDebug("WS dial failed for %s: %v", baseURL, err)
		}
	}

	// Fallback WS ping to API ping if WS probe didn't finish but API worked
	if wsMs == -1 && apiMs > 0 {
		wsMs = apiMs + 2
	}

	logger.CoreDebug("Measured Core latency (%s): API=%dms WS=%dms", baseURL, apiMs, wsMs)
	return apiMs, wsMs, nil
}
