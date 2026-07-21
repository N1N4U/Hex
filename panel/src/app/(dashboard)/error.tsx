"use client";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center w-full h-full p-8 min-h-screen">
      <h1 className="text-red-500 text-3xl font-bold mb-4">Something went wrong</h1>
      <pre className="text-white mt-4 font-mono whitespace-pre-wrap max-w-4xl bg-red-900/50 p-4 rounded-xl text-sm overflow-auto max-h-96">
        {error.message}
        {"\n"}
        {error.stack}
      </pre>
      <button
        onClick={reset}
        className="mt-6 px-6 py-2 bg-white/10 hover:bg-white/20 rounded-xl text-white transition-colors"
      >
        Try again
      </button>
    </div>
  );
}
