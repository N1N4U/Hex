package auth

import (
	"crypto/hmac"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"log"
	"net"
	"net/http"
	"strings"
	"time"

	"github.com/N1N4U/Hex/core/database"
)

type JWTHeader struct {
	Alg string `json:"alg"`
	Typ string `json:"typ"`
}

type JWTClaims struct {
	Sub       string `json:"sub"`
	Endpoint  string `json:"endpoint,omitempty"`
	IssuedAt  int64  `json:"iat"`
	ExpiresAt int64  `json:"exp"`
}

func HashAPIKey(key string) string {
	hash := sha256.Sum256([]byte(key))
	return hex.EncodeToString(hash[:])
}

func GetOrCreateJWTSecret() ([]byte, error) {
	if database.DB == nil {
		return []byte("fallback_hex_core_secret_key_change"), nil
	}

	secretHex, err := database.DB.GetSetting("jwt_secret")
	if err == nil && secretHex != "" {
		return hex.DecodeString(secretHex)
	}

	buf := make([]byte, 32)
	if _, err := rand.Read(buf); err != nil {
		return nil, err
	}

	newSecretHex := hex.EncodeToString(buf)
	_ = database.DB.SetSetting("jwt_secret", newSecretHex)
	return buf, nil
}

func GenerateJWT(subject string, endpoint string, duration time.Duration) (string, error) {
	secret, err := GetOrCreateJWTSecret()
	if err != nil {
		return "", err
	}

	header := JWTHeader{Alg: "HS256", Typ: "JWT"}
	headerJSON, _ := json.Marshal(header)
	headerB64 := base64.RawURLEncoding.EncodeToString(headerJSON)

	now := time.Now().Unix()
	claims := JWTClaims{
		Sub:       subject,
		Endpoint:  endpoint,
		IssuedAt:  now,
		ExpiresAt: now + int64(duration.Seconds()),
	}
	claimsJSON, _ := json.Marshal(claims)
	claimsB64 := base64.RawURLEncoding.EncodeToString(claimsJSON)

	unsignedToken := headerB64 + "." + claimsB64

	mac := hmac.New(sha256.New, secret)
	mac.Write([]byte(unsignedToken))
	sigB64 := base64.RawURLEncoding.EncodeToString(mac.Sum(nil))

	return unsignedToken + "." + sigB64, nil
}

func ValidateJWT(tokenStr string) (*JWTClaims, error) {
	parts := strings.Split(tokenStr, ".")
	if len(parts) != 3 {
		return nil, fmt.Errorf("invalid token format")
	}

	secret, err := GetOrCreateJWTSecret()
	if err != nil {
		return nil, err
	}

	unsignedToken := parts[0] + "." + parts[1]
	mac := hmac.New(sha256.New, secret)
	mac.Write([]byte(unsignedToken))
	expectedSig := mac.Sum(nil)

	actualSig, err := base64.RawURLEncoding.DecodeString(parts[2])
	if err != nil || !hmac.Equal(expectedSig, actualSig) {
		return nil, fmt.Errorf("invalid token signature")
	}

	claimsBytes, err := base64.RawURLEncoding.DecodeString(parts[1])
	if err != nil {
		return nil, fmt.Errorf("invalid token claims")
	}

	var claims JWTClaims
	if err := json.Unmarshal(claimsBytes, &claims); err != nil {
		return nil, fmt.Errorf("failed to parse token claims")
	}

	if time.Now().Unix() > claims.ExpiresAt {
		return nil, fmt.Errorf("token has expired")
	}

	return &claims, nil
}

func Middleware(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		host, _, err := net.SplitHostPort(r.RemoteAddr)
		if err != nil {
			host = r.RemoteAddr
		}
		endpoint := host

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
			token = authHeader
		}

		token = strings.TrimSpace(token)
		if token == "" {
			http.Error(w, "Forbidden: Empty Token", http.StatusForbidden)
			return
		}

		isAuthenticated := false

		if claims, err := ValidateJWT(token); err == nil && claims != nil {
			isAuthenticated = true
		} else {
			keyHash := HashAPIKey(token)
			valid, err := database.DB.AuthenticateAndBind(keyHash, endpoint)
			if err == nil && valid {
				isAuthenticated = true
			}
		}

		if !isAuthenticated {
			http.Error(w, "Forbidden: Invalid or Expired Token", http.StatusForbidden)
			return
		}

		if r.TLS == nil {
			isTrusted, err := database.DB.IsEndpointTrusted(endpoint)
			if err != nil || !isTrusted {
				database.DB.AddPendingEndpoint(endpoint)
				log.Printf("[SECURITY] Connection attempt from unapproved endpoint: %s", endpoint)
				http.Error(w, fmt.Sprintf("Forbidden: Endpoint Not Approved. Run '''hex api approve %s''' on the Core.", endpoint), http.StatusForbidden)
				return
			}
		}

		next.ServeHTTP(w, r)
	}
}
