'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function ProxyPage() {
  const [domain, setDomain] = useState('');
  const [targetUrl, setTargetUrl] = useState('http://localhost:3000');
  const [enableSsl, setEnableSsl] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const router = useRouter();

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const res = await fetch('/api/proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain, targetUrl, enableSsl }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to create proxy host');
      }

      setSuccess(`Successfully configured reverse proxy for ${domain}. Nginx reloaded.`);
      setDomain('');
      setTargetUrl('http://localhost:3000');
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
          <h2 className="text-2xl font-bold">Reverse Proxy</h2>
          <p className="text-sm text-gray-400 mt-1">Map public domains to your running containers.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1">
          <div className="rounded-xl border border-gray-800 bg-gray-900 p-6 shadow-sm">
            <h3 className="text-lg font-semibold mb-4">New Proxy Host</h3>
            
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
                <label className="block text-sm font-medium text-gray-300 mb-1">Domain Names</label>
                <input
                  type="text"
                  required
                  placeholder="api.example.com"
                  value={domain}
                  onChange={(e) => setDomain(e.target.value)}
                  className="block w-full rounded-md border-0 bg-gray-800 py-2 px-3 text-white ring-1 ring-inset ring-gray-700 focus:ring-2 focus:ring-blue-500 sm:text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Forward Hostname / IP</label>
                <input
                  type="text"
                  required
                  placeholder="http://localhost:3000"
                  value={targetUrl}
                  onChange={(e) => setTargetUrl(e.target.value)}
                  className="block w-full rounded-md border-0 bg-gray-800 py-2 px-3 text-white ring-1 ring-inset ring-gray-700 focus:ring-2 focus:ring-blue-500 sm:text-sm"
                />
              </div>

              <div className="flex items-center">
                <input
                  id="ssl"
                  type="checkbox"
                  checked={enableSsl}
                  onChange={(e) => setEnableSsl(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-700 bg-gray-800 text-blue-600 focus:ring-blue-600 focus:ring-offset-gray-900"
                />
                <label htmlFor="ssl" className="ml-2 block text-sm text-gray-300">
                  Request SSL Certificate (Let's Encrypt)
                </label>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:opacity-50"
              >
                {loading ? 'Saving...' : 'Save Config'}
              </button>
            </form>
          </div>
        </div>

        <div className="lg:col-span-2">
          <div className="rounded-xl border border-gray-800 bg-gray-900 p-6 shadow-sm h-full">
             <h3 className="text-lg font-semibold mb-4">Configured Hosts</h3>
             <p className="text-sm text-gray-400">Your reverse proxy rules will appear here. For development, configuration files are saved locally to Hex/core/nginx_confs/.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
