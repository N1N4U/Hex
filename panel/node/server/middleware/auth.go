package middleware

import (
	"context"
	"net/http"

	nodeauth "github.com/N1N4U/Hex/panel/auth"
)

type ContextKey string

const (
	ContextKeyUserID ContextKey = "userID"
	ContextKeyRole   ContextKey = "role"
)

func UserIDFromContext(ctx context.Context) string {
	if val, ok := ctx.Value(ContextKeyUserID).(string); ok {
		return val
	}
	return ""
}

func RoleFromContext(ctx context.Context) string {
	if val, ok := ctx.Value(ContextKeyRole).(string); ok {
		return val
	}
	return ""
}

// Auth validates the access token from cookie or header and injects user info into context.
func Auth(secret string, next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		token := nodeauth.GetAccessToken(r)
		if token == "" {
			http.Error(w, "Unauthorized", http.StatusUnauthorized)
			return
		}
		claims, err := nodeauth.ParseAccessToken(token, secret)
		if err != nil {
			http.Error(w, "Unauthorized: "+err.Error(), http.StatusUnauthorized)
			return
		}
		ctx := context.WithValue(r.Context(), ContextKeyUserID, claims.UserID)
		ctx = context.WithValue(ctx, ContextKeyRole, claims.Role)
		next(w, r.WithContext(ctx))
	}
}

// OptionalAuth tries to parse the token but doesn't fail if missing.
func OptionalAuth(secret string, next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		token := nodeauth.GetAccessToken(r)
		if token != "" {
			if claims, err := nodeauth.ParseAccessToken(token, secret); err == nil {
				ctx := context.WithValue(r.Context(), ContextKeyUserID, claims.UserID)
				ctx = context.WithValue(ctx, ContextKeyRole, claims.Role)
				r = r.WithContext(ctx)
			}
		}
		next(w, r)
	}
}
