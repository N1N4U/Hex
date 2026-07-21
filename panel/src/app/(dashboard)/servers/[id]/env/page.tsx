'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function EnvPage({ params }: { params: { id: string } }) {
  const [envContent, setEnvContent] = useState('Loading...');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const router = useRouter();

  // For this MVP, we parse out the deployment ID from the container name if it has the "hex-app-" prefix.
  const deployId = params.id.replace('hex-app-', '');

  useEffect(() => {
    const fetchEnv = async () => {
      try {
        const res = await fetch(`/api/servers/${deployId}/env`);
        if (res.ok) {
          const text = await res.text();
          setEnvContent(text);
        } else {
          setEnvContent('');
        }
      } catch (e) {
        setEnvContent('');
      } finally {
        setLoading(false);
      }
    };
    fetchEnv();
  }, [deployId]);

  const handleSave = async () => {
    setSaving(true);
    setMessage('');
    try {
      const res = await fetch(`/api/servers/${deployId}/env`, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain',
        },
        body: envContent,
      });
      if (res.ok) {
        setMessage('Environment variables saved successfully. Restart container to apply changes.');
      } else {
        const data = await res.json();
        setMessage(`Error: ${data.error}`);
      }
    } catch (e: any) {
      setMessage(`Error: ${e.message}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex h-full flex-col max-w-4xl mx-auto">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Environment Variables</h2>
          <p className="text-sm text-gray-400 mt-1">Manage the .env file for deployment: {deployId}</p>
        </div>
        <div>
          <button
            onClick={() => router.push(`/dashboard/servers/${params.id}`)}
            className="text-sm text-blue-400 hover:text-blue-300 mr-4"
          >
            ← Back to Terminal
          </button>
          <button
            onClick={handleSave}
            disabled={saving || loading}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>

      {message && (
        <div className={`mb-4 p-4 rounded-md text-sm border ${message.startsWith('Error') ? 'bg-red-900/50 border-red-500/50 text-red-400' : 'bg-green-900/50 border-green-500/50 text-green-400'}`}>
          {message}
        </div>
      )}

      <div className="flex-1 rounded-xl border border-gray-800 bg-gray-900 shadow-sm flex flex-col overflow-hidden">
        <textarea
          value={envContent}
          onChange={(e) => setEnvContent(e.target.value)}
          disabled={loading}
          spellCheck={false}
          className="flex-1 w-full bg-gray-950 text-gray-300 font-mono text-sm p-4 outline-none resize-none border-none focus:ring-0"
          placeholder="KEY=value&#10;DATABASE_URL=postgres://..."
        />
      </div>
    </div>
  );
}
