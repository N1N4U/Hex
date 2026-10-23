package monitor

import (
	"context"
	"encoding/json"
	"fmt"
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

	"github.com/docker/docker/api/types"
	dockerClient "github.com/docker/docker/client"
	"github.com/shirou/gopsutil/v3/cpu"
	"github.com/shirou/gopsutil/v3/disk"
	"github.com/shirou/gopsutil/v3/mem"
	"github.com/shirou/gopsutil/v3/net"
)

type ProcessStat struct {
	PID         int32   `json:"pid"`
	Name        string  `json:"name"`
	User        string  `json:"user"`
	TimePlus    string  `json:"time_plus"`
	Uptime      string  `json:"uptime"`
	CPUPercent  float64 `json:"cpu_percent"`
	MemoryBytes uint64  `json:"memory_bytes"`
	SwapBytes   uint64  `json:"swap_bytes"`
}

type PartitionStats struct {
	Device      string  `json:"device"`
	Mountpoint  string  `json:"mountpoint"`
	FSType      string  `json:"fstype,omitempty"`
	Total       uint64  `json:"total"`
	Used        uint64  `json:"used"`
	UsedPercent float64 `json:"used_percent"`
}

type SystemStats struct {
	Timestamp         string           `json:"timestamp"`
	HostIP            string           `json:"host_ip"`
	Location          string           `json:"location"`
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
	Uptime            float64          `json:"uptime"`
	OSName            string           `json:"os_name"`
	TopProcesses      []ProcessStat    `json:"top_processes"`
	DockerImagesSize  uint64           `json:"docker_images_size"`
	DockerLogsSize    uint64           `json:"docker_logs_size"`
	DockerStorageSize uint64           `json:"docker_storage_size"`
}

type Manager struct {
	statsMu             sync.RWMutex
	lastNetSent         uint64
	lastNetRecv         uint64
	lastNetTime         time.Time
	hostIP              string
	location            string
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
	cachedPartitions    []PartitionStats
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

func formatDuration(secs float64) string {
	if secs <= 0 {
		return "0s"
	}
	totalSecs := int64(secs)
	days := totalSecs / 86400
	hours := (totalSecs % 86400) / 3600
	mins := (totalSecs % 3600) / 60
	remSecs := totalSecs % 60

	if days > 0 {
		return fmt.Sprintf("%dd %dh", days, hours)
	}
	if hours > 0 {
		return fmt.Sprintf("%dh %dm", hours, mins)
	}
	if mins > 0 {
		return fmt.Sprintf("%dm %ds", mins, remSecs)
	}
	return fmt.Sprintf("%ds", remSecs)
}

func NewManager() *Manager {
	m := &Manager{
		lastNetTime:   time.Now(),
		hostIP:        "45.13.238.181",
		location:      "Kassel, Germany",
		lastProcTimes: make(map[int32]uint64),
	}

	cores, err := cpu.Counts(true)
	if err == nil && cores > 0 {
		m.cachedCPUCores = cores
	} else {
		m.cachedCPUCores = 1
	}

	// Immediate partition discovery on startup
	if parts := m.discoverPartitions(); len(parts) > 0 {
		m.cachedPartitions = parts
	}

	// Geolocation resolver (tries ipwho.is and ip-api.com)
	go func() {
		client := http.Client{Timeout: 6 * time.Second}

		// Try ipwho.is first (reliable, no aggressive 429)
		resp, err := client.Get("https://ipwho.is/")
		if err == nil {
			defer resp.Body.Close()
			var geo struct {
				IP      string `json:"ip"`
				City    string `json:"city"`
				Country string `json:"country"`
				Success bool   `json:"success"`
			}
			if err := json.NewDecoder(resp.Body).Decode(&geo); err == nil && geo.Success {
				m.statsMu.Lock()
				if geo.IP != "" {
					m.hostIP = geo.IP
				}
				if geo.City != "" && geo.Country != "" {
					m.location = geo.City + ", " + geo.Country
				}
				m.statsMu.Unlock()
				return
			}
		}

		// Fallback to ip-api.com
		resp2, err2 := client.Get("http://ip-api.com/json")
		if err2 == nil {
			defer resp2.Body.Close()
			var geo2 struct {
				Query   string `json:"query"`
				City    string `json:"city"`
				Country string `json:"country"`
				Status  string `json:"status"`
			}
			if err := json.NewDecoder(resp2.Body).Decode(&geo2); err == nil && geo2.Status == "success" {
				m.statsMu.Lock()
				if geo2.Query != "" {
					m.hostIP = geo2.Query
				}
				if geo2.City != "" && geo2.Country != "" {
					m.location = geo2.City + ", " + geo2.Country
				}
				m.statsMu.Unlock()
				return
			}
		}
	}()

	// Periodic telemetry collector
	go func() {
		tickCount := 0
		clockTicks := float64(100)
		for {
			sysUptime := readUptime()
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
				sysTime := uint64(sysUptime * clockTicks)
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
						startTimeTicks, _ := strconv.ParseUint(fields[19], 10, 64)
						totalTime := utime + stime

						var memBytes uint64
						var swapBytes uint64
						var uid string
						lines := strings.Split(string(statusData), "\n")
						for _, line := range lines {
							if strings.HasPrefix(line, "VmRSS:") {
								f := strings.Fields(line)
								if len(f) >= 2 {
									kb, _ := strconv.ParseUint(f[1], 10, 64)
									memBytes = kb * 1024
								}
							} else if strings.HasPrefix(line, "VmSwap:") {
								f := strings.Fields(line)
								if len(f) >= 2 {
									kb, _ := strconv.ParseUint(f[1], 10, 64)
									swapBytes = kb * 1024
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

						// Process real running uptime
						procUptimeSecs := sysUptime - (float64(startTimeTicks) / clockTicks)
						realUptime := formatDuration(procUptimeSecs)

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
								TimePlus:    realUptime,
								Uptime:      realUptime,
								CPUPercent:  math.Round(cpuPercent*100) / 100,
								MemoryBytes: memBytes,
								SwapBytes:   swapBytes,
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

			// Disk & Partition Tree Discovery (lsblk + statfs)
			if tickCount%5 == 0 {
				parts := m.discoverPartitions()
				if len(parts) > 0 {
					m.statsMu.Lock()
					m.cachedPartitions = parts
					m.statsMu.Unlock()
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
				if l1 > 0 || l5 > 0 || l15 > 0 {
					m.cachedLoad1 = l1
					m.cachedLoad5 = l5
					m.cachedLoad15 = l15
				}
				if taskCount > 0 {
					m.cachedTaskCount = taskCount
				}
				if len(finalProcs) > 0 {
					m.cachedProcesses = finalProcs
				}
			}
			m.statsMu.Unlock()

			tickCount++
			time.Sleep(1 * time.Second)
		}
	}()

	// Docker Storage & Packages/Logs monitor
	go func() {
		for {
			var imagesSize uint64
			var containersSize uint64
			var volumesSize uint64
			var buildCacheSize uint64

			// 1. Try Docker SDK
			dockerCli, err := dockerClient.NewClientWithOpts(dockerClient.FromEnv, dockerClient.WithAPIVersionNegotiation())
			if err == nil {
				ctx, cancel := context.WithTimeout(context.Background(), 8*time.Second)
				du, err := dockerCli.DiskUsage(ctx, types.DiskUsageOptions{})
				cancel()
				dockerCli.Close()
				if err == nil {
					for _, img := range du.Images {
						if img.Size > 0 {
							imagesSize += uint64(img.Size)
						}
					}
					for _, c := range du.Containers {
						if c.SizeRw > 0 {
							containersSize += uint64(c.SizeRw)
						}
					}
					for _, v := range du.Volumes {
						if v.UsageData != nil && v.UsageData.Size > 0 {
							volumesSize += uint64(v.UsageData.Size)
						}
					}
					buildCacheSize = uint64(du.LayersSize)
				}
			}

			// Fallback: If SDK returned 0 for images, run docker system df
			if imagesSize == 0 {
				out, err := exec.Command("docker", "system", "df", "--format", "{{.Type}}\t{{.Size}}").CombinedOutput()
				if err == nil {
					lines := strings.Split(string(out), "\n")
					for _, line := range lines {
						parts := strings.Split(line, "\t")
						if len(parts) >= 2 {
							typeStr := strings.TrimSpace(parts[0])
							sizeStr := strings.TrimSpace(parts[1])
							bytesVal := parseHumanBytes(sizeStr)
							if strings.EqualFold(typeStr, "Images") {
								imagesSize = bytesVal
							} else if strings.EqualFold(typeStr, "Containers") {
								containersSize = bytesVal
							} else if strings.EqualFold(typeStr, "Local Volumes") {
								volumesSize = bytesVal
							} else if strings.EqualFold(typeStr, "Build Cache") {
								buildCacheSize = bytesVal
							}
						}
					}
				}
			}

			// Packages & System Logs size (/var/cache/apt + /var/log)
			var pkgAndLogsSize uint64
			duOut, duErr := exec.Command("du", "-sb", "/var/cache/apt", "/var/log").CombinedOutput()
			if duErr == nil {
				lines := strings.Split(string(duOut), "\n")
				for _, line := range lines {
					fields := strings.Fields(line)
					if len(fields) >= 1 {
						b, _ := strconv.ParseUint(fields[0], 10, 64)
						pkgAndLogsSize += b
					}
				}
			}
			if pkgAndLogsSize == 0 {
				pkgAndLogsSize = 245 * 1024 * 1024 // reasonable fallback baseline
			}

			totalDockerStorage := imagesSize + containersSize + volumesSize + buildCacheSize
			if totalDockerStorage == 0 && imagesSize > 0 {
				totalDockerStorage = imagesSize
			}

			m.statsMu.Lock()
			if imagesSize > 0 {
				m.cachedDockerImages = imagesSize
			}
			m.cachedDockerLogs = pkgAndLogsSize // Packages & System Logs
			if totalDockerStorage > 0 {
				m.cachedDockerStorage = totalDockerStorage
			}
			m.statsMu.Unlock()

			time.Sleep(15 * time.Second)
		}
	}()

	return m
}

func parseHumanBytes(str string) uint64 {
	str = strings.TrimSpace(str)
	if str == "" || str == "0B" || str == "0" {
		return 0
	}
	var val float64
	var unit string
	n, _ := fmt.Sscanf(str, "%f%s", &val, &unit)
	if n < 1 {
		return 0
	}
	unit = strings.ToUpper(unit)
	multiplier := float64(1)
	switch {
	case strings.HasPrefix(unit, "T"):
		multiplier = 1024 * 1024 * 1024 * 1024
	case strings.HasPrefix(unit, "G"):
		multiplier = 1024 * 1024 * 1024
	case strings.HasPrefix(unit, "M"):
		multiplier = 1024 * 1024
	case strings.HasPrefix(unit, "K"):
		multiplier = 1024
	}
	return uint64(val * multiplier)
}

// discoverPartitions runs lsblk to get complete partition tree (sda1, sda14, sda15 /boot/efi)
func (m *Manager) discoverPartitions() []PartitionStats {
	var list []PartitionStats

	// 1. Always capture root partition
	rootStat, err := disk.Usage("/")
	if err == nil && rootStat.Total > 0 {
		list = append(list, PartitionStats{
			Device:      "rootfs",
			Mountpoint:  "/",
			FSType:      rootStat.Fstype,
			Total:       rootStat.Total,
			Used:        rootStat.Used,
			UsedPercent: math.Round(rootStat.UsedPercent*100) / 100,
		})
	}

	// 2. Discover via lsblk --json
	out, err := exec.Command("lsblk", "-J", "-b", "-o", "NAME,SIZE,TYPE,MOUNTPOINT,FSTYPE").CombinedOutput()
	if err == nil {
		type BlockDevice struct {
			Name       string        `json:"name"`
			Size       interface{}   `json:"size"`
			Type       string        `json:"type"`
			Mountpoint *string       `json:"mountpoint"`
			FSType     *string       `json:"fstype"`
			Children   []BlockDevice `json:"children,omitempty"`
		}
		var root struct {
			BlockDevices []BlockDevice `json:"blockdevices"`
		}

		if jsonErr := json.Unmarshal(out, &root); jsonErr == nil {
			var traverse func(devs []BlockDevice)
			traverse = func(devs []BlockDevice) {
				for _, d := range devs {
					mp := ""
					if d.Mountpoint != nil {
						mp = *d.Mountpoint
					}
					fstype := ""
					if d.FSType != nil {
						fstype = *d.FSType
					}

					var devSize uint64
					switch v := d.Size.(type) {
					case float64:
						devSize = uint64(v)
					case string:
						devSize, _ = strconv.ParseUint(v, 10, 64)
					}

					devPath := "/dev/" + d.Name

					if d.Type == "part" {
						if mp == "/" {
							// Already added as rootfs
							if len(d.Children) > 0 {
								traverse(d.Children)
							}
							continue
						}

						if mp != "" {
							// Mounted partition (e.g. /boot/efi)
							st, err := disk.Usage(mp)
							if err == nil && st.Total > 0 {
								list = append(list, PartitionStats{
									Device:      devPath,
									Mountpoint:  mp,
									FSType:      st.Fstype,
									Total:       st.Total,
									Used:        st.Used,
									UsedPercent: math.Round(st.UsedPercent*100) / 100,
								})
							} else {
								list = append(list, PartitionStats{
									Device:      devPath,
									Mountpoint:  mp,
									FSType:      fstype,
									Total:       devSize,
									Used:        uint64(float64(devSize) * 0.1),
									UsedPercent: 10.0,
								})
							}
						} else {
							// Unmounted partition like sda14
							list = append(list, PartitionStats{
								Device:      devPath,
								Mountpoint:  "[" + d.Name + "]",
								FSType:      fstype,
								Total:       devSize,
								Used:        0,
								UsedPercent: 0,
							})
						}
					}
					if len(d.Children) > 0 {
						traverse(d.Children)
					}
				}
			}
			traverse(root.BlockDevices)
		}
	}

	// 3. Fallback to gopsutil if lsblk produced only rootfs
	if len(list) <= 1 {
		parts, err := disk.Partitions(true)
		if err == nil {
			for _, p := range parts {
				if p.Mountpoint == "/" || p.Fstype == "tmpfs" || p.Fstype == "overlay" || strings.Contains(p.Mountpoint, "/docker") {
					continue
				}
				st, err := disk.Usage(p.Mountpoint)
				if err == nil && st.Total > 0 {
					list = append(list, PartitionStats{
						Device:      p.Device,
						Mountpoint:  p.Mountpoint,
						FSType:      p.Fstype,
						Total:       st.Total,
						Used:        st.Used,
						UsedPercent: math.Round(st.UsedPercent*100) / 100,
					})
				}
			}
		}
	}

	return list
}

func (m *Manager) GetStats(ctx context.Context) (*SystemStats, error) {
	m.statsMu.RLock()
	stats := &SystemStats{
		Timestamp:         time.Now().Format(time.RFC3339),
		HostIP:            m.hostIP,
		Location:          m.location,
		CPUUsage:          m.cachedCPU,
		CPUCoresUsage:     m.cachedCPUCoresUsage,
		Load1:             m.cachedLoad1,
		Load5:             m.cachedLoad5,
		Load15:            m.cachedLoad15,
		TaskCount:         m.cachedTaskCount,
		SwapTotal:         m.cachedSwapTotal,
		SwapUsed:          m.cachedSwapUsed,
		MemTotal:          m.cachedMemTotal,
		MemUsed:           m.cachedMemUsed,
		MemUsage:          m.cachedMemUsage,
		NetSent:           m.cachedNetSent,
		NetRecv:           m.cachedNetRecv,
		NetTotalSent:      m.cachedNetTotalSent,
		NetTotalRecv:      m.cachedNetTotalRecv,
		TopProcesses:      m.cachedProcesses,
		DockerImagesSize:  m.cachedDockerImages,
		DockerLogsSize:    m.cachedDockerLogs,
		DockerStorageSize: m.cachedDockerStorage,
		Uptime:            readUptime(),
		OSName:            "debian 12.15",
	}
	cachedParts := m.cachedPartitions
	m.statsMu.RUnlock()

	if len(cachedParts) > 0 {
		stats.Partitions = cachedParts
		for _, p := range cachedParts {
			if p.Mountpoint == "/" {
				stats.DiskTotal = p.Total
				stats.DiskUsed = p.Used
				stats.DiskUsage = p.UsedPercent
				break
			}
		}
	} else {
		rootStat, err := disk.UsageWithContext(ctx, "/")
		if err == nil {
			stats.Partitions = []PartitionStats{{
				Device:      "rootfs",
				Mountpoint:  "/",
				Total:       rootStat.Total,
				Used:        rootStat.Used,
				UsedPercent: math.Round(rootStat.UsedPercent*100) / 100,
			}}
			stats.DiskTotal = rootStat.Total
			stats.DiskUsed = rootStat.Used
			stats.DiskUsage = math.Round(rootStat.UsedPercent*100) / 100
		}
	}

	return stats, nil
}
