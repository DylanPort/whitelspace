'use client';

import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to console
    console.error('Application Error:', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center p-8">
      <div className="max-w-lg w-full">
        <div className="bg-red-900/20 border-2 border-red-500/30 p-8 text-center">
          <h2 className="text-2xl font-bold tracking-wider uppercase mb-4 text-white">
            Something went wrong!
          </h2>
          <p className="text-gray-300 mb-4 text-sm">
            {error.message || 'An unexpected error occurred'}
          </p>
          <div className="text-xs text-gray-500 mb-6 font-mono bg-black/40 p-4 text-left overflow-auto max-h-40">
            {error.stack}
          </div>
          <div className="flex gap-4">
            <button
              onClick={() => window.location.reload()}
              className="flex-1 px-6 py-3 bg-white/10 hover:bg-white/20 border border-white/20 transition-colors text-sm font-semibold tracking-wider uppercase"
            >
              Reload Page
            </button>
            <button
              onClick={reset}
              className="flex-1 px-6 py-3 bg-white hover:bg-gray-200 text-black border border-white transition-colors text-sm font-semibold tracking-wider uppercase"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

