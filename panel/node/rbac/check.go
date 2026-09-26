package rbac

import (
	"net/http"
)

// Require returns an HTTP middleware that enforces a minimum role.
func Require(minRole string, next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		role, _ := r.Context().Value(contextKeyRole).(string)
		if !AtLeast(role, minRole) {
			http.Error(w, "Forbidden", http.StatusForbidden)
			return
		}
		next(w, r)
	}
}

type contextKey string
const contextKeyRole contextKey = "role"
