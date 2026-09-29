package core

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"sync"
	"time"

	"github.com/N1N4U/Hex/panel/logger"
)

var mu sync.Mutex

// JWT returns the current cached JWT (for WS proxy use).
func (c *Client) JWT() string {
	if c == nil {
		return ""
	}
	mu.Lock()
	defer mu.Unlock()
	return c.jwt
}

// EnsureJWT obtains or refreshes the core JWT.
// On same-machine mode (Unix socket), no JWT is needed.
func (c *Client) EnsureJWT(ctx context.Context) error {
	if c == nil {
		return fmt.Errorf("core client is nil")
	}
	if c.mode == ModeUnixSocket {
		return nil
	}
	mu.Lock()
	defer mu.Unlock()
	if c.jwt != "" && time.Until(c.jwtExp) > 30*time.Second {
		return nil
	}
	body, _ := json.Marshal(map[string]string{"api_key": c.apiKey})
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, c.baseURL+"/auth/token", bytes.NewReader(body))
	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", "application/json")
	resp, err := c.http.Do(req)
	if err != nil {
		logger.Core("JWT exchange failed for %s: %v", c.baseURL, err)
		return fmt.Errorf("core JWT exchange failed: %w", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		b, _ := io.ReadAll(resp.Body)
		logger.Core("JWT exchange rejected by %s (HTTP %d): %s", c.baseURL, resp.StatusCode, string(b))
		return fmt.Errorf("core JWT exchange: status %d: %s", resp.StatusCode, b)
	}
	var result struct {
		Token     string `json:"token"`
		ExpiresIn int    `json:"expires_in"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return err
	}
	c.jwt = result.Token
	c.jwtExp = time.Now().Add(time.Duration(result.ExpiresIn) * time.Second)
	logger.Core("Authenticated with Core at %s (token expires in %ds)", c.baseURL, result.ExpiresIn)
	return nil
}

// Do performs an authenticated request to core.
func (c *Client) Do(ctx context.Context, method, path string, body io.Reader) (*http.Response, error) {
	if c == nil {
		return nil, fmt.Errorf("core client is nil")
	}
	if err := c.EnsureJWT(ctx); err != nil {
		return nil, err
	}
	req, err := http.NewRequestWithContext(ctx, method, c.baseURL+path, body)
	if err != nil {
		return nil, err
	}
	if c.jwt != "" {
		req.Header.Set("Authorization", "Bearer "+c.jwt)
	}
	if body != nil {
		req.Header.Set("Content-Type", "application/json")
	}
	return c.http.Do(req)
}
