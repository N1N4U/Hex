package system

import (
	"fmt"
	"os/exec"
	"time"
)

// CreateBackup creates a tar.gz archive of a specific directory
func CreateBackup(targetDir string, backupName string) (string, error) {
	filename := fmt.Sprintf("/var/lib/hex/backups/%s_%d.tar.gz", backupName, time.Now().Unix())
	out, err := exec.Command("tar", "-czf", filename, targetDir).CombinedOutput()
	return string(out), err
}

// RestoreBackup extracts a tar.gz archive to a specific directory
func RestoreBackup(backupFile string, targetDir string) (string, error) {
	out, err := exec.Command("tar", "-xzf", backupFile, "-C", targetDir).CombinedOutput()
	return string(out), err
}
