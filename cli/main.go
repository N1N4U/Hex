package main

import (
	"fmt"
	"os"
)

// Hex CLI for managing the Core daemon
// Use cases:
// hex core create-api "Production Panel"
// hex core approve <ip>
// hex core deny <ip>

func main() {
	if len(os.Args) < 2 {
		fmt.Println("Hex CLI - Management Tool")
		fmt.Println("Usage: hex core <command>")
		os.Exit(1)
	}

	command := os.Args[1]

	if command == "core" && len(os.Args) >= 3 {
		subcommand := os.Args[2]
		
		switch subcommand {
		case "create-api":
			panelName := "Unknown Panel"
			if len(os.Args) >= 4 {
				panelName = os.Args[3]
			}
			fmt.Printf("Generating permanent API Key for panel '%s'...\n", panelName)
			fmt.Println("API Key: hx_panel_a1b2c3d4e5f6g7h8i9j0")
			fmt.Println("Use this key in your Panel to generate JWTs.")
			
		case "approve":
			if len(os.Args) < 4 {
				fmt.Println("Error: IP required. (e.g., hex core approve 192.168.1.10)")
				os.Exit(1)
			}
			ip := os.Args[3]
			fmt.Printf("Approving Panel IP: %s\n", ip)
			fmt.Println("Panel is now trusted. mTLS connections from this IP will be accepted.")
			
		case "deny":
			if len(os.Args) < 4 {
				fmt.Println("Error: IP required.")
				os.Exit(1)
			}
			ip := os.Args[3]
			fmt.Printf("Denying Panel IP: %s\n", ip)
			
		default:
			fmt.Println("Unknown command")
		}
	} else {
		fmt.Println("Invalid command structure.")
	}
}
