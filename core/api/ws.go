package api

import (
	"context"
	"encoding/json"
	"log"
	"net"
	"net/http"
	"os/exec"
	"sync"
	"time"

	"github.com/N1N4U/Hex/core/auth"
	"github.com/N1N4U/Hex/core/database"
	"github.com/N1N4U/Hex/core/monitor"
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

type SafeConn struct {
	*websocket.Conn
	writeMu sync.Mutex
}

func (s *SafeConn) WriteJSONSafe(v interface{}) error {
	s.writeMu.Lock()
	defer s.writeMu.Unlock()
	return s.WriteJSON(v)
}

type WSManager struct {
	clients map[*SafeConn]bool
	mu      sync.Mutex
}

func NewWSManager() *WSManager {
	return &WSManager{
		clients: make(map[*SafeConn]bool),
	}
}

func (m *WSManager) HandleWS(w http.ResponseWriter, r *http.Request, monitorMgr interface{}) {
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Println("WS Upgrade Error:", err)
		return
	}

	safeConn := &SafeConn{Conn: conn}

	m.mu.Lock()
	m.clients[safeConn] = true
	m.mu.Unlock()

	var streamCancel context.CancelFunc

	defer func() {
		if streamCancel != nil {
			streamCancel()
		}
		m.mu.Lock()
		delete(m.clients, safeConn)
		m.mu.Unlock()
		safeConn.Close()
	}()

	isAuthenticated := false
	isSubscribed := false

	safeConn.SetReadDeadline(time.Now().Add(10 * time.Second))

	for {
		_, msgData, err := safeConn.ReadMessage()
		if err != nil {
			break
		}

		var msg WSMessage
		if err := json.Unmarshal(msgData, &msg); err != nil {
			safeConn.WriteJSONSafe(WSMessage{Error: "Invalid JSON format"})
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

				valid := false
				if claims, err := auth.ValidateJWT(authPayload.Token); err == nil && claims != nil {
					valid = true
				} else {
					keyHash := auth.HashAPIKey(authPayload.Token)
					valid, _ = database.DB.AuthenticateAndBind(keyHash, host)
				}

				if valid {
					isAuthenticated = true
					safeConn.SetReadDeadline(time.Time{})
					safeConn.WriteJSONSafe(WSMessage{ID: msg.ID, Type: "auth", Payload: json.RawMessage(`{"success":true}`)})
					continue
				}
			}
			safeConn.WriteJSONSafe(WSMessage{ID: msg.ID, Type: "auth", Error: "Authentication failed"})
			return
		}

		if !isAuthenticated {
			safeConn.WriteJSONSafe(WSMessage{ID: msg.ID, Error: "Not authenticated"})
			continue
		}

		switch msg.Type {
		case "ping":
			safeConn.WriteJSONSafe(WSMessage{ID: msg.ID, Type: "pong"})
		case "stats.subscribe":
			if !isSubscribed {
				isSubscribed = true
				var streamCtx context.Context
				streamCtx, streamCancel = context.WithCancel(context.Background())
				go m.streamStats(streamCtx, safeConn, monitorMgr, msg.ID)
			}
		case "docker.wipe_images":
			go func(reqID string) {
				exec.Command("docker", "image", "prune", "-a", "-f").Run()
				safeConn.WriteJSONSafe(WSMessage{ID: reqID, Type: "docker.wipe_images_done"})
			}(msg.ID)
		case "docker.wipe_logs":
			go func(reqID string) {
				exec.Command("sh", "-c", "truncate -s 0 /var/lib/docker/containers/*/*-json.log").Run()
				safeConn.WriteJSONSafe(WSMessage{ID: reqID, Type: "docker.wipe_logs_done"})
			}(msg.ID)
		default:
			safeConn.WriteJSONSafe(WSMessage{ID: msg.ID, Error: "Unknown event type"})
		}
	}
}

func (m *WSManager) streamStats(ctx context.Context, safeConn *SafeConn, monitorMgr interface{}, reqId string) {
	ticker := time.NewTicker(2 * time.Second)
	defer ticker.Stop()

	type StatGetter interface {
		GetStats(context.Context) (*monitor.SystemStats, error)
	}

	getter, ok := monitorMgr.(StatGetter)
	if !ok {
		log.Println("WS Error: monitorMgr does not implement StatGetter")
		return
	}

	var lastStorageHash string
	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			stats, err := getter.GetStats(ctx)
			if err == nil {
				storageData := map[string]interface{}{
					"partitions":          stats.Partitions,
					"docker_images_size":  stats.DockerImagesSize,
					"docker_logs_size":    stats.DockerLogsSize,
					"docker_storage_size": stats.DockerStorageSize,
				}
				storageJson, _ := json.Marshal(storageData)
				currentStorageHash := string(storageJson)

				if currentStorageHash != lastStorageHash {
					lastStorageHash = currentStorageHash
					if err := safeConn.WriteJSONSafe(WSMessage{
						ID:      reqId,
						Type:    "storage.update",
						Payload: storageJson,
					}); err != nil {
						return
					}
				}

				stats.Partitions = nil
				stats.DockerImagesSize = 0
				stats.DockerLogsSize = 0
				stats.DockerStorageSize = 0

				payload, _ := json.Marshal(stats)
				if err := safeConn.WriteJSONSafe(WSMessage{
					ID:      reqId,
					Type:    "stats.update",
					Payload: payload,
				}); err != nil {
					return
				}
			}
		}
	}
}
