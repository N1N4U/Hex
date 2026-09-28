package core

import (
	"context"
	"fmt"
	"net"
	"net/http"
	"os"
	"time"
)

// TransportMode describes how node talks to core.
type TransportMode int

const (
	ModeUnixSocket TransportMode = iota // same machine
	ModeRemoteHTTP                       // remote, no TLS
	ModeRemoteHTTPS                      // remote, mTLS (future)
)

// Client is the node→core HTTP client.
type Client struct {
	mode    TransportMode
	baseURL string
	socket  string
	http    *http.Client
	apiKey  string
	jwt     string
	jwtExp  time.Time
}

// NewClient creates a node→core client.
// It auto-detects whether to use Unix socket or HTTP based on socket file existence.
func NewClient(socketPath, coreURL, apiKey string) (*Client, error) {
	c := &Client{
		apiKey: apiKey,
	}

	// Auto-detect: if socket exists → same-machine mode
	if _, err := os.Stat(socketPath); err == nil {
		c.mode = ModeUnixSocket
		c.socket = socketPath
		c.http = &http.Client{
			Transport: &http.Transport{
				DialContext: func(ctx context.Context, _, _ string) (net.Conn, error) {
					return (&net.Dialer{}).DialContext(ctx, "unix", socketPath)
				},
			},
			Timeout: 5 * time.Second,
		}
		c.baseURL = "http://hex-core" // hostname doesn't matter for unix socket
		return c, nil
	}

	// Remote mode (HTTP, no mTLS)
	if coreURL == "" {
		return nil, fmt.Errorf("core socket %q not found and HEX_CORE_URL not set", socketPath)
	}
	c.mode = ModeRemoteHTTP
	c.baseURL = coreURL
	c.http = &http.Client{
		Timeout: 5 * time.Second,
	}
	return c, nil
}

// Mode returns the active transport mode.
func (c *Client) Mode() TransportMode { return c.mode }

// BaseURL returns the effective base URL (for logging).
func (c *Client) BaseURL() string { return c.baseURL }
