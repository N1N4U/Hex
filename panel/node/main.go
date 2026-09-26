package main

import (
	"fmt"
	"log"
	"os"
	"strconv"

	"github.com/N1N4U/Hex/panel/config"
	"github.com/N1N4U/Hex/panel/server"
	"github.com/N1N4U/Hex/panel/users"
)

func main() {
	fmt.Println("╭──────────────────────────────╮")
	fmt.Println("│  Hex Panel (node)  v0.1.0   │")
	fmt.Println("╰──────────────────────────────╯")

	cfg := config.Load()

	// Initialise user DB
	if err := users.Init(cfg.DBPath); err != nil {
		log.Fatalf("[node] Failed to init database: %v", err)
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
