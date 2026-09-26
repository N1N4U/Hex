package firewall

import (
	"fmt"
	"os/exec"
	"strings"
	"sync"
)

type BackendType string

const (
	BackendUFW       BackendType = "ufw"
	BackendFirewalld BackendType = "firewalld"
	BackendNftables  BackendType = "nftables"
	BackendIptables  BackendType = "iptables"
	BackendNone      BackendType = "none"
)

type Manager struct {
	mu            sync.RWMutex
	activeBackend BackendType
}

func NewManager() *Manager {
	m := &Manager{}
	m.DetectAndSet()
	return m
}

func (m *Manager) DetectBackends() []string {
	var available []string

	if _, err := exec.LookPath("ufw"); err == nil {
		available = append(available, "ufw")
	}
	if _, err := exec.LookPath("firewall-cmd"); err == nil {
		available = append(available, "firewalld")
	}
	if _, err := exec.LookPath("nft"); err == nil {
		available = append(available, "nftables")
	}
	if _, err := exec.LookPath("iptables"); err == nil {
		available = append(available, "iptables")
	}

	if len(available) == 0 {
		available = append(available, "none")
	}
	return available
}

func (m *Manager) DetectAndSet() BackendType {
	m.mu.Lock()
	defer m.mu.Unlock()

	if _, err := exec.LookPath("firewall-cmd"); err == nil {
		out, err := exec.Command("firewall-cmd", "--state").CombinedOutput()
		if err == nil && strings.Contains(string(out), "running") {
			m.activeBackend = BackendFirewalld
			return m.activeBackend
		}
	}

	if _, err := exec.LookPath("ufw"); err == nil {
		out, err := exec.Command("ufw", "status").CombinedOutput()
		if err == nil && strings.Contains(string(out), "Status: active") {
			m.activeBackend = BackendUFW
			return m.activeBackend
		}
	}

	if _, err := exec.LookPath("ufw"); err == nil {
		m.activeBackend = BackendUFW
		return m.activeBackend
	}
	if _, err := exec.LookPath("firewall-cmd"); err == nil {
		m.activeBackend = BackendFirewalld
		return m.activeBackend
	}
	if _, err := exec.LookPath("nft"); err == nil {
		m.activeBackend = BackendNftables
		return m.activeBackend
	}
	if _, err := exec.LookPath("iptables"); err == nil {
		m.activeBackend = BackendIptables
		return m.activeBackend
	}

	m.activeBackend = BackendNone
	return m.activeBackend
}

func (m *Manager) ActiveBackend() string {
	m.mu.RLock()
	defer m.mu.RUnlock()
	return string(m.activeBackend)
}

func parsePortProto(spec string) (string, string) {
	spec = strings.TrimSpace(spec)
	if strings.Contains(spec, "/") {
		parts := strings.SplitN(spec, "/", 2)
		return strings.TrimSpace(parts[0]), strings.ToLower(strings.TrimSpace(parts[1]))
	}
	return spec, "tcp"
}

func (m *Manager) Enable() (string, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()

	switch m.activeBackend {
	case BackendUFW:
		out, err := exec.Command("ufw", "--force", "enable").CombinedOutput()
		return string(out), err
	case BackendFirewalld:
		out, err := exec.Command("systemctl", "start", "firewalld").CombinedOutput()
		if err == nil {
			exec.Command("systemctl", "enable", "firewalld").Run()
		}
		return string(out), err
	case BackendNftables:
		out, err := exec.Command("systemctl", "start", "nftables").CombinedOutput()
		if err == nil {
			exec.Command("systemctl", "enable", "nftables").Run()
		}
		return string(out), err
	default:
		return "No active firewall backend available to enable", fmt.Errorf("no supported firewall manager active")
	}
}

func (m *Manager) Disable() (string, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()

	switch m.activeBackend {
	case BackendUFW:
		out, err := exec.Command("ufw", "disable").CombinedOutput()
		return string(out), err
	case BackendFirewalld:
		out, err := exec.Command("systemctl", "stop", "firewalld").CombinedOutput()
		if err == nil {
			exec.Command("systemctl", "disable", "firewalld").Run()
		}
		return string(out), err
	case BackendNftables:
		out, err := exec.Command("systemctl", "stop", "nftables").CombinedOutput()
		return string(out), err
	default:
		return "No active firewall backend available to disable", fmt.Errorf("no supported firewall manager active")
	}
}

func (m *Manager) Reload() (string, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()

	switch m.activeBackend {
	case BackendUFW:
		out, err := exec.Command("ufw", "reload").CombinedOutput()
		return string(out), err
	case BackendFirewalld:
		out, err := exec.Command("firewall-cmd", "--reload").CombinedOutput()
		return string(out), err
	case BackendNftables:
		out, err := exec.Command("systemctl", "reload", "nftables").CombinedOutput()
		return string(out), err
	default:
		return "No active firewall backend to reload", nil
	}
}

func (m *Manager) AllowPort(portProto string) (string, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()

	port, proto := parsePortProto(portProto)
	if port == "" {
		return "", fmt.Errorf("port cannot be empty")
	}

	switch m.activeBackend {
	case BackendUFW:
		target := fmt.Sprintf("%s/%s", port, proto)
		out, err := exec.Command("ufw", "allow", target).CombinedOutput()
		return string(out), err
	case BackendFirewalld:
		target := fmt.Sprintf("%s/%s", port, proto)
		out, err := exec.Command("firewall-cmd", "--permanent", fmt.Sprintf("--add-port=%s", target)).CombinedOutput()
		if err == nil {
			exec.Command("firewall-cmd", "--reload").Run()
		}
		return string(out), err
	case BackendNftables:
		rule := fmt.Sprintf("add rule inet filter input %s dport %s accept", proto, port)
		out, err := exec.Command("nft", strings.Fields(rule)...).CombinedOutput()
		return string(out), err
	case BackendIptables:
		out, err := exec.Command("iptables", "-A", "INPUT", "-p", proto, "--dport", port, "-j", "ACCEPT").CombinedOutput()
		return string(out), err
	default:
		return "", fmt.Errorf("no firewall manager available")
	}
}

func (m *Manager) DenyPort(portProto string) (string, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()

	port, proto := parsePortProto(portProto)
	if port == "" {
		return "", fmt.Errorf("port cannot be empty")
	}

	switch m.activeBackend {
	case BackendUFW:
		target := fmt.Sprintf("%s/%s", port, proto)
		out, err := exec.Command("ufw", "deny", target).CombinedOutput()
		return string(out), err
	case BackendFirewalld:
		target := fmt.Sprintf("%s/%s", port, proto)
		exec.Command("firewall-cmd", "--permanent", fmt.Sprintf("--remove-port=%s", target)).Run()
		out, err := exec.Command("firewall-cmd", "--permanent", fmt.Sprintf("--add-rich-rule=rule port port=\"%s\" protocol=\"%s\" drop", port, proto)).CombinedOutput()
		if err == nil {
			exec.Command("firewall-cmd", "--reload").Run()
		}
		return string(out), err
	case BackendNftables:
		rule := fmt.Sprintf("add rule inet filter input %s dport %s drop", proto, port)
		out, err := exec.Command("nft", strings.Fields(rule)...).CombinedOutput()
		return string(out), err
	case BackendIptables:
		out, err := exec.Command("iptables", "-A", "INPUT", "-p", proto, "--dport", port, "-j", "DROP").CombinedOutput()
		return string(out), err
	default:
		return "", fmt.Errorf("no firewall manager available")
	}
}

func (m *Manager) RemoveRule(ruleSpec string) (string, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()

	ruleSpec = strings.TrimSpace(ruleSpec)
	if ruleSpec == "" {
		return "", fmt.Errorf("rule spec cannot be empty")
	}

	switch m.activeBackend {
	case BackendUFW:
		out, err := exec.Command("ufw", "delete", ruleSpec).CombinedOutput()
		return string(out), err
	case BackendFirewalld:
		port, proto := parsePortProto(ruleSpec)
		target := fmt.Sprintf("%s/%s", port, proto)
		out, err := exec.Command("firewall-cmd", "--permanent", fmt.Sprintf("--remove-port=%s", target)).CombinedOutput()
		if err == nil {
			exec.Command("firewall-cmd", "--reload").Run()
		}
		return string(out), err
	default:
		return "", fmt.Errorf("remove rule not implemented for backend %s", m.activeBackend)
	}
}

func (m *Manager) Status(mode string) (string, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()

	switch m.activeBackend {
	case BackendUFW:
		if mode == "numbered" {
			out, err := exec.Command("ufw", "status", "numbered").CombinedOutput()
			return string(out), err
		} else if mode == "verbose" {
			out, err := exec.Command("ufw", "status", "verbose").CombinedOutput()
			return string(out), err
		}
		out, err := exec.Command("ufw", "status").CombinedOutput()
		return string(out), err
	case BackendFirewalld:
		state, _ := exec.Command("firewall-cmd", "--state").CombinedOutput()
		ports, _ := exec.Command("firewall-cmd", "--list-ports").CombinedOutput()
		services, _ := exec.Command("firewall-cmd", "--list-services").CombinedOutput()
		return fmt.Sprintf("Backend: firewalld\nState: %sActive Ports: %sActive Services: %s", string(state), string(ports), string(services)), nil
	case BackendNftables:
		out, err := exec.Command("nft", "list", "ruleset").CombinedOutput()
		return string(out), err
	case BackendIptables:
		out, err := exec.Command("iptables", "-L", "-n", "-v").CombinedOutput()
		return string(out), err
	default:
		return "No active firewall backend detected on this system", nil
	}
}

func (m *Manager) ListRules() (string, error) {
	return m.Status("numbered")
}
