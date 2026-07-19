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
  return (
    <>
      {/* Background Layer */}
      <div className="fixed inset-0 z-0">
        <div
          className="w-full h-full bg-cover bg-center"
          style={{ backgroundImage: `url('/wallpaper/${defaultWallpaper}')` }}
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
