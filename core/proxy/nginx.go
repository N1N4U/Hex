package proxy

import (
	"context"
	"fmt"
	"log"
	"net"
	"os"
	"os/exec"
	"path/filepath"
	"regexp"
	"strings"
)

var (
	validNameRegex   = regexp.MustCompile(`^[a-zA-Z0-9_-]+$`)
	validDomainRegex = regexp.MustCompile(`^[a-zA-Z0-9.-]+$`)
)

type ProxyRequest struct {
	Name       string `json:"name"`
	Domain     string `json:"domain"`
	TargetIP   string `json:"targetIp"`
	TargetPort int    `json:"targetPort"`
	EnableSSL  bool   `json:"enableSsl"`
}

type Manager struct {
	confDir string
}

func NewManager() (*Manager, error) {
	confDir := "/etc/nginx/conf.d"
	if _, err := os.Stat("/etc/nginx"); os.IsNotExist(err) {
		confDir = "./nginx_confs"
	}

	if err := os.MkdirAll(confDir, 0755); err != nil {
		return nil, fmt.Errorf("failed to create nginx conf directory: %w", err)
	}
	return &Manager{confDir: filepath.Clean(confDir)}, nil
}

func (m *Manager) sanitizeName(name string) (string, error) {
	name = strings.TrimSpace(name)
	if name == "" {
		return "", fmt.Errorf("proxy name cannot be empty")
	}
	if strings.Contains(name, "..") || strings.ContainsAny(name, "/\\") {
		return "", fmt.Errorf("proxy name cannot contain path traversal or slashes")
	}
	if !validNameRegex.MatchString(name) {
		return "", fmt.Errorf("proxy name must contain only alphanumeric characters, dashes, and underscores")
	}
	return name, nil
}

func (m *Manager) sanitizeDomain(domain string) (string, error) {
	domain = strings.TrimSpace(domain)
	if domain == "" {
		return "", fmt.Errorf("domain cannot be empty")
	}
	if strings.Contains(domain, "..") || strings.ContainsAny(domain, "/\\;{}()` \t\r\n'\"") {
		return "", fmt.Errorf("domain contains invalid characters")
	}
	if !validDomainRegex.MatchString(domain) {
		return "", fmt.Errorf("invalid domain format")
	}
	return domain, nil
}

func (m *Manager) CreateProxy(ctx context.Context, req ProxyRequest) error {
	safeName, err := m.sanitizeName(req.Name)
	if err != nil {
		return err
	}

	safeDomain, err := m.sanitizeDomain(req.Domain)
	if err != nil {
		return err
	}

	if req.TargetPort <= 0 || req.TargetPort > 65535 {
		return fmt.Errorf("invalid target port: %d (must be 1-65535)", req.TargetPort)
	}

	safeTargetIP := strings.TrimSpace(req.TargetIP)
	if safeTargetIP == "" {
		safeTargetIP = "127.0.0.1"
	}
	if strings.ContainsAny(safeTargetIP, ";{}()` \t\r\n'\"") {
		return fmt.Errorf("invalid target IP or host")
	}
	if net.ParseIP(safeTargetIP) == nil && !validDomainRegex.MatchString(safeTargetIP) {
		return fmt.Errorf("invalid target IP address or hostname")
	}

	log.Printf("Setting up reverse proxy for %s (%s) -> %s:%d (SSL: %v)\n", safeName, safeDomain, safeTargetIP, req.TargetPort, req.EnableSSL)

	confPath := filepath.Join(m.confDir, fmt.Sprintf("%s.conf", safeName))
	if !strings.HasPrefix(filepath.Clean(confPath), m.confDir) {
		return fmt.Errorf("access denied: configuration path outside allowed directory")
	}

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
`, safeDomain, safeTargetIP, req.TargetPort)

	if err := os.WriteFile(confPath, []byte(confContent), 0644); err != nil {
		return fmt.Errorf("failed to write nginx config: %w", err)
	}

	if err := m.testNginx(); err != nil {
		os.Remove(confPath)
		return fmt.Errorf("nginx config test failed: %s", err.Error())
	}

	if err := m.reloadNginx(); err != nil {
		return fmt.Errorf("failed to reload nginx: %w", err)
	}

	if req.EnableSSL {
		if err := m.runCertbot(safeDomain); err != nil {
			return fmt.Errorf("failed to request SSL certificate: %w", err)
		}
	}

	return nil
}

func (m *Manager) DeleteProxy(name string) error {
	safeName, err := m.sanitizeName(name)
	if err != nil {
		return err
	}

	confPath := filepath.Join(m.confDir, fmt.Sprintf("%s.conf", safeName))
	if !strings.HasPrefix(filepath.Clean(confPath), m.confDir) {
		return fmt.Errorf("access denied: path outside nginx directory")
	}

	if err := os.Remove(confPath); err != nil {
		if !os.IsNotExist(err) {
			return fmt.Errorf("failed to delete config: %w", err)
		}
	}
	return m.reloadNginx()
}

func (m *Manager) testNginx() error {
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
	
	if _, err := exec.LookPath("nginx"); err != nil {
		log.Println("[MOCK] nginx -s reload (Nginx not installed)")
		return nil
	}
	
	cmd := exec.Command("nginx", "-s", "reload")
	return cmd.Run()
}

func (m *Manager) runCertbot(domain string) error {
	safeDomain, err := m.sanitizeDomain(domain)
	if err != nil {
		return err
	}

	if _, err := exec.LookPath("certbot"); err != nil {
		log.Printf("[MOCK] certbot --nginx -d %s --non-interactive --agree-tos\n", safeDomain)
		return nil
	}

	cmd := exec.Command("certbot", "--nginx", "-d", safeDomain, "--non-interactive", "--agree-tos", "--register-unsafely-without-email")
	out, err := cmd.CombinedOutput()
	if err != nil {
		return fmt.Errorf("%s", string(out))
	}
	return nil
}
