"use client";
import { useState, useEffect } from "react";

export default function DesktopLayoutClient({
  children,
  defaultWallpaper,
  links,
}: {
  children: React.ReactNode;
  defaultWallpaper: string;
  links: { discord: string; github: string; feedback: string };
}) {
  const [wallpaper, setWallpaper] = useState<string>(`/wallpaper/${defaultWallpaper}`);

  useEffect(() => {
    const loadWallpaper = () => {
      const custom = localStorage.getItem("hex_wallpaper");
      if (custom) {
        setWallpaper(custom);
      } else {
        setWallpaper(`/wallpaper/${defaultWallpaper}`);
      }
    };
    
    loadWallpaper();
    window.addEventListener('wallpaper-changed', loadWallpaper);
    return () => window.removeEventListener('wallpaper-changed', loadWallpaper);
  }, [defaultWallpaper]);

  return (
    <>
      {/* Background Layer */}
      <div className="fixed inset-0 z-0">
        <div
          className="w-full h-full bg-cover bg-center transition-all duration-500"
          style={{ backgroundImage: `url(${wallpaper.startsWith('data:') ? '' : "'"}${wallpaper}${wallpaper.startsWith('data:') ? '' : "'"})` }}
        />
        <div className="absolute inset-0 bg-custom-overlay" />
      </div>

      {/* Main Content */}
      <main className="relative z-10 h-screen w-full overflow-hidden">
        {children}
      </main>


    </>
  );
}
