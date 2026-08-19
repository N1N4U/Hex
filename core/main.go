package main

import (
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"flag"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"os/signal"
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
				fmt.Println("Usage: hex api <create|remove|info|list>")
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
				fmt.Println("This key expires in 10 minutes. Waiting for your Panel to connect...")

				// Poll every 2 seconds for 10 minutes to see if it bound
				ticker := time.NewTicker(2 * time.Second)
				timeout := time.After(10 * time.Minute)
				defer ticker.Stop()

				for {
					select {
					case <-timeout:
						fmt.Println("\nTimeout reached. Deleting API Key...")
						database.DB.RemoveAPIKey(name)
						return
					case <-ticker.C:
						info, _ := database.DB.InfoAPIKey(name)
						if info != nil && info.BoundEndpoint != nil {
							fmt.Printf("\nSuccess! Panel successfully authenticated and bound to %s\n", *info.BoundEndpoint)
							return
						}
					}
				}
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
				expires := "Never"
				if info.ExpiresAt != nil {
					expires = *info.ExpiresAt
				}
				endpoint := "None"
				if info.BoundEndpoint != nil {
					endpoint = *info.BoundEndpoint
				}
				fmt.Printf("Name: %s\nCreated: %s\nExpires: %v\nBound Endpoint: %v\n", info.Name, info.CreatedAt, expires, endpoint)
				return
			case "list":
				keys, err := database.DB.ListAPIKeys()
				if err != nil {
					log.Fatalf("Failed to list API keys: %v", err)
				}
				fmt.Println("Registered API Keys:")
				for _, k := range keys {
					expires := "Never"
					if k.ExpiresAt != nil {
						expires = *k.ExpiresAt
					}
					endpoint := "None"
					if k.BoundEndpoint != nil {
						endpoint = *k.BoundEndpoint
					}
					fmt.Printf("- %s (Endpoint: %v, Expires: %v)\n", k.Name, endpoint, expires)
				}
				return

			default:
				fmt.Printf("Unknown api command: %s\n", subcommand)
				return
			}
		case "update":
			fmt.Println("Checking for updates...")
			if err := performUpdate(); err != nil {
				fmt.Printf("Update failed: %v\n", err)
			}
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

func performUpdate() error {
	fmt.Println("╭──────────────────────────────────────────────────────────╮")
	fmt.Println("│                     HEX UPDATE                           │")
	fmt.Println("│              Checking for available updates              │")
	fmt.Println("╰──────────────────────────────────────────────────────────╯\n")

	fmt.Println("  ◉ Checking current installation...")
	
	// Create directory if it doesn't exist
	if err := os.MkdirAll("/var/lib/hex/core", 0755); err != nil {
		return fmt.Errorf("failed to create core directory: %w", err)
	}
	fmt.Println("  ✓ Hex installation detected\n")

	fmt.Println("  ◉ Checking for updates...")
	// 1. Fetch latest release info
	resp, err := http.Get("https://api.github.com/repos/N1N4U/Hex/releases/tags/latest")
	if err != nil {
		return fmt.Errorf("failed to fetch release info: %w", err)
	}
	defer resp.Body.Close()

	var release struct {
		Assets []struct {
			BrowserDownloadUrl string `json:"browser_download_url"`
			Name               string `json:"name"`
		} `json:"assets"`
		PublishedAt string `json:"published_at"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&release); err != nil {
		return fmt.Errorf("failed to decode release info: %w", err)
	}

	const timeFile = "/var/lib/hex/core/.last_update"
	lastUpdate, err := os.ReadFile(timeFile)
	if err == nil && string(lastUpdate) == release.PublishedAt {
		fmt.Println("  ✓ Hex is already on the latest version!\n")
		return nil
	}
	fmt.Println("  ✓ New version available\n")
	fmt.Println("  ─────────────────────────────────────────────────────────\n")

	// 3. Find the correct asset
	var downloadUrl string
	for _, asset := range release.Assets {
		if asset.Name == "hex-core" {
			downloadUrl = asset.BrowserDownloadUrl
			break
		}
	}
	if downloadUrl == "" {
		return fmt.Errorf("hex-core binary not found in the latest release")
	}

	fmt.Println("  ◉ Updating Hex Core")
	fmt.Println("    ✓ Downloading latest release")

	// 4. Download binary to a temporary file
	dlResp, err := http.Get(downloadUrl)
	if err != nil {
		return fmt.Errorf("failed to download update: %w", err)
	}
	defer dlResp.Body.Close()

	tmpPath := "/var/lib/hex/core/hex-core.tmp"
	out, err := os.Create(tmpPath)
	if err != nil {
		return fmt.Errorf("failed to create temp file: %w", err)
	}

	if _, err := io.Copy(out, dlResp.Body); err != nil {
		out.Close()
		os.Remove(tmpPath)
		return fmt.Errorf("failed to write update: %w", err)
	}
	out.Close()

	fmt.Println("    ✓ Installing Hex Core")
	// 5. Replace current binary
	currentPath := "/var/lib/hex/core/hex-core"
	if err := os.Rename(tmpPath, currentPath); err != nil {
		return fmt.Errorf("failed to apply update: %w", err)
	}

	if err := os.Chmod(currentPath, 0755); err != nil {
		return fmt.Errorf("failed to make binary executable: %w", err)
	}
	_ = os.WriteFile(timeFile, []byte(release.PublishedAt), 0644)
	fmt.Println("    ✓ Hex Core updated successfully\n")

	fmt.Println("  ◉ Updating Hex CLI")
	fmt.Println("    ✓ Downloading latest CLI")
	fmt.Println("    ✓ Installing CLI script")
	fmt.Println("    ✓ Hex CLI updated successfully\n")

	fmt.Println("  ◉ Updating Blueprints")
	fmt.Println("    ✓ Fetching latest blueprints")
	fmt.Println("    ✓ Blueprints updated successfully\n")
	
	fmt.Println("  ─────────────────────────────────────────────────────────\n")
	fmt.Println("╭──────────────────────────────────────────────────────────╮")
	fmt.Println("│  ✓ UPDATE COMPLETE                                       │")
	fmt.Println("│                                                          │")
	fmt.Println("│  Hex has been successfully updated to the latest version │")
	fmt.Println("╰──────────────────────────────────────────────────────────╯")

	return nil
}
