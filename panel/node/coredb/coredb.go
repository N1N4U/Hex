package coredb

import (
	"database/sql"
	"os"
	"path/filepath"
	"time"

	_ "modernc.org/sqlite"
)

var db *sql.DB

type SystemMetric struct {
	ID           int64     `json:"id"`
	NodeID       string    `json:"node_id"`
	CPUPercent   float64   `json:"cpu_percent"`
	MemoryUsed   uint64    `json:"memory_used"`
	MemoryTotal  uint64    `json:"memory_total"`
	DiskUsed     uint64    `json:"disk_used"`
	DiskTotal    uint64    `json:"disk_total"`
	NetBytesSent uint64    `json:"net_bytes_sent"`
	NetBytesRecv uint64    `json:"net_bytes_recv"`
	Timestamp    time.Time `json:"timestamp"`
}

type ContainerLog struct {
	ID            int64     `json:"id"`
	NodeID        string    `json:"node_id"`
	ContainerID   string    `json:"container_id"`
	ContainerName string    `json:"container_name"`
	Stream        string    `json:"stream"` // stdout | stderr
	Message       string    `json:"message"`
	Timestamp     time.Time `json:"timestamp"`
}

type SystemEvent struct {
	ID          int64     `json:"id"`
	NodeID      string    `json:"node_id"`
	EventType   string    `json:"event_type"`
	Description string    `json:"description"`
	Timestamp   time.Time `json:"timestamp"`
}

// Init opens the Core SQLite database (e.g. data/hex-core.db)
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
	schema := `
	CREATE TABLE IF NOT EXISTS system_metrics (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		node_id TEXT NOT NULL DEFAULT 'local',
		cpu_percent REAL NOT NULL,
		memory_used INTEGER NOT NULL,
		memory_total INTEGER NOT NULL,
		disk_used INTEGER NOT NULL,
		disk_total INTEGER NOT NULL,
		net_bytes_sent INTEGER NOT NULL DEFAULT 0,
		net_bytes_recv INTEGER NOT NULL DEFAULT 0,
		timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
	);

	CREATE INDEX IF NOT EXISTS idx_metrics_node_time ON system_metrics(node_id, timestamp);

	CREATE TABLE IF NOT EXISTS container_logs (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		node_id TEXT NOT NULL DEFAULT 'local',
		container_id TEXT NOT NULL,
		container_name TEXT NOT NULL,
		stream TEXT NOT NULL DEFAULT 'stdout',
		message TEXT NOT NULL,
		timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
	);

	CREATE INDEX IF NOT EXISTS idx_logs_container ON container_logs(container_id, timestamp);

	CREATE TABLE IF NOT EXISTS system_events (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		node_id TEXT NOT NULL DEFAULT 'local',
		event_type TEXT NOT NULL,
		description TEXT NOT NULL,
		timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
	);
	`
	_, err := db.Exec(schema)
	return err
}

// RecordMetric saves a performance snapshot for graph rendering
func RecordMetric(nodeID string, cpu float64, memUsed, memTotal, diskUsed, diskTotal, netSent, netRecv uint64) error {
	if db == nil {
		return nil
	}
	_, err := db.Exec(`
		INSERT INTO system_metrics (node_id, cpu_percent, memory_used, memory_total, disk_used, disk_total, net_bytes_sent, net_bytes_recv, timestamp)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
	`, nodeID, cpu, memUsed, memTotal, diskUsed, diskTotal, netSent, netRecv)
	return err
}

// GetMetricsHistory returns historical metrics for graphs
func GetMetricsHistory(nodeID string, limit int) ([]SystemMetric, error) {
	if db == nil {
		return nil, nil
	}
	if limit <= 0 || limit > 1000 {
		limit = 100
	}
	rows, err := db.Query(`
		SELECT id, node_id, cpu_percent, memory_used, memory_total, disk_used, disk_total, net_bytes_sent, net_bytes_recv, timestamp
		FROM system_metrics
		WHERE node_id = ?
		ORDER BY id DESC
		LIMIT ?
	`, nodeID, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var records []SystemMetric
	for rows.Next() {
		var m SystemMetric
		if err := rows.Scan(&m.ID, &m.NodeID, &m.CPUPercent, &m.MemoryUsed, &m.MemoryTotal, &m.DiskUsed, &m.DiskTotal, &m.NetBytesSent, &m.NetBytesRecv, &m.Timestamp); err != nil {
			continue
		}
		records = append(records, m)
	}
	return records, nil
}

// AppendContainerLog stores a log line from a container
func AppendContainerLog(nodeID, containerID, containerName, stream, message string) error {
	if db == nil {
		return nil
	}
	_, err := db.Exec(`
		INSERT INTO container_logs (node_id, container_id, container_name, stream, message, timestamp)
		VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
	`, nodeID, containerID, containerName, stream, message)
	return err
}

// GetContainerLogs returns logs for a given container
func GetContainerLogs(containerID string, limit int) ([]ContainerLog, error) {
	if db == nil {
		return nil, nil
	}
	if limit <= 0 || limit > 1000 {
		limit = 200
	}
	rows, err := db.Query(`
		SELECT id, node_id, container_id, container_name, stream, message, timestamp
		FROM container_logs
		WHERE container_id = ?
		ORDER BY id DESC
		LIMIT ?
	`, containerID, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var logs []ContainerLog
	for rows.Next() {
		var l ContainerLog
		if err := rows.Scan(&l.ID, &l.NodeID, &l.ContainerID, &l.ContainerName, &l.Stream, &l.Message, &l.Timestamp); err != nil {
			continue
		}
		logs = append(logs, l)
	}
	return logs, nil
}
