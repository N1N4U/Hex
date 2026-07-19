package auth

import (
	"crypto/sha256"
	"encoding/hex"
	"log"
	"net/http"
	"strings"

	"github.com/N1N4U/Hex/core/database"
)

// HashAPIKey hashes the API key using SHA-256 for secure storage.
func HashAPIKey(key string) string {
	hash := sha256.Sum256([]byte(key))
	return hex.EncodeToString(hash[:])
}

// Middleware verifies the API key and the IP address.
func Middleware(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		endpoint := r.RemoteAddr
		// 1. Verify API Key
		authHeader := r.Header.Get("Authorization")
		if authHeader == "" {
			http.Error(w, "Forbidden: Missing Authorization Header", http.StatusForbidden)
			return
		}

		parts := strings.SplitN(authHeader, " ", 2)
		var token string
		if len(parts) == 2 && parts[0] == "Bearer" {
			token = parts[1]
		} else {
			token = authHeader // fallback if they just send the key
		}

		// First, check if it's a JWT token
		// (JWT Logic will be added here later, for now we assume API Key)

		keyHash := HashAPIKey(token)
		valid, err := database.DB.VerifyAPIKey(keyHash)
		if err != nil || !valid {
			http.Error(w, "Forbidden: Invalid or Expired Token", http.StatusForbidden)
			return
		}

		// 2. Check if Endpoint is trusted
		// If using mTLS (r.TLS != nil), we skip the IP whitelist since the client certificate already strongly authenticates the connection transport.
		if r.TLS == nil {
			isTrusted, err := database.DB.IsEndpointTrusted(endpoint)
			if err != nil || !isTrusted {
				// Not trusted yet. We add them to pending if they try to connect.
				database.DB.AddPendingEndpoint(endpoint)
				log.Printf("[SECURITY] Connection attempt from unapproved endpoint: %s", endpoint)
				http.Error(w, "Forbidden: Endpoint Not Approved. Run 'hex api approve <ip:port>' on the Core.", http.StatusForbidden)
				return
			}
		}

		next.ServeHTTP(w, r)
	}
}
