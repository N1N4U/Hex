package api

import (
	"context"
	"crypto/tls"
	"encoding/json"
	"net"
	"net/http"
	"net/url"
	"sync"
	"time"

	"github.com/gorilla/websocket"
	hexcore "github.com/N1N4U/Hex/panel/core"
	"github.com/N1N4U/Hex/panel/logger"
)

var wsUpgrader = websocket.Upgrader{
	CheckOrigin:     func(r *http.Request) bool { return true },
	ReadBufferSize:  8192,
	WriteBufferSize: 8192,
}

// WSProxy proxies WebSocket connections between browser and core.
type WSProxy struct {
	manager *hexcore.Manager
}

func NewWSProxy(manager *hexcore.Manager) *WSProxy {
	return &WSProxy{manager: manager}
}

type safeWS struct {
	conn *websocket.Conn
	mu   sync.Mutex
}

func (s *safeWS) WriteJSON(v interface{}) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	return s.conn.WriteJSON(v)
}

func (s *safeWS) WriteMessage(messageType int, data []byte) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	return s.conn.WriteMessage(messageType, data)
}

func (s *safeWS) Close() error {
	return s.conn.Close()
}

// ProxyWS upgrades client connection to WS, handles site pings, and bridges to active Core.
func (p *WSProxy) ProxyWS(w http.ResponseWriter, r *http.Request) {
	conn, err := wsUpgrader.Upgrade(w, r, nil)
	if err != nil {
		logger.Site("WS upgrade failed: %v", err)
		return
	}
	clientWS := &safeWS{conn: conn}
	defer clientWS.Close()

	nodeID := r.URL.Query().Get("node_id")
	logger.Site("WebSocket client connected from %s (target node: %s)", r.RemoteAddr, nodeID)
	defer logger.Site("WebSocket client disconnected (%s)", r.RemoteAddr)

	ctx, cancel := context.WithCancel(r.Context())
	defer cancel()

	// Connect to Core WS if client is available
	var coreWS *safeWS
	coreClient, _ := p.manager.GetClient(nodeID)

	if coreClient != nil && coreClient.BaseURL() != "" {
		jwtCtx, jwtCancel := context.WithTimeout(ctx, 3*time.Second)
		_ = coreClient.EnsureJWT(jwtCtx)
		jwtCancel()

		cConn := dialCoreWS(coreClient, r.URL.RawQuery)
		if cConn != nil {
			coreWS = &safeWS{conn: cConn}
			defer coreWS.Close()
			logger.Core("Core WS connected successfully to %s", coreClient.BaseURL())

			// Authenticate with Core
			token := coreClient.JWT()
			if token == "" {
				token = coreClient.APIKey()
			}
			authPayload, _ := json.Marshal(map[string]string{"token": token})
			_ = coreWS.WriteJSON(map[string]interface{}{
				"id":      "node_auth",
				"type":    "auth",
				"payload": json.RawMessage(authPayload),
			})

			// Request telemetry stream
			_ = coreWS.WriteJSON(map[string]interface{}{
				"id":   "node_sub",
				"type": "stats.subscribe",
			})
			logger.Core("Subscribed to telemetry stream on %s", coreClient.BaseURL())

			// Forward Core -> Browser
			go func() {
				for {
					msgType, data, err := coreWS.conn.ReadMessage()
					if err != nil {
						logger.Core("Core WS stream closed: %v", err)
						return
					}
					if err := clientWS.WriteMessage(msgType, data); err != nil {
						return
					}
				}
			}()
		} else {
			logger.Core("Could not establish WS connection to %s", coreClient.BaseURL())
		}
	} else {
		logger.Core("No active Core client configured for WS bridge")
	}

	// Ping ticker measuring Core-Node pings every 3s
	go func() {
		ticker := time.NewTicker(3 * time.Second)
		defer ticker.Stop()

		// Initial measure
		apiPing, wsPing, _ := p.manager.MeasurePings(nodeID)
		_ = clientWS.WriteJSON(map[string]interface{}{
			"type":          "pings",
			"core_api_ping": apiPing,
			"core_ws_ping":  wsPing,
		})

		for {
			select {
			case <-ctx.Done():
				return
			case <-ticker.C:
				apiPing, wsPing, _ := p.manager.MeasurePings(nodeID)
				_ = clientWS.WriteJSON(map[string]interface{}{
					"type":          "pings",
					"core_api_ping": apiPing,
					"core_ws_ping":  wsPing,
				})
			}
		}
	}()

	// Browser message reader: handles browser pings and forwards to core
	for {
		msgType, data, err := clientWS.conn.ReadMessage()
		if err != nil {
			break
		}

		var parsed struct {
			ID   string `json:"id"`
			Type string `json:"type"`
		}
		if jsonErr := json.Unmarshal(data, &parsed); jsonErr == nil {
			// Fast browser-to-node ping reply
			if parsed.Type == "ping" {
				pongMsg := map[string]interface{}{
					"type": "pong",
				}
				if parsed.ID != "" {
					pongMsg["id"] = parsed.ID
				}
				_ = clientWS.WriteJSON(pongMsg)
				continue
			}
		}

		// Forward to Core if connected
		if coreWS != nil {
			_ = coreWS.WriteMessage(msgType, data)
		}
	}
}

func dialCoreWS(client *hexcore.Client, rawQuery string) *websocket.Conn {
	if client == nil {
		return nil
	}

	coreBase := client.BaseURL()
	coreURLParsed, err := url.Parse(coreBase)
	if err != nil {
		return nil
	}

	switch coreURLParsed.Scheme {
	case "http":
		coreURLParsed.Scheme = "ws"
	case "https":
		coreURLParsed.Scheme = "wss"
	}
	coreURLParsed.Path = "/ws"
	coreURLParsed.RawQuery = rawQuery

	if client.Mode() == hexcore.ModeUnixSocket {
		socketPath := client.SocketPath()
		dialer := websocket.Dialer{
			NetDialContext: func(ctx context.Context, _, _ string) (net.Conn, error) {
				return (&net.Dialer{}).DialContext(ctx, "unix", socketPath)
			},
			HandshakeTimeout: 5 * time.Second,
		}
		coreURLParsed.Host = "hex-core"
		coreURLParsed.Scheme = "ws"
		conn, _, err := dialer.Dial(coreURLParsed.String(), nil)
		if err != nil {
			return nil
		}
		return conn
	}

	dialer := websocket.Dialer{
		HandshakeTimeout: 5 * time.Second,
		TLSClientConfig:  &tls.Config{InsecureSkipVerify: true},
	}
	hdr := http.Header{}
	if jwt := client.JWT(); jwt != "" {
		hdr.Set("Authorization", "Bearer "+jwt)
	}
	conn, _, err := dialer.Dial(coreURLParsed.String(), hdr)
	if err != nil {
		return nil
	}
	return conn
}
