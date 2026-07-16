import { coreClient } from '@/lib/coreClient';

export default async function DashboardPage() {
  let containers: any[] = [];
  let error = '';

  try {
    containers = await coreClient.get('/docker/containers');
  } catch (err: any) {
    error = err.message || 'Failed to connect to Hex Core';
  }

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Overview</h2>
      
      {error && (
        <div className="mb-6 rounded-md bg-red-900/50 p-4 border border-red-500/50">
          <div className="text-sm text-red-400">Core Connection Error: {error}</div>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
        <div className="rounded-xl border border-gray-800 bg-gray-900 p-6 shadow-sm">
          <p className="text-sm font-medium text-gray-400">Total Servers</p>
          <p className="text-3xl font-bold mt-2">1</p>
        </div>
        <div className="rounded-xl border border-gray-800 bg-gray-900 p-6 shadow-sm">
          <p className="text-sm font-medium text-gray-400">Active Containers</p>
          <p className="text-3xl font-bold mt-2">{containers.length}</p>
        </div>
      </div>

      <h3 className="text-xl font-semibold mb-4">Containers</h3>
      <div className="overflow-hidden rounded-xl border border-gray-800 bg-gray-900">
        <table className="min-w-full divide-y divide-gray-800">
          <thead>
            <tr className="bg-gray-950/50">
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400">Image</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {containers.map((c) => (
              <tr key={c.id} className="hover:bg-gray-800/50 cursor-pointer transition-colors">
                <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-white">
                  <a href={`/dashboard/servers/${c.id}`} className="block h-full w-full text-blue-400 hover:text-blue-300">
                    {c.name.replace('/', '')}
                  </a>
                </td>
                <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-300">{c.image}</td>
                <td className="whitespace-nowrap px-6 py-4 text-sm">
                  <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    c.state === 'running' ? 'bg-green-500/10 text-green-400' : 'bg-gray-500/10 text-gray-400'
                  }`}>
                    {c.status}
                  </span>
                </td>
              </tr>
            ))}
            {containers.length === 0 && !error && (
              <tr>
                <td colSpan={3} className="px-6 py-4 text-center text-sm text-gray-500">No containers running on this Core.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
