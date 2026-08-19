const fs = require('fs');
let c = fs.readFileSync('core/monitor/monitor.go', 'utf8');

c = c.replace(
  /for _, p := range partitions \{\s*diskStat, err := disk\.UsageWithContext\(ctx, p\.Mountpoint\)/,
  `for _, p := range partitions {
			if p.Fstype == "overlay" || p.Fstype == "squashfs" || p.Fstype == "tmpfs" || strings.Contains(p.Mountpoint, "/docker") {
				continue
			}
			if strings.HasPrefix(p.Device, "/dev/loop") {
				continue
			}
			diskStat, err := disk.UsageWithContext(ctx, p.Mountpoint)`
);

// Add strings import if missing
if (!c.includes('"strings"')) {
    c = c.replace(/"os"/, `"os"\n	"strings"`);
}

fs.writeFileSync('core/monitor/monitor.go', c);
