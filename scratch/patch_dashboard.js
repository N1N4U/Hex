const fs = require('fs');
const path = 'C:/Users/Nandu/Desktop/Dev/Hex/panel/src/app/(dashboard)/DashboardPageClient.tsx';
let content = fs.readFileSync(path, 'utf8');

// 1. RAM Widget: Add Swap and fix base-1024?
// Let's replace the RAM section.
content = content.replace(
  /<CircularGauge[\s\S]*?subText=\{\`\$\{ramUsed < 1 \? Math\.round\(ramUsed \* 1024\) \+ ' MB' : ramUsed\.toFixed\(1\) \+ ' GB'\} \/ \$\{ramTotal\} GB\`\}[\s\S]*?\/>/m,
  `<CircularGauge 
            label="" 
            percentage={ramPercent} 
            subText={\`\${ramUsed < 1 ? Math.round(ramUsed * 1024) + ' MB' : ramUsed.toFixed(2) + ' GB'} / \${ramTotal.toFixed(2)} GB\`} 
          />
          {displayCore?.stats?.swap_total > 0 && (
            <div className="mt-2 flex flex-col gap-1">
              <div className="flex justify-between text-[9px] font-mono text-on-surface-variant/60">
                <span>SWAP</span>
                <span>{formatBytes(displayCore.stats.swap_used)} / {formatBytes(displayCore.stats.swap_total)}</span>
              </div>
              <div className="w-full h-1.5 bg-black/30 rounded-sm overflow-hidden border border-white/5 relative">
                <div className="absolute inset-y-0 left-0 bg-primary/50" style={{width: \`\${(displayCore.stats.swap_used / displayCore.stats.swap_total) * 100}%\`}} />
              </div>
            </div>
          )}`
);

// 2. CPU/RAM Modal: Top section + Table update
const modalTopReplacement = `
            <div className="flex-1 p-4 overflow-y-auto">
              {(showProcessesModal === "cpu" || showProcessesModal === "ram") && displayCore?.stats && (
                <div className="mb-4 grid grid-cols-2 gap-4">
                  <div className="glass-panel p-4 rounded-xl border border-white/5">
                    <h4 className="text-xs font-bold text-on-surface-variant/70 mb-2 uppercase tracking-wider">Per-Core Usage</h4>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-[10px] font-mono text-on-surface-variant/60">
                      {displayCore.stats.cpu_cores_usage?.map((val: number, idx: number) => (
                        <div key={idx} className="flex items-center gap-2">
                          <span className="w-6 text-right">CPU{idx}</span>
                          <div className="flex-1 h-1.5 bg-black/30 rounded-sm overflow-hidden border border-white/5 relative">
                            <div className="absolute inset-y-0 left-0 bg-primary/70" style={{width: \`\${val}%\`}} />
                          </div>
                          <span className="w-8">{Math.round(val)}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="glass-panel p-4 rounded-xl border border-white/5 flex flex-col justify-center gap-4">
                    <div>
                      <h4 className="text-xs font-bold text-on-surface-variant/70 mb-1 uppercase tracking-wider">Load Average</h4>
                      <div className="flex gap-4 font-mono text-lg text-primary">
                        <span>{displayCore.stats.load_1?.toFixed(2)}</span>
                        <span>{displayCore.stats.load_5?.toFixed(2)}</span>
                        <span>{displayCore.stats.load_15?.toFixed(2)}</span>
                      </div>
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-on-surface-variant/70 mb-1 uppercase tracking-wider">Tasks</h4>
                      <div className="font-mono text-lg text-on-surface">
                        {displayCore.stats.task_count} <span className="text-xs text-on-surface-variant/50">total</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
`;

content = content.replace(
  /<div className="flex-1 p-4 overflow-y-auto">/m,
  modalTopReplacement
);

// Update Modal Table Headers (User & TIME+)
const modalHeaderReplacement = `
                  <div className="grid grid-cols-12 gap-4 px-4 py-2 text-xs font-semibold text-on-surface-variant/60 uppercase tracking-wider border-b border-white/5">
                    <div className="col-span-2">PID</div>
                    <div className="col-span-3">Name</div>
                    <div className="col-span-2">User</div>
                    <div className="col-span-2">TIME+</div>
                    {showProcessesModal === "network" ? (
                      <>
                        <div className="col-span-1 text-right">In</div>
                        <div className="col-span-2 text-right">Out</div>
                      </>
                    ) : (
                      <div className="col-span-3 text-right">{showProcessesModal === "cpu" ? "CPU %" : "RAM"}</div>
                    )}
                  </div>
`;

content = content.replace(
  /<div className="grid grid-cols-12 gap-4 px-4 py-2 text-xs font-semibold text-on-surface-variant\/60 uppercase tracking-wider border-b border-white\/5">[\s\S]*?<\/div>\s*<\/div>\s*\)/m,
  modalHeaderReplacement + ")"
);

// Update Modal Table Rows (User & TIME+)
const modalRowReplacement = `
                  <div key={i} className="grid grid-cols-12 gap-4 px-4 py-3 text-sm text-on-surface items-center border-b border-white/5 hover:bg-white/5 transition-colors">
                    <div className="col-span-2 text-on-surface-variant/50">{p.pid}</div>
                    <div className="col-span-3 flex items-center gap-2 truncate">
                      {isDocker ? (
                        <img src="https://lh3.googleusercontent.com/aida-public/AB6AXuDSlP-MXO6DGETS2dCFrduqJ57mhChx29Bo1zTWaxHk_bmuvaQ7-dvFTxoN3zVjGQ_-na_aQ6qi5u6Jwei3J4E1YvxLg4bJIgvmKOk48W4n0C4AQ_gxTbB-qh85HWOOh_hcNelIT-e6XynhC6grb7e8jsxyX4Wtm1BgHDKixENN4Lw59x1MtngwzQ15yafZ-6foP56Gshu-4GFdjbyB3w2jFND5r9REqUPogaY_IxBqlKcupJJKlYxGo5FFHClboqiayurVGKMRHRZt" className="w-4 h-4 object-contain" alt="Docker" />
                      ) : (
                        <span className="material-symbols-outlined text-[16px] text-primary">terminal</span>
                      )}
                      <span className="truncate" title={p.name}>{p.name}</span>
                    </div>
                    <div className="col-span-2 text-on-surface-variant/70 truncate">{p.user || "root"}</div>
                    <div className="col-span-2 text-on-surface-variant/70 font-mono text-xs">{p.time_plus || "0:00.00"}</div>
                    {showProcessesModal === "network" ? (
                      <>
                        <div className="col-span-1 text-right font-mono text-primary text-xs truncate">Total: {formatBytes(displayCore?.netTotalRecv || 0)}</div>
                        <div className="col-span-2 text-right font-mono text-yellow-400 text-xs truncate">Total: {formatBytes(displayCore?.netTotalSent || 0)}</div>
                      </>
                    ) : showProcessesModal === "cpu" ? (
                      <div className="col-span-3 text-right font-mono text-yellow-400">{p.cpu_percent?.toFixed(1)}%</div>
                    ) : (
                      <div className="col-span-3 text-right font-mono text-primary">{formatBytes(p.memory_bytes || 0)}</div>
                    )}
                  </div>
`;

content = content.replace(
  /<div key=\{i\} className="grid grid-cols-12 gap-4 px-4 py-3 text-sm text-on-surface items-center border-b border-white\/5 hover:bg-white\/5 transition-colors">[\s\S]*?<\/div>\s*\)\s*;\s*\}\)\s*:\s*\(/m,
  modalRowReplacement + `
                );
              }) : (`
);

// 3. Storage Widget Sections (Docker, Logs)
const storageWidgetReplacement = `
              {showProcessesModal === "storage" ? (
                <div className="flex flex-col gap-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="glass-panel p-4 rounded-xl border border-white/5 flex flex-col gap-2">
                      <h4 className="text-xs font-bold text-on-surface flex items-center gap-2"><img src="https://lh3.googleusercontent.com/aida-public/AB6AXuDSlP-MXO6DGETS2dCFrduqJ57mhChx29Bo1zTWaxHk_bmuvaQ7-dvFTxoN3zVjGQ_-na_aQ6qi5u6Jwei3J4E1YvxLg4bJIgvmKOk48W4n0C4AQ_gxTbB-qh85HWOOh_hcNelIT-e6XynhC6grb7e8jsxyX4Wtm1BgHDKixENN4Lw59x1MtngwzQ15yafZ-6foP56Gshu-4GFdjbyB3w2jFND5r9REqUPogaY_IxBqlKcupJJKlYxGo5FFHClboqiayurVGKMRHRZt" className="w-4 h-4"/> Docker Storage</h4>
                      <div className="flex justify-between text-xs text-on-surface-variant/60"><span>Containers</span> <span>1.2 GB</span></div>
                      <button className="mt-2 w-full py-1.5 rounded bg-red-500/10 text-red-400 text-[10px] font-bold hover:bg-red-500/20">WIPE</button>
                    </div>
                    <div className="glass-panel p-4 rounded-xl border border-white/5 flex flex-col gap-2">
                      <h4 className="text-xs font-bold text-on-surface flex items-center gap-2"><span className="material-symbols-outlined text-[16px] text-primary">image</span> Docker Images</h4>
                      <div className="flex justify-between text-xs text-on-surface-variant/60"><span>Images</span> <span>4.5 GB</span></div>
                      <button className="mt-2 w-full py-1.5 rounded bg-red-500/10 text-red-400 text-[10px] font-bold hover:bg-red-500/20">WIPE</button>
                    </div>
                    <div className="glass-panel p-4 rounded-xl border border-white/5 flex flex-col gap-2">
                      <h4 className="text-xs font-bold text-on-surface flex items-center gap-2"><span className="material-symbols-outlined text-[16px] text-yellow-400">subject</span> Docker Logs</h4>
                      <div className="flex justify-between text-xs text-on-surface-variant/60"><span>Logs</span> <span>800 MB</span></div>
                      <button className="mt-2 w-full py-1.5 rounded bg-red-500/10 text-red-400 text-[10px] font-bold hover:bg-red-500/20">WIPE</button>
                    </div>
                    <div className="glass-panel p-4 rounded-xl border border-white/5 flex flex-col gap-2">
                      <h4 className="text-xs font-bold text-on-surface flex items-center gap-2"><span className="material-symbols-outlined text-[16px] text-purple-400">dns</span> Hex Core Logs</h4>
                      <div className="flex justify-between text-xs text-on-surface-variant/60"><span>Logs</span> <span>120 MB</span></div>
                      <button className="mt-2 w-full py-1.5 rounded bg-red-500/10 text-red-400 text-[10px] font-bold hover:bg-red-500/20">WIPE</button>
                    </div>
                  </div>
                  <h4 className="text-xs font-bold text-on-surface-variant/70 uppercase tracking-wider mt-4">Partitions</h4>
                  {displayCore?.partitions && displayCore.partitions.length > 0 ? displayCore.partitions.map((p: any, idx: number) => (
`;

content = content.replace(
  /\{showProcessesModal === "storage" \? \(\s*<div className="flex flex-col gap-3">\s*\{displayCore\?\.partitions/m,
  storageWidgetReplacement
);

// Now write it back
fs.writeFileSync(path, content, 'utf8');
