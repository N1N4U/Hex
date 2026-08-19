package monitor

import (
	"context"
	"io"
	"math"
	"net/http"
	"os"
	"os/exec"
	"os/user"
	"path/filepath"
	"sort"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/shirou/gopsutil/v3/cpu"
	"github.com/shirou/gopsutil/v3/disk"
	"github.com/shirou/gopsutil/v3/host"
	"github.com/shirou/gopsutil/v3/mem"
	"github.com/shirou/gopsutil/v3/net"
)

type SystemStats struct {
	CPUUsage      float64          `json:"cpu_usage"`
	CPUCoresUsage []float64        `json:"cpu_cores_usage"`
	Load1         float64          `json:"load_1"`
	Load5         float64          `json:"load_5"`
	Load15        float64          `json:"load_15"`
	TaskCount     int              `json:"task_count"`
	SwapTotal     uint64           `json:"swap_total"`
	SwapUsed      uint64           `json:"swap_used"`
	MemTotal      uint64           `json:"mem_total"`
	MemUsed       uint64           `json:"mem_used"`
	MemUsage      float64          `json:"mem_usage"`
	DiskTotal     uint64           `json:"disk_total"`
	DiskUsed      uint64           `json:"disk_used"`
	DiskUsage     float64          `json:"disk_usage"`
	Partitions    []PartitionStats `json:"partitions"`
	NetSent       uint64           `json:"net_sent"`
	NetRecv       uint64           `json:"net_recv"`
	NetTotalSent  uint64           `json:"net_total_sent"`
	NetTotalRecv  uint64           `json:"net_total_recv"`
	Timestamp     string           `json:"timestamp"`
	Uptime        uint64           `json:"uptime"`
	OSName        string           `json:"os_name"`
	CPUModel      string           `json:"cpu_model"`
	CPUCores      int              `json:"cpu_cores"`
	HostIP        string           `json:"host_ip"`
	TopProcesses  []ProcessStat    `json:"top_processes"`
	DockerImagesSize  uint64       `json:"docker_images_size"`
	DockerLogsSize    uint64       `json:"docker_logs_size"`
	DockerStorageSize uint64       `json:"docker_storage_size"`
}

type ProcessStat struct {
	PID         int32   `json:"pid"`
	Name        string  `json:"name"`
	User        string  `json:"user"`
	TimePlus    string  `json:"time_plus"`
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
	lastNetSent        uint64
	lastNetRecv        uint64
	lastNetTime        time.Time
	hostIP             string
	cachedCPUCores     int
	cachedCPU          float64
	cachedCPUCoresUsage []float64
	cachedLoad1        float64
	cachedLoad5        float64
	cachedLoad15       float64
	cachedTaskCount    int
	cachedSwapTotal    uint64
	cachedSwapUsed     uint64
	cachedMemTotal     uint64
	cachedMemUsed      uint64
	cachedMemUsage     float64
	cachedNetSent      uint64
	cachedNetRecv      uint64
	cachedNetTotalSent uint64
	cachedNetTotalRecv uint64
	cachedProcesses    []ProcessStat
	cachedDockerImages  uint64
	cachedDockerLogs    uint64
	cachedDockerStorage uint64
	processMu          sync.Mutex
	lastProcTimes      map[int32]uint64
	lastSysTime        uint64
}

func readLoadAvg() (float64, float64, float64) {
	data, err := os.ReadFile("/proc/loadavg")
	if err != nil {
		return 0, 0, 0
	}
	fields := strings.Fields(string(data))
	if len(fields) >= 3 {
		l1, _ := strconv.ParseFloat(fields[0], 64)
		l5, _ := strconv.ParseFloat(fields[1], 64)
		l15, _ := strconv.ParseFloat(fields[2], 64)
		return l1, l5, l15
	}
	return 0, 0, 0
}

func readUptime() float64 {
	data, err := os.ReadFile("/proc/uptime")
	if err != nil {
		return 0
	}
	fields := strings.Fields(string(data))
	if len(fields) > 0 {
		up, _ := strconv.ParseFloat(fields[0], 64)
		return up
	}
	return 0
}

func NewManager() *Manager {
	m := &Manager{
		lastNetTime:   time.Now(),
		hostIP:        "Unknown",
		lastProcTimes: make(map[int32]uint64),
	}

	cores, err := cpu.Counts(true)
	if err == nil && cores > 0 {
		m.cachedCPUCores = cores
	} else {
		m.cachedCPUCores = 1
	}

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

	go func() {
		tickCount := 0
		clockTicks := float64(100) // standard CLK_TCK
		for {
			// Total CPU is calculated from per-core usage below
			vmStat, err := mem.VirtualMemory()
			if err == nil {
				m.cachedMemTotal = vmStat.Total
				used := vmStat.Total - vmStat.Free - vmStat.Buffers - vmStat.Cached
				m.cachedMemUsed = used
				m.cachedMemUsage = math.Round((float64(used)/float64(vmStat.Total))*100) / 100
			}

			netStats, err := net.IOCounters(false)
			if err == nil && len(netStats) > 0 {
				currentSent := netStats[0].BytesSent
				currentRecv := netStats[0].BytesRecv
				m.cachedNetTotalSent = currentSent
				m.cachedNetTotalRecv = currentRecv
				now := time.Now()

				elapsed := now.Sub(m.lastNetTime).Seconds()
				if elapsed > 0 {
					if m.lastNetSent > 0 && currentSent > m.lastNetSent {
						m.cachedNetSent = uint64(float64(currentSent-m.lastNetSent) / elapsed)
					}
					if m.lastNetRecv > 0 && currentRecv > m.lastNetRecv {
						m.cachedNetRecv = uint64(float64(currentRecv-m.lastNetRecv) / elapsed)
					}
				}

				m.lastNetSent = currentSent
				m.lastNetRecv = currentRecv
				m.lastNetTime = now
			}

			if tickCount%2 == 0 {
				cpuPerCore, err := cpu.Percent(0, true)
				if err == nil {
					var roundedCores []float64
					var sum float64
					for _, c := range cpuPerCore {
						roundedCores = append(roundedCores, math.Round(c*100)/100)
						sum += c
					}
					m.cachedCPUCoresUsage = roundedCores
					if len(cpuPerCore) > 0 {
						m.cachedCPU = math.Round(sum*100) / 100
					}
				}

				swapStat, err := mem.SwapMemory()
				if err == nil {
					m.cachedSwapTotal = swapStat.Total
					m.cachedSwapUsed = swapStat.Used
				}

				m.cachedLoad1, m.cachedLoad5, m.cachedLoad15 = readLoadAvg()

				dirs, err := os.ReadDir("/proc")
				taskCount := 0
				var procStats []ProcessStat
				
				sysTime := uint64(readUptime() * clockTicks)

				if err == nil {
					for _, d := range dirs {
						if !d.IsDir() {
							continue
						}
						pid, err := strconv.ParseInt(d.Name(), 10, 32)
						if err != nil {
							continue
						}
						taskCount++
						
						statData, err := os.ReadFile(filepath.Join("/proc", d.Name(), "stat"))
						if err != nil {
							continue
						}
						statusData, err := os.ReadFile(filepath.Join("/proc", d.Name(), "status"))
						if err != nil {
							continue
						}

						statStr := string(statData)
						openParen := strings.IndexByte(statStr, '(')
						closeParen := strings.LastIndexByte(statStr, ')')
						if openParen < 0 || closeParen < 0 {
							continue
						}
						name := statStr[openParen+1 : closeParen]
						
						fields := strings.Fields(statStr[closeParen+2:])
						if len(fields) < 22 {
							continue
						}
						
						utime, _ := strconv.ParseUint(fields[11], 10, 64)
						stime, _ := strconv.ParseUint(fields[12], 10, 64)
						totalTime := utime + stime

						var memBytes uint64
						var uid string
						lines := strings.Split(string(statusData), "\n")
						for _, line := range lines {
							if strings.HasPrefix(line, "VmRSS:") {
								f := strings.Fields(line)
								if len(f) >= 2 {
									kb, _ := strconv.ParseUint(f[1], 10, 64)
									memBytes = kb * 1024
								}
							} else if strings.HasPrefix(line, "Uid:") {
								f := strings.Fields(line)
								if len(f) >= 2 {
									uid = f[1]
								}
							}
						}

						lastTotal := m.lastProcTimes[int32(pid)]
						var cpuPercent float64
						if lastTotal > 0 && sysTime > m.lastSysTime {
							diff := totalTime - lastTotal
							sysDiff := sysTime - m.lastSysTime
							cpuPercent = (float64(diff) / float64(sysDiff)) * 100.0 * float64(m.cachedCPUCores)
						}
						m.lastProcTimes[int32(pid)] = totalTime

						totalSecs := float64(totalTime) / clockTicks
						mins := int(totalSecs / 60)
						secs := float64(totalSecs) - float64(mins*60)
						timePlus := strconv.Itoa(mins) + ":" + strconv.FormatFloat(secs, 'f', 2, 64)

						if uid == "" {
							uid = "0"
						}
						u, err := user.LookupId(uid)
						if err == nil {
							uid = u.Username
						}

						if cpuPercent > 0 || memBytes > 0 {
							procStats = append(procStats, ProcessStat{
								PID:         int32(pid),
								Name:        name,
								User:        uid,
								TimePlus:    timePlus,
								CPUPercent:  math.Round(cpuPercent*100) / 100,
								MemoryBytes: memBytes,
							})
						}
					}
					m.cachedTaskCount = taskCount
					m.lastSysTime = sysTime

					sort.Slice(procStats, func(i, j int) bool {
						return procStats[i].CPUPercent > procStats[j].CPUPercent
					})

					var topCpu []ProcessStat
					topCpu = append([]ProcessStat(nil), procStats...)

					sort.Slice(procStats, func(i, j int) bool {
						return procStats[i].MemoryBytes > procStats[j].MemoryBytes
					})

					var topRam []ProcessStat
					topRam = append([]ProcessStat(nil), procStats...)

					mergedMap := make(map[int32]ProcessStat)
					for _, p := range topCpu {
						mergedMap[p.PID] = p
					}
					for _, p := range topRam {
						mergedMap[p.PID] = p
					}

					var finalProcs []ProcessStat
					for _, p := range mergedMap {
						finalProcs = append(finalProcs, p)
					}

					m.processMu.Lock()
					m.cachedProcesses = finalProcs
					m.processMu.Unlock()
				}
			}
			tickCount++
			time.Sleep(1 * time.Second)
		}
	}()

	go func() {
		for {
			var images, logs, total uint64
			out, err := exec.Command("sh", "-c", "du -sb /var/lib/docker/image 2>/dev/null | awk '{print $1}'").Output()
			if err == nil {
				images, _ = strconv.ParseUint(strings.TrimSpace(string(out)), 10, 64)
			}
			out, err = exec.Command("sh", "-c", "du -sb /var/lib/docker/containers/*/*-json.log 2>/dev/null | awk '{s+=$1} END {print s}'").Output()
			if err == nil {
				logs, _ = strconv.ParseUint(strings.TrimSpace(string(out)), 10, 64)
			}
			out, err = exec.Command("sh", "-c", "du -sb /var/lib/docker 2>/dev/null | awk '{print $1}'").Output()
			if err == nil {
				total, _ = strconv.ParseUint(strings.TrimSpace(string(out)), 10, 64)
			}
			m.cachedDockerImages = images
			m.cachedDockerLogs = logs
			m.cachedDockerStorage = total
			time.Sleep(30 * time.Second)
		}
	}()

	return m
}

func (m *Manager) GetStats(ctx context.Context) (*SystemStats, error) {
	stats := &SystemStats{
		Timestamp: time.Now().Format(time.RFC3339),
		HostIP:    m.hostIP,
	}

	stats.CPUUsage = m.cachedCPU
	stats.CPUCoresUsage = m.cachedCPUCoresUsage
	stats.Load1 = m.cachedLoad1
	stats.Load5 = m.cachedLoad5
	stats.Load15 = m.cachedLoad15
	stats.TaskCount = m.cachedTaskCount
	stats.SwapTotal = m.cachedSwapTotal
	stats.SwapUsed = m.cachedSwapUsed
	stats.MemTotal = m.cachedMemTotal
	stats.MemUsed = m.cachedMemUsed
	stats.MemUsage = m.cachedMemUsage

	stats.Partitions = make([]PartitionStats, 0)
	
	// 1. Unconditionally add root
	rootStat, err := disk.UsageWithContext(ctx, "/")
	if err == nil {
		stats.Partitions = append(stats.Partitions, PartitionStats{
			Device:      "rootfs",
			Mountpoint:  "/",
			Total:       rootStat.Total,
			Used:        rootStat.Used,
			UsedPercent: math.Round(rootStat.UsedPercent*100) / 100,
		})
		stats.DiskTotal = rootStat.Total
		stats.DiskUsed = rootStat.Used
		stats.DiskUsage = math.Round(rootStat.UsedPercent*100) / 100
	}

	partitions, err := disk.PartitionsWithContext(ctx, false)
	if err == nil {
		for _, p := range partitions {
			if p.Mountpoint == "/" { continue }
			if p.Fstype == "overlay" || p.Fstype == "squashfs" || p.Fstype == "tmpfs" || strings.Contains(p.Mountpoint, "/docker") {
				continue
			}
			if strings.HasPrefix(p.Device, "/dev/loop") {
				continue
			}
			diskStat, err := disk.UsageWithContext(ctx, p.Mountpoint)
			if err == nil && diskStat.Total > 0 {
				stats.Partitions = append(stats.Partitions, PartitionStats{
					Device:      p.Device,
					Mountpoint:  p.Mountpoint,
					Total:       diskStat.Total,
					Used:        diskStat.Used,
					UsedPercent: math.Round(diskStat.UsedPercent*100) / 100,
				})
			}
		}
	}

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

	stats.NetSent = m.cachedNetSent
	stats.NetRecv = m.cachedNetRecv
	stats.NetTotalSent = m.cachedNetTotalSent
	stats.NetTotalRecv = m.cachedNetTotalRecv

	hostInfo, err := host.InfoWithContext(ctx)
	if err == nil {
		stats.Uptime = hostInfo.Uptime
		stats.OSName = hostInfo.Platform + " " + hostInfo.PlatformVersion
	}

	cpuInfo, err := cpu.InfoWithContext(ctx)
	if err == nil && len(cpuInfo) > 0 {
		stats.CPUModel = cpuInfo[0].ModelName
	}
	cpuCores, err := cpu.CountsWithContext(ctx, true)
	if err == nil {
		stats.CPUCores = cpuCores
	}

	m.processMu.Lock()
	stats.TopProcesses = m.cachedProcesses
	m.processMu.Unlock()

	stats.DockerImagesSize = m.cachedDockerImages
	stats.DockerLogsSize = m.cachedDockerLogs
	stats.DockerStorageSize = m.cachedDockerStorage

	return stats, nil
}
