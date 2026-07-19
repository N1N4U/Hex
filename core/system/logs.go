package system

import (
	"os/exec"
)

// GetJournalLogs returns the last 200 lines of systemd journal
func GetJournalLogs() (string, error) {
	out, err := exec.Command("journalctl", "-n", "200", "--no-pager").CombinedOutput()
	return string(out), err
}

// GetAuthLogs returns the last 200 lines of /var/log/auth.log
func GetAuthLogs() (string, error) {
	out, err := exec.Command("tail", "-n", "200", "/var/log/auth.log").CombinedOutput()
	return string(out), err
}

// GetSyslog returns the last 200 lines of /var/log/syslog
func GetSyslog() (string, error) {
	out, err := exec.Command("tail", "-n", "200", "/var/log/syslog").CombinedOutput()
	return string(out), err
}
