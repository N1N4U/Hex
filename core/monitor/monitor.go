package monitor

import (
	"context"
	"io"
	"math"
	"net/http"
	"sort"
	"strings"
	"time"

	"github.com/shirou/gopsutil/v3/cpu"
	"github.com/shirou/gopsutil/v3/disk"
	"github.com/shirou/gopsutil/v3/host"
	"github.com/shirou/gopsutil/v3/mem"
	"github.com/shirou/gopsutil/v3/net"
	"github.com/shirou/gopsutil/v3/process"
)

type SystemStats struct {
	CPUUsage    float64 `json:"cpu_usage"` // percentage
	MemTotal    uint64  `json:"mem_total"` // bytes
	MemUsed     uint64  `json:"mem_used"`
	MemUsage    float64 `json:"mem_usage"` // percentage
	DiskTotal   uint64  `json:"disk_total"`
	DiskUsed    uint64  `json:"disk_used"`
	DiskUsage   float64          `json:"disk_usage"` // percentage
	Partitions  []PartitionStats `json:"partitions"`
	NetSent     uint64           `json:"net_sent"`   // bytes/sec (calculated)
	NetRecv     uint64           `json:"net_recv"`   // bytes/sec (calculated)
	NetTotalSent uint64          `json:"net_total_sent"`
	NetTotalRecv uint64          `json:"net_total_recv"`
	Timestamp   string           `json:"timestamp"`
	Uptime      uint64           `json:"uptime"`
	OSName      string           `json:"os_name"`
	CPUModel    string           `json:"cpu_model"`
	CPUCores     int              `json:"cpu_cores"`
	HostIP       string           `json:"host_ip"`
	TopProcesses []ProcessStat    `json:"top_processes"`
}

type ProcessStat struct {
	PID         int32   `json:"pid"`
	Name        string  `json:"name"`
	CPUPercent  float64 `json:"cpu_percent"`
	MemoryBytes uint64  `json:"memory_bytes"`
}

type PartitionStats struct {
	Device      string  `json:"device"`
	Mountpoint  string  `json:"mountpoint"`
	Total       uint64  `json:"total"`
	Used        uint64  `json:"used"`
	UsedPercent float64 `json:"used_percent"`
}

type Manager struct {
	lastNetSent uint64
	lastNetRecv uint64
	lastNetTime time.Time
	hostIP      string
}

func NewManager() *Manager {
	m := &Manager{
		lastNetTime: time.Now(),
		hostIP:      "Unknown",
	}
	
	// Fetch public IP in background
	go func() {
		client := http.Client{Timeout: 5 * time.Second}
		resp, err := client.Get("https://api.ipify.org")
		if err == nil {
			defer resp.Body.Close()
			if body, err := io.ReadAll(resp.Body); err == nil {
				ip := strings.TrimSpace(string(body))
				if ip != "" {
					m.hostIP = ip
				}
			}
		}
	}()
	return m
}

func (m *Manager) GetStats(ctx context.Context) (*SystemStats, error) {
	stats := &SystemStats{
		Timestamp: time.Now().Format(time.RFC3339),
		HostIP:    m.hostIP,
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

	// Disk (root partition + others)
	stats.Partitions = make([]PartitionStats, 0)
	partitions, err := disk.PartitionsWithContext(ctx, true) // Changed to true to get all
	if err == nil {
		for _, p := range partitions {
			// Skip loops, snaps, etc
			if strings.HasPrefix(p.Mountpoint, "/snap") || strings.HasPrefix(p.Mountpoint, "/loop") || strings.HasPrefix(p.Device, "tmpfs") || strings.HasPrefix(p.Device, "devtmpfs") {
				continue
			}
			diskStat, err := disk.UsageWithContext(ctx, p.Mountpoint)
			if err == nil {
				stats.Partitions = append(stats.Partitions, PartitionStats{
					Device:      p.Device,
					Mountpoint:  p.Mountpoint,
					Total:       diskStat.Total,
					Used:        diskStat.Used,
					UsedPercent: math.Round(diskStat.UsedPercent*100) / 100,
				})
				if p.Mountpoint == "/" {
					stats.DiskTotal = diskStat.Total
					stats.DiskUsed = diskStat.Used
					stats.DiskUsage = math.Round(diskStat.UsedPercent*100) / 100
				}
			}
		}
	}

	// Add SWAP as a pseudo-partition
	swapStat, err := mem.SwapMemoryWithContext(ctx)
	if err == nil && swapStat.Total > 0 {
		stats.Partitions = append(stats.Partitions, PartitionStats{
			Device:      "swap",
			Mountpoint:  "[SWAP]",
			Total:       swapStat.Total,
			Used:        swapStat.Used,
			UsedPercent: math.Round(swapStat.UsedPercent*100) / 100,
		})
	}

	// Network
	netStats, err := net.IOCountersWithContext(ctx, false)
	if err == nil && len(netStats) > 0 {
		currentSent := netStats[0].BytesSent
		currentRecv := netStats[0].BytesRecv
		stats.NetTotalSent = currentSent
		stats.NetTotalRecv = currentRecv
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

	// Host Info
	hostInfo, err := host.InfoWithContext(ctx)
	if err == nil {
		stats.Uptime = hostInfo.Uptime
		stats.OSName = hostInfo.Platform + " " + hostInfo.PlatformVersion
	}

	// CPU Info
	cpuInfo, err := cpu.InfoWithContext(ctx)
	if err == nil && len(cpuInfo) > 0 {
		stats.CPUModel = cpuInfo[0].ModelName
	}
	cpuCores, err := cpu.CountsWithContext(ctx, true)
	if err == nil {
		stats.CPUCores = cpuCores
	}

	// Top Processes
	procs, err := process.ProcessesWithContext(ctx)
	if err == nil {
		var procStats []ProcessStat
		for _, p := range procs {
			name, err := p.NameWithContext(ctx)
			if err != nil {
				continue
			}
			cpuP, _ := p.CPUPercentWithContext(ctx)
			memInfo, err := p.MemoryInfoWithContext(ctx)
			memB := uint64(0)
			if err == nil {
				memB = memInfo.RSS
			}

			if cpuP > 0 || memB > 0 {
				procStats = append(procStats, ProcessStat{
					PID:         p.Pid,
					Name:        name,
					CPUPercent:  math.Round(cpuP*100) / 100,
					MemoryBytes: memB,
				})
			}
		}

		// Sort by CPU usage descending
		sort.Slice(procStats, func(i, j int) bool {
			return procStats[i].CPUPercent > procStats[j].CPUPercent
		})

		// Take top 10
		if len(procStats) > 10 {
			stats.TopProcesses = procStats[:10]
		} else {
			stats.TopProcesses = procStats
		}
	}

	return stats, nil
}
