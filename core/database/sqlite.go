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
	query := `
	CREATE TABLE IF NOT EXISTS api_keys (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		name TEXT NOT NULL,
		key_hash TEXT NOT NULL UNIQUE,
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP
	);

	CREATE TABLE IF NOT EXISTS trusted_ips (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		ip_address TEXT NOT NULL UNIQUE,
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP
	);
	`
	_, err := s.db.Exec(query)
	if err != nil {
		return fmt.Errorf("failed to create schema: %w", err)
	}
	return nil
}

func (s *SQLiteDB) SaveAPIKey(name, keyHash string) error {
	_, err := s.db.Exec("INSERT INTO api_keys (name, key_hash) VALUES (?, ?)", name, keyHash)
	return err
}

func (s *SQLiteDB) VerifyAPIKey(keyHash string) (bool, error) {
	var id int
	err := s.db.QueryRow("SELECT id FROM api_keys WHERE key_hash = ?", keyHash).Scan(&id)
	if err == sql.ErrNoRows {
		return false, nil
	}
	if err != nil {
		return false, err
	}
	return true, nil
}

func (s *SQLiteDB) ApproveIP(ip string) error {
	_, err := s.db.Exec("INSERT OR IGNORE INTO trusted_ips (ip_address) VALUES (?)", ip)
	return err
}

func (s *SQLiteDB) DenyIP(ip string) error {
	_, err := s.db.Exec("DELETE FROM trusted_ips WHERE ip_address = ?", ip)
	return err
}

func (s *SQLiteDB) IsIPTrusted(ip string) (bool, error) {
	var id int
	err := s.db.QueryRow("SELECT id FROM trusted_ips WHERE ip_address = ?", ip).Scan(&id)
	if err == sql.ErrNoRows {
		return false, nil
	}
	if err != nil {
		return false, err
	}
	return true, nil
}

func (s *SQLiteDB) Close() {
	if s.db != nil {
		s.db.Close()
	}
}
