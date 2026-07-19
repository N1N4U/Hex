"use client";
import { useState, useEffect } from "react";

export default function NodesPage() {
  const [nodes, setNodes] = useState<any[]>([]);
  const [isAdding, setIsAdding] = useState(false);

  useEffect(() => {
    fetch("/api/nodes")
      .then(res => res.json())
      .then(data => setNodes(data));
  }, []);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex justify-between items-center bg-zinc-900/50 backdrop-blur-xl p-6 rounded-2xl border border-zinc-800/50 shadow-2xl">
        <div>
          <h1 className="text-3xl font-black bg-clip-text text-transparent bg-gradient-to-r from-white to-zinc-500 tracking-tight">Connected Nodes</h1>
          <p className="text-zinc-400 mt-1">Manage your active Hex Core VPS instances</p>
        </div>
        <button 
          onClick={() => setIsAdding(!isAdding)}
          className="bg-white hover:bg-zinc-200 text-black px-6 py-3 rounded-xl font-bold shadow-[0_0_20px_rgba(255,255,255,0.2)] transition-all hover:scale-105"
        >
          {isAdding ? "Cancel" : "+ Connect Node"}
        </button>
      </div>

      {isAdding && (
        <div className="bg-zinc-900/80 backdrop-blur-xl p-8 rounded-2xl border border-zinc-800 shadow-2xl animate-in fade-in zoom-in-95 duration-300">
          <h2 className="text-2xl font-bold text-white mb-2">Deploy Hex Core</h2>
          <p className="text-zinc-400 mb-6">Run this command on your VPS (Ubuntu/Debian) to install Hex Core and connect it to this Panel automatically.</p>
          
          <div className="bg-black border border-zinc-800 rounded-xl p-4 font-mono text-sm text-cyan-400 relative overflow-hidden group cursor-pointer hover:border-cyan-500/50 transition-colors" onClick={() => navigator.clipboard.writeText('curl -sSL https://get.hex.com/installer.sh | bash -s -- --panel-url "http://localhost:3000" --token "demo-token"')}>
            curl -sSL https://get.hex.com/installer.sh | bash -s -- --panel-url "http://localhost:3000" --token "demo-token"
            <div className="absolute top-0 right-0 h-full px-4 bg-zinc-900 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <span className="text-white font-sans font-bold">Copy</span>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {nodes?.map(node => (
          <div key={node.id} className="group relative bg-zinc-900/50 backdrop-blur-xl border border-zinc-800/50 hover:border-cyan-500/30 rounded-2xl p-6 shadow-xl transition-all duration-300 hover:-translate-y-1">
            <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 to-violet-500/5 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
            
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="text-xl font-bold text-white group-hover:text-cyan-400 transition-colors">{node.name}</h3>
                <p className="text-zinc-500 text-sm font-mono mt-1">{node.ip_address}:{node.port}</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-zinc-950 flex items-center justify-center border border-zinc-800 shadow-inner">
                <span className="text-2xl">🖥️</span>
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-xl bg-zinc-950/50 border border-zinc-800/50">
                <span className="text-sm font-medium text-zinc-400">Connection</span>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                  <span className="text-sm font-bold text-emerald-500">Secure (mTLS)</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
