package system

import (
	"os/exec"
)

// RestartSSH restarts the sshd daemon
func RestartSSH() error {
	return exec.Command("systemctl", "restart", "sshd").Run()
}

// GetSSHStatus gets sshd status
func GetSSHStatus() (string, error) {
	out, err := exec.Command("systemctl", "status", "sshd").CombinedOutput()
	return string(out), err
}
