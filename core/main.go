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
		case "create-api":
			name := "Unknown"
			if len(args) > 1 {
				name = strings.Join(args[1:], " ")
			}
			fmt.Printf("Generating Panel API Key for '%s'...\n", name)
			
			apiKey := "hx_panel_" + generateRandomString(16)
			keyHash := auth.HashAPIKey(apiKey)

			if err := database.DB.SaveAPIKey(name, keyHash); err != nil {
				log.Fatalf("Failed to save API key to database: %v", err)
			}

			fmt.Println("API Key:", apiKey)
			fmt.Println("Save this API key in your Panel configuration. It will not be shown again.")
			return
		case "approve":
			if len(args) < 2 {
				fmt.Println("Usage: hex core approve <ip>")
				return
			}
			ip := args[1]
			if err := database.DB.ApproveIP(ip); err != nil {
				log.Fatalf("Failed to approve IP: %v", err)
			}
			fmt.Printf("Approved Panel IP: %s\n", ip)
			fmt.Println("This Panel is now trusted by the Core.")
			return
		case "deny":
			if len(args) < 2 {
				fmt.Println("Usage: hex core deny <ip>")
				return
			}
			ip := args[1]
			if err := database.DB.DenyIP(ip); err != nil {
				log.Fatalf("Failed to deny IP: %v", err)
			}
			fmt.Printf("Denied Panel IP: %s\n", ip)
			return
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
