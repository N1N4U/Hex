package main

import (
	"fmt"
	"log"
	"os"
	"strconv"

	"github.com/N1N4U/Hex/panel/config"
	"github.com/N1N4U/Hex/panel/coredb"
	"github.com/N1N4U/Hex/panel/server"
	"github.com/N1N4U/Hex/panel/users"
)

func main() {
	fmt.Println("????????????????????????????????")
	fmt.Println("?  Hex Panel (node)  v0.1.0   ?")
	fmt.Println("????????????????????????????????")

	cfg := config.Load()

	// 1. Initialise Node database (users, sessions, nodes, activities)
	if err := users.Init(cfg.NodeDBPath); err != nil {
		log.Fatalf("[node] Failed to init node database (%s): %v", cfg.NodeDBPath, err)
	}
	log.Printf("[node] Node database initialized at %s", cfg.NodeDBPath)

	// 2. Initialise Core database (metrics, console logs, system events)
	if err := coredb.Init(cfg.CoreDBPath); err != nil {
		log.Fatalf("[node] Failed to init core database (%s): %v", cfg.CoreDBPath, err)
	}
	log.Printf("[node] Core database initialized at %s", cfg.CoreDBPath)

	// 3. Ensure master auth user is present
	if cfg.MasterAuth.Username != "" && cfg.MasterAuth.Password != "" {
		if _, err := users.EnsureMasterUser(cfg.MasterAuth.Username, cfg.MasterAuth.Password); err != nil {
			log.Printf("[node] Warning: Failed to seed master user: %v", err)
		} else {
			log.Printf("[node] Master auth user ready: %s", cfg.MasterAuth.Username)
		}
	}

	port := cfg.Port
	if p := os.Getenv("PORT"); p != "" {
		if n, err := strconv.Atoi(p); err == nil {
			port = n
		}
	}

	srv := server.New(cfg)
	log.Printf("[node] Listening on :%d", port)
	if err := srv.Listen(port); err != nil {
		log.Fatalf("[node] Server error: %v", err)
	}
}
