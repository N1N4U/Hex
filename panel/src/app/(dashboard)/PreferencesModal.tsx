import { useState, useEffect, useRef } from "react";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export default function PreferencesModal({ onClose }: { onClose: () => void }) {
  const [uptime, setUptime] = useState<string>("Loading...");
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [wallpaper, setWallpaper] = useState("Default Space");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load state on mount
  useEffect(() => {
    // Uptime
    fetch("/api/system/uptime")
      .then(r => r.json())
      .then(d => setUptime(d.formatted || "Unknown"))
      .catch(() => setUptime("Unknown"));

    // Theme
    const storedTheme = localStorage.getItem("hex_theme");
    if (storedTheme === "light") {
      setIsDarkMode(false);
    }
  }, []);

  const toggleTheme = () => {
    const newDark = !isDarkMode;
    setIsDarkMode(newDark);
    if (newDark) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("hex_theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("hex_theme", "light");
    }
  };

  const handleWallpaperChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      localStorage.setItem("hex_wallpaper", base64);
      setWallpaper("Custom Image");
      window.dispatchEvent(new Event('wallpaper-changed'));
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-md transition-opacity"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto no-scrollbar glass-panel rounded-3xl border border-white/10 shadow-[0_0_100px_rgba(0,0,0,0.8)] flex flex-col fade-in">
        <div className="sticky top-0 z-10 glass-panel border-b border-white/5 px-8 py-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-on-surface tracking-tight mb-1">Preferences</h2>
            <p className="text-sm text-on-surface-variant">Manage your panel settings and display preferences.</p>
          </div>
          <button 
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-on-surface-variant transition-colors"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        <div className="p-8 space-y-6">
          {/* Appearance */}
          <div className="bg-black/20 rounded-2xl border border-white/5 p-6">
            <h3 className="text-lg font-bold text-on-surface mb-6 flex items-center gap-2">
              <span className="material-symbols-outlined text-[20px] text-primary">palette</span>
              Appearance
            </h3>
            <div className="flex items-center justify-between py-3 border-b border-white/5">
              <div>
                <p className="text-sm font-semibold text-on-surface">Dark Mode</p>
                <p className="text-xs text-on-surface-variant">Toggle dark/light theme</p>
              </div>
              <div 
                onClick={toggleTheme}
                className={`w-12 h-6 rounded-full relative cursor-pointer transition-colors ${isDarkMode ? 'bg-primary' : 'bg-white/20'}`}
              >
                <div className={`absolute top-1 w-4 h-4 bg-black rounded-full transition-all ${isDarkMode ? 'right-1' : 'left-1 bg-white'}`} />
              </div>
            </div>
            
            <div className="flex items-center justify-between py-3 pt-5 border-b border-white/5">
              <div>
                <p className="text-sm font-semibold text-on-surface">Wallpaper</p>
                <p className="text-xs text-on-surface-variant">Choose your dashboard background</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="relative group">
                  <Select
                    value={wallpaper === "Custom Image" ? "Custom Image" : wallpaper}
                    onValueChange={(val) => {
                      if (val !== "Custom Image") {
                        localStorage.removeItem("hex_wallpaper");
                        setWallpaper(val);
                        window.dispatchEvent(new Event('wallpaper-changed'));
                      }
                    }}
                  >
                    <SelectTrigger className="w-[180px] bg-black/40 border border-white/10 rounded-xl text-sm font-semibold text-on-surface-variant hover:bg-white/5 transition-colors h-10 px-4">
                      <SelectValue placeholder="Select Wallpaper" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectItem value="Default Space">Default Space</SelectItem>
                        <SelectItem value="Hexagon Grid">Hexagon Grid</SelectItem>
                        <SelectItem value="Solid Color">Solid Color</SelectItem>
                        {wallpaper === "Custom Image" && <SelectItem value="Custom Image">Custom Image</SelectItem>}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>
                {wallpaper === "Custom Image" && (
                  <button 
                    onClick={() => {
                      localStorage.removeItem("hex_wallpaper");
                      setWallpaper("Default Space");
                      window.dispatchEvent(new Event('wallpaper-changed'));
                    }}
                    className="px-3 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-bold transition-colors"
                  >
                    Reset
                  </button>
                )}
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-on-surface transition-colors flex items-center gap-2"
                >
                  <span className="material-symbols-outlined text-[16px]">add_photo_alternate</span>
                  Add
                </button>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  accept="image/*" 
                  className="hidden" 
                  onChange={handleWallpaperChange}
                />
              </div>
            </div>
          </div>

          {/* Localization */}
          <div className="bg-black/20 rounded-2xl border border-white/5 p-6">
            <h3 className="text-lg font-bold text-on-surface mb-6 flex items-center gap-2">
              <span className="material-symbols-outlined text-[20px] text-primary">language</span>
              Localization
            </h3>
            <div className="flex items-center justify-between py-3 border-b border-white/5">
              <div>
                <p className="text-sm font-semibold text-on-surface">Time Zone</p>
                <p className="text-xs text-on-surface-variant">Local timezone for logs and metrics</p>
              </div>
              <div className="relative group">
                <Select defaultValue="auto">
                  <SelectTrigger className="w-[180px] bg-black/40 border border-white/10 rounded-xl text-sm text-on-surface hover:bg-white/5 transition-colors h-10 px-4">
                    <SelectValue placeholder="Time Zone" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem value="auto">Automatic (Local)</SelectItem>
                      <SelectItem value="utc">UTC</SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex items-center justify-between py-3 border-b border-white/5 mt-2">
              <div>
                <p className="text-sm font-semibold text-on-surface">Time Format</p>
                <p className="text-xs text-on-surface-variant">12 Hour or 24 Hour clock</p>
              </div>
              <div className="flex bg-black/40 rounded-xl p-1 border border-white/10">
                <button className="px-4 py-1.5 rounded-lg bg-white/10 text-on-surface text-xs font-semibold">12 Hour</button>
                <button className="px-4 py-1.5 rounded-lg text-on-surface-variant hover:text-on-surface text-xs font-semibold transition-colors">24 Hour</button>
              </div>
            </div>
            <div className="flex items-center justify-between py-3 border-b border-white/5 mt-2">
              <div>
                <p className="text-sm font-semibold text-on-surface">Date Format</p>
                <p className="text-xs text-on-surface-variant">Display format for dates</p>
              </div>
              <div className="relative group">
                <Select defaultValue="us">
                  <SelectTrigger className="w-[180px] bg-black/40 border border-white/10 rounded-xl text-sm text-on-surface hover:bg-white/5 transition-colors h-10 px-4">
                    <SelectValue placeholder="Date Format" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem value="us">MM/DD/YYYY</SelectItem>
                      <SelectItem value="eu">DD/MM/YYYY</SelectItem>
                      <SelectItem value="iso">YYYY-MM-DD</SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* System */}
          <div className="bg-black/20 rounded-2xl border border-white/5 p-6">
            <h3 className="text-lg font-bold text-on-surface mb-6 flex items-center gap-2">
              <span className="material-symbols-outlined text-[20px] text-primary">memory</span>
              System Details
            </h3>
            <div className="flex items-center justify-between py-3 border-b border-white/5">
              <div>
                <p className="text-sm font-semibold text-on-surface">Panel Uptime</p>
                <p className="text-xs text-on-surface-variant">How long the panel process has been running</p>
              </div>
              <p className="text-sm font-mono text-primary font-semibold tracking-wide bg-primary/10 px-3 py-1 rounded-lg">{uptime}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
