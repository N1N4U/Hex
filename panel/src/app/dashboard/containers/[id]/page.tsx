"use client";
import { useEffect, useRef, useState } from "react";
import { Terminal } from "xterm";
import { FitAddon } from "xterm-addon-fit";
import "xterm/css/xterm.css";

export default function ContainerConsole({ params, searchParams }: any) {
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<Terminal | null>(null);
  const [status, setStatus] = useState("Connecting...");

  useEffect(() => {
    if (!terminalRef.current) return;

    const term = new Terminal({
      theme: {
        background: '#09090b',
        foreground: '#d4d4d8',
        cursor: '#06b6d4',
      },
      fontFamily: 'Menlo, Monaco, "Courier New", monospace',
      fontSize: 14,
      convertEol: true
    });
    
    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    term.open(terminalRef.current);
    fitAddon.fit();
    xtermRef.current = term;

    const es = new EventSource(`/api/containers/${params.id}/logs?nodeId=${searchParams.nodeId}`);
    
    es.onopen = () => {
      setStatus("Connected");
      term.writeln("\x1b[36m[Hex] Connected to container console stream...\x1b[0m");
    };

    es.onmessage = (event) => {
      term.write(event.data + "\n");
    };

    es.onerror = () => {
      setStatus("Disconnected");
      term.writeln("\x1b[31m[Hex] Connection lost or stream ended.\x1b[0m");
      es.close();
    };

    const handleResize = () => fitAddon.fit();
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      es.close();
      term.dispose();
    };
  }, [params.id, searchParams.nodeId]);

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-4">
      <div className="flex justify-between items-center bg-zinc-900 p-6 rounded-2xl border border-zinc-800 shadow-xl">
        <div>
          <h1 className="text-2xl font-bold text-white font-mono">Console</h1>
          <p className="text-zinc-400 mt-1">Container ID: {params.id}</p>
        </div>
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${status === 'Connected' ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
          <span className="text-zinc-300 font-medium">{status}</span>
        </div>
      </div>
      
      <div className="bg-zinc-950 p-4 rounded-2xl border border-zinc-800 shadow-xl overflow-hidden">
        <div ref={terminalRef} className="h-[600px] w-full" />
      </div>
    </div>
  );
}
