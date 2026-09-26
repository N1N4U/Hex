package users

import (
	"database/sql"
	"errors"
	"os"
	"path/filepath"
	"time"

	_ "modernc.org/sqlite"
)

var db *sql.DB

// User represents a node user.
type User struct {
	ID           string
	Username     string
	PasswordHash string
	Role         string // owner | admin | developer | viewer
	CreatedAt    time.Time
}

// Session represents an active user session.
type Session struct {
	ID           string
	UserID       string
	RefreshToken string
	ExpiresAt    time.Time
	CreatedAt    time.Time
}

// Init opens the SQLite database and creates tables.
func Init(path string) error {
	if dir := filepath.Dir(path); dir != "" && dir != "." {
		if err := os.MkdirAll(dir, 0755); err != nil {
			return err
		}
	}
	var err error
	db, err = sql.Open("sqlite", path+"?_pragma=foreign_keys(1)&_pragma=journal_mode(WAL)")
	if err != nil {
		return err
	}
	return migrate()
}

func migrate() error {
	_, err := db.Exec(`
		CREATE TABLE IF NOT EXISTS users (
			id           TEXT PRIMARY KEY,
			username     TEXT UNIQUE NOT NULL,
			password_hash TEXT NOT NULL,
			role         TEXT NOT NULL DEFAULT 'viewer',
			created_at   DATETIME DEFAULT CURRENT_TIMESTAMP
		);
		CREATE TABLE IF NOT EXISTS sessions (
			id            TEXT PRIMARY KEY,
			user_id       TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
			refresh_token TEXT UNIQUE NOT NULL,
			expires_at    DATETIME NOT NULL,
			created_at    DATETIME DEFAULT CURRENT_TIMESTAMP
		);
	`)
	return err
}

// CreateUser inserts a new user. Returns error if username already exists.
func CreateUser(id, username, passwordHash, role string) error {
	_, err := db.Exec(
		"INSERT INTO users (id, username, password_hash, role) VALUES (?, ?, ?, ?)",
		id, username, passwordHash, role,
	)
	return err
}

// GetUserByUsername looks up a user by username.
func GetUserByUsername(username string) (*User, error) {
	u := &User{}
	err := db.QueryRow(
		"SELECT id, username, password_hash, role, created_at FROM users WHERE username = ?", username,
	).Scan(&u.ID, &u.Username, &u.PasswordHash, &u.Role, &u.CreatedAt)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, nil
	}
	return u, err
}

// GetUserByID looks up a user by ID.
func GetUserByID(id string) (*User, error) {
	u := &User{}
	err := db.QueryRow(
		"SELECT id, username, password_hash, role, created_at FROM users WHERE id = ?", id,
	).Scan(&u.ID, &u.Username, &u.PasswordHash, &u.Role, &u.CreatedAt)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, nil
	}
	return u, err
}

// CountUsers returns the total number of users.
func CountUsers() (int, error) {
	var n int
	err := db.QueryRow("SELECT COUNT(*) FROM users").Scan(&n)
	return n, err
}

// CreateSession stores a new refresh token session.
func CreateSession(id, userID, refreshToken string, expiresAt time.Time) error {
	_, err := db.Exec(
		"INSERT INTO sessions (id, user_id, refresh_token, expires_at) VALUES (?, ?, ?, ?)",
		id, userID, refreshToken, expiresAt,
	)
	return err
}

// GetSessionByRefreshToken returns a session by its refresh token.
func GetSessionByRefreshToken(token string) (*Session, error) {
	s := &Session{}
	err := db.QueryRow(
		"SELECT id, user_id, refresh_token, expires_at, created_at FROM sessions WHERE refresh_token = ?", token,
	).Scan(&s.ID, &s.UserID, &s.RefreshToken, &s.ExpiresAt, &s.CreatedAt)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, nil
	}
	return s, err
}

// DeleteSession removes a session (logout).
func DeleteSession(refreshToken string) error {
	_, err := db.Exec("DELETE FROM sessions WHERE refresh_token = ?", refreshToken)
	return err
}

// PruneExpiredSessions deletes all expired sessions.
func PruneExpiredSessions() error {
	_, err := db.Exec("DELETE FROM sessions WHERE expires_at < CURRENT_TIMESTAMP")
	return err
}
