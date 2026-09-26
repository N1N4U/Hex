package monitor

import (
	"context"
	"io"
	"math"
	"net/http"
	"os"
	"os/user"
	"path/filepath"
	"sort"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/docker/docker/api/types"
	dockerClient "github.com/docker/docker/client"
	"github.com/shirou/gopsutil/v3/cpu"
	"github.com/shirou/gopsutil/v3/disk"
	"github.com/shirou/gopsutil/v3/host"
	"github.com/shirou/gopsutil/v3/mem"
	"github.com/shirou/gopsutil/v3/net"
)

type SystemStats struct {
	CPUUsage          float64          `json:"cpu_usage"`
	CPUCoresUsage     []float64        `json:"cpu_cores_usage"`
	Load1             float64          `json:"load_1"`
	Load5             float64          `json:"load_5"`
	Load15            float64          `json:"load_15"`
	TaskCount         int              `json:"task_count"`
	SwapTotal         uint64           `json:"swap_total"`
	SwapUsed          uint64           `json:"swap_used"`
	MemTotal          uint64           `json:"mem_total"`
	MemUsed           uint64           `json:"mem_used"`
	MemUsage          float64          `json:"mem_usage"`
	DiskTotal         uint64           `json:"disk_total"`
	DiskUsed          uint64           `json:"disk_used"`
	DiskUsage         float64          `json:"disk_usage"`
	Partitions        []PartitionStats `json:"partitions"`
	NetSent           uint64           `json:"net_sent"`
	NetRecv           uint64           `json:"net_recv"`
	NetTotalSent      uint64           `json:"net_total_sent"`
	NetTotalRecv      uint64           `json:"net_total_recv"`
	Timestamp         string           `json:"timestamp"`
	Uptime            uint64           `json:"uptime"`
	OSName            string           `json:"os_name"`
	CPUModel          string           `json:"cpu_model"`
	CPUCores          int              `json:"cpu_cores"`
	HostIP            string           `json:"host_ip"`
	TopProcesses      []ProcessStat    `json:"top_processes"`
	DockerImagesSize  uint64           `json:"docker_images_size"`
	DockerLogsSize    uint64           `json:"docker_logs_size"`
	DockerStorageSize uint64           `json:"docker_storage_size"`
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
	statsMu             sync.RWMutex
	lastNetSent         uint64
	lastNetRecv         uint64
	lastNetTime         time.Time
	hostIP              string
	cachedCPUCores      int
	cachedCPU           float64
	cachedCPUCoresUsage []float64
	cachedLoad1         float64
	cachedLoad5         float64
	cachedLoad15        float64
	cachedTaskCount     int
	cachedSwapTotal     uint64
	cachedSwapUsed      uint64
	cachedMemTotal      uint64
	cachedMemUsed       uint64
	cachedMemUsage      float64
	cachedNetSent       uint64
	cachedNetRecv       uint64
	cachedNetTotalSent  uint64
	cachedNetTotalRecv  uint64
	cachedProcesses     []ProcessStat
	cachedDockerImages  uint64
	cachedDockerLogs    uint64
	cachedDockerStorage uint64
	lastProcTimes       map[int32]uint64
	lastSysTime         uint64
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
					m.statsMu.Lock()
					m.hostIP = ip
					m.statsMu.Unlock()
				}
			}
		}
	}()

	go func() {
		tickCount := 0
		clockTicks := float64(100)
		for {
			vmStat, err := mem.VirtualMemory()
			var memTotal, memUsed uint64
			var memUsage float64
			if err == nil {
				memTotal = vmStat.Total
				used := vmStat.Total - vmStat.Free - vmStat.Buffers - vmStat.Cached
				memUsed = used
				memUsage = math.Round((float64(used)/float64(vmStat.Total))*100) / 100
			}

			netStats, err := net.IOCounters(false)
			var netSentRate, netRecvRate, netTotalSent, netTotalRecv uint64
			if err == nil && len(netStats) > 0 {
				currentSent := netStats[0].BytesSent
				currentRecv := netStats[0].BytesRecv
				netTotalSent = currentSent
				netTotalRecv = currentRecv
				now := time.Now()

				elapsed := now.Sub(m.lastNetTime).Seconds()
				if elapsed > 0 {
					if m.lastNetSent > 0 && currentSent > m.lastNetSent {
						netSentRate = uint64(float64(currentSent-m.lastNetSent) / elapsed)
					}
					if m.lastNetRecv > 0 && currentRecv > m.lastNetRecv {
						netRecvRate = uint64(float64(currentRecv-m.lastNetRecv) / elapsed)
					}
				}

				m.lastNetSent = currentSent
				m.lastNetRecv = currentRecv
				m.lastNetTime = now
			}

			var cpuVal float64
			var cpuCoresUsage []float64
			var swapTotal, swapUsed uint64
			var l1, l5, l15 float64
			var finalProcs []ProcessStat
			var taskCount int

			if tickCount%2 == 0 {
				cpuPerCore, err := cpu.Percent(0, true)
				if err == nil {
					var sum float64
					for _, c := range cpuPerCore {
						cpuCoresUsage = append(cpuCoresUsage, math.Round(c*100)/100)
						sum += c
					}
					if len(cpuPerCore) > 0 {
						cpuVal = math.Round((sum/float64(len(cpuPerCore)))*100) / 100
					}
				}

				swapStat, err := mem.SwapMemory()
				if err == nil {
					swapTotal = swapStat.Total
					swapUsed = swapStat.Used
				}

				l1, l5, l15 = readLoadAvg()

				dirs, err := os.ReadDir("/proc")
				sysTime := uint64(readUptime() * clockTicks)
				activePIDs := make(map[int32]bool)

				if err == nil {
					var procStats []ProcessStat
					for _, d := range dirs {
						if !d.IsDir() {
							continue
						}
						pid, err := strconv.ParseInt(d.Name(), 10, 32)
						if err != nil {
							continue
						}
						pid32 := int32(pid)
						activePIDs[pid32] = true
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

						lastTotal := m.lastProcTimes[pid32]
						var cpuPercent float64
						if lastTotal > 0 && sysTime > m.lastSysTime {
							diff := totalTime - lastTotal
							sysDiff := sysTime - m.lastSysTime
							cpuPercent = (float64(diff) / float64(sysDiff)) * 100.0 * float64(m.cachedCPUCores)
						}
						m.lastProcTimes[pid32] = totalTime

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
								PID:         pid32,
								Name:        name,
								User:        uid,
								TimePlus:    timePlus,
								CPUPercent:  math.Round(cpuPercent*100) / 100,
								MemoryBytes: memBytes,
							})
						}
					}

					for oldPid := range m.lastProcTimes {
						if !activePIDs[oldPid] {
							delete(m.lastProcTimes, oldPid)
						}
					}

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

					for _, p := range mergedMap {
						finalProcs = append(finalProcs, p)
					}
				}
			}

			m.statsMu.Lock()
			if memTotal > 0 {
				m.cachedMemTotal = memTotal
				m.cachedMemUsed = memUsed
				m.cachedMemUsage = memUsage
			}
			if netTotalSent > 0 || netTotalRecv > 0 {
				m.cachedNetSent = netSentRate
				m.cachedNetRecv = netRecvRate
				m.cachedNetTotalSent = netTotalSent
				m.cachedNetTotalRecv = netTotalRecv
			}
			if tickCount%2 == 0 {
				if cpuVal > 0 || len(cpuCoresUsage) > 0 {
					m.cachedCPU = cpuVal
					m.cachedCPUCoresUsage = cpuCoresUsage
				}
				if swapTotal > 0 {
					m.cachedSwapTotal = swapTotal
					m.cachedSwapUsed = swapUsed
				}
				m.cachedLoad1 = l1
				m.cachedLoad5 = l5
				m.cachedLoad15 = l15
				m.cachedTaskCount = taskCount
				m.cachedProcesses = finalProcs
			}
			m.statsMu.Unlock()

			tickCount++
			time.Sleep(1 * time.Second)
		}
	}()

	go func() {
		dockerCli, err := dockerClient.NewClientWithOpts(dockerClient.FromEnv, dockerClient.WithAPIVersionNegotiation())
		if err != nil {
			return
		}
		defer dockerCli.Close()

		for {
			ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
			du, err := dockerCli.DiskUsage(ctx, types.DiskUsageOptions{})
			cancel()
			if err == nil {
				var imagesSize uint64
				for _, img := range du.Images {
					if img.Size > 0 {
						imagesSize += uint64(img.Size)
					}
				}
				var containersSize uint64
				for _, c := range du.Containers {
					if c.SizeRw > 0 {
						containersSize += uint64(c.SizeRw)
					}
				}
				var volumesSize uint64
				for _, v := range du.Volumes {
					if v.UsageData != nil && v.UsageData.Size > 0 {
						volumesSize += uint64(v.UsageData.Size)
					}
				}

				m.statsMu.Lock()
				m.cachedDockerImages = imagesSize
				m.cachedDockerLogs = containersSize
				m.cachedDockerStorage = uint64(du.LayersSize) + containersSize + volumesSize
				m.statsMu.Unlock()
			}
			time.Sleep(30 * time.Second)
		}
	}()

	return m
}

func (m *Manager) GetStats(ctx context.Context) (*SystemStats, error) {
	m.statsMu.RLock()
	stats := &SystemStats{
		Timestamp:          time.Now().Format(time.RFC3339),
		HostIP:             m.hostIP,
		CPUUsage:           m.cachedCPU,
		CPUCoresUsage:      m.cachedCPUCoresUsage,
		Load1:              m.cachedLoad1,
		Load5:              m.cachedLoad5,
		Load15:             m.cachedLoad15,
		TaskCount:          m.cachedTaskCount,
		SwapTotal:          m.cachedSwapTotal,
		SwapUsed:           m.cachedSwapUsed,
		MemTotal:           m.cachedMemTotal,
		MemUsed:            m.cachedMemUsed,
		MemUsage:           m.cachedMemUsage,
		NetSent:            m.cachedNetSent,
		NetRecv:            m.cachedNetRecv,
		NetTotalSent:       m.cachedNetTotalSent,
		NetTotalRecv:       m.cachedNetTotalRecv,
		TopProcesses:       m.cachedProcesses,
		DockerImagesSize:   m.cachedDockerImages,
		DockerLogsSize:     m.cachedDockerLogs,
		DockerStorageSize:  m.cachedDockerStorage,
	}
	m.statsMu.RUnlock()

	stats.Partitions = make([]PartitionStats, 0)

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
			if p.Mountpoint == "/" {
				continue
			}
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

	return stats, nil
}
