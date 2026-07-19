package firewall

import (
	"os/exec"
)

type FirewallRule struct {
	Port   string `json:"port"`
	Action string `json:"action"` // "allow" or "deny"
	Status string `json:"status"` // "active"
}

type Manager struct {}

func NewManager() *Manager {
	return &Manager{}
}

func (m *Manager) ListRules() (string, error) {
	out, err := exec.Command("ufw", "status", "numbered").CombinedOutput()
	return string(out), err
}

func (m *Manager) AllowPort(port string) error {
	return exec.Command("ufw", "allow", port).Run()
}

func (m *Manager) DenyPort(port string) error {
	return exec.Command("ufw", "delete", "allow", port).Run()
}

func (m *Manager) Enable() error {
	return exec.Command("ufw", "--force", "enable").Run()
}

func (m *Manager) Disable() error {
	return exec.Command("ufw", "disable").Run()
}
