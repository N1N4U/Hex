"use client";

import { useState, useEffect } from "react";

interface Node {
  id: number;
  name: string;
  ip_address: string;
  port: number;
  status: string;
  last_seen: string;
}

export default function ServersPage() {
  const [nodes, setNodes] = useState<Node[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  
  const [formData, setFormData] = useState({
    name: "",
    ip_address: "",
    port: "8080",
    api_key: ""
  });
  
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });

  useEffect(() => {
    fetchNodes();
  }, []);

  const fetchNodes = async () => {
    try {
      const res = await fetch("/api/nodes");
      if (res.ok) {
        const data = await res.json();
        setNodes(data);
      }
    } catch (err) {
      console.error("Failed to fetch nodes", err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: "", text: "" });

    try {
      const res = await fetch("/api/nodes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData)
      });
      
      const data = await res.json();
      
      if (res.ok) {
        setMessage({ 
          type: "success", 
          text: data.connectionSuccessful 
            ? "Server added and successfully connected!" 
            : "Server added, but could not reach it right now. (Check firewall or IP)"
        });
        setIsAdding(false);
        setFormData({ name: "", ip_address: "", port: "8080", api_key: "" });
        fetchNodes();
      } else {
        setMessage({ type: "error", text: data.error || "Failed to add server" });
      }
    } catch (err) {
      setMessage({ type: "error", text: "Network error occurred." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <div className="flex justify-between items-center bg-zinc-900 p-6 rounded-2xl border border-zinc-800 shadow-xl">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">Servers & Nodes</h1>
          <p className="text-zinc-400 mt-2">Manage your Hex Core instances and monitor their connection status.</p>
        </div>
        <button 
          onClick={() => setIsAdding(!isAdding)}
          className="bg-cyan-600 hover:bg-cyan-500 text-white px-6 py-3 rounded-lg font-medium transition-all shadow-lg shadow-cyan-900/50"
        >
          {isAdding ? "Cancel" : "+ Connect New Server"}
        </button>
      </div>

      {message.text && (
        <div className={`p-4 rounded-lg flex items-center gap-3 border ${message.type === 'success' ? 'bg-emerald-950/30 border-emerald-900 text-emerald-400' : 'bg-red-950/30 border-red-900 text-red-400'}`}>
          <div className="flex-1 font-medium">{message.text}</div>
          <button onClick={() => setMessage({type:"",text:""})} className="opacity-50 hover:opacity-100">×</button>
        </div>
      )}

      {isAdding && (
        <form onSubmit={handleSubmit} className="bg-zinc-900 p-6 rounded-2xl border border-zinc-800 shadow-xl space-y-5 animate-in fade-in slide-in-from-top-4 duration-300">
          <h2 className="text-xl font-semibold text-white mb-4">Connect a Hex Core Node</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-300">Server Name</label>
              <input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="e.g. Production Node 1" className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-white focus:ring-2 focus:ring-cyan-500 focus:border-transparent outline-none transition-all" />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-300">IP Address</label>
              <input required value={formData.ip_address} onChange={e => setFormData({...formData, ip_address: e.target.value})} placeholder="e.g. 192.168.1.10" className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-white focus:ring-2 focus:ring-cyan-500 focus:border-transparent outline-none transition-all" />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-300">Port</label>
              <input required type="number" value={formData.port} onChange={e => setFormData({...formData, port: e.target.value})} className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-white focus:ring-2 focus:ring-cyan-500 focus:border-transparent outline-none transition-all" />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-300">API Key</label>
              <input required type="password" value={formData.api_key} onChange={e => setFormData({...formData, api_key: e.target.value})} placeholder="hx_panel_..." className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-white focus:ring-2 focus:ring-cyan-500 focus:border-transparent outline-none transition-all font-mono" />
            </div>
          </div>
          
          <div className="flex justify-end pt-4">
            <button disabled={loading} type="submit" className="bg-white text-black hover:bg-zinc-200 px-8 py-3 rounded-lg font-medium transition-all shadow-lg disabled:opacity-50 flex items-center gap-2">
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-black/20 border-t-black rounded-full animate-spin"/>
                  Connecting...
                </>
              ) : "Connect Node"}
            </button>
          </div>
        </form>
      )}

      <div className="bg-zinc-900 rounded-2xl border border-zinc-800 shadow-xl overflow-hidden">
        {nodes.length === 0 ? (
          <div className="p-12 text-center text-zinc-500">
            <div className="w-16 h-16 bg-zinc-800/50 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </div>
            <p className="text-lg">No servers connected yet.</p>
            <p className="text-sm mt-1">Click "Connect New Server" to add your first Hex Core node.</p>
          </div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-zinc-950/50 border-b border-zinc-800 text-zinc-400 text-sm">
                <th className="p-4 font-medium">Server Name</th>
                <th className="p-4 font-medium">IP Address</th>
                <th className="p-4 font-medium">Port</th>
                <th className="p-4 font-medium">Status</th>
                <th className="p-4 font-medium">Last Seen</th>
                <th className="p-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/50">
              {nodes.map(node => (
                <tr key={node.id} className="hover:bg-zinc-800/20 transition-colors group">
                  <td className="p-4 font-medium text-white">{node.name}</td>
                  <td className="p-4 text-zinc-300 font-mono text-sm">{node.ip_address}</td>
                  <td className="p-4 text-zinc-400">{node.port}</td>
                  <td className="p-4">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${
                      node.status === 'online' 
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                        : 'bg-red-500/10 text-red-400 border-red-500/20'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${node.status === 'online' ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
                      {node.status.toUpperCase()}
                    </span>
                  </td>
                  <td className="p-4 text-zinc-500 text-sm">
                    {new Date(node.last_seen).toLocaleDateString()} {new Date(node.last_seen).toLocaleTimeString()}
                  </td>
                  <td className="p-4 text-right">
                    <button className="text-zinc-500 hover:text-white transition-colors opacity-0 group-hover:opacity-100">
                      Manage →
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
