package monitor

import (
	"context"
	"math"
	"time"

	"github.com/shirou/gopsutil/v3/cpu"
	"github.com/shirou/gopsutil/v3/disk"
	"github.com/shirou/gopsutil/v3/mem"
	"github.com/shirou/gopsutil/v3/net"
)

type SystemStats struct {
	CPUUsage    float64 `json:"cpu_usage"` // percentage
	MemTotal    uint64  `json:"mem_total"` // bytes
	MemUsed     uint64  `json:"mem_used"`
	MemUsage    float64 `json:"mem_usage"` // percentage
	DiskTotal   uint64  `json:"disk_total"`
	DiskUsed    uint64  `json:"disk_used"`
	DiskUsage   float64 `json:"disk_usage"` // percentage
	NetSent     uint64  `json:"net_sent"`   // bytes/sec (calculated)
	NetRecv     uint64  `json:"net_recv"`   // bytes/sec (calculated)
	Timestamp   string  `json:"timestamp"`
}

type Manager struct {
	lastNetSent uint64
	lastNetRecv uint64
	lastNetTime time.Time
}

func NewManager() *Manager {
	return &Manager{
		lastNetTime: time.Now(),
	}
}

func (m *Manager) GetStats(ctx context.Context) (*SystemStats, error) {
	stats := &SystemStats{
		Timestamp: time.Now().Format(time.RFC3339),
	}

	// CPU
	cpuPercents, err := cpu.PercentWithContext(ctx, 0, false)
	if err == nil && len(cpuPercents) > 0 {
		stats.CPUUsage = math.Round(cpuPercents[0]*100) / 100
	}

	// Memory
	vmStat, err := mem.VirtualMemoryWithContext(ctx)
	if err == nil {
		stats.MemTotal = vmStat.Total
		stats.MemUsed = vmStat.Used
		stats.MemUsage = math.Round(vmStat.UsedPercent*100) / 100
	}

	// Disk (root partition)
	diskStat, err := disk.UsageWithContext(ctx, "/")
	if err == nil {
		stats.DiskTotal = diskStat.Total
		stats.DiskUsed = diskStat.Used
		stats.DiskUsage = math.Round(diskStat.UsedPercent*100) / 100
	}

	// Network
	netStats, err := net.IOCountersWithContext(ctx, false)
	if err == nil && len(netStats) > 0 {
		currentSent := netStats[0].BytesSent
		currentRecv := netStats[0].BytesRecv
		now := time.Now()
		
		elapsed := now.Sub(m.lastNetTime).Seconds()
		if elapsed > 0 {
			if m.lastNetSent > 0 && currentSent > m.lastNetSent {
				stats.NetSent = uint64(float64(currentSent-m.lastNetSent) / elapsed)
			}
			if m.lastNetRecv > 0 && currentRecv > m.lastNetRecv {
				stats.NetRecv = uint64(float64(currentRecv-m.lastNetRecv) / elapsed)
			}
		}

		m.lastNetSent = currentSent
		m.lastNetRecv = currentRecv
		m.lastNetTime = now
	}

	return stats, nil
}
