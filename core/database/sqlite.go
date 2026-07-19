package database

import (
	"database/sql"
	"fmt"
	"os"
	"path/filepath"

	_ "github.com/mattn/go-sqlite3"
)

type SQLiteDB struct {
	db *sql.DB
}

var DB *SQLiteDB

func InitSQLite() error {
	// Use /var/lib/hex/core/hex-core.db in production, fallback to local for dev
	dbPath := "/var/lib/hex/core/hex-core.db"
	if _, err := os.Stat("/var/lib/hex/core"); os.IsNotExist(err) {
		dbPath = "./hex-core.db"
	}

	// Ensure directory exists for local dev
	if err := os.MkdirAll(filepath.Dir(dbPath), 0755); err != nil {
		return fmt.Errorf("failed to create db directory: %w", err)
	}

	conn, err := sql.Open("sqlite3", dbPath)
	if err != nil {
		return fmt.Errorf("failed to open sqlite database: %w", err)
	}

	if err := conn.Ping(); err != nil {
		return fmt.Errorf("failed to ping sqlite database: %w", err)
	}

	DB = &SQLiteDB{db: conn}
	return DB.createSchema()
}

func (s *SQLiteDB) createSchema() error {
	// Add backward compatibility for existing DBs that don't have expires_at
	_, _ = s.db.Exec(`ALTER TABLE api_keys ADD COLUMN expires_at DATETIME`)

	query := `
	CREATE TABLE IF NOT EXISTS api_keys (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		name TEXT NOT NULL UNIQUE,
		key_hash TEXT NOT NULL UNIQUE,
		expires_at DATETIME,
		bound_endpoint TEXT,
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP
	);

	CREATE TABLE IF NOT EXISTS trusted_endpoints (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		endpoint TEXT NOT NULL UNIQUE,
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP
	);

	CREATE TABLE IF NOT EXISTS pending_endpoints (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		endpoint TEXT NOT NULL UNIQUE,
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP
	);
	`
	_, err := s.db.Exec(query)
	if err != nil {
		return fmt.Errorf("failed to create schema: %w", err)
	}
	return nil
}

func (s *SQLiteDB) SaveAPIKey(name, keyHash string, expiresAt *string) error {
	if expiresAt != nil {
		_, err := s.db.Exec("INSERT INTO api_keys (name, key_hash, expires_at) VALUES (?, ?, ?)", name, keyHash, *expiresAt)
		return err
	}
	_, err := s.db.Exec("INSERT INTO api_keys (name, key_hash) VALUES (?, ?)", name, keyHash)
	return err
}

func (s *SQLiteDB) VerifyAPIKey(keyHash string) (bool, error) {
	var id int
	err := s.db.QueryRow("SELECT id FROM api_keys WHERE key_hash = ? AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP)", keyHash).Scan(&id)
	if err == sql.ErrNoRows {
		return false, nil
	}
	if err != nil {
		return false, err
	}
	return true, nil
}

func (s *SQLiteDB) ApproveEndpoint(endpoint string) error {
	// 1. Add to trusted endpoints
	_, err := s.db.Exec("INSERT OR IGNORE INTO trusted_endpoints (endpoint) VALUES (?)", endpoint)
	if err == nil {
		// 2. Remove from pending
		s.db.Exec("DELETE FROM pending_endpoints WHERE endpoint = ?", endpoint)
		
		// 3. Find the most recently created temporary API key (expires_at IS NOT NULL) and bind it to this endpoint permanently
		// This assumes the admin runs approve shortly after the panel connects with the temporary key.
		s.db.Exec(`
			UPDATE api_keys 
			SET expires_at = NULL, bound_endpoint = ? 
			WHERE id = (
				SELECT id FROM api_keys 
				WHERE expires_at IS NOT NULL AND bound_endpoint IS NULL 
				ORDER BY created_at DESC LIMIT 1
			)
		`, endpoint)
	}
	return err
}

func (s *SQLiteDB) DenyEndpoint(endpoint string) error {
	_, err := s.db.Exec("DELETE FROM trusted_endpoints WHERE endpoint = ?", endpoint)
	s.db.Exec("DELETE FROM pending_endpoints WHERE endpoint = ?", endpoint)
	return err
}

func (s *SQLiteDB) AddPendingEndpoint(endpoint string) error {
	_, err := s.db.Exec("INSERT OR IGNORE INTO pending_endpoints (endpoint) VALUES (?)", endpoint)
	return err
}

func (s *SQLiteDB) IsEndpointTrusted(endpoint string) (bool, error) {
	var id int
	err := s.db.QueryRow("SELECT id FROM trusted_endpoints WHERE endpoint = ?", endpoint).Scan(&id)
	if err == sql.ErrNoRows {
		return false, nil
	}
	if err != nil {
		return false, err
	}
	return true, nil
}

type APIKeyInfo struct {
	Name          string
	ExpiresAt     *string
	BoundEndpoint *string
	CreatedAt     string
}

func (s *SQLiteDB) RemoveAPIKey(nameOrKey string) error {
	_, err := s.db.Exec("DELETE FROM api_keys WHERE name = ? OR key_hash = ?", nameOrKey, nameOrKey)
	return err
}

func (s *SQLiteDB) InfoAPIKey(nameOrKey string) (*APIKeyInfo, error) {
	var info APIKeyInfo
	err := s.db.QueryRow("SELECT name, expires_at, bound_endpoint, created_at FROM api_keys WHERE name = ? OR key_hash = ?", nameOrKey, nameOrKey).Scan(&info.Name, &info.ExpiresAt, &info.BoundEndpoint, &info.CreatedAt)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &info, nil
}

func (s *SQLiteDB) ListAPIKeys() ([]APIKeyInfo, error) {
	rows, err := s.db.Query("SELECT name, expires_at, bound_endpoint, created_at FROM api_keys")
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var keys []APIKeyInfo
	for rows.Next() {
		var info APIKeyInfo
		if err := rows.Scan(&info.Name, &info.ExpiresAt, &info.BoundEndpoint, &info.CreatedAt); err != nil {
			return nil, err
		}
		keys = append(keys, info)
	}
	return keys, nil
}

func (s *SQLiteDB) Close() {
	if s.db != nil {
		s.db.Close()
	}
}
