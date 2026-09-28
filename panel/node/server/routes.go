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
	nodesH := api.NewNodesHandler()
	proxy := api.NewCoreProxy(coreClient)
	wsProxy := api.NewWSProxy(coreClient)

	// ?? Public auth & config endpoints ???????????????????????????????????????
	mux.HandleFunc("/api/v1/auth/login", middleware.RateLimit(10, 60e9, authH.Login))
	mux.HandleFunc("/api/v1/auth/logout", authH.Logout)
	mux.HandleFunc("/api/v1/auth/logout-all", authH.LogoutAll)
	mux.HandleFunc("/api/v1/auth/refresh", authH.Refresh)
	mux.HandleFunc("/api/v1/auth/setup", authH.Setup)
	mux.HandleFunc("/api/v1/config/public", authH.PublicConfig)

	// ?? Authenticated endpoints ?????????????????????????????????????????????
	mux.HandleFunc("/api/v1/auth/me", middleware.Auth(cfg.JWTSecret, authH.Me))
	mux.HandleFunc("/api/v1/nodes", middleware.Auth(cfg.JWTSecret, func(w http.ResponseWriter, r *http.Request) {
		switch r.Method {
		case http.MethodGet:
			nodesH.List(w, r)
		case http.MethodPost:
			nodesH.Add(w, r)
		case http.MethodDelete:
			nodesH.Delete(w, r)
		default:
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		}
	}))
	mux.HandleFunc("/api/v1/activities", middleware.Auth(cfg.JWTSecret, nodesH.Activities))

	// ?? WebSocket proxy (auth checked before upgrade) ????????????????????????
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

	// ?? Core proxy (all core endpoints under /api/v1/core/*) ????????????????
	mux.HandleFunc("/api/v1/core/", middleware.Auth(cfg.JWTSecret, proxy.Proxy))
}
