package config

import (
	"bufio"
	"os"
	"strconv"
	"strings"
)

// Config holds all runtime configuration for hex-node.
type Config struct {
	Port      int
	DBPath    string
	JWTSecret string

	// Core connection — auto-detected at runtime
	CoreURL      string // e.g. http://192.168.78.129:8080  (remote mode)
	CoreSocket   string // /var/run/hex/core.sock            (same-machine mode)
	CoreAPIKey   string // hx_panel_xxx  — used to get core JWTs

	// TLS (future remote-secure mode)
	CoreTLSCert string
	CoreTLSKey  string
	CoreCACert  string

	// Dev mode — loosens some security checks
	DevMode bool
}

func Load() *Config {
	loadDotEnv()

	cfg := &Config{
		Port:       getInt("HEX_NODE_PORT", 9000),
		DBPath:     getStr("HEX_NODE_DB", "data/hex-node.db"),
		JWTSecret:  getStr("HEX_NODE_JWT_SECRET", "change-me-in-production"),
		CoreURL:    getStr("HEX_CORE_URL", "http://127.0.0.1:8080"),
		CoreSocket: getStr("HEX_CORE_SOCKET", "/var/run/hex/core.sock"),
		CoreAPIKey: getStr("HEX_CORE_API_KEY", ""),
		DevMode:    getStr("HEX_DEV", "") == "true",
	}
	return cfg
}

func loadDotEnv() {
	// Look for .env in current directory or panel/node/.env
	envPaths := []string{".env", "panel/node/.env", "../.env"}
	for _, p := range envPaths {
		file, err := os.Open(p)
		if err != nil {
			continue
		}
		defer file.Close()

		scanner := bufio.NewScanner(file)
		for scanner.Scan() {
			line := strings.TrimSpace(scanner.Text())
			if line == "" || strings.HasPrefix(line, "#") {
				continue
			}
			parts := strings.SplitN(line, "=", 2)
			if len(parts) == 2 {
				k := strings.TrimSpace(parts[0])
				v := strings.TrimSpace(parts[1])
				// Strip surrounding quotes
				if len(v) >= 2 && ((v[0] == '"' && v[len(v)-1] == '"') || (v[0] == ''' && v[len(v)-1] == ''')) {
					v = v[1 : len(v)-1]
				}
				if os.Getenv(k) == "" {
					os.Setenv(k, v)
				}
			}
		}
		break // loaded first found .env
	}
}

func getStr(key, def string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return def
}

func getInt(key string, def int) int {
	if v := os.Getenv(key); v != "" {
		if n, err := strconv.Atoi(v); err == nil {
			return n
		}
	}
	return def
}
