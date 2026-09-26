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
)

var mu sync.Mutex

// JWT returns the current cached JWT (for WS proxy use).
func (c *Client) JWT() string {
	mu.Lock()
	defer mu.Unlock()
	return c.jwt
}

// SocketPath returns the Unix socket path.
func (c *Client) SocketPath() string { return c.socket }

// ensureJWT obtains or refreshes the core JWT.
// On same-machine mode (Unix socket), no JWT is needed.
func (c *Client) ensureJWT(ctx context.Context) error {
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
		return fmt.Errorf("core JWT exchange failed: %w", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		b, _ := io.ReadAll(resp.Body)
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
	return nil
}

// Do performs an authenticated request to core.
func (c *Client) Do(ctx context.Context, method, path string, body io.Reader) (*http.Response, error) {
	if err := c.ensureJWT(ctx); err != nil {
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
