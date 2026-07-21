'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function DeploymentsPage() {
  const [repository, setRepository] = useState('');
  const [branch, setBranch] = useState('main');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const router = useRouter();

  const handleDeploy = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const res = await fetch('/api/deployments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repository, branch }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to start deployment');
      }

      setSuccess(`Deployment triggered successfully! Job ID: ${data.id}. Check the Core logs for progress.`);
      setRepository('');
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Deployments</h2>
          <p className="text-sm text-gray-400 mt-1">Deploy an application directly from a Git Repository.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1">
          <div className="rounded-xl border border-gray-800 bg-gray-900 p-6 shadow-sm">
            <h3 className="text-lg font-semibold mb-4">New Deployment</h3>
            
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

            <form onSubmit={handleDeploy} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Git Repository URL</label>
                <input
                  type="url"
                  required
                  placeholder="https://github.com/user/repo.git"
                  value={repository}
                  onChange={(e) => setRepository(e.target.value)}
                  className="block w-full rounded-md border-0 bg-gray-800 py-2 px-3 text-white ring-1 ring-inset ring-gray-700 focus:ring-2 focus:ring-blue-500 sm:text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Branch</label>
                <input
                  type="text"
                  required
                  value={branch}
                  onChange={(e) => setBranch(e.target.value)}
                  className="block w-full rounded-md border-0 bg-gray-800 py-2 px-3 text-white ring-1 ring-inset ring-gray-700 focus:ring-2 focus:ring-blue-500 sm:text-sm"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:opacity-50"
              >
                {loading ? 'Deploying...' : 'Deploy via Docker'}
              </button>
            </form>
          </div>
        </div>

        <div className="lg:col-span-2">
          <div className="rounded-xl border border-gray-800 bg-gray-900 p-6 shadow-sm h-full">
             <h3 className="text-lg font-semibold mb-4">Deployment History</h3>
             <p className="text-sm text-gray-400">Deployment history will appear here. For now, check the Core logs or the Active Containers on the Dashboard to see your deployed applications.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
