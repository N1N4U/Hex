package main

import (
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"

	"github.com/N1N4U/Hex/core/api"
	"github.com/N1N4U/Hex/core/firewall"
)

func main() {
	fmt.Println("Starting Hex Core...")

	// 1. Initialize Firewall Abstraction
	fw, err := firewall.NewManager()
	if err != nil {
		log.Printf("Warning: Failed to initialize firewall manager: %v\n", err)
	} else {
		log.Println("Firewall manager initialized successfully.")
		// Example usage: fw.AllowPort(80, "tcp")
		_ = fw
	}

	// 2. Setup API Server (mTLS + JWT will be configured here)
	server := api.NewServer(8080)

	// 3. Start Server in Goroutine
	go func() {
		log.Printf("Hex Core API listening on port %d...\n", 8080)
		if err := server.Start(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("Server error: %v", err)
		}
	}()

	// 4. Graceful Shutdown
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	fmt.Println("Shutting down Hex Core...")
	if err := server.Stop(); err != nil {
		log.Fatalf("Error during shutdown: %v", err)
	}
	fmt.Println("Hex Core gracefully stopped.")
}
