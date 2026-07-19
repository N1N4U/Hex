"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

interface EnvConfig {
  ownerUsername: string;
  ownerPassword: string;
  discordToggle: boolean;
  googleToggle: boolean;
  smtpToggle: boolean;
  defaultWallpaper: string;
}

export default function LockScreenClient({ envConfig }: { envConfig: EnvConfig }) {
  const router = useRouter();
  const [isFocused, setIsFocused] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [time, setTime] = useState<Date | null>(null);

  useEffect(() => {
    setTime(new Date());
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (username === envConfig.ownerUsername && password === envConfig.ownerPassword) {
      // Create a smooth transition effect
      document.body.style.opacity = "0";
      setTimeout(() => {
        router.push("/dashboard");
        setTimeout(() => {
          document.body.style.opacity = "1";
        }, 100);
      }, 500);
    } else if (username.trim() !== "" && password.trim() !== "") {
       alert("Invalid credentials.");
    }
  };

  const formattedTime = time ? time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "";
  const formattedDate = time ? time.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' }) : "";

  return (
    <div 
      className="min-h-screen w-full flex flex-col items-center justify-center relative overflow-hidden transition-opacity duration-500"
      onClick={() => setIsFocused(true)}
    >
      {/* Background Image with pure dark overlay */}
      <div className="fixed inset-0 z-0">
        <div 
          className={`w-full h-full bg-cover bg-center transition-all duration-700 ${isFocused ? 'blur-xl scale-110' : 'blur-0 scale-100'}`}
          style={{ backgroundImage: `url('/wallpaper/${envConfig.defaultWallpaper}')` }}
        />
        <div className="absolute inset-0 bg-custom-overlay"></div>
      </div>

      {/* Clock - Visible when not focused */}
      <div className={`relative z-10 text-white text-center transition-all duration-700 absolute top-24 ${isFocused ? 'opacity-0 -translate-y-10 pointer-events-none' : 'opacity-100 translate-y-0'}`}>
        <h1 className="text-8xl font-light tracking-wider drop-shadow-lg">{formattedTime}</h1>
        <p className="text-xl mt-4 font-medium drop-shadow-md">{formattedDate}</p>
      </div>

      {/* Login Form - Visible when focused */}
      <div className={`relative z-10 flex flex-col items-center transition-all duration-700 transform ${isFocused ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-10 scale-95 pointer-events-none'}`}>
        
        {/* User Avatar */}
        <div className="w-32 h-32 rounded-full mb-6 overflow-hidden border-4 border-white/20 shadow-2xl backdrop-blur-md">
          <div className="w-full h-full bg-gradient-to-br from-indigo-500 to-fuchsia-500 flex items-center justify-center text-4xl font-bold text-white">
            A
          </div>
        </div>

        <h2 className="text-3xl font-semibold text-on-surface mb-8 drop-shadow-md">Administrator</h2>

        <form onSubmit={handleLogin} className="flex flex-col items-center w-80 space-y-4">
          <div className="w-full space-y-3">
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Username"
              autoFocus={isFocused}
              className="w-full glass-panel rounded-xl px-4 py-3 text-on-surface placeholder-on-surface-variant/50 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-transparent transition-all shadow-lg"
            />
            <div className="relative w-full group">
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                className="w-full glass-panel rounded-xl px-4 py-3 text-on-surface placeholder-on-surface-variant/50 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-transparent transition-all shadow-lg pr-12"
              />
              <button 
                type="submit" 
                className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-on-surface transition-colors"
              >
                ➔
              </button>
            </div>
          </div>
          
          <div className="w-full flex justify-between items-center space-x-2 pt-2">
             <button
                type="button"
                disabled={!envConfig.discordToggle}
                className={`flex-1 py-2 rounded-xl text-sm font-medium transition-colors border backdrop-blur-sm shadow-md flex justify-center items-center ${
                  envConfig.discordToggle 
                    ? "bg-[#5865F2]/80 border-[#5865F2] text-white hover:bg-[#5865F2]" 
                    : "bg-gray-800/30 border-gray-700/50 text-gray-500 cursor-not-allowed"
                }`}
             >
                Discord
             </button>
             <button
                type="button"
                disabled={!envConfig.googleToggle}
                className={`flex-1 py-2 rounded-xl text-sm font-medium transition-colors border backdrop-blur-sm shadow-md flex justify-center items-center ${
                  envConfig.googleToggle 
                    ? "bg-white/90 border-white text-gray-800 hover:bg-white" 
                    : "bg-gray-800/30 border-gray-700/50 text-gray-500 cursor-not-allowed"
                }`}
             >
                Google
             </button>
             <button
                type="button"
                disabled={!envConfig.smtpToggle}
                className={`flex-1 py-2 rounded-xl text-sm font-medium transition-colors border backdrop-blur-sm shadow-md flex justify-center items-center ${
                  envConfig.smtpToggle 
                    ? "bg-red-500/80 border-red-500 text-white hover:bg-red-500" 
                    : "bg-gray-800/30 border-gray-700/50 text-gray-500 cursor-not-allowed"
                }`}
             >
                Gmail
             </button>
          </div>
        </form>

        <button 
          onClick={(e) => {
            e.stopPropagation();
            setIsFocused(false);
          }}
          className="mt-8 px-6 py-2 rounded-full glass-panel text-on-surface-variant hover:text-on-surface transition-colors text-sm shadow-lg"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
