package deployments

import (
	"context"
	"fmt"
	"log"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
)

type DeploymentRequest struct {
	ID         string `json:"id"`
	Repository string `json:"repository"`
	Branch     string `json:"branch"`
}

type Manager struct {
	baseDir string
}

func NewManager() (*Manager, error) {
	// In production this would be /var/lib/Hex/deployments
	baseDir := "./deployments_data"
	if err := os.MkdirAll(baseDir, 0755); err != nil {
		return nil, fmt.Errorf("failed to create deployments directory: %w", err)
	}
	return &Manager{baseDir: baseDir}, nil
}

func (m *Manager) Deploy(ctx context.Context, req DeploymentRequest) error {
	log.Printf("Starting deployment for %s (Branch: %s)\n", req.Repository, req.Branch)

	targetDir := filepath.Join(m.baseDir, req.ID)

	// 1. Clone the repository
	if err := m.runCommand(ctx, m.baseDir, "git", "clone", "-b", req.Branch, req.Repository, req.ID); err != nil {
		return fmt.Errorf("git clone failed: %w", err)
	}

	// 2. Build the Docker image
	imageName := fmt.Sprintf("hex-app-%s", req.ID)
	log.Printf("Building Docker image %s...\n", imageName)
	if err := m.runCommand(ctx, targetDir, "docker", "build", "-t", imageName, "."); err != nil {
		return fmt.Errorf("docker build failed: %w", err)
	}

	// 3. Generate Compose file
	composeContent := fmt.Sprintf(`services:
  app:
    image: %s
    restart: always
`, imageName)

	composePath := filepath.Join(targetDir, "compose.yaml")
	if err := os.WriteFile(composePath, []byte(composeContent), 0644); err != nil {
		return fmt.Errorf("failed to write compose.yaml: %w", err)
	}

	// 4. Run Docker Compose Up
	log.Printf("Starting application via Docker Compose...\n")
	if err := m.runCommand(ctx, targetDir, "docker", "compose", "up", "-d"); err != nil {
		return fmt.Errorf("docker compose up failed: %w", err)
	}

	log.Printf("Deployment %s completed successfully.\n", req.ID)
	return nil
}

// Helper to run commands and pipe output to standard logger
func (m *Manager) runCommand(ctx context.Context, dir string, name string, args ...string) error {
	cmd := exec.CommandContext(ctx, name, args...)
	cmd.Dir = dir
	
	// For simplicity, we capture output. In a real system, you stream this over WebSockets to the Panel.
	out, err := cmd.CombinedOutput()
	if err != nil {
		return fmt.Errorf("command %s %s failed: %v\nOutput: %s", name, strings.Join(args, " "), err, string(out))
	}
	log.Printf("Cmd: %s %s\n%s", name, strings.Join(args, " "), string(out))
	return nil
}
