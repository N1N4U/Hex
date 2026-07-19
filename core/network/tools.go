package network

import (
	"os/exec"
)

// Ping runs ping -c 4 <host>
func Ping(host string) (string, error) {
	out, err := exec.Command("ping", "-c", "4", host).CombinedOutput()
	return string(out), err
}

// Traceroute runs traceroute <host>
func Traceroute(host string) (string, error) {
	out, err := exec.Command("traceroute", host).CombinedOutput()
	return string(out), err
}

// OpenPorts runs netstat -tuln or ss -tuln
func OpenPorts() (string, error) {
	out, err := exec.Command("ss", "-tuln").CombinedOutput()
	return string(out), err
}
