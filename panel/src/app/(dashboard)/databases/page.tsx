'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface DatabaseInstance {
  id: string;
  type: string;
  name: string;
  connectionString: string;
  status: string;
}

export default function DatabasesPage() {
  const [databases, setDatabases] = useState<DatabaseInstance[]>([]);
  const [loading, setLoading] = useState(true);
  const [type, setType] = useState('postgres');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [provisioning, setProvisioning] = useState(false);
  const router = useRouter();

  const fetchDatabases = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/databases');
      if (res.ok) {
        const data = await res.json();
        setDatabases(data || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDatabases();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setProvisioning(true);

    if (!name) return;

    try {
      const res = await fetch('/api/databases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, name }),
      });
      if (res.ok) {
        setSuccess(`Database ${name} provisioned successfully!`);
        setName('');
        fetchDatabases();
      } else {
        const data = await res.json();
        setError(data.error);
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setProvisioning(false);
    }
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Database Provisioning</h2>
          <p className="text-sm text-gray-400 mt-1">Automatically spin up isolated databases connected to the hex_internal network.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        <div className="xl:col-span-1">
          <div className="rounded-xl border border-gray-800 bg-gray-900 p-6 shadow-sm">
            <h3 className="text-lg font-semibold mb-4">Provision Database</h3>
            
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

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Database Engine</label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  className="block w-full rounded-md border-0 bg-gray-800 py-2 px-3 text-white ring-1 ring-inset ring-gray-700 focus:ring-2 focus:ring-blue-500 sm:text-sm"
                >
                  <option value="postgres">PostgreSQL 15</option>
                  <option value="redis">Redis</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Logical Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g., prod-db"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="block w-full rounded-md border-0 bg-gray-800 py-2 px-3 text-white ring-1 ring-inset ring-gray-700 focus:ring-2 focus:ring-blue-500 sm:text-sm"
                />
              </div>

              <button
                type="submit"
                disabled={provisioning}
                className="w-full flex justify-center rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:opacity-50"
              >
                {provisioning ? 'Provisioning...' : 'Create Database'}
              </button>
            </form>
          </div>
        </div>

        <div className="xl:col-span-2">
          <div className="rounded-xl border border-gray-800 bg-gray-900 p-0 shadow-sm overflow-hidden overflow-x-auto">
            {loading ? (
              <div className="p-6 text-gray-400">Loading databases...</div>
            ) : (
              <table className="min-w-full divide-y divide-gray-800">
                <thead className="bg-gray-900">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400">Engine</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400">Connection String (Internal)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800 bg-gray-900">
                  {databases.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-6 py-4 text-center text-sm text-gray-400">No databases provisioned yet.</td>
                    </tr>
                  ) : (
                    databases.map((db) => (
                      <tr key={db.id} className="hover:bg-gray-800/50 transition-colors">
                        <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-white">{db.name}</td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-300 capitalize">{db.type}</td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm">
                          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                            db.status === 'running' ? 'bg-green-500/10 text-green-400' : 'bg-gray-500/10 text-gray-400'
                          }`}>
                            {db.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm font-mono text-gray-400 break-all select-all">
                          {db.connectionString}
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
