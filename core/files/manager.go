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
	restrictedPaths []string
	protectedRoots  []string
}

func NewManager() *Manager {
	return &Manager{
		restrictedPaths: []string{
			"/boot",
			"/proc",
			"/sys",
			"/dev",
			"/etc/shadow",
			"/etc/gshadow",
			"/etc/sudoers",
			"/etc/sudoers.d",
		},
		protectedRoots: []string{
			"/",
			"/etc",
			"/usr",
			"/bin",
			"/sbin",
			"/var",
			"/var/lib",
			"/var/lib/hex",
			"/var/lib/hex/core",
			"/root",
			"/home",
			"/opt",
			"/lib",
			"/lib64",
		},
	}
}

// sanitizePath validates and cleans the path, blocking path traversal and restricted directories.
func (m *Manager) sanitizePath(reqPath string) (string, error) {
	if reqPath == "" {
		reqPath = "/"
	}

	// 1. Strict traversal check - block any attempt to use ..
	if strings.Contains(reqPath, "..") {
		return "", fmt.Errorf("access denied: path traversal (..) is not allowed")
	}

	cleanPath := filepath.Clean(reqPath)
	if !filepath.IsAbs(cleanPath) {
		cleanPath = filepath.Clean("/" + cleanPath)
	}

	// 2. Check against restricted internal/system paths
	for _, restricted := range m.restrictedPaths {
		if cleanPath == restricted || strings.HasPrefix(cleanPath, restricted+"/") {
			return "", fmt.Errorf("access denied: '%s' is an internal restricted system area", cleanPath)
		}
	}

	return cleanPath, nil
}

func (m *Manager) ListFiles(dirPath string) ([]FileInfo, error) {
	target, err := m.sanitizePath(dirPath)
	if err != nil {
		return nil, err
	}

	entries, err := os.ReadDir(target)
	if err != nil {
		return nil, err
	}

	var files []FileInfo
	for _, entry := range entries {
		info, err := entry.Info()
		if err != nil {
			continue
		}

		fullEntryPath := filepath.Clean(filepath.Join(target, entry.Name()))

		// Skip displaying restricted entries in root or internal paths
		skip := false
		for _, restricted := range m.restrictedPaths {
			if fullEntryPath == restricted {
				skip = true
				break
			}
		}
		if skip {
			continue
		}

		files = append(files, FileInfo{
			Name:     entry.Name(),
			Path:     fullEntryPath,
			Size:     info.Size(),
			IsDir:    entry.IsDir(),
			Mode:     info.Mode().String(),
			Modified: info.ModTime().Format("2006-01-02 15:04:05"),
		})
	}
	return files, nil
}

func (m *Manager) ReadFile(filePath string) ([]byte, error) {
	target, err := m.sanitizePath(filePath)
	if err != nil {
		return nil, err
	}

	info, err := os.Stat(target)
	if err != nil {
		return nil, err
	}
	if info.IsDir() {
		return nil, fmt.Errorf("cannot read: path is a directory")
	}

	// Protect against memory exhaustion: limit read to 50MB
	const maxFileSize = 50 * 1024 * 1024
	if info.Size() > maxFileSize {
		return nil, fmt.Errorf("file size (%d bytes) exceeds 50MB limit", info.Size())
	}

	return os.ReadFile(target)
}

func (m *Manager) WriteFile(filePath string, content io.Reader) error {
	target, err := m.sanitizePath(filePath)
	if err != nil {
		return err
	}

	// Disallow overwriting entire protected root paths directly
	for _, protected := range m.protectedRoots {
		if target == protected {
			return fmt.Errorf("cannot overwrite protected system directory: %s", target)
		}
	}

	// Ensure parent directory exists
	parentDir := filepath.Dir(target)
	if err := os.MkdirAll(parentDir, 0755); err != nil {
		return fmt.Errorf("failed to create directory: %w", err)
	}

	out, err := os.Create(target)
	if err != nil {
		return err
	}
	defer out.Close()

	// Limit write stream to 100MB per request
	limitReader := io.LimitReader(content, 100*1024*1024)
	_, err = io.Copy(out, limitReader)
	return err
}

func (m *Manager) DeleteFile(filePath string) error {
	target, err := m.sanitizePath(filePath)
	if err != nil {
		return err
	}

	// Guard against deleting system roots or base directories
	for _, protected := range m.protectedRoots {
		if target == protected {
			return fmt.Errorf("safety violation: cannot delete protected system directory: %s", target)
		}
	}

	return os.RemoveAll(target)
}
