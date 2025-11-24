'use client';

import React, { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import dynamic from 'next/dynamic';

// Dynamically import the dashboard to avoid SSR issues
const ProviderDashboardDark = dynamic(
  () => import('./ProviderDashboardDark'),
  { ssr: false }
);

type Platform = 'windows' | 'mac' | 'linux';

export default function BecomeProviderSection() {
  const { connected, publicKey } = useWallet();
  const [showDashboard, setShowDashboard] = useState(false);
  const [showSetup, setShowSetup] = useState(false);
  const [copied, setCopied] = useState(false);
  const [platform, setPlatform] = useState<Platform>('windows');
  const [activeStep, setActiveStep] = useState(1);

  useEffect(() => {
    // Detect user's operating system
    const detectOS = () => {
      const userAgent = window.navigator.userAgent.toLowerCase();
      const platform = window.navigator.platform?.toLowerCase() || '';
      
      if (platform.includes('win') || userAgent.includes('windows')) {
        setPlatform('windows');
      } else if (platform.includes('mac') || userAgent.includes('mac')) {
        setPlatform('mac');
      } else if (platform.includes('linux') || userAgent.includes('linux')) {
        setPlatform('linux');
      }
    };
    
    detectOS();
  }, []);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Platform-specific Docker installation commands
  const dockerInstallCommands = {
    windows: {
      title: 'Windows (PowerShell as Administrator)',
      steps: [
        {
          label: 'Download Docker Desktop',
          command: 'Start-Process "https://desktop.docker.com/win/stable/Docker%20Desktop%20Installer.exe"',
          note: 'Or visit: https://docker.com/products/docker-desktop'
        },
        {
          label: 'Install via Chocolatey (Alternative)',
          command: 'choco install docker-desktop',
          note: 'Requires Chocolatey package manager'
        }
      ]
    },
    mac: {
      title: 'macOS',
      steps: [
        {
          label: 'Install via Homebrew',
          command: 'brew install --cask docker',
          note: 'Requires Homebrew'
        },
        {
          label: 'Download Docker Desktop (Alternative)',
          command: 'open https://desktop.docker.com/mac/stable/Docker.dmg',
          note: 'Direct download from Docker'
        }
      ]
    },
    linux: {
      title: 'Linux (Ubuntu/Debian)',
      steps: [
        {
          label: 'Quick Install Script',
          command: 'curl -fsSL https://get.docker.com | sh',
          note: 'Works on most Linux distributions'
        },
        {
          label: 'Add user to docker group',
          command: 'sudo usermod -aG docker $USER',
          note: 'Logout and login again after this'
        }
      ]
    }
  };

  // Platform-specific run commands
  const getRunCommand = () => {
    const wallet = publicKey?.toBase58() || 'YOUR_WALLET_ADDRESS';
    
    if (platform === 'windows') {
      return `docker run -d --name whistle-cache \`
  -e WALLET=${wallet} \`
  -p 8545:8545 \`
  --restart unless-stopped \`
  whistlenet/cache-node`;
    }
    
    return `docker run -d --name whistle-cache \\
  -e WALLET=${wallet} \\
  -p 8545:8545 \\
  --restart unless-stopped \\
  whistlenet/cache-node`;
  };

  if (showDashboard) {
    return (
      <div className="fixed inset-0 z-50 bg-black/95 overflow-auto">
        <button 
          onClick={() => setShowDashboard(false)}
          className="fixed top-4 right-4 z-10 text-white/70 hover:text-white transition-colors"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
        <ProviderDashboardDark />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="text-xs text-gray-400 leading-relaxed">
        Run a WHISTLE cache node and earn SOL by serving RPC queries to the network.
      </div>

      <div className="space-y-2">
        <div className="flex items-start gap-2">
          <span className="text-green-400 text-xs mt-0.5">✓</span>
          <span className="text-xs text-gray-300">Earn $50-500/month</span>
        </div>
        <div className="flex items-start gap-2">
          <span className="text-green-400 text-xs mt-0.5">✓</span>
          <span className="text-xs text-gray-300">5 minute setup</span>
        </div>
        <div className="flex items-start gap-2">
          <span className="text-green-400 text-xs mt-0.5">✓</span>
          <span className="text-xs text-gray-300">Low requirements (2GB RAM)</span>
        </div>
      </div>

      {!showSetup ? (
        <div className="flex gap-2">
          <button
            onClick={() => setShowSetup(true)}
            className="btn-primary flex-1"
          >
            QUICK START
          </button>
          
          {connected && (
            <button
              onClick={() => setShowDashboard(true)}
              className="btn-secondary flex-1"
            >
              DASHBOARD
            </button>
          )}
        </div>
      ) : (
        <div className="bg-black/40 rounded-lg p-4 space-y-3 border border-white/10">
          <div className="flex justify-between items-center mb-3">
            <h4 className="text-xs font-semibold text-white/90 tracking-wider">
              QUICK SETUP - START EARNING IN 5 MINUTES
            </h4>
            
            {/* Platform Selector */}
            <div className="flex gap-1">
              <button
                onClick={() => setPlatform('windows')}
                className={`text-[9px] px-2 py-1 rounded transition-colors ${
                  platform === 'windows' 
                    ? 'bg-blue-500/30 text-blue-400 border border-blue-500/50' 
                    : 'bg-white/5 text-gray-500 hover:bg-white/10'
                }`}
              >
                WINDOWS
              </button>
              <button
                onClick={() => setPlatform('mac')}
                className={`text-[9px] px-2 py-1 rounded transition-colors ${
                  platform === 'mac' 
                    ? 'bg-blue-500/30 text-blue-400 border border-blue-500/50' 
                    : 'bg-white/5 text-gray-500 hover:bg-white/10'
                }`}
              >
                MAC
              </button>
              <button
                onClick={() => setPlatform('linux')}
                className={`text-[9px] px-2 py-1 rounded transition-colors ${
                  platform === 'linux' 
                    ? 'bg-blue-500/30 text-blue-400 border border-blue-500/50' 
                    : 'bg-white/5 text-gray-500 hover:bg-white/10'
                }`}
              >
                LINUX
              </button>
            </div>
          </div>
          
          {/* Step 1: Install Docker */}
          <div className={`transition-opacity ${activeStep === 1 ? 'opacity-100' : 'opacity-60'}`}>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[10px] text-gray-500 uppercase tracking-wider">
                STEP 1: INSTALL DOCKER
              </span>
              {activeStep > 1 && <span className="text-green-400 text-[10px]">✓</span>}
            </div>
            
            {dockerInstallCommands[platform].steps.map((step, idx) => (
              <div key={idx} className="mb-2">
                <p className="text-[9px] text-gray-600 mb-1">{step.label}:</p>
                <div className="bg-black/60 p-2 rounded flex justify-between items-center group">
                  <code className="text-[10px] text-green-400 font-mono overflow-x-auto">
                    {step.command}
                  </code>
                  <button
                    onClick={() => copyToClipboard(step.command)}
                    className="text-[9px] px-2 py-1 bg-white/10 hover:bg-white/20 rounded transition-colors ml-2 flex-shrink-0"
                  >
                    COPY
                  </button>
                </div>
                {step.note && (
                  <p className="text-[8px] text-gray-600 mt-1">{step.note}</p>
                )}
              </div>
            ))}
            
            {activeStep === 1 && (
              <button
                onClick={() => setActiveStep(2)}
                className="w-full text-[10px] py-2 bg-green-500/20 hover:bg-green-500/30 rounded transition-colors text-green-400 mt-2"
              >
                DOCKER INSTALLED → NEXT STEP
              </button>
            )}
          </div>

          {/* Step 2: Run Cache Node */}
          {activeStep >= 2 && (
            <div className={`transition-opacity ${activeStep === 2 ? 'opacity-100' : 'opacity-60'}`}>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[10px] text-gray-500 uppercase tracking-wider">
                  STEP 2: RUN CACHE NODE
                </span>
                {activeStep > 2 && <span className="text-green-400 text-[10px]">✓</span>}
              </div>
              
              <div className="bg-black/60 p-3 rounded">
                <code className="text-[10px] text-green-400 font-mono block whitespace-pre-wrap break-all">
                  {getRunCommand()}
                </code>
                <button
                  onClick={() => copyToClipboard(getRunCommand().replace(/\`|\\/g, ''))}
                  className="text-[9px] px-2 py-1 bg-white/10 hover:bg-white/20 rounded transition-colors mt-2"
                >
                  COPY COMMAND
                </button>
              </div>
              
              {activeStep === 2 && (
                <button
                  onClick={() => setActiveStep(3)}
                  className="w-full text-[10px] py-2 bg-green-500/20 hover:bg-green-500/30 rounded transition-colors text-green-400 mt-2"
                >
                  NODE RUNNING → VERIFY
                </button>
              )}
            </div>
          )}

          {/* Step 3: Verify */}
          {activeStep >= 3 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[10px] text-gray-500 uppercase tracking-wider">
                  STEP 3: VERIFY NODE
                </span>
              </div>
              
              <div className="bg-green-500/10 border border-green-500/30 rounded p-3 space-y-2">
                <p className="text-[11px] text-green-400">
                  ✓ Your node is running and earning SOL!
                </p>
                
                <div className="text-[9px] text-gray-400 space-y-1">
                  <p>Check status:</p>
                  <code className="block bg-black/50 p-1 rounded">docker ps</code>
                  <p>View logs:</p>
                  <code className="block bg-black/50 p-1 rounded">docker logs whistle-cache</code>
                  <p>Check metrics:</p>
                  <code className="block bg-black/50 p-1 rounded">curl http://localhost:8545/metrics</code>
                </div>
              </div>
            </div>
          )}

          <button
            onClick={() => {
              setShowSetup(false);
              setActiveStep(1);
            }}
            className="w-full text-[10px] py-2 bg-white/5 hover:bg-white/10 rounded transition-colors text-gray-400"
          >
            CLOSE SETUP GUIDE
          </button>
        </div>
      )}

      <div className="pt-3 border-t border-white/10">
        <div className="text-[9px] text-gray-500 tracking-widest mb-2">REQUIREMENTS</div>
        <div className="space-y-1 text-[10px] text-gray-400">
          <div>• Min: 2GB RAM, 10GB storage</div>
          <div>• Recommended: $6/mo VPS</div>
          <div>• Earnings: $50-500/month</div>
          <div>• No staking required</div>
        </div>
      </div>
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import dynamic from 'next/dynamic';

// Dynamically import the dashboard to avoid SSR issues
const ProviderDashboardDark = dynamic(
  () => import('./ProviderDashboardDark'),
  { ssr: false }
);

type Platform = 'windows' | 'mac' | 'linux';

export default function BecomeProviderSection() {
  const { connected, publicKey } = useWallet();
  const [showDashboard, setShowDashboard] = useState(false);
  const [showSetup, setShowSetup] = useState(false);
  const [copied, setCopied] = useState(false);
  const [platform, setPlatform] = useState<Platform>('windows');
  const [activeStep, setActiveStep] = useState(1);

  useEffect(() => {
    // Detect user's operating system
    const detectOS = () => {
      const userAgent = window.navigator.userAgent.toLowerCase();
      const platform = window.navigator.platform?.toLowerCase() || '';
      
      if (platform.includes('win') || userAgent.includes('windows')) {
        setPlatform('windows');
      } else if (platform.includes('mac') || userAgent.includes('mac')) {
        setPlatform('mac');
      } else if (platform.includes('linux') || userAgent.includes('linux')) {
        setPlatform('linux');
      }
    };
    
    detectOS();
  }, []);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Platform-specific Docker installation commands
  const dockerInstallCommands = {
    windows: {
      title: 'Windows (PowerShell as Administrator)',
      steps: [
        {
          label: 'Download Docker Desktop',
          command: 'Start-Process "https://desktop.docker.com/win/stable/Docker%20Desktop%20Installer.exe"',
          note: 'Or visit: https://docker.com/products/docker-desktop'
        },
        {
          label: 'Install via Chocolatey (Alternative)',
          command: 'choco install docker-desktop',
          note: 'Requires Chocolatey package manager'
        }
      ]
    },
    mac: {
      title: 'macOS',
      steps: [
        {
          label: 'Install via Homebrew',
          command: 'brew install --cask docker',
          note: 'Requires Homebrew'
        },
        {
          label: 'Download Docker Desktop (Alternative)',
          command: 'open https://desktop.docker.com/mac/stable/Docker.dmg',
          note: 'Direct download from Docker'
        }
      ]
    },
    linux: {
      title: 'Linux (Ubuntu/Debian)',
      steps: [
        {
          label: 'Quick Install Script',
          command: 'curl -fsSL https://get.docker.com | sh',
          note: 'Works on most Linux distributions'
        },
        {
          label: 'Add user to docker group',
          command: 'sudo usermod -aG docker $USER',
          note: 'Logout and login again after this'
        }
      ]
    }
  };

  // Platform-specific run commands
  const getRunCommand = () => {
    const wallet = publicKey?.toBase58() || 'YOUR_WALLET_ADDRESS';
    
    if (platform === 'windows') {
      return `docker run -d --name whistle-cache \`
  -e WALLET=${wallet} \`
  -p 8545:8545 \`
  --restart unless-stopped \`
  whistlenet/cache-node`;
    }
    
    return `docker run -d --name whistle-cache \\
  -e WALLET=${wallet} \\
  -p 8545:8545 \\
  --restart unless-stopped \\
  whistlenet/cache-node`;
  };

  if (showDashboard) {
    return (
      <div className="fixed inset-0 z-50 bg-black/95 overflow-auto">
        <button 
          onClick={() => setShowDashboard(false)}
          className="fixed top-4 right-4 z-10 text-white/70 hover:text-white transition-colors"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
        <ProviderDashboardDark />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="text-xs text-gray-400 leading-relaxed">
        Run a WHISTLE cache node and earn SOL by serving RPC queries to the network.
      </div>

      <div className="space-y-2">
        <div className="flex items-start gap-2">
          <span className="text-green-400 text-xs mt-0.5">✓</span>
          <span className="text-xs text-gray-300">Earn $50-500/month</span>
        </div>
        <div className="flex items-start gap-2">
          <span className="text-green-400 text-xs mt-0.5">✓</span>
          <span className="text-xs text-gray-300">5 minute setup</span>
        </div>
        <div className="flex items-start gap-2">
          <span className="text-green-400 text-xs mt-0.5">✓</span>
          <span className="text-xs text-gray-300">Low requirements (2GB RAM)</span>
        </div>
      </div>

      {!showSetup ? (
        <div className="flex gap-2">
          <button
            onClick={() => setShowSetup(true)}
            className="btn-primary flex-1"
          >
            QUICK START
          </button>
          
          {connected && (
            <button
              onClick={() => setShowDashboard(true)}
              className="btn-secondary flex-1"
            >
              DASHBOARD
            </button>
          )}
        </div>
      ) : (
        <div className="bg-black/40 rounded-lg p-4 space-y-3 border border-white/10">
          <div className="flex justify-between items-center mb-3">
            <h4 className="text-xs font-semibold text-white/90 tracking-wider">
              QUICK SETUP - START EARNING IN 5 MINUTES
            </h4>
            
            {/* Platform Selector */}
            <div className="flex gap-1">
              <button
                onClick={() => setPlatform('windows')}
                className={`text-[9px] px-2 py-1 rounded transition-colors ${
                  platform === 'windows' 
                    ? 'bg-blue-500/30 text-blue-400 border border-blue-500/50' 
                    : 'bg-white/5 text-gray-500 hover:bg-white/10'
                }`}
              >
                WINDOWS
              </button>
              <button
                onClick={() => setPlatform('mac')}
                className={`text-[9px] px-2 py-1 rounded transition-colors ${
                  platform === 'mac' 
                    ? 'bg-blue-500/30 text-blue-400 border border-blue-500/50' 
                    : 'bg-white/5 text-gray-500 hover:bg-white/10'
                }`}
              >
                MAC
              </button>
              <button
                onClick={() => setPlatform('linux')}
                className={`text-[9px] px-2 py-1 rounded transition-colors ${
                  platform === 'linux' 
                    ? 'bg-blue-500/30 text-blue-400 border border-blue-500/50' 
                    : 'bg-white/5 text-gray-500 hover:bg-white/10'
                }`}
              >
                LINUX
              </button>
            </div>
          </div>
          
          {/* Step 1: Install Docker */}
          <div className={`transition-opacity ${activeStep === 1 ? 'opacity-100' : 'opacity-60'}`}>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[10px] text-gray-500 uppercase tracking-wider">
                STEP 1: INSTALL DOCKER
              </span>
              {activeStep > 1 && <span className="text-green-400 text-[10px]">✓</span>}
            </div>
            
            {dockerInstallCommands[platform].steps.map((step, idx) => (
              <div key={idx} className="mb-2">
                <p className="text-[9px] text-gray-600 mb-1">{step.label}:</p>
                <div className="bg-black/60 p-2 rounded flex justify-between items-center group">
                  <code className="text-[10px] text-green-400 font-mono overflow-x-auto">
                    {step.command}
                  </code>
                  <button
                    onClick={() => copyToClipboard(step.command)}
                    className="text-[9px] px-2 py-1 bg-white/10 hover:bg-white/20 rounded transition-colors ml-2 flex-shrink-0"
                  >
                    COPY
                  </button>
                </div>
                {step.note && (
                  <p className="text-[8px] text-gray-600 mt-1">{step.note}</p>
                )}
              </div>
            ))}
            
            {activeStep === 1 && (
              <button
                onClick={() => setActiveStep(2)}
                className="w-full text-[10px] py-2 bg-green-500/20 hover:bg-green-500/30 rounded transition-colors text-green-400 mt-2"
              >
                DOCKER INSTALLED → NEXT STEP
              </button>
            )}
          </div>

          {/* Step 2: Run Cache Node */}
          {activeStep >= 2 && (
            <div className={`transition-opacity ${activeStep === 2 ? 'opacity-100' : 'opacity-60'}`}>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[10px] text-gray-500 uppercase tracking-wider">
                  STEP 2: RUN CACHE NODE
                </span>
                {activeStep > 2 && <span className="text-green-400 text-[10px]">✓</span>}
              </div>
              
              <div className="bg-black/60 p-3 rounded">
                <code className="text-[10px] text-green-400 font-mono block whitespace-pre-wrap break-all">
                  {getRunCommand()}
                </code>
                <button
                  onClick={() => copyToClipboard(getRunCommand().replace(/\`|\\/g, ''))}
                  className="text-[9px] px-2 py-1 bg-white/10 hover:bg-white/20 rounded transition-colors mt-2"
                >
                  COPY COMMAND
                </button>
              </div>
              
              {activeStep === 2 && (
                <button
                  onClick={() => setActiveStep(3)}
                  className="w-full text-[10px] py-2 bg-green-500/20 hover:bg-green-500/30 rounded transition-colors text-green-400 mt-2"
                >
                  NODE RUNNING → VERIFY
                </button>
              )}
            </div>
          )}

          {/* Step 3: Verify */}
          {activeStep >= 3 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[10px] text-gray-500 uppercase tracking-wider">
                  STEP 3: VERIFY NODE
                </span>
              </div>
              
              <div className="bg-green-500/10 border border-green-500/30 rounded p-3 space-y-2">
                <p className="text-[11px] text-green-400">
                  ✓ Your node is running and earning SOL!
                </p>
                
                <div className="text-[9px] text-gray-400 space-y-1">
                  <p>Check status:</p>
                  <code className="block bg-black/50 p-1 rounded">docker ps</code>
                  <p>View logs:</p>
                  <code className="block bg-black/50 p-1 rounded">docker logs whistle-cache</code>
                  <p>Check metrics:</p>
                  <code className="block bg-black/50 p-1 rounded">curl http://localhost:8545/metrics</code>
                </div>
              </div>
            </div>
          )}

          <button
            onClick={() => {
              setShowSetup(false);
              setActiveStep(1);
            }}
            className="w-full text-[10px] py-2 bg-white/5 hover:bg-white/10 rounded transition-colors text-gray-400"
          >
            CLOSE SETUP GUIDE
          </button>
        </div>
      )}

      <div className="pt-3 border-t border-white/10">
        <div className="text-[9px] text-gray-500 tracking-widest mb-2">REQUIREMENTS</div>
        <div className="space-y-1 text-[10px] text-gray-400">
          <div>• Min: 2GB RAM, 10GB storage</div>
          <div>• Recommended: $6/mo VPS</div>
          <div>• Earnings: $50-500/month</div>
          <div>• No staking required</div>
        </div>
      </div>
    </div>
  );
}
