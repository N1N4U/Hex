package docker

import (
	"os/exec"
	"path/filepath"
)

// ComposeUp runs docker compose up -d in the given directory
func ComposeUp(dir string) (string, error) {
	cmd := exec.Command("docker", "compose", "up", "-d")
	cmd.Dir = filepath.Clean(dir)
	out, err := cmd.CombinedOutput()
	return string(out), err
}

// ComposeDown runs docker compose down in the given directory
func ComposeDown(dir string) (string, error) {
	cmd := exec.Command("docker", "compose", "down")
	cmd.Dir = filepath.Clean(dir)
	out, err := cmd.CombinedOutput()
	return string(out), err
}

// ComposeLogs gets the logs for a compose stack
func ComposeLogs(dir string) (string, error) {
	cmd := exec.Command("docker", "compose", "logs", "--tail=100")
	cmd.Dir = filepath.Clean(dir)
	out, err := cmd.CombinedOutput()
	return string(out), err
}
