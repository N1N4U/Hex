package api

import (
	"encoding/json"
	"fmt"
	"io"
	"net"
	"net/http"
	"sync"
	"time"

	"github.com/gorilla/websocket"
	"golang.org/x/crypto/ssh"
	"github.com/N1N4U/Hex/panel/logger"
)

type SSHTerminalHandler struct{}

func NewSSHTerminalHandler() *SSHTerminalHandler {
	return &SSHTerminalHandler{}
}

type sshControlMsg struct {
	Type     string `json:"type"` // "connect" or "resize"
	IP       string `json:"ip,omitempty"`
	Port     int    `json:"port,omitempty"`
	Username string `json:"username,omitempty"`
	Password string `json:"password,omitempty"`
	Cols     int    `json:"cols,omitempty"`
	Rows     int    `json:"rows,omitempty"`
}

// HandleTerminalWS handles SSH PTY terminal sessions over WebSocket.
func (h *SSHTerminalHandler) HandleTerminalWS(w http.ResponseWriter, r *http.Request) {
	conn, err := wsUpgrader.Upgrade(w, r, nil)
	if err != nil {
		logger.Site("Terminal WS upgrade failed: %v", err)
		return
	}
	defer conn.Close()

	var writeMu sync.Mutex
	safeWrite := func(msgType int, data []byte) error {
		writeMu.Lock()
		defer writeMu.Unlock()
		return conn.WriteMessage(msgType, data)
	}

	// 1. Wait for connect control message
	_, firstMsg, err := conn.ReadMessage()
	if err != nil {
		return
	}

	var ctrl sshControlMsg
	if err := json.Unmarshal(firstMsg, &ctrl); err != nil || ctrl.Type != "connect" {
		_ = safeWrite(websocket.TextMessage, []byte("\r\n\x1b[31m[Error: Expected connect handshake]\x1b[0m\r\n"))
		return
	}

	if ctrl.Port <= 0 {
		ctrl.Port = 22
	}
	if ctrl.Cols <= 0 {
		ctrl.Cols = 80
	}
	if ctrl.Rows <= 0 {
		ctrl.Rows = 24
	}

	_ = safeWrite(websocket.TextMessage, []byte(fmt.Sprintf("\x1b[33m[Connecting via SSH to %s@%s:%d...]\x1b[0m\r\n", ctrl.Username, ctrl.IP, ctrl.Port)))

	sshConfig := &ssh.ClientConfig{
		User: ctrl.Username,
		Auth: []ssh.AuthMethod{
			ssh.Password(ctrl.Password),
		},
		HostKeyCallback: ssh.InsecureIgnoreHostKey(),
		Timeout:         12 * time.Second,
	}

	targetAddr := net.JoinHostPort(ctrl.IP, fmt.Sprintf("%d", ctrl.Port))
	client, err := ssh.Dial("tcp", targetAddr, sshConfig)
	if err != nil {
		_ = safeWrite(websocket.TextMessage, []byte(fmt.Sprintf("\r\n\x1b[31m[SSH Connection Failed: %v]\x1b[0m\r\n", err)))
		return
	}
	defer client.Close()

	session, err := client.NewSession()
	if err != nil {
		_ = safeWrite(websocket.TextMessage, []byte(fmt.Sprintf("\r\n\x1b[31m[SSH Session Allocation Failed: %v]\x1b[0m\r\n", err)))
		return
	}
	defer session.Close()

	modes := ssh.TerminalModes{
		ssh.ECHO:          1,
		ssh.TTY_OP_ISPEED: 14400,
		ssh.TTY_OP_OSPEED: 14400,
	}
	if err := session.RequestPty("xterm-256color", ctrl.Rows, ctrl.Cols, modes); err != nil {
		_ = safeWrite(websocket.TextMessage, []byte(fmt.Sprintf("\r\n\x1b[31m[PTY Request Failed: %v]\x1b[0m\r\n", err)))
		return
	}

	stdin, err := session.StdinPipe()
	if err != nil {
		_ = safeWrite(websocket.TextMessage, []byte(fmt.Sprintf("\r\n\x1b[31m[Stdin Pipe Failed: %v]\x1b[0m\r\n", err)))
		return
	}
	defer stdin.Close()

	stdout, err := session.StdoutPipe()
	if err != nil {
		_ = safeWrite(websocket.TextMessage, []byte(fmt.Sprintf("\r\n\x1b[31m[Stdout Pipe Failed: %v]\x1b[0m\r\n", err)))
		return
	}

	stderr, err := session.StderrPipe()
	if err != nil {
		_ = safeWrite(websocket.TextMessage, []byte(fmt.Sprintf("\r\n\x1b[31m[Stderr Pipe Failed: %v]\x1b[0m\r\n", err)))
		return
	}

	if err := session.Shell(); err != nil {
		_ = safeWrite(websocket.TextMessage, []byte(fmt.Sprintf("\r\n\x1b[31m[Interactive Shell Failed: %v]\x1b[0m\r\n", err)))
		return
	}

	_ = safeWrite(websocket.TextMessage, []byte(fmt.Sprintf("\x1b[32m[Connected successfully to %s@%s:%d]\x1b[0m\r\n\r\n", ctrl.Username, ctrl.IP, ctrl.Port)))

	// Goroutine to pipe stdout/stderr back to WebSocket
	pipeOutput := func(r io.Reader) {
		buf := make([]byte, 4096)
		for {
			n, rErr := r.Read(buf)
			if n > 0 {
				if wErr := safeWrite(websocket.BinaryMessage, buf[:n]); wErr != nil {
					return
				}
			}
			if rErr != nil {
				return
			}
		}
	}

	go pipeOutput(stdout)
	go pipeOutput(stderr)

	// Main loop: read from WebSocket and pipe to SSH stdin or handle resize
	for {
		msgType, p, err := conn.ReadMessage()
		if err != nil {
			break
		}

		if msgType == websocket.TextMessage && len(p) > 0 && p[0] == '{' {
			var cmd sshControlMsg
			if err := json.Unmarshal(p, &cmd); err == nil {
				if cmd.Type == "resize" && cmd.Rows > 0 && cmd.Cols > 0 {
					_ = session.WindowChange(cmd.Rows, cmd.Cols)
					continue
				}
			}
		}

		if _, err := stdin.Write(p); err != nil {
			break
		}
	}

	_ = safeWrite(websocket.TextMessage, []byte("\r\n\x1b[33m[SSH Terminal connection closed]\x1b[0m\r\n"))
}
