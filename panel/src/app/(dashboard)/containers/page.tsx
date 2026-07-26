"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import BlueprintDeployer from "@/components/deployer/BlueprintDeployer";

export default function ContainersPage() {
  const [nodes, setNodes] = useState<any[]>([]);
  const [selectedNode, setSelectedNode] = useState<string>("");
  const [containers, setContainers] = useState<any[]>([]);
  const [showDeployer, setShowDeployer] = useState(false);

  useEffect(() => {
    fetch("/api/nodes").then(res => res.json()).then(data => {
      setNodes(data);
      if (data.length > 0) {
        setSelectedNode(data[0].id.toString());
      }
    });
  }, []);

  useEffect(() => {
    if (selectedNode) {
      fetchContainers(selectedNode);
      const interval = setInterval(() => fetchContainers(selectedNode), 5000);
      return () => clearInterval(interval);
    }
  }, [selectedNode]);

  const fetchContainers = async (nodeId: string) => {
    const res = await fetch(`/api/nodes/${nodeId}/docker/containers`);
    if (res.ok) {
      setContainers(await res.json());
    } else {
      setContainers([]);
    }
  };

  const handleDeploy = async (config: any) => {
    const res = await fetch(`/api/nodes/${selectedNode}/docker/containers`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(config)
    });

    if (res.ok) {
      setShowDeployer(false);
      fetchContainers(selectedNode);
    } else {
      const err = await res.json();
      alert(`Failed to deploy: ${err.error || "Unknown error"}`);
    }
  };

  const handleAction = async (containerId: string, action: string) => {
    await fetch(`/api/nodes/${selectedNode}/docker/containers/${action}?containerId=${containerId}`, {
      method: "POST"
    });
    fetchContainers(selectedNode);
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 pb-32">
      <div className="flex justify-between items-center bg-zinc-900/80 backdrop-blur-md p-6 rounded-3xl border border-zinc-800 shadow-2xl">
        <div>
          <h1 className="text-4xl font-bold text-white tracking-tight">Containers</h1>
          <div className="flex items-center gap-4 mt-3">
            <div className="flex items-center gap-2 bg-zinc-950 px-3 py-1.5 rounded-lg border border-zinc-800">
              <span className="material-symbols-outlined text-zinc-500 text-sm">dns</span>
              <select 
                value={selectedNode} 
                onChange={e => setSelectedNode(e.target.value)}
                className="bg-transparent border-none text-white text-sm outline-none cursor-pointer"
              >
                {nodes.map(n => <option key={n.id} value={n.id}>{n.name} ({n.ip_address})</option>)}
              </select>
            </div>
          </div>
        </div>
        <button 
          onClick={() => setShowDeployer(true)}
          className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-cyan-900/20 transition flex items-center gap-2"
        >
          <span className="material-symbols-outlined">add</span>
          Deploy Blueprint
        </button>
      </div>

      {showDeployer && (
        <BlueprintDeployer 
          nodeId={selectedNode} 
          onClose={() => setShowDeployer(false)} 
          onDeploy={handleDeploy} 
        />
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {containers?.map(c => {
          // c is the raw docker types.Container object
          const name = c.Names?.[0]?.replace('/', '') || 'Unknown';
          const isRunning = c.State === 'running';
          
          return (
            <div key={c.Id} className="bg-zinc-900/50 backdrop-blur-md border border-zinc-800 rounded-3xl p-6 shadow-xl flex flex-col justify-between group hover:border-zinc-700 transition">
              <div>
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full ${isRunning ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]' : 'bg-zinc-600'}`} />
                    <h3 className="text-xl font-bold text-white truncate max-w-[200px]" title={name}>{name}</h3>
                  </div>
                  <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold tracking-wider uppercase ${isRunning ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-zinc-800 text-zinc-400 border border-zinc-700'}`}>
                    {c.State}
                  </span>
                </div>
                <p className="text-zinc-500 text-sm font-mono truncate">{c.Image}</p>
                <p className="text-zinc-400 text-xs mt-2">{c.Status}</p>
              </div>
              
              <div className="mt-6 flex gap-2">
                {isRunning ? (
                  <>
                    <button onClick={() => handleAction(c.Id, 'stop')} className="flex-1 bg-red-950/30 hover:bg-red-900/50 text-red-400 border border-red-900/50 py-2 rounded-xl text-sm font-bold transition flex justify-center items-center gap-1">
                      <span className="material-symbols-outlined text-[18px]">stop</span> Stop
                    </button>
                    <button onClick={() => handleAction(c.Id, 'restart')} className="flex-1 bg-zinc-800/50 hover:bg-zinc-700 text-white border border-zinc-700 py-2 rounded-xl text-sm font-bold transition flex justify-center items-center gap-1">
                      <span className="material-symbols-outlined text-[18px]">restart_alt</span> Restart
                    </button>
                  </>
                ) : (
                  <>
                    <button onClick={() => handleAction(c.Id, 'start')} className="flex-1 bg-emerald-950/30 hover:bg-emerald-900/50 text-emerald-400 border border-emerald-900/50 py-2 rounded-xl text-sm font-bold transition flex justify-center items-center gap-1">
                      <span className="material-symbols-outlined text-[18px]">play_arrow</span> Start
                    </button>
                    <button onClick={() => handleAction(c.Id, 'delete')} className="flex-1 bg-red-950/30 hover:bg-red-900/50 text-red-400 border border-red-900/50 py-2 rounded-xl text-sm font-bold transition flex justify-center items-center gap-1">
                      <span className="material-symbols-outlined text-[18px]">delete</span> Delete
                    </button>
                  </>
                )}
                <Link href={`/dashboard/containers/${c.Id}?nodeId=${selectedNode}`} className="flex-1 bg-cyan-950/30 hover:bg-cyan-900/50 text-cyan-400 border border-cyan-900/50 py-2 rounded-xl text-sm font-bold text-center transition flex justify-center items-center gap-1">
                  <span className="material-symbols-outlined text-[18px]">terminal</span> Console
                </Link>
              </div>
            </div>
          );
        })}
        
        {containers.length === 0 && (
          <div className="col-span-full py-20 flex flex-col items-center justify-center text-zinc-500 border-2 border-dashed border-zinc-800 rounded-3xl">
            <span className="material-symbols-outlined text-6xl mb-4 opacity-50">deployed_code</span>
            <p className="text-lg">No containers found on this node.</p>
            <p className="text-sm mt-2 opacity-70">Click 'Deploy Blueprint' to get started.</p>
          </div>
        )}
      </div>
    </div>
  );
}
