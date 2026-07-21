package api

import (
	"encoding/json"
	"log"
	"net/http"
	"sync"
	"time"
	"context"
	"net"

	"github.com/N1N4U/Hex/core/auth"
	"github.com/N1N4U/Hex/core/database"
	"github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		return true
	},
	EnableCompression: true,
}

type WSMessage struct {
	ID      string          `json:"id,omitempty"`
	Type    string          `json:"type"`
	Payload json.RawMessage `json:"payload,omitempty"`
	Error   string          `json:"error,omitempty"`
}

type WSManager struct {
	clients map[*websocket.Conn]bool
	mu      sync.Mutex
}

func NewWSManager() *WSManager {
	return &WSManager{
		clients: make(map[*websocket.Conn]bool),
	}
}

func (m *WSManager) HandleWS(w http.ResponseWriter, r *http.Request, monitorMgr interface{}) {
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Println("WS Upgrade Error:", err)
		return
	}

	m.mu.Lock()
	m.clients[conn] = true
	m.mu.Unlock()

	defer func() {
		m.mu.Lock()
		delete(m.clients, conn)
		m.mu.Unlock()
		conn.Close()
	}()

	isAuthenticated := false

	// Wait for auth
	conn.SetReadDeadline(time.Now().Add(10 * time.Second))

	for {
		_, msgData, err := conn.ReadMessage()
		if err != nil {
			break
		}

		// Reset deadline on read
		conn.SetReadDeadline(time.Now().Add(60 * time.Second))

		var msg WSMessage
		if err := json.Unmarshal(msgData, &msg); err != nil {
			conn.WriteJSON(WSMessage{Error: "Invalid JSON format"})
			continue
		}

		if msg.Type == "auth" {
			var authPayload struct {
				Token string `json:"token"`
			}
			if err := json.Unmarshal(msg.Payload, &authPayload); err == nil {
				host, _, err := net.SplitHostPort(r.RemoteAddr)
				if err != nil {
					host = r.RemoteAddr
				}
				keyHash := auth.HashAPIKey(authPayload.Token)
				valid, _ := database.DB.AuthenticateAndBind(keyHash, host)
				if valid {
					isAuthenticated = true
					conn.SetReadDeadline(time.Time{}) // Disable deadline after auth
					conn.WriteJSON(WSMessage{ID: msg.ID, Type: "auth", Payload: json.RawMessage(`{"success":true}`)})
					continue
				}
			}
			conn.WriteJSON(WSMessage{ID: msg.ID, Type: "auth", Error: "Authentication failed"})
			return // Close connection
		}

		if !isAuthenticated {
			conn.WriteJSON(WSMessage{ID: msg.ID, Error: "Not authenticated"})
			continue
		}

		// Route based on type
		switch msg.Type {
		case "ping":
			conn.WriteJSON(WSMessage{ID: msg.ID, Type: "pong"})
		case "stats.subscribe":
			// Start pushing stats
			go m.streamStats(conn, monitorMgr, msg.ID)
		default:
			conn.WriteJSON(WSMessage{ID: msg.ID, Error: "Unknown event type"})
		}
	}
}

func (m *WSManager) streamStats(conn *websocket.Conn, monitorMgr interface{}, reqId string) {
	// A simple stream implementation just for this connection
	ticker := time.NewTicker(2 * time.Second)
	defer ticker.Stop()
	
	// Check if monitorMgr has GetStats method
	type StatGetter interface {
		GetStats(context.Context) (interface{}, error)
	}

	getter, ok := monitorMgr.(StatGetter)
	if !ok {
		return
	}

	for range ticker.C {
		stats, err := getter.GetStats(context.Background())
		if err == nil {
			payload, _ := json.Marshal(stats)
			err = conn.WriteJSON(WSMessage{
				ID:      reqId,
				Type:    "stats.update",
				Payload: payload,
			})
			if err != nil {
				return // break if write fails (connection closed)
			}
		}
	}
}
