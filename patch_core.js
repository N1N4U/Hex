const fs = require('fs');
let c = fs.readFileSync('core/monitor/monitor.go', 'utf8');

c = c.replace(/	stats\.Partitions = make\(\[\]PartitionStats, 0\)[\s\S]*?	swapStat, err := mem\.SwapMemoryWithContext\(ctx\)/,
`	stats.Partitions = make([]PartitionStats, 0)
	
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

	swapStat, err := mem.SwapMemoryWithContext(ctx)`);

fs.writeFileSync('core/monitor/monitor.go', c);
