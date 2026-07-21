'use client';

import { useEffect, useRef, useState } from 'react';
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import 'xterm/css/xterm.css';

export default function ServerDetailsPage({ params }: { params: { id: string } }) {
  const terminalRef = useRef<HTMLDivElement>(null);
  const [files, setFiles] = useState<string>('Loading files...');

  useEffect(() => {
    // 1. Fetch File Explorer Data
    const fetchFiles = async () => {
      try {
        const res = await fetch(`/api/servers/${params.id}/files?path=/`);
        if (res.ok) {
          const data = await res.text();
          setFiles(data);
        } else {
          setFiles('Failed to load files.');
        }
      } catch (e) {
        setFiles('Error loading files.');
      }
    };
    fetchFiles();

    // 2. Initialize xterm.js and WebSocket
    if (!terminalRef.current) return;

    const term = new Terminal({
      theme: {
        background: '#111827', // gray-900
        foreground: '#f3f4f6', // gray-100
        cursor: '#3b82f6', // blue-500
      },
      fontFamily: 'Menlo, Monaco, "Courier New", monospace',
    });
    
    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    term.open(terminalRef.current);
    fitAddon.fit();

    // Connect to WebSocket on Go Core
    // In production, grab the JWT token and pass it. Here we assume Core runs on 8080.
    const wsUrl = `ws://127.0.0.1:8080/docker/terminal?id=${params.id}`;
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      term.writeln('Connected to Hex WebSSH Terminal.\r\n');
    };

    ws.onmessage = (event) => {
      // If blob, read as text
      if (event.data instanceof Blob) {
        const reader = new FileReader();
        reader.onload = () => {
          term.write(reader.result as string);
        };
        reader.readAsText(event.data);
      } else {
        term.write(event.data);
      }
    };

    ws.onerror = () => {
      term.writeln('\r\nConnection error.\r\n');
    };

    term.onData((data) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(data);
      }
    });

    const handleResize = () => fitAddon.fit();
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      ws.close();
      term.dispose();
    };
  }, [params.id]);

  return (
    <div className="flex h-full flex-col">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-2xl font-bold">Server: {params.id.substring(0, 12)}</h2>
        <a 
          href={`/dashboard/servers/${params.id}/env`}
          className="rounded-md bg-gray-800 px-4 py-2 text-sm font-semibold text-gray-300 hover:bg-gray-700 border border-gray-700"
        >
          Manage .env Secrets
        </a>
      </div>

      <div className="flex flex-1 gap-6 overflow-hidden">
        {/* Left Pane: File Explorer */}
        <div className="w-1/3 rounded-xl border border-gray-800 bg-gray-900 p-4 shadow-sm flex flex-col">
          <h3 className="text-lg font-semibold mb-2">File Explorer (/)</h3>
          <div className="flex-1 overflow-auto bg-gray-950 p-3 rounded-md text-sm font-mono text-gray-300 whitespace-pre">
            {files}
          </div>
        </div>

        {/* Right Pane: Terminal */}
        <div className="w-2/3 rounded-xl border border-gray-800 bg-gray-900 p-4 shadow-sm flex flex-col">
          <h3 className="text-lg font-semibold mb-2">Terminal</h3>
          <div className="flex-1 overflow-hidden rounded-md bg-gray-950" ref={terminalRef} />
        </div>
      </div>
    </div>
  );
}
