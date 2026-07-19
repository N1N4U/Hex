package main

import (
	"crypto/rand"
	"encoding/hex"
	"flag"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"strings"
	"syscall"
	"time"

	"github.com/N1N4U/Hex/core/api"
	"github.com/N1N4U/Hex/core/auth"
	"github.com/N1N4U/Hex/core/database"
	"github.com/N1N4U/Hex/core/firewall"
)

func generateRandomString(length int) string {
	bytes := make([]byte, length)
	if _, err := rand.Read(bytes); err != nil {
		return ""
	}
	return hex.EncodeToString(bytes)
}

func main() {
	port := flag.Int("port", 8080, "Port for the API server")
	flag.Parse()

	args := flag.Args()

	// Initialize SQLite Database
	if err := database.InitSQLite(); err != nil {
		log.Fatalf("Failed to initialize database: %v", err)
	}
	defer database.DB.Close()

	if len(args) > 0 {
		command := args[0]
		switch command {
		case "api":
			if len(args) < 2 {
				fmt.Println("Usage: hex api <create|remove|info|list|approve|deny>")
				return
			}
			subcommand := args[1]
			switch subcommand {
			case "create":
				if len(args) < 3 {
					fmt.Println("Usage: hex api create <name>")
					return
				}
				if len(args) > 3 {
					fmt.Println("Error: Name cannot contain spaces.")
					return
				}
				name := args[2]

				// Check if name exists manually to handle old DBs without UNIQUE constraint
				exists, _ := database.DB.HasAPIKey(name)
				if exists {
					fmt.Println("Error: An API Key with this name already exists.")
					return
				}

				fmt.Printf("Generating Temporary Panel API Key for '%s'...\n", name)
				
				apiKey := "hx_panel_" + generateRandomString(16)
				keyHash := auth.HashAPIKey(apiKey)

				expiresAt := time.Now().UTC().Add(10 * time.Minute).Format("2006-01-02 15:04:05")
				if err := database.DB.SaveAPIKey(name, keyHash, &expiresAt); err != nil {
					log.Fatalf("Failed to save API key to database: %v", err)
				}

				fmt.Println("API Key:", apiKey)
				fmt.Println("This key expires in 10 minutes. Connect your Panel now to permanently bind it.")
				return
			case "remove":
				if len(args) < 3 {
					fmt.Println("Usage: hex api remove <name/key>")
					return
				}
				if err := database.DB.RemoveAPIKey(args[2]); err != nil {
					log.Fatalf("Failed to remove API key: %v", err)
				}
				fmt.Println("API Key removed.")
				return
			case "info":
				if len(args) < 3 {
					fmt.Println("Usage: hex api info <name/key>")
					return
				}
				info, err := database.DB.InfoAPIKey(args[2])
				if err != nil {
					log.Fatalf("Failed to get API key info: %v", err)
				}
				if info == nil {
					fmt.Println("API Key not found.")
					return
				}
				fmt.Printf("Name: %s\nCreated: %s\nExpires: %v\nBound Endpoint: %v\n", info.Name, info.CreatedAt, info.ExpiresAt, info.BoundEndpoint)
				return
			case "list":
				keys, err := database.DB.ListAPIKeys()
				if err != nil {
					log.Fatalf("Failed to list API keys: %v", err)
				}
				fmt.Println("Registered API Keys:")
				for _, k := range keys {
					fmt.Printf("- %s (Endpoint: %v, Expires: %v)\n", k.Name, k.BoundEndpoint, k.ExpiresAt)
				}
				return
			case "approve":
				if len(args) < 3 {
					fmt.Println("Usage: hex api approve <ip:port>")
					return
				}
				endpoint := args[2]
				if err := database.DB.ApproveEndpoint(endpoint); err != nil {
					log.Fatalf("Failed to approve endpoint: %v", err)
				}
				fmt.Printf("Approved Panel Endpoint: %s\n", endpoint)
				fmt.Println("This Panel is now permanently trusted.")
				return
			case "deny":
				if len(args) < 3 {
					fmt.Println("Usage: hex api deny <ip:port>")
					return
				}
				endpoint := args[2]
				if err := database.DB.DenyEndpoint(endpoint); err != nil {
					log.Fatalf("Failed to deny endpoint: %v", err)
				}
				fmt.Printf("Denied Panel Endpoint: %s\n", endpoint)
				return
			default:
				fmt.Printf("Unknown api command: %s\n", subcommand)
				return
			}
		default:
			fmt.Printf("Unknown command: %s\n", command)
			return
		}
	}

	fmt.Println("Starting Hex Core...")

	// 1. Initialize Firewall Abstraction
	fw := firewall.NewManager()
	log.Println("Firewall manager initialized successfully.")
	_ = fw

	// 2. Setup API Server (mTLS + JWT will be configured here)
	server := api.NewServer(*port)

	// 3. Start Server in Goroutine
	go func() {
		log.Printf("Hex Core API listening on port %d...\n", *port)
		if err := server.Start(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("Server error: %v", err)
		}
	}()

	// 4. Graceful Shutdown
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	fmt.Println("\nShutting down Hex Core...")
	if err := server.Stop(); err != nil {
		log.Fatalf("Error during shutdown: %v", err)
	}
	fmt.Println("Hex Core gracefully stopped.")
}
