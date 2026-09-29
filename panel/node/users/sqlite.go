package users

import (
	"database/sql"
	"errors"
	"os"
	"path/filepath"
	"time"

	_ "modernc.org/sqlite"
	"golang.org/x/crypto/argon2"
	"crypto/rand"
	"encoding/base64"
	"fmt"
)

var db *sql.DB

// User represents a node user.
type User struct {
	ID           string    `json:"id"`
	Username     string    `json:"username"`
	PasswordHash string    `json:"-"`
	Role         string    `json:"role"` // owner | admin | developer | viewer
	CreatedAt    time.Time `json:"created_at"`
}

// Session represents an active user session.
type Session struct {
	ID           string    `json:"id"`
	UserID       string    `json:"user_id"`
	RefreshToken string    `json:"refresh_token"`
	ExpiresAt    time.Time `json:"expires_at"`
	CreatedAt    time.Time `json:"created_at"`
}

// Node represents a connected VPS Core instance.
type Node struct {
	ID        string    `json:"id"`
	Name      string    `json:"name"`
	IPAddress string    `json:"ip_address"`
	Port      int       `json:"port"`
	Protocol  string    `json:"protocol"` // http | https | unix
	APIKey    string    `json:"api_key,omitempty"`
	Status    string    `json:"status"` // online | offline | busy
	LastSeen  time.Time `json:"last_seen"`
	CreatedAt time.Time `json:"created_at"`
}

// ActivityLog records user actions on the node.
type ActivityLog struct {
	ID        int64     `json:"id"`
	UserID    string    `json:"user_id"`
	Username  string    `json:"username"`
	Action    string    `json:"action"`
	Details   string    `json:"details"`
	IPAddress string    `json:"ip_address"`
	CreatedAt time.Time `json:"created_at"`
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

		CREATE TABLE IF NOT EXISTS nodes (
			id         TEXT PRIMARY KEY,
			name       TEXT NOT NULL,
			ip_address TEXT NOT NULL,
			port       INTEGER NOT NULL DEFAULT 8080,
			protocol   TEXT NOT NULL DEFAULT 'http',
			api_key    TEXT NOT NULL,
			status     TEXT NOT NULL DEFAULT 'offline',
			last_seen  DATETIME DEFAULT CURRENT_TIMESTAMP,
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP
		);

		CREATE TABLE IF NOT EXISTS activity_logs (
			id         INTEGER PRIMARY KEY AUTOINCREMENT,
			user_id    TEXT NOT NULL,
			username   TEXT NOT NULL,
			action     TEXT NOT NULL,
			details    TEXT NOT NULL,
			ip_address TEXT NOT NULL,
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP
		);
	`)
	return err
}

// EnsureMasterUser seeds or updates the master auth user from settings.json
func EnsureMasterUser(username, plainPassword string) (*User, error) {
	if username == "" || plainPassword == "" {
		return nil, errors.New("empty credentials")
	}

	existing, err := GetUserByUsername(username)
	if err == nil && existing != nil {
		// Update password if needed
		hash, _ := hashPasswordInternal(plainPassword)
		db.Exec(`UPDATE users SET password_hash = ?, role = 'owner' WHERE id = ?`, hash, existing.ID)
		existing.Role = "owner"
		return existing, nil
	}

	hash, err := hashPasswordInternal(plainPassword)
	if err != nil {
		return nil, err
	}

	id := "master-" + username
	_, err = db.Exec(`
		INSERT INTO users (id, username, password_hash, role, created_at)
		VALUES (?, ?, ?, 'owner', CURRENT_TIMESTAMP)
		ON CONFLICT(username) DO UPDATE SET password_hash = excluded.password_hash, role = 'owner'
	`, id, username, hash)
	if err != nil {
		return nil, err
	}

	return &User{
		ID:        id,
		Username:  username,
		Role:      "owner",
		CreatedAt: time.Now(),
	}, nil
}

func hashPasswordInternal(password string) (string, error) {
	salt := make([]byte, 16)
	rand.Read(salt)
	hash := argon2.IDKey([]byte(password), salt, 1, 64*1024, 4, 32)
	b64Salt := base64.RawStdEncoding.EncodeToString(salt)
	b64Hash := base64.RawStdEncoding.EncodeToString(hash)
	return fmt.Sprintf("$argon2id$v=19$m=65536,t=1,p=4$%s$%s", b64Salt, b64Hash), nil
}

// ── Node Operations ──────────────────────────────────────────────────────────

func ListNodes() ([]Node, error) {
	rows, err := db.Query(`SELECT id, name, ip_address, port, protocol, api_key, status, last_seen, created_at FROM nodes ORDER BY name ASC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var nodes []Node
	for rows.Next() {
		var n Node
		if err := rows.Scan(&n.ID, &n.Name, &n.IPAddress, &n.Port, &n.Protocol, &n.APIKey, &n.Status, &n.LastSeen, &n.CreatedAt); err != nil {
			continue
		}
		nodes = append(nodes, n)
	}
	return nodes, nil
}

func GetNode(id string) (*Node, error) {
	row := db.QueryRow(`SELECT id, name, ip_address, port, protocol, api_key, status, last_seen, created_at FROM nodes WHERE id = ?`, id)
	var n Node
	if err := row.Scan(&n.ID, &n.Name, &n.IPAddress, &n.Port, &n.Protocol, &n.APIKey, &n.Status, &n.LastSeen, &n.CreatedAt); err != nil {
		return nil, err
	}
	return &n, nil
}

func AddNode(n *Node) error {
	_, err := db.Exec(`
		INSERT INTO nodes (id, name, ip_address, port, protocol, api_key, status, last_seen, created_at)
		VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
	`, n.ID, n.Name, n.IPAddress, n.Port, n.Protocol, n.APIKey, n.Status)
	return err
}

func DeleteNode(id string) error {
	_, err := db.Exec(`DELETE FROM nodes WHERE id = ?`, id)
	return err
}

func UpdateNodeStatus(id, status string) error {
	_, err := db.Exec(`UPDATE nodes SET status = ?, last_seen = CURRENT_TIMESTAMP WHERE id = ?`, status, id)
	return err
}

// ── Activity Log Operations ──────────────────────────────────────────────────

func RecordActivity(userID, username, action, details, ipAddress string) error {
	if db == nil {
		return nil
	}
	_, err := db.Exec(`
		INSERT INTO activity_logs (user_id, username, action, details, ip_address, created_at)
		VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
	`, userID, username, action, details, ipAddress)
	return err
}

func GetRecentActivities(limit int) ([]ActivityLog, error) {
	if limit <= 0 || limit > 500 {
		limit = 50
	}
	rows, err := db.Query(`
		SELECT id, user_id, username, action, details, ip_address, created_at
		FROM activity_logs
		ORDER BY id DESC
		LIMIT ?
	`, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var logs []ActivityLog
	for rows.Next() {
		var l ActivityLog
		if err := rows.Scan(&l.ID, &l.UserID, &l.Username, &l.Action, &l.Details, &l.IPAddress, &l.CreatedAt); err != nil {
			continue
		}
		logs = append(logs, l)
	}
	return logs, nil
}

// ── User / Session Operations ────────────────────────────────────────────────

func GetUserByUsername(username string) (*User, error) {
	row := db.QueryRow(`SELECT id, username, password_hash, role, created_at FROM users WHERE username = ?`, username)
	var u User
	if err := row.Scan(&u.ID, &u.Username, &u.PasswordHash, &u.Role, &u.CreatedAt); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}
	return &u, nil
}

func GetUserByID(id string) (*User, error) {
	row := db.QueryRow(`SELECT id, username, password_hash, role, created_at FROM users WHERE id = ?`, id)
	var u User
	if err := row.Scan(&u.ID, &u.Username, &u.PasswordHash, &u.Role, &u.CreatedAt); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}
	return &u, nil
}

func CreateUser(id, username, passwordHash, role string) error {
	query := "INSERT INTO users (id, username, password_hash, role, created_at) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)"
	_, err := db.Exec(query, id, username, passwordHash, role)
	return err
}

func CreateUserRecord(u *User) error {
	query := "INSERT INTO users (id, username, password_hash, role, created_at) VALUES (?, ?, ?, ?, ?)"
	_, err := db.Exec(query, u.ID, u.Username, u.PasswordHash, u.Role, u.CreatedAt)
	return err
}

func CountUsers() (int, error) {
	var count int
	err := db.QueryRow("SELECT COUNT(*) FROM users").Scan(&count)
	return count, err
}

func CreateSession(id, userID, refreshToken string, expiresAt time.Time) error {
	query := "INSERT INTO sessions (id, user_id, refresh_token, expires_at, created_at) VALUES (?, ?, ?, ?, ?)"
	_, err := db.Exec(query, id, userID, refreshToken, expiresAt, time.Now())
	return err
}

func SaveSession(s *Session) error {
	return CreateSession(s.ID, s.UserID, s.RefreshToken, s.ExpiresAt)
}

func GetSessionByRefreshToken(token string) (*Session, error) {
	row := db.QueryRow(`SELECT id, user_id, refresh_token, expires_at, created_at FROM sessions WHERE refresh_token = ?`, token)
	var s Session
	if err := row.Scan(&s.ID, &s.UserID, &s.RefreshToken, &s.ExpiresAt, &s.CreatedAt); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}
	return &s, nil
}

func DeleteSession(refreshToken string) error {
	_, err := db.Exec("DELETE FROM sessions WHERE refresh_token = ?", refreshToken)
	return err
}

func DeleteSessionByRefreshToken(token string) error {
	return DeleteSession(token)
}
func DeleteSessionsByUserID(userID string) error {
	_, err := db.Exec(`DELETE FROM sessions WHERE user_id = ?`, userID)
	return err
}
