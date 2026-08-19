const fs = require('fs');
let file = 'panel/src/app/(dashboard)/DashboardPageClient.tsx';
let content = fs.readFileSync(file, 'utf8');

// Fix RAM parsing precision
content = content.replace(
  /ram: Number\(\(\(stats\.mem_used \|\| 0\) \/ \(1024 \* 1024 \* 1024\)\)\.toFixed\(1\)\),/g,
  'ram: Number(((stats.mem_used || 0) / (1024 * 1024 * 1024)).toFixed(3)),'
);
content = content.replace(
  /ramTotal: Number\(\(\(stats\.mem_total \|\| 0\) \/ \(1024 \* 1024 \* 1024\)\)\.toFixed\(0\)\),/g,
  'ramTotal: Number(((stats.mem_total || 0) / (1024 * 1024 * 1024)).toFixed(2)),'
);

// Fix RAM Widget subtext logic
const oldRamSubtext = 'subText={\${ramUsed < 1 ? Math.round(ramUsed * 1024) + \\' MB\\' : ramUsed.toFixed(1) + \\' GB\\'} /  GB\}'
const newRamSubtext = 'subText={\${ramUsed < 1 ? (ramUsed * 1024).toFixed(2) + \\' MB\\' : ramUsed.toFixed(2) + \\' GB\\'} /  GB\}'
content = content.replace(oldRamSubtext, newRamSubtext);

// Fix segmented CPU bar (dashboard widget)
const cpuBarRegex = /<div className="w-full h-2 bg-white\\/5 rounded-full overflow-hidden flex mt-3 gap-\\[1px\\]">[\\s\\S]*?<\\/div>\\s*<\\/div>\\s*\\)\\}/;
const newCpuBar = \<div className="w-full h-2 flex mt-3 gap-[2px]">
              {displayCore.stats.cpu_cores_usage.map((usage: number, idx: number) => (
                <div key={idx} className="flex-1 bg-white/5 rounded-full overflow-hidden">
                  <div className={\\\h-full \\\\\\} style={{ width: \\\\\\%\\\ }} />
                </div>
              ))}
            </div>
          )}\;
content = content.replace(cpuBarRegex, newCpuBar);

fs.writeFileSync(file, content, 'utf8');
