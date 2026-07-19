"use client";
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const navItems = [
    { name: 'Nodes', href: '/dashboard/nodes', icon: '🖥️' },
    { name: 'Containers', href: '/dashboard/containers', icon: '🐳' },
    { name: 'Proxy Manager', href: '/dashboard/proxy', icon: '🌐' },
    { name: 'File Explorer', href: '/dashboard/files', icon: '📂' },
    { name: 'Host Terminal', href: '/dashboard/terminal', icon: '💻' },
    { name: 'System Monitor', href: '/dashboard/monitor', icon: '📈' },
  ];

  return (
    <div className="min-h-screen bg-black text-white flex">
      {/* Sidebar */}
      <aside className="w-64 bg-zinc-950 border-r border-zinc-900 flex flex-col shadow-2xl">
        <div className="p-6 border-b border-zinc-900 flex items-center justify-center">
          <div className="text-2xl font-black bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-violet-500">
            HEX PANEL
          </div>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-2">
          {navItems.map((item) => {
            const isActive = pathname.startsWith(item.href);
            return (
              <Link 
                key={item.name} 
                href={item.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 font-medium ${
                  isActive 
                    ? 'bg-gradient-to-r from-cyan-900/40 to-violet-900/40 text-cyan-400 border border-cyan-800/50 shadow-lg shadow-cyan-900/20' 
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-900 border border-transparent'
                }`}
              >
                <span className="text-xl">{item.icon}</span>
                {item.name}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-zinc-900">
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-zinc-900/50 border border-zinc-800">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-400 to-violet-500 flex items-center justify-center font-bold text-black text-sm">
              AD
            </div>
            <div>
              <p className="text-sm font-bold text-white">Admin</p>
              <p className="text-xs text-zinc-500">Superuser</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-zinc-900 via-black to-black">
        {/* Topbar */}
        <header className="h-16 border-b border-zinc-900/50 bg-black/20 backdrop-blur-md flex items-center justify-between px-8 z-10">
          <h2 className="text-lg font-medium text-zinc-300">
            {navItems.find(n => pathname.startsWith(n.href))?.name || "Dashboard"}
          </h2>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></div>
              <span className="text-xs font-bold text-emerald-400 tracking-wide uppercase">System Online</span>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 overflow-y-auto p-8 relative z-0">
          {/* Subtle background glow */}
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl -z-10 pointer-events-none"></div>
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-violet-500/5 rounded-full blur-3xl -z-10 pointer-events-none"></div>
          
          {children}
        </div>
      </main>
    </div>
  );
}
