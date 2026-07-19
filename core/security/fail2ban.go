package security

import (
	"os/exec"
)

// GetFail2banStatus gets status of fail2ban service
func GetFail2banStatus() (string, error) {
	out, err := exec.Command("fail2ban-client", "status").CombinedOutput()
	return string(out), err
}

// GetFail2banJailStatus gets status of a specific jail like sshd
func GetFail2banJailStatus(jail string) (string, error) {
	out, err := exec.Command("fail2ban-client", "status", jail).CombinedOutput()
	return string(out), err
}

// BanIP bans an IP in a specific jail
func BanIP(jail, ip string) error {
	return exec.Command("fail2ban-client", "set", jail, "banip", ip).Run()
}

// UnbanIP unbans an IP in a specific jail
func UnbanIP(jail, ip string) error {
	return exec.Command("fail2ban-client", "set", jail, "unbanip", ip).Run()
}
