"use client";
import { useState, useEffect } from "react";
import Link from "next/link";

export default function ContainersPage() {
  const [nodes, setNodes] = useState<any[]>([]);
  const [selectedNode, setSelectedNode] = useState<string>("");
  const [containers, setContainers] = useState<any[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  
  const [formData, setFormData] = useState({
    name: "",
    image: "ubuntu:latest",
    hostPort: "",
    containerPort: ""
  });

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
    }
  }, [selectedNode]);

  const fetchContainers = async (nodeId: string) => {
    const res = await fetch(`/api/containers?nodeId=${nodeId}`);
    if (res.ok) {
      setContainers(await res.json());
    } else {
      setContainers([]);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const ports = formData.hostPort && formData.containerPort 
      ? { [formData.hostPort]: formData.containerPort } 
      : {};

    const res = await fetch("/api/containers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nodeId: selectedNode,
        name: formData.name,
        image: formData.image,
        ports
      })
    });

    if (res.ok) {
      setIsCreating(false);
      fetchContainers(selectedNode);
    } else {
      alert("Failed to create container");
    }
  };

  const handleAction = async (id: string, action: string) => {
    await fetch(`/api/containers/${id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nodeId: selectedNode, action })
    });
    fetchContainers(selectedNode);
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <div className="flex justify-between items-center bg-zinc-900 p-6 rounded-2xl border border-zinc-800 shadow-xl">
        <div>
          <h1 className="text-3xl font-bold text-white">Containers</h1>
          <div className="flex items-center gap-4 mt-2">
            <span className="text-zinc-400">Node:</span>
            <select 
              value={selectedNode} 
              onChange={e => setSelectedNode(e.target.value)}
              className="bg-zinc-950 border border-zinc-800 rounded-lg p-2 text-white"
            >
              {nodes.map(n => <option key={n.id} value={n.id}>{n.name} ({n.ip_address})</option>)}
            </select>
          </div>
        </div>
        <button 
          onClick={() => setIsCreating(!isCreating)}
          className="bg-cyan-600 hover:bg-cyan-500 text-white px-6 py-3 rounded-lg font-medium shadow-lg"
        >
          {isCreating ? "Cancel" : "+ Create Container"}
        </button>
      </div>

      {isCreating && (
        <form onSubmit={handleCreate} className="bg-zinc-900 p-6 rounded-2xl border border-zinc-800 space-y-4">
          <h2 className="text-xl text-white font-bold mb-4">Create New Container</h2>
          <div className="grid grid-cols-2 gap-4">
            <input required placeholder="Container Name" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="bg-zinc-950 border border-zinc-800 p-3 rounded-lg text-white" />
            <select value={formData.image} onChange={e => setFormData({...formData, image: e.target.value})} className="bg-zinc-950 border border-zinc-800 p-3 rounded-lg text-white">
              <option value="ubuntu:latest">Ubuntu (Blank)</option>
              <option value="node:18">Node.js 18</option>
              <option value="python:3.9">Python 3.9</option>
              <option value="nginx:latest">Nginx Web Server</option>
            </select>
            <input placeholder="Host Port (e.g. 8080)" value={formData.hostPort} onChange={e => setFormData({...formData, hostPort: e.target.value})} className="bg-zinc-950 border border-zinc-800 p-3 rounded-lg text-white" />
            <input placeholder="Container Port (e.g. 80)" value={formData.containerPort} onChange={e => setFormData({...formData, containerPort: e.target.value})} className="bg-zinc-950 border border-zinc-800 p-3 rounded-lg text-white" />
          </div>
          <button type="submit" className="bg-white text-black px-6 py-2 rounded-lg font-bold mt-4">Deploy</button>
        </form>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {containers?.map(c => (
          <div key={c.id} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-xl flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-xl font-bold text-white truncate pr-4">{c.name.replace('/', '')}</h3>
                <span className={`px-2 py-1 rounded text-xs font-bold ${c.state === 'running' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-zinc-800 text-zinc-400'}`}>
                  {c.state.toUpperCase()}
                </span>
              </div>
              <p className="text-zinc-500 text-sm font-mono">{c.image}</p>
              <p className="text-zinc-400 text-xs mt-2">{c.status}</p>
            </div>
            
            <div className="mt-6 flex gap-2">
              {c.state === 'running' ? (
                <>
                  <button onClick={() => handleAction(c.id, 'stop')} className="flex-1 bg-red-950/50 hover:bg-red-900 text-red-400 py-2 rounded-lg text-sm font-bold transition">Stop</button>
                  <button onClick={() => handleAction(c.id, 'restart')} className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-white py-2 rounded-lg text-sm font-bold transition">Restart</button>
                </>
              ) : (
                <button onClick={() => handleAction(c.id, 'start')} className="flex-1 bg-emerald-950/50 hover:bg-emerald-900 text-emerald-400 py-2 rounded-lg text-sm font-bold transition">Start</button>
              )}
              <Link href={`/dashboard/containers/${c.id}?nodeId=${selectedNode}`} className="flex-1 bg-cyan-950/50 hover:bg-cyan-900 text-cyan-400 py-2 rounded-lg text-sm font-bold text-center transition">
                Console
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
