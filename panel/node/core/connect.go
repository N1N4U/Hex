package core

import (
	"context"
	"crypto/tls"
	"fmt"
	"net"
	"net/http"
	"os"
	"strings"
	"time"
)

// TransportMode describes how node talks to core.
type TransportMode int

const (
	ModeUnixSocket TransportMode = iota // same machine
	ModeRemoteHTTP                       // remote, no TLS
	ModeRemoteHTTPS                      // remote, mTLS / HTTPS
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
	if socketPath != "" {
		if _, err := os.Stat(socketPath); err == nil {
			c.mode = ModeUnixSocket
			c.socket = socketPath
			c.http = &http.Client{
				Transport: &http.Transport{
					DialContext: func(ctx context.Context, _, _ string) (net.Conn, error) {
						return (&net.Dialer{}).DialContext(ctx, "unix", socketPath)
					},
				},
				Timeout: 10 * time.Second,
			}
			c.baseURL = "http://hex-core" // hostname doesn't matter for unix socket
			return c, nil
		}
	}

	// Remote mode
	if coreURL == "" {
		return nil, fmt.Errorf("core socket %q not found and HEX_CORE_URL not set", socketPath)
	}
	c.mode = ModeRemoteHTTP
	if strings.HasPrefix(strings.ToLower(coreURL), "https://") {
		c.mode = ModeRemoteHTTPS
	}
	c.baseURL = strings.TrimRight(coreURL, "/")
	c.http = &http.Client{
		Transport: &http.Transport{
			TLSClientConfig: &tls.Config{InsecureSkipVerify: true},
		},
		Timeout: 10 * time.Second,
	}
	return c, nil
}

// NewRemoteClient creates an HTTP/HTTPS client specifically targeting a remote Core node.
func NewRemoteClient(protocol, ip string, port int, apiKey string) (*Client, error) {
	if protocol == "" {
		protocol = "http"
	}
	if port <= 0 {
		port = 8080
	}
	baseURL := fmt.Sprintf("%s://%s:%d", protocol, ip, port)
	mode := ModeRemoteHTTP
	if protocol == "https" {
		mode = ModeRemoteHTTPS
	}

	return &Client{
		mode:    mode,
		baseURL: baseURL,
		apiKey:  apiKey,
		http: &http.Client{
			Transport: &http.Transport{
				TLSClientConfig: &tls.Config{InsecureSkipVerify: true},
			},
			Timeout: 10 * time.Second,
		},
	}, nil
}

// Mode returns the active transport mode.
func (c *Client) Mode() TransportMode {
	if c == nil {
		return ModeRemoteHTTP
	}
	return c.mode
}

// BaseURL returns the effective base URL (for logging & WS dial).
func (c *Client) BaseURL() string {
	if c == nil {
		return ""
	}
	return c.baseURL
}

// SocketPath returns the Unix socket path.
func (c *Client) SocketPath() string {
	if c == nil {
		return ""
	}
	return c.socket
}

// APIKey returns the configured API key.
func (c *Client) APIKey() string {
	if c == nil {
		return ""
	}
	return c.apiKey
}
