package system

import (
	"os/exec"
	"strings"
)

// UpdatePackages runs apt-get update
func UpdatePackages() (string, error) {
	out, err := exec.Command("apt-get", "update").CombinedOutput()
	return string(out), err
}

// UpgradePackages runs apt-get upgrade -y
func UpgradePackages() (string, error) {
	out, err := exec.Command("apt-get", "upgrade", "-y").CombinedOutput()
	return string(out), err
}

// InstallPackage runs apt-get install -y <pkg>
func InstallPackage(pkg string) (string, error) {
	out, err := exec.Command("apt-get", "install", "-y", pkg).CombinedOutput()
	return string(out), err
}

// RemovePackage runs apt-get remove -y <pkg>
func RemovePackage(pkg string) (string, error) {
	out, err := exec.Command("apt-get", "remove", "-y", pkg).CombinedOutput()
	return string(out), err
}

// SearchPackage runs apt-cache search <pkg>
func SearchPackage(query string) (string, error) {
	out, err := exec.Command("apt-cache", "search", query).CombinedOutput()
	return string(out), err
}

// ListInstalledPackages returns a list of installed packages
func ListInstalledPackages() ([]string, error) {
	out, err := exec.Command("dpkg", "-l").CombinedOutput()
	if err != nil {
		return nil, err
	}
	lines := strings.Split(string(out), "\n")
	var packages []string
	for _, line := range lines {
		if strings.HasPrefix(line, "ii ") {
			fields := strings.Fields(line)
			if len(fields) >= 2 {
				packages = append(packages, fields[1])
			}
		}
	}
	return packages, nil
}
