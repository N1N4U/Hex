package server

import (
	"net/http"

	"github.com/N1N4U/Hex/panel/api"
	nodeauth "github.com/N1N4U/Hex/panel/auth"
	"github.com/N1N4U/Hex/panel/config"
	"github.com/N1N4U/Hex/panel/core"
	"github.com/N1N4U/Hex/panel/server/middleware"
)

func registerRoutes(mux *http.ServeMux, cfg *config.Config, coreMgr *core.Manager) {
	authH := api.NewAuthHandlers(cfg)
	nodesH := api.NewNodesHandler(coreMgr)
	proxy := api.NewCoreProxy(coreMgr)
	wsProxy := api.NewWSProxy(coreMgr)
	sshTermH := api.NewSSHTerminalHandler()

	// ── Public auth & config endpoints ───────────────────────────────────────
	mux.HandleFunc("/api/v1/auth/login", middleware.RateLimit(10, 60e9, authH.Login))
	mux.HandleFunc("/api/v1/auth/logout", authH.Logout)
	mux.HandleFunc("/api/v1/auth/logout-all", authH.LogoutAll)
	mux.HandleFunc("/api/v1/auth/refresh", authH.Refresh)
	mux.HandleFunc("/api/v1/auth/setup", authH.Setup)
	mux.HandleFunc("/api/v1/config/public", authH.PublicConfig)
	mux.HandleFunc("/api/v1/ping", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "text/plain")
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("pong"))
	})

	// ── Authenticated endpoints ─────────────────────────────────────────────
	mux.HandleFunc("/api/v1/auth/me", middleware.Auth(cfg.JWTSecret, authH.Me))
	mux.HandleFunc("/api/v1/nodes", middleware.Auth(cfg.JWTSecret, func(w http.ResponseWriter, r *http.Request) {
		switch r.Method {
		case http.MethodGet:
			nodesH.List(w, r)
		case http.MethodPost:
			nodesH.Add(w, r)
		case http.MethodPut:
			nodesH.Update(w, r)
		case http.MethodDelete:
			nodesH.Delete(w, r)
		default:
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		}
	}))
	mux.HandleFunc("/api/v1/nodes/active", middleware.Auth(cfg.JWTSecret, nodesH.SetActive))
	mux.HandleFunc("/api/v1/nodes/toggle", middleware.Auth(cfg.JWTSecret, nodesH.Toggle))
	mux.HandleFunc("/api/v1/activities", middleware.Auth(cfg.JWTSecret, nodesH.Activities))

	// ── WebSocket proxy (auth checked before upgrade) ────────────────────────
	mux.HandleFunc("/api/v1/ws", func(w http.ResponseWriter, r *http.Request) {
		token := nodeauth.GetAccessToken(r)
		if token == "" {
			http.Error(w, "Unauthorized", http.StatusUnauthorized)
			return
		}
		_, err := nodeauth.ParseAccessToken(token, cfg.JWTSecret)
		if err != nil {
			http.Error(w, "Unauthorized", http.StatusUnauthorized)
			return
		}
		wsProxy.ProxyWS(w, r)
	})

	// ── Standalone SSH/SFTP Terminal WebSocket (Node to any VPS) ─────────────
	mux.HandleFunc("/api/v1/terminal/ws", func(w http.ResponseWriter, r *http.Request) {
		token := nodeauth.GetAccessToken(r)
		if token == "" {
			http.Error(w, "Unauthorized", http.StatusUnauthorized)
			return
		}
		_, err := nodeauth.ParseAccessToken(token, cfg.JWTSecret)
		if err != nil {
			http.Error(w, "Unauthorized", http.StatusUnauthorized)
			return
		}
		sshTermH.HandleTerminalWS(w, r)
	})

	// ── Core proxy (all core endpoints under /api/v1/core/*) ─────────────────
	mux.HandleFunc("/api/v1/core/", middleware.Auth(cfg.JWTSecret, proxy.Proxy))
}
