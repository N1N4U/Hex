package main

import (
	"fmt"
	"os"
	"strconv"

	"github.com/N1N4U/Hex/panel/config"
	"github.com/N1N4U/Hex/panel/coredb"
	"github.com/N1N4U/Hex/panel/logger"
	"github.com/N1N4U/Hex/panel/server"
	"github.com/N1N4U/Hex/panel/users"
)

func main() {
	fmt.Println("────────────────────────────────")
	fmt.Println("│   Hex Panel (node) v0.1.0    │")
	fmt.Println("────────────────────────────────")

	cfg := config.Load()
	logger.Init(cfg.Logger.Timestamp, cfg.Logger.Color, cfg.Logger.Debug.Toggle, cfg.Logger.Debug.Core)
	logger.Node("Settings loaded (port: %d, panel: %s)", cfg.Port, cfg.Basic.PanelName)

	// 1. Initialise Node database (users, sessions, nodes, activities)
	if err := users.Init(cfg.NodeDBPath); err != nil {
		logger.Node("FATAL: Failed to init node database (%s): %v", cfg.NodeDBPath, err)
		os.Exit(1)
	}
	logger.Node("Node database initialized at %s", cfg.NodeDBPath)

	// 2. Initialise Core database (metrics, console logs, system events)
	if err := coredb.Init(cfg.CoreDBPath); err != nil {
		logger.Node("FATAL: Failed to init core database (%s): %v", cfg.CoreDBPath, err)
		os.Exit(1)
	}
	logger.Node("Core database initialized at %s", cfg.CoreDBPath)

	// 3. Ensure master auth user is present
	if cfg.MasterAuth.Username != "" && cfg.MasterAuth.Password != "" {
		if _, err := users.EnsureMasterUser(cfg.MasterAuth.Username, cfg.MasterAuth.Password); err != nil {
			logger.Node("Warning: Failed to seed master user: %v", err)
		} else {
			logger.Node("Master auth user ready: %s", cfg.MasterAuth.Username)
		}
	}

	port := cfg.Port
	if p := os.Getenv("PORT"); p != "" {
		if n, err := strconv.Atoi(p); err == nil {
			port = n
		}
	}

	srv := server.New(cfg)
	logger.Node("Server listening on :%d", port)
	if err := srv.Listen(port); err != nil {
		logger.Node("FATAL: Server error: %v", err)
		os.Exit(1)
	}
}
