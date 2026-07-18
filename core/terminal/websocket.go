package terminal

import (
	"log"
	"net/http"
	"os"
	"os/exec"
	"runtime"

	"github.com/creack/pty"
	"github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		return true // In production, validate origin
	},
}

func HandleTerminal(w http.ResponseWriter, r *http.Request) {
	ws, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Printf("Failed to upgrade websocket: %v", err)
		return
	}
	defer ws.Close()

	containerID := r.URL.Query().Get("id")

	var cmd *exec.Cmd
	if containerID != "" {
		// Docker Exec Terminal
		cmd = exec.Command("docker", "exec", "-it", containerID, "/bin/sh")
	} else {
		// Host Terminal
		shell := os.Getenv("SHELL")
		if shell == "" {
			shell = "/bin/bash"
			if runtime.GOOS == "windows" {
				shell = "powershell.exe"
			}
		}
		cmd = exec.Command(shell)
		cmd.Env = append(os.Environ(), "TERM=xterm")
	}

	// Start the command in a PTY
	ptmx, err := pty.Start(cmd)
	if err != nil {
		ws.WriteMessage(websocket.TextMessage, []byte("Failed to start pseudo-terminal.\r\n"))
		return
	}
	defer func() { _ = ptmx.Close() }() // Best effort.

	// Read from PTY and send to WebSocket
	go func() {
		buf := make([]byte, 1024)
		for {
			n, err := ptmx.Read(buf)
			if err != nil {
				return
			}
			ws.WriteMessage(websocket.TextMessage, buf[:n])
		}
	}()

	// Read from WebSocket and send to PTY
	go func() {
		for {
			_, msg, err := ws.ReadMessage()
			if err != nil {
				return
			}
			ptmx.Write(msg)
		}
	}()

	cmd.Wait()
}
