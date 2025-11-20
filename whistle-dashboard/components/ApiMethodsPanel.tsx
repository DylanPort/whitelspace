'use client';

import { useState } from 'react';
import PanelFrame from './PanelFrame';

export default function ApiMethodsPanel() {
  const [copiedText, setCopiedText] = useState<string | null>(null);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(label);
    setTimeout(() => setCopiedText(null), 2000);
  };

  const endpoint = 'https://rpc.whistle.ninja/rpc';

  const jsCode = `import { Connection } from '@solana/web3.js';

const connection = new Connection(
  '${endpoint}'
);

const slot = await connection.getSlot();`;

  const pythonCode = `from solana.rpc.api import Client

client = Client("${endpoint}")

response = client.get_slot()`;

  const curlCode = `curl -X POST ${endpoint} \\
  -H "Content-Type: application/json" \\
  -d '{"jsonrpc":"2.0","id":1,"method":"getSlot"}'`;

  return (
    <PanelFrame
      cornerType="silver"
      className="h-[280px] flex flex-col"
      motionProps={{
        initial: { opacity: 0, x: -50 },
        animate: { opacity: 1, x: 0 },
        transition: { duration: 0.6, delay: 0.5 }
      }}
    >
      <h3 className="text-[11px] font-semibold mb-3 tracking-[0.15em]">
        RPC INTEGRATION
      </h3>

      <div className="space-y-3 overflow-y-auto pr-2 flex-1 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
        {/* Quick Start */}
        <div>
          <div className="text-[10px] text-emerald-400 font-semibold mb-2">QUICK START</div>
          <div className="space-y-2 text-[9px] text-gray-400 leading-relaxed">
            <div className="flex gap-2">
              <span className="text-gray-600">•</span>
              <span>Use our public RPC endpoint for free</span>
            </div>
            <div className="flex gap-2">
              <span className="text-gray-600">•</span>
              <span>100 requests/minute per IP</span>
            </div>
            <div className="flex gap-2">
              <span className="text-gray-600">•</span>
              <span>Global CDN - low latency worldwide</span>
            </div>
          </div>
        </div>

        {/* Endpoint */}
        <div className="pt-2 border-t border-white/10">
          <div className="text-[10px] text-emerald-400 font-semibold mb-2">ENDPOINT</div>
          <div 
            className="p-2 bg-black/30 rounded border border-emerald-500/20 cursor-pointer hover:bg-black/40 transition-colors relative group"
            onClick={() => copyToClipboard(endpoint, 'endpoint')}
          >
            <code className="text-[9px] text-emerald-300 font-mono break-all">
              {endpoint}
            </code>
            <div className="absolute top-1 right-1 text-[8px] text-gray-500 group-hover:text-emerald-400 transition-colors">
              {copiedText === 'endpoint' ? '✓' : '📋'}
            </div>
          </div>
        </div>

        {/* JavaScript Example */}
        <div className="pt-2 border-t border-white/10">
          <div className="text-[10px] text-emerald-400 font-semibold mb-2">JAVASCRIPT</div>
          <div 
            className="p-2 bg-black/30 rounded border border-white/10 cursor-pointer hover:bg-black/40 transition-colors relative group"
            onClick={() => copyToClipboard(jsCode, 'js')}
          >
            <pre className="text-[8px] text-gray-300 font-mono leading-relaxed overflow-x-auto">
{jsCode}
            </pre>
            <div className="absolute top-1 right-1 text-[8px] text-gray-500 group-hover:text-emerald-400 transition-colors">
              {copiedText === 'js' ? '✓' : '📋'}
            </div>
          </div>
        </div>

        {/* Python Example */}
        <div className="pt-2 border-t border-white/10">
          <div className="text-[10px] text-emerald-400 font-semibold mb-2">PYTHON</div>
          <div 
            className="p-2 bg-black/30 rounded border border-white/10 cursor-pointer hover:bg-black/40 transition-colors relative group"
            onClick={() => copyToClipboard(pythonCode, 'python')}
          >
            <pre className="text-[8px] text-gray-300 font-mono leading-relaxed overflow-x-auto">
{pythonCode}
            </pre>
            <div className="absolute top-1 right-1 text-[8px] text-gray-500 group-hover:text-emerald-400 transition-colors">
              {copiedText === 'python' ? '✓' : '📋'}
            </div>
          </div>
        </div>

        {/* cURL Example */}
        <div className="pt-2 border-t border-white/10">
          <div className="text-[10px] text-emerald-400 font-semibold mb-2">cURL</div>
          <div 
            className="p-2 bg-black/30 rounded border border-white/10 cursor-pointer hover:bg-black/40 transition-colors relative group"
            onClick={() => copyToClipboard(curlCode, 'curl')}
          >
            <pre className="text-[8px] text-gray-300 font-mono leading-relaxed overflow-x-auto">
{curlCode}
            </pre>
            <div className="absolute top-1 right-1 text-[8px] text-gray-500 group-hover:text-emerald-400 transition-colors">
              {copiedText === 'curl' ? '✓' : '📋'}
            </div>
          </div>
        </div>

        {/* Features */}
        <div className="pt-3 border-t border-white/10">
          <div className="text-[10px] text-gray-500 font-semibold mb-2">FEATURES</div>
          <div className="space-y-1 text-[9px] text-gray-500">
            <div className="flex gap-2">
              <span>✓</span>
              <span>Full Solana mainnet access</span>
            </div>
            <div className="flex gap-2">
              <span>✓</span>
              <span>All standard JSON-RPC methods</span>
            </div>
            <div className="flex gap-2">
              <span>✓</span>
              <span>Rate limit headers included</span>
            </div>
            <div className="flex gap-2">
              <span>✓</span>
              <span>CORS enabled for web apps</span>
            </div>
          </div>
        </div>
      </div>
    </PanelFrame>
  );
}
