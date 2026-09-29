package config

import (
	"encoding/json"
	"os"
	"strconv"
)

type BasicConfig struct {
	PanelName   string `json:"panel_name"`
	LabelMadeBy string `json:"label_made_by"`
	Discord     string `json:"discord"`
	GitHub      string `json:"github"`
	Feedback    string `json:"feedback"`
}

type MasterAuth struct {
	Username string `json:"username"`
	Password string `json:"password"`
}

type OAuthProvider struct {
	Toggle       bool   `json:"toggle"`
	ClientID     string `json:"client_id"`
	ClientSecret string `json:"client_secret"`
	RedirectLink string `json:"redirect_link"`
}

type SMTPConfig struct {
	Toggle   bool   `json:"toggle"`
	Host     string `json:"host"`
	Port     int    `json:"port"`
	Email    string `json:"email"`
	Password string `json:"password"`
}

type AuthConfig struct {
	Discord   OAuthProvider `json:"discord"`
	Google    OAuthProvider `json:"google"`
	GmailSMTP SMTPConfig    `json:"gmail_smtp"`
}

type SQLiteDB struct {
	Path string `json:"path"`
}

type MongoDBConfig struct {
	Database string `json:"database"`
	URI      string `json:"uri"`
}

type MySQLConfig struct {
	Host     string `json:"host"`
	Port     int    `json:"port"`
	User     string `json:"user"`
	Password string `json:"password"`
	Database string `json:"database"`
}

type DBSection struct {
	Type    string        `json:"type"` // sqlite | mongodb | mysql
	SQLite  SQLiteDB      `json:"sqlite"`
	MongoDB MongoDBConfig `json:"mogodb"`
	MySQL   MySQLConfig   `json:"mysql"`
}

type DatabaseConfig struct {
	Type string    `json:"type"` // default "sqlite"
	Core DBSection `json:"core"`
	Node DBSection `json:"node"`
}

type DebugLogConfig struct {
	Toggle bool `json:"toggle"`
	Core   bool `json:"core"`
}

type LoggerConfig struct {
	Timestamp bool           `json:"timestamp"`
	Color     bool           `json:"color"`
	Debug     DebugLogConfig `json:"debug"`
}

// Config represents all runtime settings loaded from settings.json
type Config struct {
	Port       int            `json:"port"`
	Basic      BasicConfig    `json:"basic"`
	MasterAuth MasterAuth     `json:"master_auth"`
	Auth       AuthConfig     `json:"auth"`
	Logger     LoggerConfig   `json:"logger"`
	Database   DatabaseConfig `json:"database"`

	// Derived / runtime fields
	NodeDBPath string `json:"-"`
	CoreDBPath string `json:"-"`
	JWTSecret  string `json:"-"`
	DevMode    bool   `json:"-"`

	// Local Core socket
	CoreSocket string `json:"-"`
	CoreURL    string `json:"-"`
	CoreAPIKey string `json:"-"`
}

func Load() *Config {
	cfg := &Config{
		Port: 9000,
		Basic: BasicConfig{
			PanelName:   "Hex Panel",
			LabelMadeBy: "N1N4U",
			Discord:     "https://discord.com/users/1093946948928680008",
			GitHub:      "https://github.com/N1N4U/Hex",
			Feedback:    "https://github.com/N1N4U/Hex",
		},
		MasterAuth: MasterAuth{
			Username: "nandu",
			Password: "password",
		},
		Database: DatabaseConfig{
			Type: "sqlite",
			Core: DBSection{
				Type:   "sqlite",
				SQLite: SQLiteDB{Path: "data/hex-core.db"},
			},
			Node: DBSection{
				Type:   "sqlite",
				SQLite: SQLiteDB{Path: "data/hex-node.db"},
			},
		},
		CoreSocket: "/var/run/hex/core.sock",
		JWTSecret:  "hex-node-jwt-secret-key-change-in-prod-32bytes",
		DevMode:    true,
	}

	// Try reading settings.json from current directory, panel/node/, or HEX_SETTINGS
	settingsPaths := []string{"settings.json", "panel/node/settings.json", "../settings.json"}
	if custom := os.Getenv("HEX_SETTINGS"); custom != "" {
		settingsPaths = append([]string{custom}, settingsPaths...)
	}

	for _, p := range settingsPaths {
		if data, err := os.ReadFile(p); err == nil {
			if err := json.Unmarshal(data, cfg); err == nil {
				break
			}
		}
	}

	// Environment variable overrides (if any)
	if p := os.Getenv("PORT"); p != "" {
		if n, err := strconv.Atoi(p); err == nil {
			cfg.Port = n
		}
	}
	if p := os.Getenv("HEX_NODE_PORT"); p != "" {
		if n, err := strconv.Atoi(p); err == nil {
			cfg.Port = n
		}
	}
	if sec := os.Getenv("HEX_NODE_JWT_SECRET"); sec != "" {
		cfg.JWTSecret = sec
	}

	// Ensure DB paths
	if cfg.Database.Node.SQLite.Path != "" {
		cfg.NodeDBPath = cfg.Database.Node.SQLite.Path
	} else {
		cfg.NodeDBPath = "data/hex-node.db"
	}

	if cfg.Database.Core.SQLite.Path != "" {
		cfg.CoreDBPath = cfg.Database.Core.SQLite.Path
	} else {
		cfg.CoreDBPath = "data/hex-core.db"
	}

	return cfg
}
