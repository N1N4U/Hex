package database

import (
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"log"
	"os/exec"
	"strings"
	"sync"
)

type DatabaseInstance struct {
	ID               string `json:"id"`
	Type             string `json:"type"`
	Name             string `json:"name"`
	ConnectionString string `json:"connectionString"`
	Status           string `json:"status"`
}

type Manager struct {
	mu        sync.Mutex
	databases map[string]DatabaseInstance
}

func NewManager() *Manager {
	// Ensure the hex_internal network exists
	exec.Command("docker", "network", "create", "hex_internal").Run()
	
	return &Manager{
		databases: make(map[string]DatabaseInstance),
	}
}

func generatePassword() string {
	bytes := make([]byte, 16)
	rand.Read(bytes)
	return hex.EncodeToString(bytes)
}

func (m *Manager) CreateDatabase(dbType, name string) (*DatabaseInstance, error) {
	m.mu.Lock()
	defer m.mu.Unlock()

	id := fmt.Sprintf("hex-db-%s", generatePassword()[:8])
	password := generatePassword()
	var connStr string

	if dbType == "postgres" {
		cmd := exec.Command("docker", "run", "-d", 
			"--name", id, 
			"--network", "hex_internal", 
			"-e", fmt.Sprintf("POSTGRES_PASSWORD=%s", password), 
			"-e", fmt.Sprintf("POSTGRES_DB=%s", name), 
			"postgres:15-alpine")
		
		if err := cmd.Run(); err != nil {
			return nil, fmt.Errorf("failed to start postgres container: %w", err)
		}
		
		// The connection string uses the container ID as the hostname inside the docker network
		connStr = fmt.Sprintf("postgres://postgres:%s@%s:5432/%s", password, id, name)

	} else if dbType == "redis" {
		cmd := exec.Command("docker", "run", "-d", 
			"--name", id, 
			"--network", "hex_internal", 
			"redis:alpine", "redis-server", "--requirepass", password)
		
		if err := cmd.Run(); err != nil {
			return nil, fmt.Errorf("failed to start redis container: %w", err)
		}

		connStr = fmt.Sprintf("redis://:%s@%s:6379/0", password, id)
	} else {
		return nil, fmt.Errorf("unsupported database type: %s", dbType)
	}

	db := DatabaseInstance{
		ID:               id,
		Type:             dbType,
		Name:             name,
		ConnectionString: connStr,
		Status:           "running",
	}
	m.databases[id] = db

	log.Printf("Provisioned new database: %s (%s)", name, dbType)
	return &db, nil
}

func (m *Manager) ListDatabases() []DatabaseInstance {
	m.mu.Lock()
	defer m.mu.Unlock()

	// In a real implementation we would query Docker and a local DB, 
	// for MVP we use our in-memory map which acts as a cache.
	var list []DatabaseInstance
	for _, db := range m.databases {
		// Update status via docker inspect
		out, err := exec.Command("docker", "inspect", "-f", "{{.State.Status}}", db.ID).Output()
		if err == nil {
			db.Status = strings.TrimSpace(string(out))
		}
		list = append(list, db)
	}
	return list
}
