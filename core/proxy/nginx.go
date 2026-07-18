package proxy

import (
	"context"
	"fmt"
	"log"
	"os"
	"os/exec"
	"path/filepath"
)

type ProxyRequest struct {
	Domain     string `json:"domain"`
	TargetIP   string `json:"targetIp"`
	TargetPort int    `json:"targetPort"`
	EnableSSL  bool   `json:"enableSsl"`
}

type Manager struct {
	confDir string
}

func NewManager() (*Manager, error) {
	// In production this is /etc/nginx/conf.d, but we should allow it to work locally on Windows for dev
	confDir := "/etc/nginx/conf.d"
	
	// Fallback to local dir for development if /etc doesn't exist
	if _, err := os.Stat("/etc/nginx"); os.IsNotExist(err) {
		confDir = "./nginx_confs"
	}

	if err := os.MkdirAll(confDir, 0755); err != nil {
		return nil, fmt.Errorf("failed to create nginx conf directory: %w", err)
	}
	return &Manager{confDir: confDir}, nil
}

func (m *Manager) CreateProxy(ctx context.Context, req ProxyRequest) error {
	log.Printf("Setting up reverse proxy for %s -> %s:%d (SSL: %v)\n", req.Domain, req.TargetIP, req.TargetPort, req.EnableSSL)

	confPath := filepath.Join(m.confDir, fmt.Sprintf("%s.conf", req.Domain))

	// 1. Generate Nginx template
	confContent := fmt.Sprintf(`server {
    listen 80;
    server_name %s;

    location / {
        proxy_pass http://%s:%d;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
`, req.Domain, req.TargetIP, req.TargetPort)

	if err := os.WriteFile(confPath, []byte(confContent), 0644); err != nil {
		return fmt.Errorf("failed to write nginx config: %w", err)
	}

	// 2. Test Nginx Configuration
	if err := m.testNginx(); err != nil {
		// Rollback on failure
		os.Remove(confPath)
		return fmt.Errorf("nginx config test failed: %w", err)
	}

	// 3. Reload Nginx
	if err := m.reloadNginx(); err != nil {
		return fmt.Errorf("failed to reload nginx: %w", err)
	}

	// 4. Run Certbot if SSL is requested
	if req.EnableSSL {
		if err := m.runCertbot(req.Domain); err != nil {
			return fmt.Errorf("failed to request SSL certificate: %w", err)
		}
	}

	return nil
}

func (m *Manager) DeleteProxy(domain string) error {
	confPath := filepath.Join(m.confDir, fmt.Sprintf("%s.conf", domain))
	if err := os.Remove(confPath); err != nil {
		if !os.IsNotExist(err) {
			return fmt.Errorf("failed to delete config: %w", err)
		}
	}
	return m.reloadNginx()
}

func (m *Manager) testNginx() error {
	// If we are on Windows dev, skip the test
	if _, err := exec.LookPath("nginx"); err != nil {
		log.Println("[MOCK] nginx -t (Nginx not installed)")
		return nil
	}
	
	cmd := exec.Command("nginx", "-t")
	out, err := cmd.CombinedOutput()
	if err != nil {
		return fmt.Errorf("%s", string(out))
	}
	return nil
}

func (m *Manager) reloadNginx() error {
	if _, err := exec.LookPath("systemctl"); err == nil {
		cmd := exec.Command("systemctl", "reload", "nginx")
		out, err := cmd.CombinedOutput()
		if err != nil {
			return fmt.Errorf("%s", string(out))
		}
		return nil
	}
	
	// Fallback to direct reload
	if _, err := exec.LookPath("nginx"); err != nil {
		log.Println("[MOCK] nginx -s reload (Nginx not installed)")
		return nil
	}
	
	cmd := exec.Command("nginx", "-s", "reload")
	return cmd.Run()
}

func (m *Manager) runCertbot(domain string) error {
	if _, err := exec.LookPath("certbot"); err != nil {
		log.Printf("[MOCK] certbot --nginx -d %s --non-interactive --agree-tos\n", domain)
		return nil
	}

	cmd := exec.Command("certbot", "--nginx", "-d", domain, "--non-interactive", "--agree-tos", "--register-unsafely-without-email")
	out, err := cmd.CombinedOutput()
	if err != nil {
		return fmt.Errorf("%s", string(out))
	}
	return nil
}
