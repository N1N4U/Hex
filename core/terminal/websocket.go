package terminal

import (
	"log"
	"net/http"
	"os/exec"

	"github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		// In production, validate this against Panel Domain
		return true
	},
}

// HandleTerminal handles the websocket connection and bridges it to docker exec
func HandleTerminal(w http.ResponseWriter, r *http.Request) {
	containerID := r.URL.Query().Get("id")
	if containerID == "" {
		http.Error(w, "Container ID is required", http.StatusBadRequest)
		return
	}

	ws, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Printf("Failed to upgrade websocket: %v", err)
		return
	}
	defer ws.Close()

	// Spawn Docker Exec PTY
	// Using sh as standard fallback shell
	cmd := exec.Command("docker", "exec", "-it", containerID, "/bin/sh")

	// Create pseudo-terminal (PTY) using os pipes or generic io.ReadWriter
	// Note: True PTY requires github.com/creack/pty, but standard pipes work for a basic WebSSH MVP
	
	stdout, _ := cmd.StdoutPipe()
	stderr, _ := cmd.StderrPipe()
	stdin, _ := cmd.StdinPipe()

	if err := cmd.Start(); err != nil {
		ws.WriteMessage(websocket.TextMessage, []byte("Failed to start terminal.\r\n"))
		return
	}

	// Read from Docker and send to WebSocket
	go func() {
		buf := make([]byte, 1024)
		for {
			n, err := stdout.Read(buf)
			if err != nil {
				return
			}
			ws.WriteMessage(websocket.TextMessage, buf[:n])
		}
	}()

	go func() {
		buf := make([]byte, 1024)
		for {
			n, err := stderr.Read(buf)
			if err != nil {
				return
			}
			ws.WriteMessage(websocket.TextMessage, buf[:n])
		}
	}()

	// Read from WebSocket and send to Docker
	go func() {
		for {
			_, msg, err := ws.ReadMessage()
			if err != nil {
				return
			}
			stdin.Write(msg)
		}
	}()

	cmd.Wait()
}
