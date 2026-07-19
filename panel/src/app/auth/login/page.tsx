"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [password, setPassword] = useState("");
  const router = useRouter();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    // In dev, bypass auth
    router.push("/dashboard/nodes");
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center relative overflow-hidden">
      {/* Dynamic Background Glows */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-cyan-500/20 rounded-full blur-[100px] -z-10 animate-pulse"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-violet-500/20 rounded-full blur-[100px] -z-10 animate-pulse delay-700"></div>
      
      <div className="w-full max-w-md p-8 bg-zinc-900/50 backdrop-blur-2xl border border-zinc-800/50 rounded-3xl shadow-[0_0_50px_rgba(0,0,0,0.5)] animate-in zoom-in-95 duration-500">
        <div className="text-center mb-10">
          <div className="w-16 h-16 bg-gradient-to-br from-cyan-400 to-violet-500 rounded-2xl mx-auto mb-6 flex items-center justify-center shadow-lg shadow-cyan-500/20 rotate-3 hover:rotate-0 transition-transform">
            <span className="text-2xl font-black text-black">H</span>
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight">Welcome to Hex</h1>
          <p className="text-zinc-400 mt-2">Enter your master password to continue</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <input 
              type="password" 
              placeholder="Master Password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-black/50 border border-zinc-800 focus:border-cyan-500/50 rounded-xl p-4 text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 transition-all text-center tracking-widest font-mono"
            />
          </div>
          <button 
            type="submit"
            className="w-full bg-white hover:bg-zinc-200 text-black font-black py-4 rounded-xl shadow-[0_0_20px_rgba(255,255,255,0.1)] hover:shadow-[0_0_30px_rgba(255,255,255,0.3)] transition-all transform hover:-translate-y-1"
          >
            UNLOCK PANEL
          </button>
        </form>
      </div>
    </div>
  );
}
