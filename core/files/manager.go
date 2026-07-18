package files

import (
	"fmt"
	"io"
	"os"
	"path/filepath"
	"strings"
)

type FileInfo struct {
	Name     string `json:"name"`
	Path     string `json:"path"`
	Size     int64  `json:"size"`
	IsDir    bool   `json:"is_dir"`
	Mode     string `json:"mode"`
	Modified string `json:"modified"`
}

type Manager struct {
	baseDir string
}

func NewManager() *Manager {
	// Root directory for Hex files
	baseDir := "/var/lib/hex"
	if _, err := os.Stat(baseDir); os.IsNotExist(err) {
		baseDir = "./hex_data" // Fallback for local dev
		os.MkdirAll(baseDir, 0755)
	}
	return &Manager{baseDir: baseDir}
}

// securePath ensures the requested path stays within the baseDir to prevent path traversal
func (m *Manager) securePath(reqPath string) (string, error) {
	fullPath := filepath.Clean(filepath.Join(m.baseDir, reqPath))
	if !strings.HasPrefix(fullPath, m.baseDir) {
		return "", fmt.Errorf("invalid path: access denied outside base directory")
	}
	return fullPath, nil
}

func (m *Manager) ListFiles(dirPath string) ([]FileInfo, error) {
	secure, err := m.securePath(dirPath)
	if err != nil {
		return nil, err
	}

	entries, err := os.ReadDir(secure)
	if err != nil {
		return nil, err
	}

	var files []FileInfo
	for _, entry := range entries {
		info, err := entry.Info()
		if err != nil {
			continue
		}
		
		relPath, _ := filepath.Rel(m.baseDir, filepath.Join(secure, entry.Name()))

		files = append(files, FileInfo{
			Name:     entry.Name(),
			Path:     relPath,
			Size:     info.Size(),
			IsDir:    entry.IsDir(),
			Mode:     info.Mode().String(),
			Modified: info.ModTime().Format("2006-01-02 15:04:05"),
		})
	}
	return files, nil
}

func (m *Manager) ReadFile(filePath string) ([]byte, error) {
	secure, err := m.securePath(filePath)
	if err != nil {
		return nil, err
	}
	return os.ReadFile(secure)
}

func (m *Manager) WriteFile(filePath string, content io.Reader) error {
	secure, err := m.securePath(filePath)
	if err != nil {
		return err
	}
	
	// Ensure parent directory exists
	if err := os.MkdirAll(filepath.Dir(secure), 0755); err != nil {
		return err
	}

	out, err := os.Create(secure)
	if err != nil {
		return err
	}
	defer out.Close()

	_, err = io.Copy(out, content)
	return err
}

func (m *Manager) DeleteFile(filePath string) error {
	secure, err := m.securePath(filePath)
	if err != nil {
		return err
	}
	return os.RemoveAll(secure)
}
