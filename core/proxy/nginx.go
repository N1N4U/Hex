package proxy

import (
	"context"
	"fmt"
	"log"
	"os"
	"path/filepath"
)

type ProxyRequest struct {
	Domain     string `json:"domain"`
	TargetURL  string `json:"targetUrl"`
	EnableSSL  bool   `json:"enableSsl"`
}

type Manager struct {
	confDir string
}

func NewManager() (*Manager, error) {
	// For dev, we use a local directory. In prod this would be /etc/nginx/conf.d
	confDir := "./nginx_confs"
	if err := os.MkdirAll(confDir, 0755); err != nil {
		return nil, fmt.Errorf("failed to create nginx conf directory: %w", err)
	}
	return &Manager{confDir: confDir}, nil
}

func (m *Manager) CreateProxy(ctx context.Context, req ProxyRequest) error {
	log.Printf("Setting up reverse proxy for %s -> %s (SSL: %v)\n", req.Domain, req.TargetURL, req.EnableSSL)

	confPath := filepath.Join(m.confDir, fmt.Sprintf("%s.conf", req.Domain))

	// 1. Generate Nginx template
	// NOTE: In production, the SSL block would be appended by certbot if requested.
	// For simplicity, we write a standard reverse proxy config.
	confContent := fmt.Sprintf(`server {
    listen 80;
    server_name %s;

    location / {
        proxy_pass %s;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
`, req.Domain, req.TargetURL)

	if err := os.WriteFile(confPath, []byte(confContent), 0644); err != nil {
		return fmt.Errorf("failed to write nginx config: %w", err)
	}

	// 2. Request SSL Certificates via Certbot (if enabled)
	if req.EnableSSL {
		log.Printf("Requesting Let's Encrypt certificates for %s...\n", req.Domain)
		// We mock the execution since certbot isn't installed locally
		// In production: certbot --nginx -d req.Domain --non-interactive --agree-tos -m admin@req.Domain
		log.Printf("[MOCK] Running: certbot --nginx -d %s --non-interactive\n", req.Domain)
	}

	// 3. Reload Nginx
	log.Printf("Reloading Nginx...\n")
	// We mock the reload as well to ensure this runs gracefully on a developer's Windows box
	// In production: exec.CommandContext(ctx, "nginx", "-s", "reload").Run()
	log.Printf("[MOCK] Running: nginx -s reload\n")

	log.Printf("Reverse proxy setup completed for %s\n", req.Domain)
	return nil
}
