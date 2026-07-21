'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface FirewallRule {
  port: string;
  action: string;
  status: string;
}

export default function FirewallPage() {
  const [rules, setRules] = useState<FirewallRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [newPort, setNewPort] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const router = useRouter();

  const fetchRules = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/firewall');
      if (res.ok) {
        const data = await res.json();
        setRules(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRules();
  }, []);

  const handleAllow = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (!newPort) return;

    try {
      const res = await fetch('/api/firewall', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ port: newPort, action: 'allow' }),
      });
      if (res.ok) {
        setSuccess(`Port ${newPort} allowed successfully.`);
        setNewPort('');
        fetchRules();
      } else {
        const data = await res.json();
        setError(data.error);
      }
    } catch (e: any) {
      setError(e.message);
    }
  };

  const handleDeny = async (port: string) => {
    setError('');
    setSuccess('');
    try {
      const res = await fetch('/api/firewall', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ port, action: 'deny' }),
      });
      if (res.ok) {
        setSuccess(`Port ${port} denied and removed from allowed list.`);
        fetchRules();
      } else {
        const data = await res.json();
        setError(data.error);
      }
    } catch (e: any) {
      setError(e.message);
    }
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Firewall Manager</h2>
          <p className="text-sm text-gray-400 mt-1">Manage UFW rules directly on the host VPS.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1">
          <div className="rounded-xl border border-gray-800 bg-gray-900 p-6 shadow-sm">
            <h3 className="text-lg font-semibold mb-4">Open New Port</h3>
            
            {error && (
              <div className="mb-4 rounded-md bg-red-900/50 p-4 border border-red-500/50">
                <div className="text-sm text-red-400">{error}</div>
              </div>
            )}
            
            {success && (
              <div className="mb-4 rounded-md bg-green-900/50 p-4 border border-green-500/50">
                <div className="text-sm text-green-400">{success}</div>
              </div>
            )}

            <form onSubmit={handleAllow} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Port</label>
                <input
                  type="text"
                  required
                  placeholder="e.g., 8080/tcp or 8080"
                  value={newPort}
                  onChange={(e) => setNewPort(e.target.value)}
                  className="block w-full rounded-md border-0 bg-gray-800 py-2 px-3 text-white ring-1 ring-inset ring-gray-700 focus:ring-2 focus:ring-blue-500 sm:text-sm"
                />
              </div>

              <button
                type="submit"
                className="w-full flex justify-center rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
              >
                Allow Port
              </button>
            </form>
          </div>
        </div>

        <div className="lg:col-span-2">
          <div className="rounded-xl border border-gray-800 bg-gray-900 p-0 shadow-sm overflow-hidden">
            {loading ? (
              <div className="p-6 text-gray-400">Loading rules...</div>
            ) : (
              <table className="min-w-full divide-y divide-gray-800">
                <thead className="bg-gray-900">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400">Port</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400">Action</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400">Status</th>
                    <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-400"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800 bg-gray-900">
                  {rules.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-6 py-4 text-center text-sm text-gray-400">No open ports configured.</td>
                    </tr>
                  ) : (
                    rules.map((rule, idx) => (
                      <tr key={idx} className="hover:bg-gray-800/50 transition-colors">
                        <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-white">{rule.port}</td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-300 uppercase">{rule.action}</td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm">
                          <span className="inline-flex items-center rounded-full bg-green-500/10 px-2.5 py-0.5 text-xs font-medium text-green-400">
                            {rule.status}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-right text-sm">
                          <button
                            onClick={() => handleDeny(rule.port)}
                            className="text-red-400 hover:text-red-300"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
