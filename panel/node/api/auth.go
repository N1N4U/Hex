package api

import (
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"net/http"
	"time"

	nodeauth "github.com/N1N4U/Hex/panel/auth"
	"github.com/N1N4U/Hex/panel/config"
	"github.com/N1N4U/Hex/panel/users"
)

type AuthHandlers struct {
	cfg *config.Config
}

func NewAuthHandlers(cfg *config.Config) *AuthHandlers {
	return &AuthHandlers{cfg: cfg}
}

// POST /api/v1/auth/login
func (h *AuthHandlers) Login(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}
	var body struct {
		Username string `json:"username"`
		Password string `json:"password"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		http.Error(w, "Bad request", http.StatusBadRequest)
		return
	}
	if body.Username == "" || body.Password == "" {
		http.Error(w, "Username and password required", http.StatusBadRequest)
		return
	}

	user, err := users.GetUserByUsername(body.Username)
	if err != nil || user == nil {
		http.Error(w, "Invalid credentials", http.StatusUnauthorized)
		return
	}
	ok, err := nodeauth.VerifyPassword(body.Password, user.PasswordHash)
	if err != nil || !ok {
		http.Error(w, "Invalid credentials", http.StatusUnauthorized)
		return
	}

	accessToken, err := nodeauth.GenerateAccessToken(user.ID, user.Role, h.cfg.JWTSecret)
	if err != nil {
		http.Error(w, "Token generation failed", http.StatusInternalServerError)
		return
	}
	refreshToken, err := nodeauth.GenerateRefreshToken()
	if err != nil {
		http.Error(w, "Token generation failed", http.StatusInternalServerError)
		return
	}

	sessionID := newID()
	if err := users.CreateSession(sessionID, user.ID, refreshToken, time.Now().Add(30*24*time.Hour)); err != nil {
		http.Error(w, "Session creation failed", http.StatusInternalServerError)
		return
	}

	secure := !h.cfg.DevMode
	nodeauth.SetAuthCookies(w, accessToken, refreshToken, secure)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"ok":   true,
		"role": user.Role,
	})
}

// POST /api/v1/auth/logout
func (h *AuthHandlers) Logout(w http.ResponseWriter, r *http.Request) {
	if c, err := r.Cookie(nodeauth.RefreshCookieName); err == nil {
		_ = users.DeleteSession(c.Value)
	}
	nodeauth.ClearAuthCookies(w)
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]bool{"ok": true})
}

// POST /api/v1/auth/refresh
func (h *AuthHandlers) Refresh(w http.ResponseWriter, r *http.Request) {
	c, err := r.Cookie(nodeauth.RefreshCookieName)
	if err != nil {
		http.Error(w, "Missing refresh token", http.StatusUnauthorized)
		return
	}
	session, err := users.GetSessionByRefreshToken(c.Value)
	if err != nil || session == nil || time.Now().After(session.ExpiresAt) {
		nodeauth.ClearAuthCookies(w)
		http.Error(w, "Refresh token invalid or expired", http.StatusUnauthorized)
		return
	}
	user, err := users.GetUserByID(session.UserID)
	if err != nil || user == nil {
		http.Error(w, "User not found", http.StatusUnauthorized)
		return
	}

	// Rotate refresh token
	newRefresh, _ := nodeauth.GenerateRefreshToken()
	_ = users.DeleteSession(c.Value)
	_ = users.CreateSession(newID(), user.ID, newRefresh, time.Now().Add(30*24*time.Hour))

	accessToken, _ := nodeauth.GenerateAccessToken(user.ID, user.Role, h.cfg.JWTSecret)
	secure := !h.cfg.DevMode
	nodeauth.SetAuthCookies(w, accessToken, newRefresh, secure)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]bool{"ok": true})
}

// GET /api/v1/auth/me
func (h *AuthHandlers) Me(w http.ResponseWriter, r *http.Request) {
	userID, _ := r.Context().Value(struct{ s string }{"userID"}).(string)
	if userID == "" {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}
	user, err := users.GetUserByID(userID)
	if err != nil || user == nil {
		http.Error(w, "User not found", http.StatusNotFound)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"id":       user.ID,
		"username": user.Username,
		"role":     user.Role,
	})
}

// POST /api/v1/auth/setup — creates the first admin user (only when no users exist)
func (h *AuthHandlers) Setup(w http.ResponseWriter, r *http.Request) {
	count, err := users.CountUsers()
	if err != nil || count > 0 {
		http.Error(w, "Setup already completed", http.StatusForbidden)
		return
	}
	var body struct {
		Username string `json:"username"`
		Password string `json:"password"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil || body.Username == "" || body.Password == "" {
		http.Error(w, "username and password required", http.StatusBadRequest)
		return
	}
	if len(body.Password) < 12 {
		http.Error(w, "Password must be at least 12 characters", http.StatusBadRequest)
		return
	}
	hash, err := nodeauth.HashPassword(body.Password)
	if err != nil {
		http.Error(w, "Failed to hash password", http.StatusInternalServerError)
		return
	}
	if err := users.CreateUser(newID(), body.Username, hash, "owner"); err != nil {
		http.Error(w, "Failed to create user", http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]bool{"ok": true})
}

func newID() string {
	b := make([]byte, 16)
	rand.Read(b)
	return hex.EncodeToString(b)
}
