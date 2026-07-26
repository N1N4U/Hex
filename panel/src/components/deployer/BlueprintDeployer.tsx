"use client";
import { useState, useEffect } from "react";

interface BlueprintDeployerProps {
  nodeId: string;
  onClose: () => void;
  onDeploy: (config: any) => void;
}

export default function BlueprintDeployer({ nodeId, onClose, onDeploy }: BlueprintDeployerProps) {
  const [blueprints, setBlueprints] = useState<any[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  
  const [step, setStep] = useState(1);
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [selectedBlueprint, setSelectedBlueprint] = useState<any>(null);
  const [version, setVersion] = useState<string>("");
  const [containerName, setContainerName] = useState("");
  const [hostPort, setHostPort] = useState("");
  
  useEffect(() => {
    fetch(`/api/nodes/${nodeId}/blueprints`)
      .then(res => res.json())
      .then(data => {
        setBlueprints(data || []);
        const cats = Array.from(new Set(data.map((b: any) => b.category))) as string[];
        setCategories(cats.sort());
      })
      .catch(err => console.error("Failed to load blueprints", err));
  }, [nodeId]);

  const handleNext = () => setStep(s => s + 1);
  const handleBack = () => setStep(s => s - 1);

  const submitDeploy = (e: React.FormEvent) => {
    e.preventDefault();
    const config = {
      name: containerName || selectedBlueprint.name.toLowerCase().replace(/\s+/g, '-'),
      image: version,
      ports: hostPort ? { [hostPort]: selectedBlueprint.networking?.ports?.[0]?.containerPort?.[0] || 80 } : {}
    };
    onDeploy(config);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col h-[80vh]">
        <div className="p-6 border-b border-zinc-800 flex justify-between items-center bg-zinc-950/50">
          <h2 className="text-2xl font-bold text-white">Deploy Blueprint</h2>
          <button onClick={onClose} className="text-zinc-400 hover:text-white transition">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {step === 1 && (
            <div className="space-y-6">
              <h3 className="text-xl font-semibold text-white">Select a Category</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {categories.map(cat => (
                  <button 
                    key={cat}
                    onClick={() => { setSelectedCategory(cat); handleNext(); }}
                    className="p-6 rounded-xl border border-zinc-800 bg-zinc-950 hover:bg-zinc-800 hover:border-cyan-500/50 transition flex flex-col items-center justify-center gap-3 group"
                  >
                    <span className="material-symbols-outlined text-4xl text-zinc-500 group-hover:text-cyan-400 transition">folder</span>
                    <span className="font-medium text-zinc-300 group-hover:text-white">{cat}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <button onClick={handleBack} className="text-zinc-400 hover:text-white"><span className="material-symbols-outlined">arrow_back</span></button>
                <h3 className="text-xl font-semibold text-white">{selectedCategory} Blueprints</h3>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {blueprints.filter(b => b.category === selectedCategory).map(bp => (
                  <button
                    key={bp.id}
                    onClick={() => { 
                      setSelectedBlueprint(bp); 
                      setVersion(bp.runtime.default);
                      handleNext(); 
                    }}
                    className="p-4 rounded-xl border border-zinc-800 bg-zinc-950 hover:bg-zinc-800 hover:border-cyan-500/50 transition text-left flex items-center gap-4"
                  >
                    {bp.iconUrl ? (
                      <img src={bp.iconUrl} alt={bp.name} className="w-10 h-10 object-contain rounded" onError={(e) => { e.currentTarget.style.display = 'none' }} />
                    ) : (
                      <div className="w-10 h-10 bg-zinc-800 rounded flex items-center justify-center"><span className="material-symbols-outlined text-zinc-400">deployed_code</span></div>
                    )}
                    <div>
                      <h4 className="font-bold text-white">{bp.name}</h4>
                      <p className="text-xs text-zinc-500 truncate">{bp.description}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 3 && selectedBlueprint && (
            <div className="space-y-6 max-w-2xl mx-auto">
              <div className="flex items-center gap-4">
                <button onClick={handleBack} className="text-zinc-400 hover:text-white"><span className="material-symbols-outlined">arrow_back</span></button>
                <h3 className="text-xl font-semibold text-white">Configure {selectedBlueprint.name}</h3>
              </div>
              
              <form id="deployForm" onSubmit={submitDeploy} className="space-y-5 bg-zinc-950 p-6 rounded-xl border border-zinc-800">
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-1">Container Name (Optional)</label>
                  <input 
                    type="text" 
                    placeholder={selectedBlueprint.name.toLowerCase().replace(/\s+/g, '-')}
                    value={containerName}
                    onChange={e => setContainerName(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-3 text-white focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none transition"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-1">Version</label>
                  <select 
                    value={version}
                    onChange={e => setVersion(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-3 text-white focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none transition"
                  >
                    {selectedBlueprint.runtime.options.map((opt: any) => (
                      <option key={opt.id} value={opt.dockerImage}>{opt.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-1">
                    Host Port Mapping 
                    <span className="text-zinc-500 ml-2">(Maps to container port {selectedBlueprint.networking?.ports?.[0]?.containerPort?.[0] || 80})</span>
                  </label>
                  <input 
                    type="text" 
                    placeholder="e.g. 8080"
                    value={hostPort}
                    onChange={e => setHostPort(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-3 text-white focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none transition"
                  />
                </div>
              </form>
            </div>
          )}
        </div>

        <div className="p-6 border-t border-zinc-800 bg-zinc-950/50 flex justify-end gap-3">
          <button onClick={onClose} className="px-6 py-2 rounded-lg font-medium text-zinc-300 hover:text-white hover:bg-zinc-800 transition">Cancel</button>
          {step === 3 && (
            <button form="deployForm" type="submit" className="px-6 py-2 rounded-lg font-bold bg-cyan-600 hover:bg-cyan-500 text-white shadow-lg transition flex items-center gap-2">
              <span className="material-symbols-outlined text-sm">rocket_launch</span>
              Deploy Now
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
