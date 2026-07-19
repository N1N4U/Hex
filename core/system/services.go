package system

import (
	"os/exec"
)

// StartService runs systemctl start
func StartService(service string) error {
	return exec.Command("systemctl", "start", service).Run()
}

// StopService runs systemctl stop
func StopService(service string) error {
	return exec.Command("systemctl", "stop", service).Run()
}

// RestartService runs systemctl restart
func RestartService(service string) error {
	return exec.Command("systemctl", "restart", service).Run()
}

// EnableService runs systemctl enable
func EnableService(service string) error {
	return exec.Command("systemctl", "enable", service).Run()
}

// DisableService runs systemctl disable
func DisableService(service string) error {
	return exec.Command("systemctl", "disable", service).Run()
}

// ServiceStatus runs systemctl status
func ServiceStatus(service string) (string, error) {
	out, err := exec.Command("systemctl", "status", service).CombinedOutput()
	return string(out), err
}
