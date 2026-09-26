package server

import (
	"net/http"

	nodeauth "github.com/N1N4U/Hex/panel/auth"
	"github.com/N1N4U/Hex/panel/api"
	"github.com/N1N4U/Hex/panel/config"
	"github.com/N1N4U/Hex/panel/core"
	"github.com/N1N4U/Hex/panel/server/middleware"
)

func registerRoutes(mux *http.ServeMux, cfg *config.Config, coreClient *core.Client) {
	authH := api.NewAuthHandlers(cfg)
	proxy := api.NewCoreProxy(coreClient)
	wsProxy := api.NewWSProxy(coreClient)

	// ── Public auth endpoints ────────────────────────────────────────────────
	mux.HandleFunc("/api/v1/auth/login", middleware.RateLimit(10, 60e9, authH.Login))
	mux.HandleFunc("/api/v1/auth/logout", authH.Logout)
	mux.HandleFunc("/api/v1/auth/refresh", authH.Refresh)
	mux.HandleFunc("/api/v1/auth/setup", authH.Setup)

	// ── Authenticated auth endpoints ─────────────────────────────────────────
	mux.HandleFunc("/api/v1/auth/me", middleware.Auth(cfg.JWTSecret, authH.Me))

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

	// ── Core proxy (all core endpoints under /api/v1/core/*) ────────────────
	mux.HandleFunc("/api/v1/core/", middleware.Auth(cfg.JWTSecret, proxy.Proxy))
}
