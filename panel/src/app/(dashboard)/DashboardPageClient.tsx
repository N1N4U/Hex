"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import CircularGauge from "../../components/CircularGauge";
import ProgressBar from "../../components/ProgressBar";
import PreferencesModal from "./PreferencesModal";
import AccountModal from "./AccountModal";

/* ── Types ─────────────────────────────────────────── */

type AppId = string;
type CoreStatus = "online" | "busy" | "offline";


interface Core {
  id: string;                                 
  name: string;
  host: string;
  status: CoreStatus;
  cpu: number;
  ram: number;
  ramTotal: number;
  storage: number;
  storageTotal: number;
  uptime: string;
  networkSent?: number;
  networkRecv?: number;
  netTotalSent?: number;
  netTotalRecv?: number;
  osName?: string;
  cpuModel?: string;
  cpuCores?: number;
  partitions?: any[];
  stats?: any;
}

interface DockApp {
  id: AppId;
  label: string;
  icon?: string;
  imgSrc?: string;
  iconColor?: string;
  url?: string;
}

/* ── Mock Cores Removed ────────────────────────────── */

const DEFAULT_DOCK: DockApp[] = [
  { id: "home", label: "Home", icon: "home", iconColor: "text-white" },
  { id: "docker", label: "Docker", imgSrc: "https://lh3.googleusercontent.com/aida-public/AB6AXuDSlP-MXO6DGETS2dCFrduqJ57mhChx29Bo1zTWaxHk_bmuvaQ7-dvFTxoN3zVjGQ_-na_aQ6qi5u6Jwei3J4E1YvxLg4bJIgvmKOk48W4n0C4AQ_gxTbB-qh85HWOOh_hcNelIT-e6XynhC6grb7e8jsxyX4Wtm1BgHDKixENN4Lw59x1MtngwzQ15yafZ-6foP56Gshu-4GFdjbyB3w2jFND5r9REqUPogaY_IxBqlKcupJJKlYxGo5FFHClboqiayurVGKMRHRZt" },
  { id: "files", label: "Files", icon: "folder", iconColor: "text-blue-400" },
  { id: "nginx", label: "Nginx", icon: "public", iconColor: "text-green-500" },
  { id: "firewall", label: "Firewall", icon: "security", iconColor: "text-red-400" },
  { id: "terminal", label: "Terminal", icon: "terminal", iconColor: "text-blue-300" },
  { id: "core", label: "Cores", icon: "dns", iconColor: "text-purple-400" },
  { id: "settings", label: "Settings", icon: "settings", iconColor: "text-on-surface-variant" },
];

/* ── Utils ─────────────────────────────────────────── */
const formatBytes = (bytes: number) => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

/* ── Core Selector Strip ────────────────────────────── */
function CoreSelector({
  cores,
  activeCoreId,
  onSelect,
  showAllCores = true
}: {
  cores: Core[];
  activeCoreId: string | "all";
  onSelect: (id: string | "all") => void;
  showAllCores?: boolean;
}) {
  const statusDot: Record<CoreStatus, string> = {
    online: "bg-primary",
    busy: "bg-yellow-400",
    offline: "bg-red-500",
  };

  return (
    <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar flex-shrink-0">
      {/* All Cores tab */}
      {showAllCores && (
        <>
          <button
            onClick={() => onSelect("all")}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap border ${activeCoreId === "all"
              ? "glass-panel border-white/20 text-on-surface"
              : "border-transparent text-on-surface-variant/60 hover:text-on-surface/80 hover:border-white/10 hover:bg-white/5"
              }`}
          >
            <span className="material-symbols-outlined text-[14px]">dns</span>
            All Cores
            <span className="px-1.5 py-0.5 rounded-full bg-primary/20 text-primary text-[9px] font-bold">
              {cores.filter(c => c.status !== "offline").length}/{cores.length}
            </span>
          </button>
          <div className="w-px h-5 bg-white/10 mx-1 flex-shrink-0" />
        </>
      )}

      {cores.map(core => (
        <button
          key={core.id}
          onClick={() => onSelect(core.id)}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap border ${activeCoreId === core.id
            ? "glass-panel border-white/20 text-on-surface"
            : "border-transparent text-on-surface-variant/60 hover:text-on-surface/80 hover:border-white/10 hover:bg-white/5"
            } ${core.status === "offline" ? "opacity-50" : ""}`}
        >
          <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${statusDot[core.status]}`} />
          {core.name}
        </button>
      ))}

    </div>
  );
}

/* ── Mac Dock ──────────────────────────────────────── */
function MacDock({ apps, activeApp, onSelect }: { apps: DockApp[]; activeApp: AppId; onSelect: (app: DockApp) => void }) {
  const dockRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Array<{ bubble: HTMLDivElement | null; label: HTMLSpanElement | null }>>([]);
  const rafRef = useRef<number | null>(null);

  const updateScales = useCallback((clientX: number | null) => {
    apps.forEach((_, i) => {
      const bubble = itemRefs.current[i]?.bubble;
      if (!bubble) return;
      const BASE = 52, MAX = 80, RANGE = 140;
      let size = BASE, lift = 0;
      if (clientX !== null) {
        const rect = bubble.getBoundingClientRect();
        const center = rect.left + rect.width / 2;
        const dist = Math.abs(clientX - center);
        if (dist < RANGE) {
          const t = 1 - dist / RANGE;
          size = BASE + (MAX - BASE) * t * t;
          lift = (size - BASE) * 0.6;
        }
      }
      bubble.style.width = `${size}px`;
      bubble.style.height = `${size}px`;
      bubble.style.transform = `translateY(-${lift}px)`;
    });
  }, [apps]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const x = e.clientX;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => updateScales(x));
  }, [updateScales]);

  const handleMouseLeave = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => updateScales(null));
  }, [updateScales]);

  return (
    <div className="fixed bottom-6 left-0 right-0 flex justify-center z-50 pointer-events-none">
      <div
        ref={dockRef}
        className="flex items-center gap-2 px-4 rounded-[28px] border border-white/10 shadow-[0_8px_40px_rgba(0,0,0,0.6)] pointer-events-auto"
        style={{ background: "rgba(0,0,0,0.35)", backdropFilter: "blur(32px)", WebkitBackdropFilter: "blur(32px)", height: "76px", overflow: "visible" }}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        {apps.map((app, i) => {
          const showSep = app.id === "add";
          const isActive = activeApp === app.id;
          if (!itemRefs.current[i]) itemRefs.current[i] = { bubble: null, label: null };
          
          return (
            <div key={app.id} className="flex items-end gap-2">
              {showSep && <div className="w-px h-8 bg-white/15 mx-1 self-center" />}
              <div
                className="relative flex flex-col items-center cursor-pointer select-none"
                onMouseEnter={() => {
                  const l = itemRefs.current[i]?.label;
                  if (l) { l.style.opacity = "1"; l.style.transform = "translateY(-4px)"; }
                }}
                onMouseLeave={() => {
                  const l = itemRefs.current[i]?.label;
                  if (l) { l.style.opacity = "0"; l.style.transform = "translateY(0px)"; }
                }}
                onClick={() => onSelect(app)}
              >
                <span
                  ref={(el) => { itemRefs.current[i].label = el; }}
                  className="absolute -top-8 bg-black/70 backdrop-blur-md text-white text-[11px] font-semibold px-2 py-0.5 rounded-md whitespace-nowrap pointer-events-none"
                  style={{ opacity: 0, transform: "translateY(0px)", transition: "opacity 0.12s ease, transform 0.12s ease" }}
                >
                  {app.label}
                </span>
                <div
                  ref={(el) => { itemRefs.current[i].bubble = el; }}
                  className={`flex items-center justify-center rounded-[30px] glass-panel border ${isActive ? "border-white/25 bg-white/5" : "border-transparent"}`}
                  style={{ width: 52, height: 52, transition: "width 0.15s cubic-bezier(0.34,1.56,0.64,1), height 0.15s cubic-bezier(0.34,1.56,0.64,1), transform 0.15s cubic-bezier(0.34,1.56,0.64,1)" }}
                >
                  {app.imgSrc
                    ? <img src={app.imgSrc} alt={app.label} className="w-8 h-8 object-contain" />
                    : <span className={`material-symbols-outlined text-[26px] ${app.iconColor ?? "text-white"}`} style={{ fontVariationSettings: "'FILL' 1" }}>{app.icon}</span>
                  }
                </div>
                <div className={`w-1 h-1 rounded-full mt-1.5 ${isActive ? "bg-white/70" : "bg-transparent"}`} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── Home View ──────────────────────────────────────── */
function HomeView({ panelName, cores, activeCoreId, wsPing, apiPing }: { panelName: string; cores: Core[]; activeCoreId: string | "all"; wsPing: number | null; apiPing: number | null }) {
  const [time, setTime] = useState<Date | null>(null);
  const [locationCache, setLocationCache] = useState<Record<string, string>>({});

  // Modals state
  const [confirmAction, setConfirmAction] = useState<"reboot" | "update" | "shutdown" | null>(null);
  const [isExecutingAction, setIsExecutingAction] = useState(false);
  const [isLogsModalOpen, setIsLogsModalOpen] = useState(false);
  const [activeLogTab, setActiveLogTab] = useState<"Docker" | "Nginx" | "Firewall" | "Core" | "Panel">("Core");
  const [showHostIP, setShowHostIP] = useState(false);
  const [showCoreLogs, setShowCoreLogs] = useState(false);
  const [showCpuModal, setShowCpuModal] = useState(false);
  const [networkHistory, setNetworkHistory] = useState<{up: number, down: number, max: number}[]>(Array(20).fill({up:0, down:0, max:1}));
  const [showProcessesModal, setShowProcessesModal] = useState<"cpu" | "ram" | "storage" | "network" | null>(null);

  useEffect(() => {
    setTime(new Date());
    const t = setInterval(() => {
      setTime(new Date());
    }, 10000);
    return () => clearInterval(t);
  }, []);

  const displayCore = activeCoreId === "all" ? null : cores.find(c => c.id === activeCoreId) ?? null;
  const onlineCores = cores.filter(c => c.status !== "offline");

  useEffect(() => {
    if (displayCore && displayCore.host) {
      const ip = displayCore.host.split(":")[0];
      if (ip && !locationCache[ip] && locationCache[ip] !== "Fetching..." && locationCache[ip] !== "Error") {
        // Mark as fetching to avoid rapid duplicates
        setLocationCache(prev => ({ ...prev, [ip]: "Fetching..." }));
        
        fetch(`http://ip-api.com/json/${ip}`)
          .then(res => res.json())
          .then(data => {
            if (data && data.city && data.country) {
              setLocationCache(prev => ({ ...prev, [ip]: `${data.city}, ${data.country}` }));
            } else {
              setLocationCache(prev => ({ ...prev, [ip]: "Local Network" }));
            }
          })
          .catch(() => {
            // Silently fail if blocked by adblocker or no internet
            setLocationCache(prev => ({ ...prev, [ip]: "Error" }));
          });
      }
    }
  }, [displayCore?.host, locationCache]);

  const formattedTime = time ? time.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "00:00";
  const formattedDate = time ? time.toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" }) : "";

  // Aggregate stats
  const totalCPU = Math.round(onlineCores.reduce((s, c) => s + c.cpu, 0) / (onlineCores.length || 1));
  const totalRAM = onlineCores.reduce((s, c) => s + c.ram, 0);
  const totalRAMMax = onlineCores.reduce((s, c) => s + c.ramTotal, 0);
  const ramPct = Math.round((totalRAM / (totalRAMMax || 1)) * 100);

  // Per-core or aggregate values
  const cpuPct = displayCore ? displayCore.cpu : totalCPU;
  const ramUsed = displayCore ? displayCore.ram : totalRAM;
  const ramTotal = displayCore ? displayCore.ramTotal : totalRAMMax;
  const ramPercent = displayCore ? (displayCore.ramTotal ? Math.round((displayCore.ram / displayCore.ramTotal) * 100) : 0) : ramPct;
  const storagePct = displayCore ? (displayCore.storageTotal ? Math.round((displayCore.storage / displayCore.storageTotal) * 100) : 0) : 28;
  const storageLabel = displayCore ? `${displayCore.storage} / ${displayCore.storageTotal} GB` : "Multi-disk";

  const networkSent = displayCore ? (displayCore.networkSent || 0) : onlineCores.reduce((s, c) => s + (c.networkSent || 0), 0);
  const networkRecv = displayCore ? (displayCore.networkRecv || 0) : onlineCores.reduce((s, c) => s + (c.networkRecv || 0), 0);

  // Update Network History
  useEffect(() => {
    setNetworkHistory(prev => {
      const maxVal = Math.max(...prev.map(p => p.up + p.down), networkSent + networkRecv, 1024); // at least 1KB max for scale
      const newEntry = { up: networkSent, down: networkRecv, max: maxVal };
      return [...prev.slice(1), newEntry];
    });
  }, [networkSent, networkRecv]);



  const handleExecuteAction = async () => {
    if (!displayCore || !confirmAction) return;
    setIsExecutingAction(true);
    try {
      const res = await fetch(`/api/nodes/${displayCore.id}/${confirmAction}`, { method: 'POST' });
      if (!res.ok) throw new Error("Action failed");
      // Could show a success toast here
    } catch (e) {
      console.error(e);
      alert("Failed to execute action.");
    } finally {
      setIsExecutingAction(false);
      setConfirmAction(null);
    }
  };

  return (
    <div className="w-full h-full p-2 relative">
      {/*
        Layout:
        [  CPU   ] [ Time / Uptime / Hostname / Specs ] [  RAM    ]
        [Storage ] [        Quick Actions              ] [ Network ]
                   [  btn  ] [         ]  [ btn  ]
      */}
      <div className="grid gap-3" style={{ gridTemplateColumns: "1fr 1fr 1fr", gridTemplateRows: "1fr 1fr auto" }}>

        {/* CPU — top left */}
        <div className="glass-panel rounded-2xl p-5 flex flex-col gap-3 relative group cursor-pointer hover:bg-white/[0.02] transition-colors" onClick={() => setShowProcessesModal("cpu")}>
          <div className="flex justify-between items-center">
            <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/50">CPU</p>
            <span className="material-symbols-outlined text-on-surface-variant/30 group-hover:text-on-surface-variant/70 text-[18px] transition-colors">chevron_right</span>
          </div>
          <CircularGauge label="" percentage={cpuPct} subText={displayCore ? `${displayCore.cpuCores || '?'} Cores` : `Avg · ${onlineCores.length} cores`} />
        </div>

        {/* CENTER — tall info card spanning 2 rows */}
        <div className="glass-panel rounded-2xl p-5 flex flex-col gap-3 row-span-2">
          {/* Time */}
          <div className="flex flex-col items-center pt-2">
            <p className="text-[44px] font-bold text-on-surface leading-none tracking-tight">{formattedTime}</p>
            <p className="text-[11px] text-on-surface-variant/60 mt-1">{formattedDate}</p>
          </div>

          <div className="border-t border-white/5 my-1" />

          {/* Uptime */}
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-primary animate-pulse flex-shrink-0" />
            <span className="text-xs text-on-surface-variant/60">Uptime</span>
            <span className="text-xs text-on-surface font-semibold ml-auto">
              {displayCore ? displayCore.uptime : `${onlineCores.length} cores up`}
            </span>
          </div>

          {/* Host IP */}
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-on-surface-variant/40 text-[16px]">computer</span>
            <span className="text-xs text-on-surface-variant/60">Host IP</span>
            <div className="ml-auto flex items-center gap-2">
              <span className={`text-xs font-semibold truncate max-w-[120px] transition-all duration-300 ${showHostIP ? 'text-on-surface' : 'text-transparent bg-on-surface-variant/30 select-none rounded blur-sm'}`}>
                {displayCore ? (displayCore.stats?.host_ip || displayCore.host.split(":")[0]) : panelName}
              </span>
              <button 
                onClick={() => setShowHostIP(!showHostIP)}
                className="text-on-surface-variant/50 hover:text-on-surface transition-colors flex items-center justify-center p-1 rounded-md hover:bg-white/5"
                title={showHostIP ? "Hide IP" : "Show IP"}
              >
                <span className="material-symbols-outlined text-[14px]">
                  {showHostIP ? 'visibility_off' : 'visibility'}
                </span>
              </button>
            </div>
          </div>

          {/* CPU type spec */}
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-on-surface-variant/40 text-[16px]">memory</span>
            <span className="text-xs text-on-surface-variant/60">CPU</span>
            <span 
              className="text-xs text-on-surface font-semibold ml-auto truncate max-w-[120px] cursor-pointer hover:text-primary transition-colors" 
              title={displayCore?.cpuModel || "Mixed CPUs"}
              onClick={() => setShowCpuModal(true)}
            >
              {displayCore ? displayCore.cpuModel || "Unknown CPU" : "Mixed CPUs"}
            </span>
          </div>

          {/* Location spec */}
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-on-surface-variant/40 text-[16px]">location_on</span>
            <span className="text-xs text-on-surface-variant/60">Location</span>
            <span className="text-xs text-on-surface font-semibold ml-auto truncate max-w-[120px]">
              {displayCore ? (locationCache[displayCore.host.split(":")[0]] === "Error" ? "Unknown" : (locationCache[displayCore.host.split(":")[0]] || "Fetching...")) : "Multiple Locations"}
            </span>
          </div>

          {/* OS */}
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-on-surface-variant/40 text-[16px]">terminal</span>
            <span className="text-xs text-on-surface-variant/60">OS</span>
            <span className="text-xs text-on-surface font-semibold ml-auto truncate max-w-[120px]" title={displayCore?.osName || "Mixed OS"}>
              {displayCore ? displayCore.osName || "Unknown OS" : "Mixed OS"}
            </span>
          </div>

          <div className="border-t border-white/5 my-1" />

          {/* Quick Actions label + buttons */}
          <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/50">Quick Actions</p>
          <div className="grid grid-cols-2 gap-2">
            {[
              { icon: "refresh",            label: "Reboot",   action: "reboot" },
              { icon: "download",           label: "Update",   action: "update" },
              { icon: "monitoring",         label: "Logs",     action: "logs" },
              { icon: "power_settings_new", label: "Shut Down",action: "shutdown" },
            ].map(a => (
              <button 
                key={a.icon} 
                onClick={() => {
                  if (activeCoreId === "all") {
                    alert("Please select a specific Core first.");
                    return;
                  }
                  if (a.action === "logs") setIsLogsModalOpen(true);
                  else setConfirmAction(a.action as any);
                }}
                className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-white/5 border border-white/5 transition-colors"
              >
                <span className="material-symbols-outlined text-on-surface-variant text-[16px]">{a.icon}</span>
                <span className="text-[11px] text-on-surface-variant/70">{a.label}</span>
              </button>
            ))}
          </div>
          
          <div className="flex justify-between items-center mt-2 px-1 text-[10px] text-on-surface-variant/50 font-medium">
            <span className="flex items-center gap-1"><span className={`w-1.5 h-1.5 rounded-full ${wsPing !== null ? 'bg-green-400' : 'bg-red-500'}`}></span> WS: {wsPing !== null ? `${wsPing}ms` : '---'}</span>
            <span className="flex items-center gap-1"><span className={`w-1.5 h-1.5 rounded-full ${apiPing !== null ? 'bg-green-400' : 'bg-red-500'}`}></span> API: {apiPing !== null ? `${apiPing}ms` : '---'}</span>
          </div>
        </div>

        {/* RAM — top right */}
        <div className="glass-panel rounded-2xl p-5 flex flex-col gap-3 relative group cursor-pointer hover:bg-white/[0.02] transition-colors" onClick={() => setShowProcessesModal("ram")}>
          <div className="flex justify-between items-center">
            <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/50">RAM</p>
            <span className="material-symbols-outlined text-on-surface-variant/30 group-hover:text-on-surface-variant/70 text-[18px] transition-colors">chevron_right</span>
          </div>
          <CircularGauge 
            label="" 
            percentage={ramPercent} 
            subText={`${ramUsed < 1 ? Math.round(ramUsed * 1024) + ' MB' : ramUsed.toFixed(1) + ' GB'} / ${ramTotal} GB`} 
          />
        </div>

        {/* Storage — bottom left */}
        <div className="glass-panel rounded-2xl p-5 flex flex-col gap-3 relative group cursor-pointer hover:bg-white/[0.02] transition-colors" onClick={() => setShowProcessesModal("storage")}>
          <div className="flex justify-between items-center">
            <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/50">Storage</p>
            <span className="material-symbols-outlined text-on-surface-variant/30 group-hover:text-on-surface-variant/70 text-[18px] transition-colors">chevron_right</span>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <span className="material-symbols-outlined text-primary text-[18px]">hard_drive</span>
            <span className="text-sm text-on-surface font-medium">
              {displayCore ? `${(displayCore.storageTotal - displayCore.storage).toFixed(1)} GB Free` : "Multi-disk"}
            </span>
            <span className="ml-auto text-[10px] text-on-surface-variant/50">{storagePct}%</span>
          </div>
          <ProgressBar percentage={storagePct} />
          <div className="flex justify-between text-[10px] text-on-surface-variant/40 mt-1">
            <span>{displayCore ? `${displayCore.storage.toFixed(1)} GB` : "Used"}</span>
            <span>{displayCore ? `${displayCore.storageTotal} GB` : "Total"}</span>
          </div>

          {displayCore?.partitions && Array.isArray(displayCore.partitions) && displayCore.partitions.length > 0 && (
            <div className="mt-2 flex flex-col gap-2 max-h-24 overflow-y-auto pr-1 no-scrollbar border-t border-white/5 pt-2">
              {displayCore.partitions.map((p: any, idx: number) => (
                <div key={idx} className="flex flex-col gap-1">
                  <div className="flex justify-between text-[9px] text-on-surface-variant/60">
                    <span className="truncate max-w-[80px]" title={p.mountpoint}>{p.mountpoint}</span>
                    <span>{formatBytes(p.used)} / {formatBytes(p.total)}</span>
                  </div>
                  <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full bg-primary/70" style={{ width: `${p.used_percent}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Network — bottom right */}
        <div className="glass-panel rounded-2xl p-5 flex flex-col gap-3 relative group cursor-pointer hover:bg-white/[0.02] transition-colors" onClick={() => setShowProcessesModal("network")}>
          <div className="flex justify-between items-center">
            <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/50">Network</p>
            <span className="material-symbols-outlined text-on-surface-variant/30 group-hover:text-on-surface-variant/70 text-[18px] transition-colors">chevron_right</span>
          </div>
          <svg className="w-full h-14 overflow-visible mt-2" viewBox="0 0 100 30" preserveAspectRatio="none">
            {/* Smooth Curve Function generator via SVG commands */}
            {(() => {
              const generateSmoothPath = (points: {x:number, y:number}[]) => {
                if (points.length === 0) return "";
                let path = `M ${points[0].x},${points[0].y} `;
                for (let i = 0; i < points.length - 1; i++) {
                  const p0 = i > 0 ? points[i - 1] : points[i];
                  const p1 = points[i];
                  const p2 = points[i + 1];
                  const p3 = i !== points.length - 2 ? points[i + 2] : p2;
                  
                  const cp1x = p1.x + (p2.x - p0.x) / 6;
                  const cp1y = p1.y + (p2.y - p0.y) / 6;
                  
                  const cp2x = p2.x - (p3.x - p1.x) / 6;
                  const cp2y = p2.y - (p3.y - p1.y) / 6;
                  
                  path += `C ${cp1x},${cp1y} ${cp2x},${cp2y} ${p2.x},${p2.y} `;
                }
                return path;
              };

              const downPoints = networkHistory.map((h, i) => ({ x: (i / 19) * 100, y: 30 - (h.down / h.max) * 25 }));
              const upPoints = networkHistory.map((h, i) => ({ x: (i / 19) * 100, y: 30 - (h.up / h.max) * 25 }));
              
              const downLine = generateSmoothPath(downPoints);
              const upLine = generateSmoothPath(upPoints);

              return (
                <>
                  {/* Download Area fill & Line */}
                  <path d={`${downLine} L100,30 L0,30 Z`} fill="currentColor" className="text-primary opacity-10" />
                  <path d={downLine} fill="transparent" stroke="currentColor" strokeWidth="2" className="text-primary opacity-80" />
                  
                  {/* Upload Area fill & Line */}
                  <path d={`${upLine} L100,30 L0,30 Z`} fill="currentColor" className="text-yellow-400 opacity-10" />
                  <path d={upLine} fill="transparent" stroke="currentColor" strokeWidth="1.5" className="text-yellow-400 opacity-80" />
                </>
              );
            })()}
          </svg>
          
          {/* Dual Progress Bar */}
          <div className="w-full h-1.5 bg-white/5 rounded-full relative overflow-hidden flex">
            {/* Download side (Left to Middle) max width 50% */}
            <div className="h-full bg-primary transition-all duration-300" style={{ width: `${Math.min(50, (networkRecv / (networkHistory[networkHistory.length - 1].max || 1)) * 50)}%` }} />
            <div className="h-full bg-transparent flex-1" />
            {/* Upload side (Right to Middle) max width 50% */}
            <div className="h-full bg-yellow-400 transition-all duration-300" style={{ width: `${Math.min(50, (networkSent / (networkHistory[networkHistory.length - 1].max || 1)) * 50)}%` }} />
          </div>

          <div className="flex justify-between text-[10px] text-on-surface-variant/50 mt-1">
            <span className="text-primary">↓ {formatBytes(networkRecv)}/s</span>
            <span>Total: {formatBytes(networkRecv + networkSent)}/s</span>
            <span className="text-yellow-400">↑ {formatBytes(networkSent)}/s</span>
          </div>

          <div className="mt-2 border-t border-white/5 pt-3 grid grid-cols-3 gap-2">
            <div className="flex flex-col items-center p-1.5 rounded-lg bg-black/20">
              <span className="text-[9px] uppercase tracking-wider text-on-surface-variant/50 font-bold mb-1">Upload</span>
              <span className="text-[11px] font-semibold text-yellow-400/90 truncate w-full text-center" title={formatBytes(displayCore?.netTotalSent || 0)}>
                {formatBytes(displayCore?.netTotalSent || 0)}
              </span>
            </div>
            <div className="flex flex-col items-center p-1.5 rounded-lg bg-black/20">
              <span className="text-[9px] uppercase tracking-wider text-on-surface-variant/50 font-bold mb-1">Download</span>
              <span className="text-[11px] font-semibold text-primary/90 truncate w-full text-center" title={formatBytes(displayCore?.netTotalRecv || 0)}>
                {formatBytes(displayCore?.netTotalRecv || 0)}
              </span>
            </div>
            <div className="flex flex-col items-center p-1.5 rounded-lg bg-black/20 border border-white/5 shadow-inner">
              <span className="text-[9px] uppercase tracking-wider text-on-surface-variant/50 font-bold mb-1">Total</span>
              <span className="text-[11px] font-semibold text-on-surface/90 truncate w-full text-center" title={formatBytes((displayCore?.netTotalSent || 0) + (displayCore?.netTotalRecv || 0))}>
                {formatBytes((displayCore?.netTotalSent || 0) + (displayCore?.netTotalRecv || 0))}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Action Confirmation Modal */}
      {confirmAction && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm rounded-3xl">
          <div className="glass-panel w-96 rounded-2xl p-6 shadow-2xl border border-white/10">
            <h3 className="text-xl font-bold text-on-surface mb-2 capitalize">{confirmAction} Core</h3>
            <p className="text-sm text-on-surface-variant/70 mb-6">
              Are you sure you want to {confirmAction} <strong>{displayCore?.name}</strong>? This action will impact running services.
            </p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setConfirmAction(null)} className="px-4 py-2 rounded-lg text-sm font-semibold text-on-surface-variant hover:bg-white/10 transition-colors">
                Cancel
              </button>
              <button 
                onClick={handleExecuteAction}
                disabled={isExecutingAction}
                className="px-4 py-2 rounded-lg text-sm font-semibold bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors flex items-center gap-2"
              >
                {isExecutingAction ? "Executing..." : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Top Processes Modal */}
      {showProcessesModal && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm rounded-3xl p-6" onClick={() => setShowProcessesModal(null)}>
          <div className="glass-panel w-full max-w-2xl rounded-2xl flex flex-col shadow-2xl border border-white/10 overflow-hidden max-h-full" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center px-6 py-4 border-b border-white/5">
              <h3 className="text-lg font-bold text-on-surface flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">
                  {showProcessesModal === "storage" ? "hard_drive" : showProcessesModal === "network" ? "language" : "memory"}
                </span>
                {showProcessesModal === "storage" ? "Storage Details" : showProcessesModal === "network" ? "Network Details" : `Top Processes by ${showProcessesModal.toUpperCase()} Usage`} - {displayCore?.name || "All Cores"}
              </h3>
              <button onClick={() => setShowProcessesModal(null)} className="text-on-surface-variant/50 hover:text-on-surface transition-colors">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            
            <div className="flex-1 p-4 overflow-y-auto">
              {showProcessesModal === "storage" ? (
                <div className="flex flex-col gap-3">
                  {displayCore?.partitions && displayCore.partitions.length > 0 ? displayCore.partitions.map((p: any, idx: number) => (
                    <div key={idx} className="flex flex-col gap-2 p-4 bg-black/20 rounded-xl border border-white/5">
                      <div className="flex justify-between items-center text-sm">
                        <span className="font-bold text-on-surface flex items-center gap-2"><span className="material-symbols-outlined text-[16px] text-primary">hard_drive</span> {p.mountpoint}</span>
                        <span className="font-mono text-on-surface-variant">{formatBytes(p.used)} / {formatBytes(p.total)}</span>
                      </div>
                      <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden mt-1">
                        <div className={`h-full ${p.used_percent > 85 ? 'bg-red-500' : 'bg-primary'}`} style={{ width: `${p.used_percent}%` }} />
                      </div>
                      <div className="flex justify-between text-xs text-on-surface-variant/50">
                        <span>Device: {p.device}</span>
                        <span>{p.used_percent.toFixed(1)}% Used</span>
                      </div>
                    </div>
                  )) : (
                    <div className="text-center p-8 text-on-surface-variant/50">No partition data available</div>
                  )}
                </div>
              ) : showProcessesModal === "network" ? (
                <div className="flex flex-col items-center justify-center h-64 opacity-90">
                  <span className="material-symbols-outlined text-5xl mb-3 text-primary">lan</span>
                  <p className="font-semibold text-on-surface text-lg">Network Activity</p>
                  <div className="flex gap-6 mt-6 w-full max-w-sm">
                    <div className="flex-1 glass-panel rounded-xl p-4 text-center border border-white/5 bg-black/20">
                      <p className="text-[10px] uppercase font-bold text-on-surface-variant/50 mb-1">Total Sent</p>
                      <p className="text-lg font-mono text-yellow-400">{formatBytes(displayCore?.netTotalSent || 0)}</p>
                    </div>
                    <div className="flex-1 glass-panel rounded-xl p-4 text-center border border-white/5 bg-black/20">
                      <p className="text-[10px] uppercase font-bold text-on-surface-variant/50 mb-1">Total Received</p>
                      <p className="text-lg font-mono text-primary">{formatBytes(displayCore?.netTotalRecv || 0)}</p>
                    </div>
                  </div>
                  <p className="text-xs text-on-surface-variant/40 mt-8 max-w-sm text-center">Linux kernel does not track bandwidth per-process natively. Use a tool like <span className="font-mono text-white/60">nethogs</span> for advanced process network tracing.</p>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-12 gap-4 px-4 py-2 text-xs font-semibold text-on-surface-variant/60 uppercase tracking-wider border-b border-white/5">
                    <div className="col-span-2">PID</div>
                    <div className="col-span-7">Name</div>
                    <div className="col-span-3 text-right">{showProcessesModal === "cpu" ? "CPU" : "RAM"}</div>
                  </div>
              {displayCore?.stats?.top_processes ? [...displayCore.stats.top_processes].sort((a: any, b: any) => {
                if (showProcessesModal === "ram") return b.memory_bytes - a.memory_bytes;
                return b.cpu_percent - a.cpu_percent;
              }).map((p: any, i: number) => {
                const isDocker = p.name.includes('docker') || p.name.includes('containerd');
                return (
                  <div key={i} className="grid grid-cols-12 gap-4 px-4 py-3 text-sm text-on-surface items-center border-b border-white/5 hover:bg-white/5 transition-colors">
                    <div className="col-span-2 text-on-surface-variant/50">{p.pid}</div>
                    <div className="col-span-7 flex items-center gap-2 truncate">
                      {isDocker ? (
                        <img src="https://lh3.googleusercontent.com/aida-public/AB6AXuDSlP-MXO6DGETS2dCFrduqJ57mhChx29Bo1zTWaxHk_bmuvaQ7-dvFTxoN3zVjGQ_-na_aQ6qi5u6Jwei3J4E1YvxLg4bJIgvmKOk48W4n0C4AQ_gxTbB-qh85HWOOh_hcNelIT-e6XynhC6grb7e8jsxyX4Wtm1BgHDKixENN4Lw59x1MtngwzQ15yafZ-6foP56Gshu-4GFdjbyB3w2jFND5r9REqUPogaY_IxBqlKcupJJKlYxGo5FFHClboqiayurVGKMRHRZt" className="w-4 h-4 object-contain" alt="Docker" />
                      ) : (
                        <span className="material-symbols-outlined text-[16px] text-primary">terminal</span>
                      )}
                      <span className="truncate" title={p.name}>{p.name}</span>
                    </div>
                    {showProcessesModal === "cpu" ? (
                      <div className="col-span-3 text-right font-mono text-yellow-400">{p.cpu_percent}%</div>
                    ) : (
                      <div className="col-span-3 text-right font-mono text-primary">{formatBytes(p.memory_bytes)}</div>
                    )}
                  </div>
                );
              }) : (
                <div className="p-8 text-center text-on-surface-variant/50 text-sm">No process data available for this core. Make sure your Hex Core is updated.</div>
              )}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* CPU Name Modal */}
      {showCpuModal && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm rounded-3xl p-6" onClick={() => setShowCpuModal(false)}>
          <div className="glass-panel max-w-md w-full rounded-2xl p-6 shadow-2xl border border-white/10 text-center flex flex-col gap-4 items-center" onClick={e => e.stopPropagation()}>
            <span className="material-symbols-outlined text-[48px] text-primary">memory</span>
            <h3 className="text-xl font-bold text-on-surface">Processor Information</h3>
            <p className="text-sm font-mono bg-black/30 p-3 rounded-xl border border-white/5 text-primary break-words w-full select-all">
              {displayCore?.cpuModel || "Unknown"}
            </p>
            <button onClick={() => setShowCpuModal(false)} className="mt-2 px-6 py-2 bg-white/10 hover:bg-white/20 text-on-surface rounded-xl text-sm font-semibold transition-colors">
              Close
            </button>
          </div>
        </div>
      )}

      {/* Logs Modal */}
      {isLogsModalOpen && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm rounded-3xl p-6">
          <div className="glass-panel w-full h-full max-w-4xl rounded-2xl flex flex-col shadow-2xl border border-white/10 overflow-hidden">
            <div className="flex justify-between items-center px-6 py-4 border-b border-white/5">
              <h3 className="text-lg font-bold text-on-surface flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">monitoring</span>
                System Logs - {displayCore?.name}
              </h3>
              <button onClick={() => setIsLogsModalOpen(false)} className="text-on-surface-variant/50 hover:text-on-surface transition-colors">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            
            <div className="flex px-6 py-2 gap-4 border-b border-white/5 overflow-x-auto no-scrollbar">
              {["Docker", "Nginx", "Firewall", "Core", "Panel"].map(tab => (
                <button 
                  key={tab} 
                  onClick={() => setActiveLogTab(tab as any)}
                  className={`text-sm font-medium pb-2 border-b-2 transition-colors ${activeLogTab === tab ? "border-primary text-primary" : "border-transparent text-on-surface-variant/60 hover:text-on-surface"}`}
                >
                  {tab}
                </button>
              ))}
            </div>

            <div className="flex-1 p-4 bg-black/40 font-mono text-xs text-on-surface-variant/80 overflow-y-auto">
              {activeLogTab === 'Panel' ? (
                <>
                  <p className="text-on-surface-variant/60">[BFF] Starting Hex Panel Background Services...</p>
                  <p className="text-on-surface-variant/60">[BFF] Loaded 1 active core configurations.</p>
                  <p className="text-on-surface-variant/60">[BFF] Next.js Router initialized on port 3000.</p>
                  <p className="text-green-400">[BFF] Successfully connected to Core "Test".</p>
                  <p className="text-on-surface-variant/60">[WS] Client connected from 192.168.1.5</p>
                </>
              ) : activeLogTab === 'Core' ? (
                <>
                  <p className="text-on-surface-variant/60">[HexCore] Initializing Daemon...</p>
                  <p className="text-on-surface-variant/60">[HexCore] Loading plugins: Docker, Network, SysStats</p>
                  <p className="text-on-surface-variant/60">[HexCore] Starting WebSocket server on 0.0.0.0:8080</p>
                  <p className="text-green-400">[HexCore] Daemon is ready and accepting connections.</p>
                </>
              ) : (
                <p className="opacity-50 italic">Waiting for {activeLogTab} log stream from {displayCore?.name || "the selected Core"}...</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Docker View ─────────────────────────────────────── */
function DockerView({ cores, activeCoreId }: { cores: Core[]; activeCoreId: string | "all" }) {
  const allContainers: any[] = [];
  const filtered = activeCoreId === "all" ? allContainers : allContainers.filter(c => c.coreId === activeCoreId);
  const coreName = (id: string) => cores.find(c => c.id === id)?.name ?? id;

  return (
    <div className="w-full flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img src="https://lh3.googleusercontent.com/aida-public/AB6AXuDSlP-MXO6DGETS2dCFrduqJ57mhChx29Bo1zTWaxHk_bmuvaQ7-dvFTxoN3zVjGQ_-na_aQ6qi5u6Jwei3J4E1YvxLg4bJIgvmKOk48W4n0C4AQ_gxTbB-qh85HWOOh_hcNelIT-e6XynhC6grb7e8jsxyX4Wtm1BgHDKixENN4Lw59x1MtngwzQ15yafZ-6foP56Gshu-4GFdjbyB3w2jFND5r9REqUPogaY_IxBqlKcupJJKlYxGo5FFHClboqiayurVGKMRHRZt" alt="Docker" className="w-7 h-7" />
          <h2 className="text-2xl font-bold text-on-surface">Docker</h2>
          <span className="px-2 py-0.5 rounded-full bg-primary/20 text-primary text-[10px] font-bold uppercase tracking-wider">
            {filtered.filter(c => c.status === "Running").length} Running
          </span>
          {activeCoreId === "all" && (
            <span className="text-xs text-on-surface-variant/50">· All Cores</span>
          )}
        </div>
        <button className="glass-panel px-3 py-1.5 rounded-lg text-xs text-on-surface flex items-center gap-1 hover:bg-white/10 transition-colors">
          <span className="material-symbols-outlined text-[14px]">add</span> New Container
        </button>
      </div>
      <div className="grid grid-cols-3 gap-3">
        {filtered.map((c) => (
          <div key={`${c.coreId}-${c.name}`} className="glass-panel p-4 rounded-xl border border-white/5 flex flex-col gap-3 hover:border-white/15 transition-colors cursor-pointer">
            <div className="flex justify-between items-start gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <span className="material-symbols-outlined text-primary text-[18px] flex-shrink-0">deployed_code</span>
                <span className="font-semibold text-on-surface text-sm truncate">{c.name}</span>
              </div>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider flex-shrink-0 ${c.status === "Running" ? "bg-primary/20 text-primary" : "bg-red-500/20 text-red-400"}`}>
                {c.status}
              </span>
            </div>
            {activeCoreId === "all" && (
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-primary/60" />
                <span className="text-[10px] text-on-surface-variant/50">{coreName(c.coreId)}</span>
              </div>
            )}
            <div className="flex justify-between text-xs text-on-surface-variant/60">
              <span>CPU: {c.cpu}</span>
              <span>RAM: {c.ram}</span>
              <span>Up: {c.uptime}</span>
            </div>
            <div className="flex gap-2 pt-1 border-t border-white/5">
              <button className="text-[10px] text-on-surface-variant/50 hover:text-on-surface transition-colors flex items-center gap-1">
                <span className="material-symbols-outlined text-[12px]">terminal</span> Shell
              </button>
              <button className="text-[10px] text-on-surface-variant/50 hover:text-on-surface transition-colors flex items-center gap-1 ml-auto">
                <span className="material-symbols-outlined text-[12px]">more_horiz</span>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Files View ──────────────────────────────────────── */
function FilesView({ cores, activeCoreId }: { cores: Core[]; activeCoreId: string | "all" }) {
  const [currentPath, setCurrentPath] = useState("/");
  const [items, setItems] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (activeCoreId === "all") return;
    
    async function loadFiles() {
      setIsLoading(true);
      try {
        const res = await fetch(`/api/nodes/${activeCoreId}/files?path=${encodeURIComponent(currentPath)}`);
        if (res.ok) {
          const data = await res.json();
          setItems(data || []);
        } else {
          setItems([]);
        }
      } catch (e) {
        console.error("Failed to load files", e);
        setItems([]);
      } finally {
        setIsLoading(false);
      }
    }
    loadFiles();
  }, [activeCoreId, currentPath]);

  if (activeCoreId === "all") {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-[#0c0c0c] rounded-3xl border border-white/5 shadow-2xl text-on-surface-variant/50">
        <span className="material-symbols-outlined text-[48px] mb-2 opacity-50">dns</span>
        <p className="text-sm">Please select a specific Core to view files.</p>
      </div>
    );
  }

  const navigateUp = () => {
    if (currentPath === "/") return;
    const parts = currentPath.split("/").filter(Boolean);
    parts.pop();
    setCurrentPath("/" + parts.join("/"));
  };

  return (
    <div className="w-full h-full flex bg-[#0c0c0c] rounded-3xl border border-white/5 overflow-hidden min-h-[650px] shadow-2xl">
      {/* Sidebar */}
      <div className="w-56 flex-shrink-0 flex flex-col border-r border-white/5 bg-white/[0.02] py-8">
        <h2 className="text-xl font-bold text-on-surface px-6 mb-6">Files</h2>
        <div className="flex flex-col gap-1 px-3">
          <button 
            onClick={() => setCurrentPath("/")}
            className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${currentPath === "/" ? "bg-primary/10 text-primary" : "text-on-surface-variant/70 hover:bg-white/5 hover:text-on-surface"}`}
          >
            <span className="material-symbols-outlined text-[20px] text-blue-300">home</span>
            Root
          </button>
          <button 
            onClick={() => setCurrentPath("/var/lib/hex/core")}
            className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${currentPath.startsWith("/var/lib/hex/core") ? "bg-primary/10 text-primary" : "text-on-surface-variant/70 hover:bg-white/5 hover:text-on-surface"}`}
          >
            <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>database</span>
            Hex Data
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col p-8 overflow-hidden bg-black/20">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/5">
          <div className="flex items-center gap-3 text-sm">
            <button onClick={navigateUp} className="text-on-surface-variant/60 hover:text-on-surface transition-colors flex items-center">
              <span className="material-symbols-outlined text-[20px]">arrow_upward</span>
            </button>
            <span className="text-on-surface-variant/60">Path:</span>
            <span className="font-bold text-on-surface tracking-wide">{currentPath}</span>
          </div>
          <div className="flex items-center gap-4">
            <button className="flex items-center gap-2 px-5 py-2 rounded-full bg-primary text-black text-xs font-bold hover:bg-primary/90 transition-colors shadow-[0_0_15px_rgba(var(--primary-rgb),0.3)]">
              <span className="material-symbols-outlined text-[14px]">upload</span>
              Upload
            </button>
          </div>
        </div>

        {/* Subheader */}
        <div className="flex items-center justify-between mt-6 mb-8">
          <div className="flex items-center gap-3">
            <div className="w-4 h-4 rounded-full border border-white/20" />
            <span className="text-xs font-medium text-on-surface-variant/60">Total {items.length} items</span>
          </div>
          <div className="text-xs text-primary animate-pulse">{isLoading ? "Loading..." : ""}</div>
        </div>

        {/* Grid */}
        <div className="flex flex-wrap gap-10 overflow-y-auto pb-8">
          {items.length > 0 ? (
            items.map(f => (
              <div 
                key={f.name} 
                onClick={() => {
                  if (f.isDir) {
                    setCurrentPath(currentPath === "/" ? `/${f.name}` : `${currentPath}/${f.name}`);
                  }
                }}
                className="flex flex-col items-center gap-3 group cursor-pointer w-28"
              >
                <div className="relative w-24 h-20 flex items-center justify-center">
                  {f.isDir ? (
                    <>
                      <span className="material-symbols-outlined text-blue-500 text-[90px] drop-shadow-xl group-hover:-translate-y-2 transition-transform duration-300" style={{ fontVariationSettings: "'FILL' 1" }}>folder</span>
                      <span className="material-symbols-outlined text-white/95 text-[34px] absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 group-hover:-translate-y-2 transition-transform duration-300 drop-shadow-md"></span>
                    </>
                  ) : (
                    <span className="material-symbols-outlined text-on-surface-variant text-[70px] drop-shadow-xl group-hover:-translate-y-2 transition-transform duration-300" style={{ fontVariationSettings: "'FILL' 1" }}>description</span>
                  )}
                </div>
                <div className="text-center mt-2">
                  <p className="text-sm font-semibold text-on-surface/90 group-hover:text-primary transition-colors truncate w-full px-1" title={f.name}>{f.name}</p>
                  <p className="text-[10px] text-on-surface-variant/50 mt-1">{f.sizeBytes ? (f.sizeBytes / 1024).toFixed(1) + ' KB' : ''}</p>
                </div>
              </div>
            ))
          ) : (
            !isLoading && (
              <div className="w-full h-40 flex flex-col items-center justify-center text-on-surface-variant/50">
                <span className="material-symbols-outlined text-[48px] mb-2 opacity-50">folder_open</span>
                <p className="text-sm">Directory is empty.</p>
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Terminal View (Mockup) ──────────────────────────── */
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import '@xterm/xterm/css/xterm.css';

function TerminalView({ activeCoreId }: { activeCoreId: string | "all" }) {
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<Terminal | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (!terminalRef.current || activeCoreId === "all") return;

    const term = new Terminal({
      theme: {
        background: '#1e1e1e',
        foreground: '#4ade80', // text-green-400
        cursor: '#4ade80'
      },
      fontFamily: 'monospace',
      fontSize: 14,
      cursorBlink: true
    });
    
    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    term.open(terminalRef.current);
    fitAddon.fit();
    xtermRef.current = term;

    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const ws = new WebSocket(`${wsProtocol}//${window.location.host}/ws/terminal?coreId=${activeCoreId}`);
    wsRef.current = ws;

    ws.onopen = () => {
      term.writeln('\x1b[32m[Hex Terminal Proxy] Connected to Core\x1b[0m');
    };

    ws.onmessage = (event) => {
      term.write(event.data);
    };

    ws.onclose = () => {
      term.writeln('\r\n\x1b[31m[Hex Terminal Proxy] Disconnected\x1b[0m');
    };

    term.onData(data => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(data);
      }
    });

    const handleResize = () => fitAddon.fit();
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      ws.close();
      term.dispose();
    };
  }, [activeCoreId]);

  if (activeCoreId === "all") {
    return (
      <div className="flex-1 flex flex-col p-8 items-center justify-center text-on-surface-variant/50">
        <span className="material-symbols-outlined text-4xl mb-4 opacity-50">terminal</span>
        <p>Please select a specific Core from the dock to use the Terminal.</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col p-8 overflow-hidden bg-black fade-in h-full relative">
      <div className="absolute inset-0 bg-black/50 pointer-events-none" />
      <div className="z-10 flex flex-col h-full bg-[#1e1e1e] rounded-xl border border-white/10 shadow-2xl overflow-hidden font-mono text-sm">
        <div className="bg-[#2d2d2d] px-4 py-2 flex items-center gap-2 border-b border-white/5">
          <div className="w-3 h-3 rounded-full bg-red-500" />
          <div className="w-3 h-3 rounded-full bg-yellow-500" />
          <div className="w-3 h-3 rounded-full bg-green-500" />
          <span className="ml-4 text-xs text-white/50 tracking-wider">Terminal</span>
        </div>
        <div className="flex-1 p-4" ref={terminalRef} style={{ overflow: 'hidden' }}></div>
      </div>
    </div>
  );
}

/* ── Firewall View (Real Integration) ──────────────────────────── */
function FirewallView({ activeCoreId }: { activeCoreId: string | "all" }) {
  const [firewallEnabled, setFirewallEnabled] = useState(true);
  const [rules, setRules] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [newPort, setNewPort] = useState("");

  const fetchRules = async () => {
    if (activeCoreId === "all") return;
    setLoading(true);
    try {
      const res = await fetch(`/api/nodes/${activeCoreId}/firewall`);
      const { data } = await res.json();
      if (data) {
        setFirewallEnabled(data.includes("Status: active"));
        // Parse UFW output
        const lines = data.split("\n");
        const parsedRules = [];
        for (const line of lines) {
          const match = line.match(/^\[\s*(\d+)\]\s+(\S+)\s+(ALLOW IN|DENY IN)\s+(.*)$/);
          if (match) {
            parsedRules.push({
              id: match[1],
              port: match[2],
              action: match[3],
              from: match[4]
            });
          }
        }
        setRules(parsedRules);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRules();
  }, [activeCoreId]);

  const toggleFirewall = async (enable: boolean) => {
    if (activeCoreId === "all") return;
    setFirewallEnabled(enable);
    await fetch(`/api/nodes/${activeCoreId}/firewall?action=${enable ? 'enable' : 'disable'}`, { method: 'POST' });
    fetchRules();
  };

  const addRule = async () => {
    if (!newPort || activeCoreId === "all") return;
    await fetch(`/api/nodes/${activeCoreId}/firewall?action=allow&port=${newPort}`, { method: 'POST' });
    setNewPort("");
    fetchRules();
  };

  const deleteRule = async (port: string) => {
    if (activeCoreId === "all") return;
    await fetch(`/api/nodes/${activeCoreId}/firewall?action=deny&port=${port}`, { method: 'POST' });
    fetchRules();
  };

  if (activeCoreId === "all") {
    return (
      <div className="flex-1 flex flex-col p-8 items-center justify-center text-on-surface-variant/50">
        <span className="material-symbols-outlined text-4xl mb-4 opacity-50">security</span>
        <p>Please select a specific Core from the dock to manage Firewall.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full fade-in p-8 pb-24 overflow-y-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-bold text-on-surface tracking-tight mb-2">Firewall Management</h2>
          <p className="text-sm text-on-surface-variant">Configure UFW iptables and security rules.</p>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm font-semibold text-on-surface-variant">Master Switch</span>
          <label className="flex items-center gap-2 cursor-pointer group/toggle">
            <div className="relative">
              <input 
                type="checkbox" 
                className="sr-only" 
                checked={firewallEnabled} 
                onChange={(e) => toggleFirewall(e.target.checked)}
              />
              <div className={`block w-10 h-6 rounded-full transition-colors ${firewallEnabled ? 'bg-primary' : 'bg-white/10'}`}></div>
              <div className={`absolute left-1 top-1 bg-black w-4 h-4 rounded-full transition-transform ${firewallEnabled ? 'translate-x-4' : 'translate-x-0'}`}></div>
            </div>
            <span className={`text-xs font-bold uppercase ${firewallEnabled ? 'text-primary' : 'text-on-surface-variant/50'}`}>
              {firewallEnabled ? 'Enabled' : 'Disabled'}
            </span>
          </label>
        </div>
      </div>

      <div className="glass-panel rounded-2xl flex flex-col border border-white/10 overflow-hidden">
        <div className="flex justify-between items-center px-6 py-4 border-b border-white/5 bg-white/[0.02]">
          <h3 className="text-lg font-bold text-on-surface">Whitelisted Ports</h3>
          <div className="flex gap-2">
            <input 
              type="text" 
              placeholder="e.g. 8080/tcp" 
              className="bg-black/40 border border-white/10 rounded-lg px-3 py-1.5 text-xs outline-none focus:border-primary text-white w-32"
              value={newPort}
              onChange={e => setNewPort(e.target.value)}
            />
            <button onClick={addRule} className="px-4 py-1.5 rounded-lg bg-primary/20 text-primary border border-primary/30 hover:bg-primary/30 transition-colors flex items-center gap-2 text-xs font-semibold">
              <span className="material-symbols-outlined text-[16px]">add</span>
              Add Rule
            </button>
          </div>
        </div>
        <div className="flex-1 p-0">
          <table className="w-full text-left text-sm">
            <thead className="text-xs uppercase text-on-surface-variant/50 bg-white/[0.01] border-b border-white/5">
              <tr>
                <th className="px-6 py-4">ID</th>
                <th className="px-6 py-4">Target (Port)</th>
                <th className="px-6 py-4">Action</th>
                <th className="px-6 py-4">From</th>
                <th className="px-6 py-4 text-right">Manage</th>
              </tr>
            </thead>
            <tbody>
              {rules.map((rule, idx) => (
                <tr key={idx} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                  <td className="px-6 py-4 text-on-surface-variant/70">[{rule.id}]</td>
                  <td className="px-6 py-4 font-mono font-bold text-on-surface">{rule.port}</td>
                  <td className="px-6 py-4 text-on-surface-variant/70">{rule.action}</td>
                  <td className="px-6 py-4 text-on-surface-variant/70">{rule.from}</td>
                  <td className="px-6 py-4 text-right">
                    <button 
                      onClick={() => deleteRule(rule.port)}
                      className="text-red-400/50 hover:text-red-400 transition-colors"
                    >
                      <span className="material-symbols-outlined text-[18px]">delete</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!loading && rules.length === 0 && (
            <div className="p-12 text-center text-on-surface-variant/50">
              <span className="material-symbols-outlined text-4xl mb-2 opacity-50">security</span>
              <p>No firewall rules configured or firewall is inactive.</p>
            </div>
          )}
          {loading && (
             <div className="p-12 text-center text-on-surface-variant/50">
               <span className="material-symbols-outlined text-4xl mb-2 opacity-50 animate-spin">refresh</span>
               <p>Loading rules...</p>
             </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Placeholder ────────────────────────────────────── */
function PlaceholderView({ activeApp }: { activeApp: string }) {
  const fullAppsList = [...DEFAULT_DOCK, { id: "add", label: "Add App", icon: "add", iconColor: "text-on-surface-variant" }];
  const currentApp = fullAppsList.find(a => a.id === activeApp);
  
  return (
    <div className="w-full flex flex-col items-center justify-center gap-4 h-64">
      {currentApp?.imgSrc
        ? <img src={currentApp.imgSrc} alt={currentApp.label} className="w-16 h-16 opacity-40" />
        : <span className={`material-symbols-outlined text-[64px] opacity-30 ${currentApp?.iconColor ?? ""}`} style={{ fontVariationSettings: "'FILL' 1" }}>{currentApp?.icon}</span>
      }
      <p className="text-on-surface-variant/40 text-sm">{currentApp?.label ?? "App"} integration coming soon.</p>
    </div>
  );
}

/* ── Empty State ────────────────────────────────────── */
function EmptyStateView({ onConnect }: { onConnect: () => void }) {
  return (
    <div className="w-full h-full flex flex-col items-center justify-center gap-6">
      <div className="w-24 h-24 rounded-full bg-white/5 flex items-center justify-center border border-white/10 shadow-[0_0_50px_rgba(255,255,255,0.05)]">
        <span className="material-symbols-outlined text-[48px] text-on-surface-variant/50">dns</span>
      </div>
      <div className="text-center max-w-md">
        <h2 className="text-3xl font-bold text-on-surface tracking-tight mb-3">No Cores Connected</h2>
        <p className="text-sm text-on-surface-variant/70 leading-relaxed mb-8">
          Your panel is currently empty. Connect your first Hex Core to start managing Docker containers, system resources, and files directly from your browser.
        </p>
        <button 
          onClick={onConnect}
          className="px-6 py-3 rounded-xl bg-primary text-black font-bold tracking-wide hover:bg-primary/90 transition-all shadow-[0_0_20px_rgba(var(--primary-rgb),0.3)] hover:shadow-[0_0_30px_rgba(var(--primary-rgb),0.5)] transform hover:-translate-y-0.5 flex items-center justify-center gap-2 mx-auto"
        >
          <span className="material-symbols-outlined text-[20px]">add_link</span>
          Connect Your First Core
        </button>
      </div>
    </div>
  );
}

/* ── Core Management View ────────────────────────────── */
function CoreManagementView({ cores, setCores, onToggle, onConnect, onRemove }: { cores: Core[]; setCores: any; onToggle: (id: string, status: string) => void; onConnect: () => void; onRemove: (id: string) => void }) {
  const [showIp, setShowIp] = useState<Record<string, boolean>>({});

  return (
    <div className="flex flex-col h-full fade-in pb-16">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-bold text-on-surface tracking-tight mb-2">Core Management</h2>
          <p className="text-sm text-on-surface-variant">Manage your connected Hex Cores.</p>
        </div>
        <button 
          onClick={onConnect}
          className="px-4 py-2 rounded-xl bg-primary/20 text-primary border border-primary/30 hover:bg-primary/30 transition-colors flex items-center gap-2 text-sm font-semibold"
        >
          <span className="material-symbols-outlined text-[18px]">add</span>
          Add Core
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {cores.map(core => (
          <div key={core.id} className="glass-panel p-5 rounded-2xl flex flex-col gap-4 border border-white/10 group">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
                  <span className="material-symbols-outlined text-[20px] text-on-surface-variant">dns</span>
                </div>
                <div>
                  <h3 className="text-base font-bold text-on-surface">{core.name}</h3>
                  <button 
                    onClick={() => setShowIp(prev => ({ ...prev, [core.id]: !prev[core.id] }))}
                    className="text-xs text-on-surface-variant/70 font-mono hover:text-on-surface transition-colors cursor-pointer"
                  >
                    {showIp[core.id] ? core.host : "Click to show IP"}
                  </button>
                </div>
              </div>
              <div className={`w-2.5 h-2.5 rounded-full ${core.status === 'online' ? 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]' : 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]'}`} />
            </div>
            
            <div className="flex items-center gap-4 text-xs font-semibold text-on-surface-variant/70 mt-2">
              <span className="flex items-center gap-1">
                <span className="material-symbols-outlined text-[14px]">memory</span>
                {core.cpu}% CPU
              </span>
              <span className="flex items-center gap-1">
                <span className="material-symbols-outlined text-[14px]">dns</span>
                {core.ram.toFixed(1)}GB RAM
              </span>
              <span className="flex items-center gap-1">
                <span className="material-symbols-outlined text-[14px]">hard_drive</span>
                {core.storage.toFixed(1)}GB Storage
              </span>
              <span className="flex items-center gap-1">
                <span className="material-symbols-outlined text-[14px]">language</span>
                {formatBytes(core.networkSent + core.networkRecv)}/s
              </span>
            </div>

            <div className="mt-auto pt-4 border-t border-white/10 flex justify-between items-center">
              <label className="flex items-center gap-2 cursor-pointer group/toggle">
                <div className="relative">
                  <input 
                    type="checkbox" 
                    className="sr-only" 
                    checked={core.status !== 'offline'} 
                    onChange={(e) => {
                      const newStatus = e.target.checked ? 'online' : 'offline';
                      onToggle(core.id, newStatus);
                    }}
                  />
                  <div className={`block w-8 h-5 rounded-full transition-colors ${core.status !== 'offline' ? 'bg-primary' : 'bg-white/10'}`}></div>
                  <div className={`absolute left-1 top-1 bg-black w-3 h-3 rounded-full transition-transform ${core.status !== 'offline' ? 'translate-x-3' : 'translate-x-0'}`}></div>
                </div>
                <span className="text-[10px] font-semibold text-on-surface-variant/70 group-hover/toggle:text-on-surface transition-colors uppercase tracking-wider">
                  {core.status !== 'offline' ? 'Connected' : 'Disconnected'}
                </span>
              </label>

              <button 
                onClick={() => onRemove(core.id)}
                className="px-3 py-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 hover:text-red-300 transition-colors text-xs font-semibold flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-[14px]">delete</span>
                Remove
              </button>
            </div>
          </div>
        ))}
      </div>
      {cores.length === 0 && (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-sm text-on-surface-variant/50">No Cores connected.</p>
        </div>
      )}
    </div>
  );
}
/* ── Preferences View ──────────────────────────────────── */
function PreferencesView() {
  return (
    <div className="flex flex-col h-full fade-in pb-16 max-w-4xl mx-auto w-full">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-on-surface tracking-tight mb-2">Preferences</h2>
        <p className="text-sm text-on-surface-variant">Manage your panel settings and display preferences.</p>
      </div>

      <div className="space-y-6">
        {/* Appearance */}
        <div className="glass-panel rounded-2xl border border-white/5 p-6">
          <h3 className="text-lg font-bold text-on-surface mb-6 flex items-center gap-2">
            <span className="material-symbols-outlined text-[20px] text-primary">palette</span>
            Appearance
          </h3>
          <div className="flex items-center justify-between py-3 border-b border-white/5">
            <div>
              <p className="text-sm font-semibold text-on-surface">Dark Mode</p>
              <p className="text-xs text-on-surface-variant">Toggle dark/light theme (currently forced dark)</p>
            </div>
            <div className="w-11 h-6 bg-primary rounded-full relative cursor-pointer">
              <div className="absolute right-1 top-1 w-4 h-4 bg-black rounded-full" />
            </div>
          </div>
          <div className="flex items-center justify-between py-3 border-b border-white/5 mt-2">
            <div>
              <p className="text-sm font-semibold text-on-surface">Wallpaper</p>
              <p className="text-xs text-on-surface-variant">Choose your dashboard background</p>
            </div>
            <select className="bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-sm text-on-surface outline-none focus:border-primary">
              <option>Default Space</option>
              <option>Hexagon Grid</option>
              <option>Solid Color</option>
            </select>
          </div>
        </div>

        {/* Localization */}
        <div className="glass-panel rounded-2xl border border-white/5 p-6">
          <h3 className="text-lg font-bold text-on-surface mb-6 flex items-center gap-2">
            <span className="material-symbols-outlined text-[20px] text-primary">language</span>
            Localization
          </h3>
          <div className="flex items-center justify-between py-3 border-b border-white/5">
            <div>
              <p className="text-sm font-semibold text-on-surface">Time Zone</p>
              <p className="text-xs text-on-surface-variant">Local timezone for logs and metrics</p>
            </div>
            <select className="bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-sm text-on-surface outline-none focus:border-primary">
              <option>Automatic (UTC+5:30)</option>
              <option>UTC</option>
            </select>
          </div>
          <div className="flex items-center justify-between py-3 border-b border-white/5 mt-2">
            <div>
              <p className="text-sm font-semibold text-on-surface">Time Format</p>
              <p className="text-xs text-on-surface-variant">12 Hour or 24 Hour clock</p>
            </div>
            <div className="flex bg-black/40 rounded-xl p-1 border border-white/10">
              <button className="px-3 py-1.5 rounded-lg bg-white/10 text-on-surface text-xs font-semibold">12 Hour</button>
              <button className="px-3 py-1.5 rounded-lg text-on-surface-variant hover:text-on-surface text-xs font-semibold transition-colors">24 Hour</button>
            </div>
          </div>
          <div className="flex items-center justify-between py-3 border-b border-white/5 mt-2">
            <div>
              <p className="text-sm font-semibold text-on-surface">Date Format</p>
              <p className="text-xs text-on-surface-variant">Display format for dates</p>
            </div>
            <select className="bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-sm text-on-surface outline-none focus:border-primary">
              <option>MM/DD/YYYY</option>
              <option>DD/MM/YYYY</option>
              <option>YYYY-MM-DD</option>
            </select>
          </div>
        </div>

        {/* System */}
        <div className="glass-panel rounded-2xl border border-white/5 p-6">
          <h3 className="text-lg font-bold text-on-surface mb-6 flex items-center gap-2">
            <span className="material-symbols-outlined text-[20px] text-primary">memory</span>
            System Details
          </h3>
          <div className="flex items-center justify-between py-3 border-b border-white/5">
            <div>
              <p className="text-sm font-semibold text-on-surface">Panel Uptime</p>
              <p className="text-xs text-on-surface-variant">How long the panel process has been running</p>
            </div>
            <p className="text-sm font-mono text-on-surface">14 days, 3 hrs, 22 mins</p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Account View ───────────────────────────────────── */
function AccountView() {
  return (
    <div className="flex flex-col h-full fade-in pb-16 max-w-4xl mx-auto w-full">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-on-surface tracking-tight mb-2">Account</h2>
        <p className="text-sm text-on-surface-variant">Manage your profile, security, and activity.</p>
      </div>

      <div className="space-y-6">
        {/* Profile */}
        <div className="glass-panel rounded-2xl border border-white/5 p-6 flex items-center gap-6">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary to-blue-500 flex items-center justify-center text-black text-3xl font-bold">
            N
          </div>
          <div className="flex-1">
            <h3 className="text-xl font-bold text-on-surface mb-1">Nandu</h3>
            <p className="text-sm text-on-surface-variant mb-3">Administrator</p>
            <button className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-on-surface transition-colors flex items-center gap-2">
              <span className="material-symbols-outlined text-[16px]">edit</span>
              Edit Profile
            </button>
          </div>
        </div>

        {/* Activity & History */}
        <div className="glass-panel rounded-2xl border border-white/5 p-6">
          <h3 className="text-lg font-bold text-on-surface mb-6 flex items-center gap-2">
            <span className="material-symbols-outlined text-[20px] text-primary">history</span>
            Recent History
          </h3>
          <div className="space-y-4">
            {[
              { action: "Logged in via Web", time: "2 mins ago", ip: "192.168.78.1" },
              { action: "Connected new Core 'dev'", time: "4 hours ago", ip: "192.168.78.129" },
              { action: "Updated Settings", time: "1 day ago", ip: "192.168.78.1" }
            ].map((log, i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0 last:pb-0">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-white/20" />
                  <p className="text-sm text-on-surface">{log.action}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-on-surface-variant">{log.time}</p>
                  <p className="text-[10px] text-on-surface-variant/50 font-mono mt-0.5">{log.ip}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* About */}
        <div className="glass-panel rounded-2xl border border-white/5 p-6">
          <h3 className="text-lg font-bold text-on-surface mb-6 flex items-center gap-2">
            <span className="material-symbols-outlined text-[20px] text-primary">info</span>
            About Hex
          </h3>
          <div className="flex items-center justify-between py-3 border-b border-white/5">
            <div>
              <p className="text-sm font-semibold text-on-surface">Version</p>
            </div>
            <p className="text-sm font-mono text-on-surface">v1.0.0-beta</p>
          </div>
          <div className="flex items-center justify-between py-3 border-b border-white/5">
            <div>
              <p className="text-sm font-semibold text-on-surface">Documentation</p>
              <p className="text-xs text-on-surface-variant">View guides and API references</p>
            </div>
            <a href="https://github.com/N1N4U/Hex" target="_blank" rel="noreferrer" className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-on-surface transition-colors flex items-center gap-2">
              <span className="material-symbols-outlined text-[16px]">open_in_new</span>
              View Docs
            </a>
          </div>
        </div>

        {/* Danger Zone */}
        <div className="pt-6 border-t border-red-500/20">
          <button className="px-6 py-3 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-500 text-sm font-bold transition-colors flex items-center gap-2 w-full justify-center">
            <span className="material-symbols-outlined text-[18px]">logout</span>
            Log Out
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Main Page ───────────────────────────────────────── */
export default function DashboardPageClient({ panelName, links }: { panelName: string; links: { discord: string; github: string; feedback: string } }) {
  const [activeApp, setActiveApp] = useState<AppId>("home");
  const [activeCoreId, setActiveCoreId] = useState<string | "all">("all");
  const [customApps, setCustomApps] = useState<DockApp[]>([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newAppName, setNewAppName] = useState("");
  const [newAppDomain, setNewAppDomain] = useState("");
  const [isInitialized, setIsInitialized] = useState(false);

  // Load from local storage on mount
  useEffect(() => {
    const token = localStorage.getItem("hex_token");
    if (!token) {
      window.location.href = "/auth/login";
      return;
    }

    const savedApp = localStorage.getItem("hex_activeApp");
    const savedCore = localStorage.getItem("hex_activeCoreId");
    if (savedApp) setActiveApp(savedApp as AppId);
    if (savedCore) setActiveCoreId(savedCore);
    setIsInitialized(true);
  }, []);

  // Save to local storage on change, but only after initial load
  useEffect(() => {
    if (isInitialized) {
      localStorage.setItem("hex_activeApp", activeApp);
    }
  }, [activeApp, isInitialized]);

  useEffect(() => {
    if (isInitialized) {
      localStorage.setItem("hex_activeCoreId", activeCoreId);
    }
  }, [activeCoreId, isInitialized]);
  
  const [cores, setCores] = useState<Core[]>([]);
  const [isLoadingCores, setIsLoadingCores] = useState(true);
  const [wsPing, setWsPing] = useState<number | null>(null);
  const [apiPing, setApiPing] = useState<number | null>(null);

  // Setup periodic API Ping
  useEffect(() => {
    const t = setInterval(() => {
      const start = Date.now();
      fetch('/favicon.ico').then(res => {
        if (res.ok) setApiPing(Date.now() - start);
      }).catch(() => setApiPing(null));
    }, 10000);
    return () => clearInterval(t);
  }, []);

  const wsRef = useRef<WebSocket | null>(null);

  const handleToggleCore = (coreId: string, status: string) => {
    setCores(prev => prev.map(c => c.id === coreId ? { ...c, status: status as any } : c));
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      if (status === 'offline') {
        wsRef.current.send(JSON.stringify({ type: 'stats.unsubscribe', target_core_id: coreId }));
      } else {
        wsRef.current.send(JSON.stringify({ id: `req_sub_${coreId}`, type: 'stats.subscribe', target_core_id: coreId }));
      }
    }
  };

  const [isConnectModalOpen, setIsConnectModalOpen] = useState(false);
  const [isPreferencesModalOpen, setIsPreferencesModalOpen] = useState(false);
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [coreName, setCoreName] = useState("");
  const [coreProtocol, setCoreProtocol] = useState("https");
  const [coreIp, setCoreIp] = useState("");
  const [corePort, setCorePort] = useState("8080");
  const [coreToken, setCoreToken] = useState("");
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectError, setConnectError] = useState("");

  // Fetch Cores and Setup WebSocket
  useEffect(() => {
    let ws: WebSocket;
    let reconnectTimeout: NodeJS.Timeout;
    let reconnectAttempts = 0;
    let pingInterval: NodeJS.Timeout;

    async function loadCores() {
      try {
        const res = await fetch('/api/nodes');
        if (res.ok) {
          const data = await res.json();
          let mappedCores: Core[] = data.map((n: any) => ({
            id: n.id.toString(),
            name: n.name,
            host: `${n.ip_address}:${n.port}`,
            status: n.status,
            cpu: 0,
            ram: 0,
            ramTotal: 16,
            storage: 0,
            storageTotal: 256,
            uptime: "—",
            networkSent: 0,
            networkRecv: 0,
            netTotalSent: 0,
            netTotalRecv: 0,
            osName: "Unknown",
            cpuModel: "Unknown",
            cpuCores: 0
          }));
          setCores(mappedCores);
          
          
          // Setup WebSocket Connection to Panel BFF
          const connectWs = () => {
            const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            ws = new WebSocket(`${wsProtocol}//${window.location.host}/ws`);
            wsRef.current = ws;

            ws.onopen = () => {
              console.log('[WS] Connected to Panel');
              reconnectAttempts = 0;
              
              // Authenticate using the JWT from localStorage
              const token = localStorage.getItem('hex_token');
              if (!token) {
                // No token — just close the WS, don't redirect (HTTP auth check handles that)
                ws.close();
                return;
              }

              ws.send(JSON.stringify({
                id: `req_${Date.now()}`,
                type: 'auth',
                token: token
              }));

              // Setup Ping
              pingInterval = setInterval(() => {
                if (ws.readyState === WebSocket.OPEN) {
                  ws.send(JSON.stringify({ id: `ping_${Date.now()}`, type: 'ping' }));
                }
              }, 20000);

              // Note: We don't subscribe to cores here anymore.
              // We wait for the 'auth' success message in onmessage
              // before sending the subscriptions, otherwise we hit a race condition.
            };

              ws.onmessage = (event) => {
              try {
                const data = JSON.parse(event.data);
                
                if (data.type === 'pong' && data.id?.startsWith('ping_')) {
                  const pingTime = parseInt(data.id.split('_')[1]);
                  setWsPing(Date.now() - pingTime);
                  return;
                }

                if (data.type === 'auth' && data.success) {
                  console.log('[WS] Auth successful, subscribing to cores...');
                  // Subscribe to all online cores now that we are authenticated
                  mappedCores.forEach(core => {
                    if (core.status !== 'offline') {
                      ws.send(JSON.stringify({
                        id: `req_sub_${core.id}`,
                        type: 'stats.subscribe',
                        target_core_id: core.id
                      }));
                    }
                  });
                }
                
                // Handle auth failure (server restarted, invalid token, etc.)
                if (data.type === 'auth' && data.error) {
                  // WS auth failed — this does NOT mean the user is logged out.
                  // The HTTP session is still valid. Just close the WS and
                  // the reconnect logic will retry. Do NOT clear the token!
                  console.warn('[WS] Auth failed, will retry on reconnect:', data.error);
                  ws.close();
                  return;
                }

                if (data.type === 'stats.update' && data.core_id) {
                  const stats = data.payload || data; // handle unwrapping
                  
                  const formatUptime = (seconds: number) => {
                    if (!seconds) return "—";
                    const d = Math.floor(seconds / 86400);
                    const h = Math.floor((seconds % 86400) / 3600);
                    const m = Math.floor((seconds % 3600) / 60);
                    const s = Math.floor(seconds % 60);
                    if (d > 0) return `${d}d ${h}h ${m}m ${s}s`;
                    if (h > 0) return `${h}h ${m}m ${s}s`;
                    if (m > 0) return `${m}m ${s}s`;
                    return `${s}s`;
                  };

                  setCores(prev => prev.map(c => {
                    if (c.id === data.core_id) {
                      return {
                        ...c,
                        cpu: stats.cpu_usage || 0,
                        ram: Number(((stats.mem_used || 0) / (1024 * 1024 * 1024)).toFixed(1)),
                        ramTotal: Number(((stats.mem_total || 0) / (1024 * 1024 * 1024)).toFixed(0)),
                        storage: Number(((stats.disk_used || 0) / (1024 * 1024 * 1024)).toFixed(1)),
                        storageTotal: Number(((stats.disk_total || 0) / (1024 * 1024 * 1024)).toFixed(0)),
                        networkSent: stats.net_sent || 0,
                        networkRecv: stats.net_recv || 0,
                        netTotalSent: stats.net_total_sent || 0,
                        netTotalRecv: stats.net_total_recv || 0,
                        uptime: formatUptime(stats.uptime),
                        osName: stats.os_name || c.osName,
                        cpuModel: stats.cpu_model || c.cpuModel,
                        cpuCores: stats.cpu_cores || c.cpuCores,
                        partitions: stats.partitions || [],
                        stats: stats
                      };
                    }
                    return c;
                  }));
                }
              } catch (e) {
                console.error("Error parsing WS data", e);
              }
            };

            ws.onclose = () => {
              console.log('[WS] Disconnected from Panel');
              clearInterval(pingInterval);
              
              // Exponential backoff reconnect
              const backoff = Math.min(1000 * Math.pow(2, reconnectAttempts), 30000);
              reconnectAttempts++;
              console.log(`[WS] Reconnecting in ${backoff}ms...`);
              reconnectTimeout = setTimeout(connectWs, backoff);
            };

            ws.onerror = (err) => {
              console.error('[WS] Error', err);
            };
          };

          connectWs();
        }
      } catch (err) {
        console.error("Failed to load cores", err);
      } finally {
        setIsLoadingCores(false);
      }
    }

    loadCores();

    return () => {
      clearTimeout(reconnectTimeout);
      clearInterval(pingInterval);
      if (ws) ws.close();
    };
  }, []);
  
  const ALL_DOCK_APPS = [...DEFAULT_DOCK, ...customApps];

  const handleDockSelect = (app: DockApp) => {
    if (app.id === "add") {
      setIsAddModalOpen(true);
    } else if (app.url) {
      window.open(app.url.startsWith("http") ? app.url : `https://${app.url}`, "_blank");
    } else {
      setActiveApp(app.id);
    }
  };

  const handleAddApp = () => {
    if (newAppName && newAppDomain) {
      setCustomApps(prev => [...prev, {
        id: `custom-${Date.now()}`,
        label: newAppName,
        url: newAppDomain,
        imgSrc: `https://www.google.com/s2/favicons?domain=${newAppDomain}&sz=64`
      }]);
      setIsAddModalOpen(false);
      setNewAppName("");
      setNewAppDomain("");
    }
  };

  const showCoreSelector = activeApp !== "settings" && activeApp !== "core";
  const hideAllCoresOption = ["home", "files", "nginx", "terminal", "add"].includes(activeApp);

  const handleConnectCore = async () => {
    setIsConnecting(true);
    setConnectError("");
    try {
      const res = await fetch('/api/nodes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: coreName,
          protocol: coreProtocol,
          ip_address: coreIp,
          port: corePort,
          api_key: coreToken
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to connect");
      if (!data.connectionSuccessful) throw new Error("Could not connect to Core. Is it running?");
      
      const newCore: Core = {
        id: data.id.toString(),
        name: data.name,
        host: `${data.ip_address}:${data.port}`,
        status: data.status,
        cpu: 0, ram: 0, ramTotal: 8, storage: 0, storageTotal: 100, uptime: "—"
      };
      setCores(prev => [...prev, newCore]);
      setActiveCoreId(newCore.id);
      setIsConnectModalOpen(false);
      
      // Reset form
      setCoreName(""); setCoreIp(""); setCorePort("8080"); setCoreToken("");
    } catch (err: any) {
      setConnectError(err.message);
    } finally {
      setIsConnecting(false);
    }
  };

  // If user is on an app that hides 'All Cores' but 'all' is selected, switch to the first core
  useEffect(() => {
    if (isInitialized && !isLoadingCores && cores.length > 0 && hideAllCoresOption && activeCoreId === "all") {
      setActiveCoreId(cores[0].id);
    }
  }, [activeApp, hideAllCoresOption, activeCoreId, cores, isInitialized, isLoadingCores]);

  const handleRemoveCore = async (id: string) => {
    if (!confirm("Are you sure you want to remove this Core?")) return;
    try {
      const res = await fetch(`/api/nodes/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setCores(prev => prev.filter(c => c.id !== id));
        if (activeCoreId === id) setActiveCoreId("all");
      }
    } catch (err) {
      console.error("Failed to remove core", err);
    }
  };

  return (
    <div className="w-full h-full flex flex-col overflow-hidden">

      {/* Top bar */}
      <div className="flex items-center justify-between px-8 pt-5 pb-3 flex-shrink-0">
        <div className="flex items-center gap-8">
          <h1 className="text-3xl font-bold text-on-surface tracking-tight">{panelName}</h1>
          
          {/* Core Selector Strip */}
          {showCoreSelector && cores.length > 0 && (
            <CoreSelector cores={cores} activeCoreId={activeCoreId} onSelect={setActiveCoreId} showAllCores={!hideAllCoresOption} />
          )}
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setIsPreferencesModalOpen(true)}
            className="w-10 h-10 rounded-[14px] transition-all flex items-center justify-center glass-panel hover:bg-white/10 text-on-surface-variant"
            title="Preferences"
          >
            <span className="material-symbols-outlined text-[22px]">settings</span>
          </button>
          <button 
            onClick={() => setIsAccountModalOpen(true)}
            className="w-10 h-10 rounded-[14px] transition-all flex items-center justify-center glass-panel hover:bg-white/10 text-on-surface-variant"
            title="Account"
          >
            <span className="material-symbols-outlined text-[22px]">person</span>
          </button>
        </div>
      </div>

      {/* Content area — dock and footer live inside here so they scroll */}
      <div className="flex-1 overflow-y-auto no-scrollbar min-h-0 flex flex-col">
        <div className="flex-1 px-8 pt-2 pb-4">
          {isLoadingCores ? (
            <div className="w-full h-full flex items-center justify-center">
              <span className="material-symbols-outlined text-[48px] animate-spin text-primary opacity-50">refresh</span>
            </div>
          ) : cores.length === 0 ? (
            <EmptyStateView onConnect={() => setIsConnectModalOpen(true)} />
          ) : (
            <>
              {activeApp === "home" && <HomeView panelName={panelName} cores={cores} activeCoreId={activeCoreId} wsPing={wsPing} apiPing={apiPing} />}
              {activeApp === "docker" && <DockerView cores={cores} activeCoreId={activeCoreId} />}
              {activeApp === "files" && <FilesView cores={cores} activeCoreId={activeCoreId} />}
              {activeApp === "terminal" && <TerminalView activeCoreId={activeCoreId} />}
              {activeApp === "firewall" && <FirewallView activeCoreId={activeCoreId} />}
              {activeApp === "core" && (
                <CoreManagementView 
                  cores={cores}
                  setCores={setCores}
                  onToggle={handleToggleCore}
                  onConnect={() => setIsConnectModalOpen(true)}
                  onRemove={handleRemoveCore} 
                />
              )}
              {activeApp !== "home" && activeApp !== "docker" && activeApp !== "files" && activeApp !== "terminal" && activeApp !== "firewall" && activeApp !== "core" && (
                <PlaceholderView activeApp={activeApp} />
              )}
            </>
          )}
        </div>

        {/* macOS Dock */}
        <MacDock apps={ALL_DOCK_APPS} activeApp={activeApp} onSelect={handleDockSelect} />

        {/* Footer */}
        <footer className="flex-shrink-0 flex justify-between items-center px-8 py-.8 border-t border-white/5 text-[10px]">
          <div className="flex items-center gap-3">
            <span className="text-sm font-bold tracking-tight text-on-surface/80">Hex</span>
            <div className="h-3 w-px bg-white/10" />
            <span className="text-on-surface-variant/40 uppercase tracking-wide">Made by <span className="text-on-surface/60">N1N4U</span></span>
          </div>
          <div className="flex items-center gap-5">
            <a className="text-on-surface-variant/50 hover:text-on-surface/80 transition-colors flex items-center gap-1" href={links.discord} target="_blank" rel="noreferrer">
              <span className="material-symbols-outlined text-[14px]">forum</span>
              <span>Discord</span>
            </a>
            <a className="text-on-surface-variant/50 hover:text-on-surface/80 transition-colors flex items-center gap-1" href={links.github} target="_blank" rel="noreferrer">
              <span className="material-symbols-outlined text-[14px]">code</span>
              <span>GitHub</span>
            </a>
            <a className="text-on-surface-variant/50 hover:text-on-surface/80 transition-colors flex items-center gap-1" href={links.feedback} target="_blank" rel="noreferrer">
              <span className="material-symbols-outlined text-[14px]">feedback</span>
              <span>Feedback</span>
            </a>
          </div>
        </footer>
      </div>

      {/* Add App Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="glass-panel p-6 rounded-2xl w-80 flex flex-col gap-4 border border-white/10 shadow-2xl">
            <h3 className="text-lg font-bold text-on-surface">Add Web App</h3>
            <div className="flex flex-col gap-3">
              <input
                type="text"
                placeholder="App Name (e.g. Analytics)"
                className="bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-sm text-on-surface outline-none focus:border-primary transition-colors placeholder:text-on-surface-variant/40"
                value={newAppName}
                onChange={e => setNewAppName(e.target.value)}
              />
              <input
                type="text"
                placeholder="Domain (e.g. google.com)"
                className="bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-sm text-on-surface outline-none focus:border-primary transition-colors placeholder:text-on-surface-variant/40"
                value={newAppDomain}
                onChange={e => setNewAppDomain(e.target.value)}
              />
            </div>
            <div className="flex items-center justify-end gap-2 mt-2">
              <button 
                onClick={() => setIsAddModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-on-surface-variant hover:bg-white/5 transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleAddApp}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-primary text-black hover:bg-primary/90 transition-colors"
              >
                Add App
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Connect Core Modal */}
      {isConnectModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="glass-panel p-6 rounded-2xl w-[400px] flex flex-col gap-5 border border-white/10 shadow-2xl">
            <h3 className="text-xl font-bold text-on-surface tracking-tight">Connect Core</h3>
            <div className="flex flex-col gap-4">
              <div>
                <label className="text-[10px] uppercase font-bold text-on-surface-variant/70 tracking-wider mb-1.5 block">Core Name</label>
                <input
                  type="text"
                  placeholder="e.g. Main VPS"
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-on-surface outline-none focus:border-primary transition-colors"
                  value={coreName}
                  onChange={e => setCoreName(e.target.value)}
                />
              </div>
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="text-[10px] uppercase font-bold text-on-surface-variant/70 tracking-wider mb-1.5 block">IP Address</label>
                  <div className="flex">
                    <select
                      className="bg-black/60 border border-white/10 border-r-0 rounded-l-xl px-3 py-2.5 text-sm text-on-surface-variant outline-none focus:border-primary transition-colors cursor-pointer"
                      value={coreProtocol}
                      onChange={e => setCoreProtocol(e.target.value)}
                    >
                      <option value="https">https://</option>
                      <option value="http">http://</option>
                    </select>
                    <input
                      type="text"
                      placeholder="e.g. 127.0.0.1"
                      className="w-full bg-black/40 border border-white/10 rounded-r-xl px-4 py-2.5 text-sm text-on-surface outline-none focus:border-primary transition-colors"
                      value={coreIp}
                      onChange={e => setCoreIp(e.target.value)}
                    />
                  </div>
                </div>
                <div className="w-24">
                  <label className="text-[10px] uppercase font-bold text-on-surface-variant/70 tracking-wider mb-1.5 block">Port</label>
                  <input
                    type="text"
                    placeholder="8080"
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-on-surface outline-none focus:border-primary transition-colors"
                    value={corePort}
                    onChange={e => setCorePort(e.target.value)}
                  />
                </div>
              </div>
              <div>
                <label className="text-[10px] uppercase font-bold text-on-surface-variant/70 tracking-wider mb-1.5 block">Registration Token</label>
                <input
                  type="password"
                  placeholder="Paste 64-char temporary token"
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-on-surface outline-none focus:border-primary transition-colors"
                  value={coreToken}
                  onChange={e => setCoreToken(e.target.value)}
                />
              </div>
              {connectError && (
                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-medium">
                  {connectError}
                </div>
              )}
            </div>
            <div className="flex items-center justify-end gap-3 mt-2">
              <button 
                onClick={() => setIsConnectModalOpen(false)}
                className="px-4 py-2.5 rounded-xl text-xs font-semibold text-on-surface-variant hover:bg-white/5 transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleConnectCore}
                disabled={isConnecting || !coreName || !coreIp || !coreToken}
                className="px-6 py-2.5 rounded-xl text-xs font-bold bg-primary text-black hover:bg-primary/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isConnecting ? (
                  <>
                    <span className="material-symbols-outlined text-[16px] animate-spin">refresh</span>
                    Connecting...
                  </>
                ) : (
                  'Connect'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      {isPreferencesModalOpen && <PreferencesModal onClose={() => setIsPreferencesModalOpen(false)} />}
      {isAccountModalOpen && <AccountModal onClose={() => setIsAccountModalOpen(false)} />}
    </div>
  );
}
