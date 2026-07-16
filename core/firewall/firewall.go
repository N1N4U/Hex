package firewall

import (
	"errors"
	"fmt"
	"os/exec"
)

// Rule represents a parsed firewall rule
type Rule struct {
	ID       string
	Port     int
	Protocol string
	Action   string
}

// Manager defines the interface for interacting with the host firewall
type Manager interface {
	AllowPort(port int, protocol string) error
	DenyPort(port int, protocol string) error
	DeleteRule(id string) error
	ListRules() ([]Rule, error)
	Reload() error
}

// NewManager auto-detects the firewall and returns the appropriate implementation
func NewManager() (Manager, error) {
	if _, err := exec.LookPath("ufw"); err == nil {
		return &UFWManager{}, nil
	}
	// Fallback to firewalld or nftables in the future
	return nil, errors.New("no supported firewall found (ufw, firewalld, nftables)")
}

// UFWManager implements the Manager interface using os/exec for ufw
type UFWManager struct{}

func (u *UFWManager) AllowPort(port int, protocol string) error {
	cmd := exec.Command("ufw", "allow", fmt.Sprintf("%d/%s", port, protocol))
	return cmd.Run()
}

func (u *UFWManager) DenyPort(port int, protocol string) error {
	cmd := exec.Command("ufw", "deny", fmt.Sprintf("%d/%s", port, protocol))
	return cmd.Run()
}

func (u *UFWManager) DeleteRule(id string) error {
	// ufw delete allow <port>/<protocol>
	// Parsing ID is required for a complete implementation
	return errors.New("not implemented yet")
}

func (u *UFWManager) ListRules() ([]Rule, error) {
	// Execute 'ufw status numbered' and parse output
	return []Rule{}, nil
}

func (u *UFWManager) Reload() error {
	cmd := exec.Command("ufw", "reload")
	return cmd.Run()
}
