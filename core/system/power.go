package system

import (
	"os/exec"
)

// Reboot securely reboots the host
func Reboot() error {
	return exec.Command("sudo", "reboot").Run()
}

// Shutdown securely powers off the host
func Shutdown() error {
	return exec.Command("sudo", "shutdown", "-h", "now").Run()
}

// GetHostInfo returns kernel and OS version
func GetHostInfo() (string, error) {
	out, err := exec.Command("uname", "-a").Output()
	return string(out), err
}
