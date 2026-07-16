import { getSession, clearSession } from '@/lib/session';
import { redirect } from 'next/navigation';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();

  if (!session) {
    redirect('/auth/login');
  }

  return (
    <div className="flex h-screen bg-gray-950 text-white">
      {/* Sidebar */}
      <div className="w-64 border-r border-gray-800 bg-gray-900 p-4 flex flex-col">
        <div className="mb-8">
          <h1 className="text-2xl font-bold tracking-tight text-blue-500">Hex</h1>
          <p className="text-xs text-gray-400 mt-1">Role: {session.role}</p>
        </div>
        
        <nav className="flex-1 space-y-2">
          <a href="/dashboard" className="block rounded-md bg-gray-800 px-3 py-2 text-sm font-medium text-white">Overview</a>
          <a href="/dashboard/deployments" className="block rounded-md px-3 py-2 text-sm font-medium text-gray-300 hover:bg-gray-800 hover:text-white">Deployments</a>
          <a href="/dashboard/proxy" className="block rounded-md px-3 py-2 text-sm font-medium text-gray-300 hover:bg-gray-800 hover:text-white">Reverse Proxy</a>
        </nav>

        <div className="mt-auto">
          <form action={async () => {
            'use server';
            await clearSession();
            redirect('/auth/login');
          }}>
            <button type="submit" className="w-full text-left rounded-md px-3 py-2 text-sm font-medium text-red-400 hover:bg-gray-800">
              Sign out
            </button>
          </form>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto p-8">
        {children}
      </div>
    </div>
  );
}
