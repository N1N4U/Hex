package blueprint

import (
	"encoding/json"
	"io/fs"
	"os"
	"path/filepath"
)

type Blueprint struct {
	SchemaVersion int    `json:"schemaVersion"`
	ID            string `json:"id"`
	Name          string `json:"name"`
	Description   string `json:"description"`
	Version       string `json:"version"`
	Author        string `json:"author"`
	Category      string `json:"category"`
	IconURL       string `json:"iconUrl"`
	Runtime       struct {
		Default string `json:"default"`
		Options []struct {
			ID          string `json:"id"`
			Name        string `json:"name"`
			DockerImage string `json:"dockerImage"`
		} `json:"options"`
	} `json:"runtime"`
	Docker struct {
		Image                  string `json:"image"`
		ImagePullPolicy        string `json:"imagePullPolicy"`
		WorkingDirectory       string `json:"workingDirectory"`
		Entrypoint             string `json:"entrypoint"`
		StartupCommand         string `json:"startupCommand"`
		RestartPolicy          string `json:"restartPolicy"`
		NetworkMode            string `json:"networkMode"`
		Privileged             bool   `json:"privileged"`
		ReadOnlyRootFilesystem bool   `json:"readOnlyRootFilesystem"`
	} `json:"docker"`
	// Additional fields omitted for brevity but can be expanded
}

type Manager struct {
	BaseDir string
}

func NewManager(baseDir string) *Manager {
	return &Manager{BaseDir: baseDir}
}

func (m *Manager) ListBlueprints() ([]Blueprint, error) {
	var blueprints []Blueprint

	err := filepath.WalkDir(m.BaseDir, func(path string, d fs.DirEntry, err error) error {
		if err != nil {
			return nil // ignore errors like missing dir
		}
		if !d.IsDir() && filepath.Ext(path) == ".json" {
			data, err := os.ReadFile(path)
			if err != nil {
				return nil // skip on error
			}
			var bp Blueprint
			if err := json.Unmarshal(data, &bp); err == nil {
				blueprints = append(blueprints, bp)
			}
		}
		return nil
	})

	if err != nil {
		return nil, err
	}

	return blueprints, nil
}
