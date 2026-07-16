package firewall

import (
	"log"
)

type FirewallRule struct {
	Port   string `json:"port"`
	Action string `json:"action"` // "allow" or "deny"
	Status string `json:"status"` // "active"
}

// Manager handles UFW firewall interactions
type Manager struct {
	// For MVP, we maintain a mock list in memory for Windows development
	mockRules []FirewallRule
}

func NewManager() *Manager {
	return &Manager{
		mockRules: []FirewallRule{
			{Port: "22/tcp", Action: "allow", Status: "active"},
			{Port: "80/tcp", Action: "allow", Status: "active"},
			{Port: "443/tcp", Action: "allow", Status: "active"},
			{Port: "8080/tcp", Action: "allow", Status: "active"},
		},
	}
}

func (m *Manager) ListRules() ([]FirewallRule, error) {
	// In production:
	// out, err := exec.Command("ufw", "status", "numbered").Output()
	// parse output...

	log.Printf("[MOCK] ufw status\n")
	return m.mockRules, nil
}

func (m *Manager) AllowPort(port string) error {
	// In production:
	// err := exec.Command("ufw", "allow", port).Run()

	log.Printf("[MOCK] Running: ufw allow %s\n", port)
	
	// Add to mock state
	for _, r := range m.mockRules {
		if r.Port == port {
			return nil // already exists
		}
	}
	m.mockRules = append(m.mockRules, FirewallRule{Port: port, Action: "allow", Status: "active"})
	return nil
}

func (m *Manager) DenyPort(port string) error {
	// In production:
	// err := exec.Command("ufw", "delete", "allow", port).Run()

	log.Printf("[MOCK] Running: ufw delete allow %s\n", port)
	
	// Remove from mock state
	var updated []FirewallRule
	for _, r := range m.mockRules {
		if r.Port != port {
			updated = append(updated, r)
		}
	}
	m.mockRules = updated
	return nil
}
