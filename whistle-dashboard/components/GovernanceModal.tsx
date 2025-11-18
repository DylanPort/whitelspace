'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { PublicKey } from '@solana/web3.js';
import { connection } from '@/lib/contract';

interface GovernanceModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface Proposal {
  id: number;
  title: string;
  description: string;
  proposer: string;
  votesFor: number;
  votesAgainst: number;
  endTime: Date;
  executed: boolean;
  status: 'active' | 'passed' | 'rejected' | 'executed';
}

export default function GovernanceModal({ isOpen, onClose }: GovernanceModalProps) {
  const { publicKey, connected } = useWallet();
  const [activeTab, setActiveTab] = useState<'proposals' | 'create' | 'history'>('proposals');
  const [votingPower, setVotingPower] = useState(0);
  const [loading, setLoading] = useState(false);
  
  // Mock proposals - In production, fetch from smart contract
  const [proposals, setProposals] = useState<Proposal[]>([
    {
      id: 1,
      title: 'Increase Provider Bonus Pool Allocation',
      description: 'Increase provider bonus pool from 20% to 25% to attract more high-quality providers',
      proposer: '7BZQ...EKHR',
      votesFor: 150000,
      votesAgainst: 50000,
      endTime: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
      executed: false,
      status: 'active'
    },
    {
      id: 2,
      title: 'Reduce Query Cost to 0.000005 SOL',
      description: 'Lower query cost to make the network more competitive and accessible',
      proposer: '3J14...hamr4',
      votesFor: 180000,
      votesAgainst: 120000,
      endTime: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
      executed: false,
      status: 'active'
    }
  ]);

  const [newProposal, setNewProposal] = useState({
    title: '',
    description: '',
  });

  useEffect(() => {
    if (connected && publicKey) {
      // In production, fetch voting power from smart contract
      // For now, use mock data
      setVotingPower(3100000); // 3.1M access tokens = 3100 WHISTLE staked
    }
  }, [connected, publicKey]);

  const handleVote = async (proposalId: number, support: boolean) => {
    if (!connected) {
      alert('Please connect your wallet');
      return;
    }

    setLoading(true);
    try {
      // TODO: Implement actual voting transaction
      console.log(`Voting ${support ? 'FOR' : 'AGAINST'} proposal ${proposalId}`);
      
      // Mock update
      setProposals(prev => prev.map(p => 
        p.id === proposalId 
          ? {
              ...p,
              votesFor: support ? p.votesFor + votingPower : p.votesFor,
              votesAgainst: !support ? p.votesAgainst + votingPower : p.votesAgainst
            }
          : p
      ));

      alert(`Vote recorded successfully! ${votingPower.toLocaleString()} votes ${support ? 'FOR' : 'AGAINST'}`);
    } catch (error) {
      console.error('Vote failed:', error);
      alert('Failed to vote');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProposal = async () => {
    if (!connected) {
      alert('Please connect your wallet');
      return;
    }

    if (!newProposal.title || !newProposal.description) {
      alert('Please fill in all fields');
      return;
    }

    setLoading(true);
    try {
      // TODO: Implement actual proposal creation transaction
      console.log('Creating proposal:', newProposal);

      const proposal: Proposal = {
        id: proposals.length + 1,
        title: newProposal.title,
        description: newProposal.description,
        proposer: publicKey!.toBase58().slice(0, 4) + '...' + publicKey!.toBase58().slice(-4),
        votesFor: 0,
        votesAgainst: 0,
        endTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        executed: false,
        status: 'active'
      };

      setProposals(prev => [proposal, ...prev]);
      setNewProposal({ title: '', description: '' });
      setActiveTab('proposals');
      alert('Proposal created successfully!');
    } catch (error) {
      console.error('Proposal creation failed:', error);
      alert('Failed to create proposal');
    } finally {
      setLoading(false);
    }
  };

  const getTimeRemaining = (endTime: Date) => {
    const now = new Date();
    const diff = endTime.getTime() - now.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    return `${days}d ${hours}h`;
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-50 flex items-center justify-center"
            style={{
              background: 'rgba(0, 0, 0, 0.95)',
              backdropFilter: 'blur(10px)',
            }}
          />

          {/* Modal */}
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none overflow-y-auto"
          >
            <div 
              className="relative w-full max-w-5xl pointer-events-auto my-8 flex flex-col"
              style={{
                background: 'linear-gradient(135deg, rgba(22, 22, 22, 0.98) 0%, rgba(12, 12, 12, 0.98) 100%)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                backdropFilter: 'blur(30px)',
                boxShadow: `
                  0 30px 100px rgba(0, 0, 0, 0.95),
                  0 15px 50px rgba(0, 0, 0, 0.85),
                  0 8px 25px rgba(0, 0, 0, 0.75),
                  inset 0 1px 0 rgba(255, 255, 255, 0.2),
                  inset 0 -1px 0 rgba(0, 0, 0, 0.9)
                `,
                clipPath: 'polygon(20px 0, calc(100% - 20px) 0, 100% 20px, 100% calc(100% - 20px), calc(100% - 20px) 100%, 20px 100%, 0 calc(100% - 20px), 0 20px)',
                maxHeight: '85vh',
                height: '85vh',
              }}
            >
              {/* Gradient overlay */}
              <div 
                className="absolute inset-0 pointer-events-none"
                style={{
                  background: 'radial-gradient(circle at 20% 20%, rgba(255, 255, 255, 0.08) 0%, transparent 40%, rgba(0, 0, 0, 0.4) 100%)',
                  clipPath: 'inherit',
                }}
              />

              {/* Content */}
              <div className="relative flex flex-col h-full">
                {/* Header */}
                <div className="flex items-center justify-between p-8 pb-4 border-b border-white/10 flex-shrink-0">
                  <div>
                    <h2 className="text-3xl font-bold tracking-[0.2em] uppercase">
                      GOVERNANCE
                    </h2>
                    <p className="text-xs text-gray-500 mt-1">Decentralized protocol governance via access tokens</p>
                  </div>
                  <button
                    onClick={onClose}
                    className="text-3xl text-gray-400 hover:text-white transition-colors flex-shrink-0"
                  >
                    ×
                  </button>
                </div>

                {/* Status Notice */}
                <div className="px-8 pt-4">
                  <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded">
                    <div className="flex items-start gap-3">
                      <div className="text-yellow-500 text-xl flex-shrink-0">⚠</div>
                      <div>
                        <div className="text-xs font-semibold text-yellow-400 mb-1">GOVERNANCE UI - DEMO MODE</div>
                        <div className="text-[10px] text-gray-300 leading-relaxed">
                          <strong>Smart Contract Status:</strong> The contract includes <code className="bg-black/40 px-1">voting_power</code> field in StakerAccount, 
                          but full on-chain voting/proposal system is not yet implemented. This UI shows the intended governance interface. 
                          <strong className="block mt-2">Currently:</strong> Protocol changes are made by the authority. 
                          <strong className="block mt-1">Future:</strong> Community voting will be enabled via smart contract upgrade.
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Voting Power Display */}
                {connected && (
                  <div className="px-8 pt-4 pb-2">
                    <div className="flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded">
                      <div>
                        <div className="text-[10px] text-gray-500 tracking-wider mb-1">YOUR VOTING POWER (FROM STAKING)</div>
                        <div className="text-2xl font-bold text-white">{votingPower.toLocaleString()}</div>
                        <div className="text-[9px] text-gray-400 mt-1">
                          {(votingPower / 1000).toLocaleString()} WHISTLE staked = {votingPower.toLocaleString()} access tokens
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-[10px] text-gray-500 tracking-wider mb-1">WALLET</div>
                        <div className="text-xs font-mono text-gray-300">
                          {publicKey?.toBase58().slice(0, 8)}...{publicKey?.toBase58().slice(-8)}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Tabs */}
                <div className="flex border-b border-white/10 flex-shrink-0 px-8">
                  <button
                    onClick={() => setActiveTab('proposals')}
                    className={`flex-1 px-6 py-3 text-sm font-semibold tracking-wider transition-all ${
                      activeTab === 'proposals'
                        ? 'bg-white/10 text-white border-b-2 border-white'
                        : 'text-gray-500 hover:text-gray-300'
                    }`}
                  >
                    ACTIVE PROPOSALS
                  </button>
                  <button
                    onClick={() => setActiveTab('create')}
                    className={`flex-1 px-6 py-3 text-sm font-semibold tracking-wider transition-all ${
                      activeTab === 'create'
                        ? 'bg-white/10 text-white border-b-2 border-white'
                        : 'text-gray-500 hover:text-gray-300'
                    }`}
                  >
                    CREATE PROPOSAL
                  </button>
                  <button
                    onClick={() => setActiveTab('history')}
                    className={`flex-1 px-6 py-3 text-sm font-semibold tracking-wider transition-all ${
                      activeTab === 'history'
                        ? 'bg-white/10 text-white border-b-2 border-white'
                        : 'text-gray-500 hover:text-gray-300'
                    }`}
                  >
                    HISTORY
                  </button>
                </div>

                {/* Scrollable Content */}
                <div className="flex-1 overflow-y-auto p-8 scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent" style={{ minHeight: 0, maxHeight: 'calc(85vh - 400px)' }}>
                  
                  {/* Active Proposals Tab */}
                  {activeTab === 'proposals' && (
                    <div className="space-y-4">
                      {proposals.filter(p => p.status === 'active').length === 0 ? (
                        <div className="text-center py-12 text-gray-500">
                          No active proposals
                        </div>
                      ) : (
                        proposals.filter(p => p.status === 'active').map((proposal) => (
                          <div key={proposal.id} className="p-6 bg-white/5 border border-white/10 rounded">
                            <div className="flex items-start justify-between mb-4">
                              <div className="flex-1">
                                <h3 className="text-lg font-bold text-white mb-2">{proposal.title}</h3>
                                <p className="text-sm text-gray-300 mb-3">{proposal.description}</p>
                                <div className="flex items-center gap-4 text-xs text-gray-500">
                                  <span>Proposed by: <span className="text-gray-300 font-mono">{proposal.proposer}</span></span>
                                  <span>•</span>
                                  <span>Ends in: <span className="text-white">{getTimeRemaining(proposal.endTime)}</span></span>
                                </div>
                              </div>
                            </div>

                            {/* Vote Count */}
                            <div className="mb-4">
                              <div className="flex items-center justify-between text-xs mb-2">
                                <span className="text-gray-400">FOR: {proposal.votesFor.toLocaleString()}</span>
                                <span className="text-gray-400">AGAINST: {proposal.votesAgainst.toLocaleString()}</span>
                              </div>
                              <div className="flex h-2 bg-white/10 rounded overflow-hidden">
                                <div 
                                  className="bg-green-500/50" 
                                  style={{ 
                                    width: `${(proposal.votesFor / (proposal.votesFor + proposal.votesAgainst)) * 100}%` 
                                  }}
                                />
                                <div 
                                  className="bg-red-500/50" 
                                  style={{ 
                                    width: `${(proposal.votesAgainst / (proposal.votesFor + proposal.votesAgainst)) * 100}%` 
                                  }}
                                />
                              </div>
                            </div>

                            {/* Vote Buttons */}
                            <div className="flex gap-3">
                              <button
                                onClick={() => handleVote(proposal.id, true)}
                                disabled={!connected || loading}
                                className="flex-1 px-4 py-2 bg-green-500/20 hover:bg-green-500/30 border border-green-500/30 hover:border-green-500/50 transition-all text-sm font-semibold tracking-wider disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                VOTE FOR
                              </button>
                              <button
                                onClick={() => handleVote(proposal.id, false)}
                                disabled={!connected || loading}
                                className="flex-1 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 hover:border-red-500/50 transition-all text-sm font-semibold tracking-wider disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                VOTE AGAINST
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}

                  {/* Create Proposal Tab */}
                  {activeTab === 'create' && (
                    <div className="max-w-3xl mx-auto space-y-4">
                      {/* Demo Notice */}
                      <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded">
                        <div className="text-xs text-blue-300">
                          <strong>Note:</strong> This is a UI demonstration. In production, proposals will be stored on-chain 
                          and require a smart contract upgrade to enable full voting functionality.
                        </div>
                      </div>

                      <div className="p-6 bg-white/5 border border-white/10 rounded">
                        <h3 className="text-xl font-bold mb-6">Create New Proposal</h3>
                        
                        {!connected ? (
                          <div className="text-center py-12 text-gray-500">
                            Please connect your wallet to create proposals
                          </div>
                        ) : (
                          <div className="space-y-6">
                            {/* Title Input */}
                            <div>
                              <label className="block text-sm font-semibold text-gray-300 mb-2">
                                Proposal Title
                              </label>
                              <input
                                type="text"
                                value={newProposal.title}
                                onChange={(e) => setNewProposal(prev => ({ ...prev, title: e.target.value }))}
                                placeholder="e.g., Increase Staker Rewards to 7%"
                                className="w-full px-4 py-3 bg-black/40 border border-white/20 rounded text-white placeholder-gray-600 focus:outline-none focus:border-white/40"
                              />
                            </div>

                            {/* Description Input */}
                            <div>
                              <label className="block text-sm font-semibold text-gray-300 mb-2">
                                Description
                              </label>
                              <textarea
                                value={newProposal.description}
                                onChange={(e) => setNewProposal(prev => ({ ...prev, description: e.target.value }))}
                                placeholder="Provide detailed explanation of the proposal, rationale, and expected impact..."
                                rows={6}
                                className="w-full px-4 py-3 bg-black/40 border border-white/20 rounded text-white placeholder-gray-600 focus:outline-none focus:border-white/40 resize-none"
                              />
                            </div>

                            {/* Requirements */}
                            <div className="p-4 bg-black/40 border border-white/10 rounded">
                              <div className="text-xs text-gray-400 space-y-2">
                                <div className="flex items-center justify-between">
                                  <span>Minimum Voting Power Required:</span>
                                  <span className="text-white font-semibold">1,000,000 tokens</span>
                                </div>
                                <div className="flex items-center justify-between">
                                  <span>Your Voting Power:</span>
                                  <span className={`font-semibold ${votingPower >= 1000000 ? 'text-green-400' : 'text-red-400'}`}>
                                    {votingPower.toLocaleString()} tokens
                                  </span>
                                </div>
                                <div className="flex items-center justify-between">
                                  <span>Voting Period:</span>
                                  <span className="text-white font-semibold">7 days</span>
                                </div>
                              </div>
                            </div>

                            {/* Submit Button */}
                            <button
                              onClick={handleCreateProposal}
                              disabled={loading || votingPower < 1000000}
                              className="w-full px-6 py-3 bg-white/10 hover:bg-white/20 border border-white/20 hover:border-white/40 transition-all text-sm font-semibold tracking-wider disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {loading ? 'CREATING...' : 'CREATE PROPOSAL'}
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* History Tab */}
                  {activeTab === 'history' && (
                    <div className="text-center py-12 text-gray-500">
                      Proposal history coming soon
                    </div>
                  )}

                </div>

                {/* Footer */}
                <div className="p-6 border-t border-white/10 flex items-center justify-between flex-shrink-0">
                  <div className="text-[10px] text-gray-500">
                    Whistlenet Governance (UI Demo) • Voting Power = Access Tokens from Staking • 1 WHISTLE = 1,000 Voting Power
                  </div>
                  <button
                    onClick={onClose}
                    className="px-6 py-2 bg-white/10 hover:bg-white/20 border border-white/20 hover:border-white/40 transition-all text-sm font-semibold tracking-wider"
                    style={{
                      clipPath: 'polygon(8px 0, calc(100% - 8px) 0, 100% 8px, 100% calc(100% - 8px), calc(100% - 8px) 100%, 8px 100%, 0 calc(100% - 8px), 0 8px)',
                    }}
                  >
                    CLOSE
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

