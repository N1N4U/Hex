export default function AccountModal({ onClose }: { onClose: () => void }) {
  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      window.location.href = '/login';
    } catch (err) {
      console.error('Failed to logout', err);
    }
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
            <h2 className="text-2xl font-bold text-on-surface tracking-tight mb-1">Account</h2>
            <p className="text-sm text-on-surface-variant">Manage your profile, security, and activity.</p>
          </div>
          <button 
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-on-surface-variant transition-colors"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        <div className="p-8 space-y-6">
          {/* Profile */}
          <div className="bg-black/20 rounded-2xl border border-white/5 p-6 flex items-center gap-6">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary to-blue-500 flex items-center justify-center text-black text-3xl font-bold">
              N
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-bold text-on-surface mb-1">Nandu</h3>
              <p className="text-sm text-on-surface-variant mb-3">Administrator</p>
              <button className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-on-surface transition-colors flex items-center gap-2">
                <span className="material-symbols-outlined text-[16px]">edit</span>
                Edit Profile
              </button>
            </div>
          </div>

          {/* Activity & History */}
          <div className="bg-black/20 rounded-2xl border border-white/5 p-6">
            <h3 className="text-lg font-bold text-on-surface mb-6 flex items-center gap-2">
              <span className="material-symbols-outlined text-[20px] text-primary">history</span>
              Recent History
            </h3>
            <div className="space-y-4">
              {[
                { action: "Logged in via Web", time: "2 mins ago", ip: "192.168.78.1" },
                { action: "Connected new Core 'dev'", time: "4 hours ago", ip: "192.168.78.129" },
                { action: "Updated Settings", time: "1 day ago", ip: "192.168.78.1" }
              ].map((log, i) => (
                <div key={i} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0 last:pb-0">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-white/20" />
                    <p className="text-sm text-on-surface">{log.action}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-on-surface-variant">{log.time}</p>
                    <p className="text-[10px] text-on-surface-variant/50 font-mono mt-0.5">{log.ip}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* About */}
          <div className="bg-black/20 rounded-2xl border border-white/5 p-6">
            <h3 className="text-lg font-bold text-on-surface mb-6 flex items-center gap-2">
              <span className="material-symbols-outlined text-[20px] text-primary">info</span>
              About Hex
            </h3>
            <div className="flex items-center justify-between py-3 border-b border-white/5">
              <div>
                <p className="text-sm font-semibold text-on-surface">Version</p>
              </div>
              <p className="text-sm font-mono text-on-surface bg-white/5 px-2 py-1 rounded-md">v1.0.0-beta</p>
            </div>
            <div className="flex items-center justify-between py-3 border-b border-white/5">
              <div>
                <p className="text-sm font-semibold text-on-surface">Documentation</p>
                <p className="text-xs text-on-surface-variant">View guides and API references</p>
              </div>
              <a href="https://github.com/N1N4U/Hex" target="_blank" rel="noreferrer" className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-on-surface transition-colors flex items-center gap-2">
                <span className="material-symbols-outlined text-[16px]">open_in_new</span>
                View Docs
              </a>
            </div>
          </div>

          {/* Danger Zone */}
          <div className="pt-6 border-t border-red-500/20">
            <button 
              onClick={handleLogout}
              className="px-6 py-3 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-500 text-sm font-bold transition-colors flex items-center gap-2 w-full justify-center"
            >
              <span className="material-symbols-outlined text-[18px]">logout</span>
              Log Out
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
