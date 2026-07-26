"use client";
import { useEffect, useRef, useState } from "react";
import { Terminal } from "xterm";
import { FitAddon } from "xterm-addon-fit";
import "xterm/css/xterm.css";
import Link from "next/link";

export default function ContainerConsole({ params, searchParams }: any) {
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<Terminal | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const [status, setStatus] = useState("Connecting...");
  const [containerInfo, setContainerInfo] = useState<any>(null);

  // Tab State: console, logs, settings
  const [activeTab, setActiveTab] = useState("console");

  useEffect(() => {
    // Fetch container details
    fetch(`/api/nodes/${searchParams.nodeId}/docker/containers`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          const c = data.find((c: any) => c.Id === params.id);
          if (c) setContainerInfo(c);
        }
      });
  }, [params.id, searchParams.nodeId]);

  useEffect(() => {
    if (activeTab !== "console") return;
    if (!terminalRef.current) return;

    const term = new Terminal({
      theme: {
        background: '#09090b',
        foreground: '#d4d4d8',
        cursor: '#06b6d4',
      },
      fontFamily: 'Menlo, Monaco, "Courier New", monospace',
      fontSize: 14,
      convertEol: true,
      cursorBlink: true
    });
    
    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    term.open(terminalRef.current);
    
    // Slight delay to ensure DOM is ready for fit
    setTimeout(() => fitAddon.fit(), 10);
    xtermRef.current = term;

    // Connect to WebSocket Proxy
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws/docker/exec?coreId=${searchParams.nodeId}&containerId=${params.id}`;
    
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      setStatus("Connected");
      term.writeln("\x1b[36m[Hex] Interactive terminal attached.\x1b[0m");
      term.writeln("\x1b[90mTip: Type 'exit' to detach.\x1b[0m\r\n");
    };

    ws.onmessage = (event) => {
      if (typeof event.data === 'string') {
        term.write(event.data);
      } else if (event.data instanceof Blob) {
        const reader = new FileReader();
        reader.onload = () => {
          term.write(reader.result as string);
        };
        reader.readAsText(event.data);
      }
    };

    ws.onclose = () => {
      setStatus("Disconnected");
      term.writeln("\r\n\x1b[31m[Hex] Terminal disconnected.\x1b[0m");
    };

    term.onData((data) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(data);
      }
    });

    const handleResize = () => fitAddon.fit();
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      if (ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
      term.dispose();
    };
  }, [params.id, searchParams.nodeId, activeTab]);

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6 pb-32">
      <Link href="/dashboard/containers" className="inline-flex items-center gap-2 text-zinc-400 hover:text-white transition">
        <span className="material-symbols-outlined text-sm">arrow_back</span>
        Back to Containers
      </Link>

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-zinc-900/80 backdrop-blur-md p-6 rounded-3xl border border-zinc-800 shadow-2xl gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold text-white tracking-tight">
              {containerInfo ? containerInfo.Names[0].replace('/', '') : "Loading..."}
            </h1>
            <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold tracking-wider uppercase ${containerInfo?.State === 'running' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-zinc-800 text-zinc-400 border border-zinc-700'}`}>
              {containerInfo?.State || "UNKNOWN"}
            </span>
          </div>
          <div className="flex items-center gap-4 mt-2">
            <p className="text-zinc-500 font-mono text-sm">{containerInfo?.Image || "..."}</p>
            <p className="text-zinc-600 text-sm">|</p>
            <p className="text-zinc-500 text-sm">{params.id.substring(0, 12)}</p>
          </div>
        </div>
        
        <div className="flex bg-zinc-950 p-1 rounded-xl border border-zinc-800">
          <button 
            onClick={() => setActiveTab('console')} 
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${activeTab === 'console' ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:text-white'}`}
          >
            Console
          </button>
          <button 
            onClick={() => setActiveTab('logs')} 
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${activeTab === 'logs' ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:text-white'}`}
          >
            Logs
          </button>
          <button 
            onClick={() => setActiveTab('settings')} 
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${activeTab === 'settings' ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:text-white'}`}
          >
            Settings
          </button>
        </div>
      </div>
      
      {activeTab === 'console' && (
        <div className="bg-zinc-950 p-4 rounded-3xl border border-zinc-800 shadow-xl overflow-hidden relative group">
          <div className="absolute top-4 right-4 flex items-center gap-2 z-10 bg-black/50 backdrop-blur px-3 py-1.5 rounded-full border border-white/10 opacity-0 group-hover:opacity-100 transition">
            <div className={`w-2 h-2 rounded-full ${status === 'Connected' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]' : 'bg-red-500'}`} />
            <span className="text-zinc-300 text-xs font-medium">{status}</span>
          </div>
          <div ref={terminalRef} className="h-[65vh] w-full" />
        </div>
      )}

      {activeTab === 'logs' && (
        <div className="bg-zinc-950 p-8 rounded-3xl border border-zinc-800 shadow-xl flex flex-col items-center justify-center h-[65vh] text-zinc-500">
          <span className="material-symbols-outlined text-6xl mb-4 opacity-50">receipt_long</span>
          <p className="text-lg">Container Logs</p>
          <p className="text-sm mt-2 opacity-70">Log stream implementation coming soon.</p>
        </div>
      )}

      {activeTab === 'settings' && (
        <div className="bg-zinc-950 p-8 rounded-3xl border border-zinc-800 shadow-xl flex flex-col items-center justify-center h-[65vh] text-zinc-500">
          <span className="material-symbols-outlined text-6xl mb-4 opacity-50">settings</span>
          <p className="text-lg">Container Settings</p>
          <p className="text-sm mt-2 opacity-70">Resource limits and environment variables coming soon.</p>
        </div>
      )}
    </div>
  );
}
