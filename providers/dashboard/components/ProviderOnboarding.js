'use client'

import { useState, useEffect, useCallback } from 'react'
import { useWalletSafe } from '../lib/useWalletSafe'
import {
  Wallet,
  Coins,
  CheckCircle,
  AlertCircle,
  Loader2,
  ExternalLink,
  Server,
  Zap,
  Shield,
  Award,
  RefreshCw,
  Info,
  ChevronRight,
  Circle,
  Lock,
  Play
} from 'lucide-react'
import { WalletButton } from './WalletButton'
import {
  fetchWhistleBalance,
  fetchSolBalance,
  fetchStakerAccount,
  fetchProviderAccount,
  createRegisterProviderTx,
  createStakeTx,
  formatWhistle,
  contractConfig,
  MIN_PROVIDER_BOND,
  connection,
} from '../lib/whistle-contract'

// 6 Steps for Provider Registration
const STEPS = [
  { id: 1, title: 'Connect Wallet', icon: Wallet, description: 'Connect your Solana wallet' },
  { id: 2, title: 'Get WHISTLE', icon: Coins, description: 'Acquire WHISTLE tokens' },
  { id: 3, title: 'Have SOL', icon: Zap, description: 'SOL for transaction fees' },
  { id: 4, title: 'Stake WHISTLE', icon: Lock, description: 'Stake tokens to participate' },
  { id: 5, title: 'Register Provider', icon: Server, description: 'Bond tokens & set endpoint' },
  { id: 6, title: 'Start Earning', icon: Play, description: 'Run your cache node' },
]

export function ProviderOnboarding() {
  const { publicKey, connected, signTransaction } = useWalletSafe()
  const [mounted, setMounted] = useState(false)
  
  const [whistleBalance, setWhistleBalance] = useState(null)
  const [solBalance, setSolBalance] = useState(null)
  const [stakerAccount, setStakerAccount] = useState(null)
  const [providerAccount, setProviderAccount] = useState(null)
  const [offChainProvider, setOffChainProvider] = useState(null)
  
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)
  const [txSig, setTxSig] = useState(null)
  
  const [endpoint, setEndpoint] = useState('https://rpc.whistle.ninja/rpc')
  const [bondAmount, setBondAmount] = useState(MIN_PROVIDER_BOND)
  const [stakeAmount, setStakeAmount] = useState(1000)
  const [manualStep, setManualStep] = useState(null) // For manual navigation

  const coordinatorUrl = process.env.NEXT_PUBLIC_COORDINATOR_HTTP || 'http://localhost:3003'

  useEffect(() => {
    setMounted(true)
  }, [])

  // Calculate minimum required step based on actual progress
  const getMinStep = () => {
    if (!connected) return 1
    if (!whistleBalance || whistleBalance < MIN_PROVIDER_BOND) return 2
    if (!solBalance || solBalance < 0.01) return 3
    if (!stakerAccount || stakerAccount.stakedAmount < 1000) return 4
    if (!providerAccount && !offChainProvider) return 5
    return 6
  }

  const minStep = getMinStep()
  // Use manual step if set and valid, otherwise use minimum required step
  const currentStep = manualStep && manualStep >= minStep ? manualStep : minStep

  // Check if step requirements are met
  const isStepComplete = (step) => {
    switch (step) {
      case 1: return connected
      case 2: return whistleBalance && whistleBalance >= MIN_PROVIDER_BOND
      case 3: return solBalance && solBalance >= 0.01
      case 4: return stakerAccount && stakerAccount.stakedAmount >= 1000
      case 5: return providerAccount || offChainProvider
      case 6: return true
      default: return false
    }
  }

  // Navigation handlers
  const canGoNext = () => currentStep < 6 && isStepComplete(currentStep)
  const canGoBack = () => currentStep > 1

  const goNext = () => {
    if (canGoNext()) {
      setManualStep(currentStep + 1)
      setError(null)
      setSuccess(null)
    }
  }

  const goBack = () => {
    if (canGoBack()) {
      setManualStep(currentStep - 1)
      setError(null)
      setSuccess(null)
    }
  }

  // Fetch account data
  const fetchAccountData = useCallback(async () => {
    if (!publicKey) return
    
    try {
      const [balanceData, sol, staker, provider] = await Promise.all([
        fetchWhistleBalance(publicKey),
        fetchSolBalance(publicKey),
        fetchStakerAccount(publicKey),
        fetchProviderAccount(publicKey),
      ])
      
      // fetchWhistleBalance returns { amount, uiAmount, decimals }
      setWhistleBalance(balanceData?.uiAmount || 0)
      setSolBalance(sol)
      setStakerAccount(staker)
      setProviderAccount(provider)
      
      // Check off-chain registration
      try {
        const response = await fetch(`${coordinatorUrl}/api/providers/${publicKey.toBase58()}`)
        if (response.ok) {
          const data = await response.json()
          setOffChainProvider(data)
        }
      } catch (e) {
        // Not registered off-chain
      }
      
    } catch (err) {
      console.error('[Onboarding] Error fetching data:', err)
    }
  }, [publicKey, coordinatorUrl])

  useEffect(() => {
    if (connected && publicKey) {
      fetchAccountData()
    }
  }, [connected, publicKey, fetchAccountData])

  // Polling-based transaction confirmation
  const confirmTransactionPolling = async (signature) => {
    const maxRetries = 30
    for (let i = 0; i < maxRetries; i++) {
      const status = await connection.getSignatureStatus(signature)
      if (status?.value?.confirmationStatus === 'confirmed' || 
          status?.value?.confirmationStatus === 'finalized') {
        if (status.value.err) {
          throw new Error(`Transaction failed: ${JSON.stringify(status.value.err)}`)
        }
        return
      }
      await new Promise(resolve => setTimeout(resolve, 1000))
    }
    throw new Error('Transaction confirmation timeout')
  }

  // Handle Stake
  const handleStake = async () => {
    if (!publicKey || !signTransaction) return
    
    setLoading(true)
    setError(null)
    setSuccess(null)
    
    try {
      const tx = await createStakeTx(publicKey, stakeAmount)
      const { blockhash } = await connection.getLatestBlockhash()
      tx.recentBlockhash = blockhash
      tx.feePayer = publicKey
      
      const signed = await signTransaction(tx)
      const sig = await connection.sendRawTransaction(signed.serialize())
      
      setSuccess('Transaction sent! Confirming...')
      await confirmTransactionPolling(sig)
      
      setTxSig(sig)
      setSuccess(`Successfully staked ${stakeAmount} WHISTLE!`)
      fetchAccountData()
    } catch (err) {
      setError(err.message || 'Failed to stake')
    } finally {
      setLoading(false)
    }
  }

  // Handle Register Provider - REAL ON-CHAIN REGISTRATION
  const handleRegister = async () => {
    if (!publicKey || !signTransaction) return
    
    setLoading(true)
    setError(null)
    setSuccess(null)
    
    try {
      // Build the on-chain transaction
      const tx = await createRegisterProviderTx(publicKey, endpoint, bondAmount)
      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash()
      tx.recentBlockhash = blockhash
      tx.feePayer = publicKey
      
      console.log('[Register] Transaction built, requesting wallet signature...')
      console.log('[Register] This will bond', bondAmount, 'WHISTLE tokens')
      
      // Sign with wallet - this will show the approval popup
      const signed = await signTransaction(tx)
      
      console.log('[Register] Wallet signed! Sending transaction...')
      setSuccess('Transaction signed! Sending to network...')
      
      // Send the transaction
      const sig = await connection.sendRawTransaction(signed.serialize(), {
        skipPreflight: true, // Skip simulation, send directly
        maxRetries: 3,
      })
      
      console.log('[Register] Transaction sent:', sig)
      setTxSig(sig)
      setSuccess('Transaction sent! Confirming...')
      
      // Wait for confirmation
      await confirmTransactionPolling(sig)
      
      setSuccess('Successfully registered as provider ON-CHAIN! Your bond is locked.')
      
      // Also register with coordinator for tracking
      try {
        await fetch(`${coordinatorUrl}/api/providers/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            wallet: publicKey.toBase58(),
            name: `Provider-${publicKey.toBase58().slice(0, 8)}`,
            endpoint: endpoint,
            onChainTx: sig, // Link to on-chain tx
          })
        })
      } catch (e) {
        console.log('[Register] Coordinator registration optional, on-chain is what matters')
      }
      
      fetchAccountData()
      
    } catch (err) {
      console.error('[Register] Error:', err)
      // Show detailed error
      if (err.message?.includes('User rejected')) {
        setError('Transaction cancelled by user')
      } else if (err.logs) {
        console.error('[Register] Transaction logs:', err.logs)
        setError(`Transaction failed: ${err.message}\nCheck console for logs`)
      } else {
        setError(err.message || 'Failed to register')
      }
    } finally {
      setLoading(false)
    }
  }

  if (!mounted) {
    return (
      <div className="card p-6">
        <div className="h-40 bg-whistle-dark animate-pulse" />
      </div>
    )
  }

  return (
    <div className="card p-6">
      <div className="card-inner">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-whistle-accent/20 border border-whistle-accent/50">
              <Server size={24} className="text-whistle-accent" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white uppercase tracking-wider">Become a Provider</h2>
              <p className="text-gray-500 text-sm font-mono">6 steps to start earning</p>
            </div>
          </div>
          {connected && (
            <button
              onClick={fetchAccountData}
              className="text-gray-500 hover:text-whistle-accent transition-colors"
            >
              <RefreshCw size={16} />
            </button>
          )}
        </div>

        {/* 6-Step Progress */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            {STEPS.map((step, index) => {
              const StepIcon = step.icon
              const isCompleted = currentStep > step.id
              const isCurrent = currentStep === step.id
              const isLocked = currentStep < step.id
              
              return (
                <div key={step.id} className="flex items-center">
                  {/* Step Circle */}
                  <div className={`
                    relative flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all
                    ${isCompleted ? 'bg-whistle-accent/20 border-whistle-accent' : ''}
                    ${isCurrent ? 'bg-whistle-accent/10 border-whistle-accent animate-pulse' : ''}
                    ${isLocked ? 'bg-gray-800/50 border-gray-700' : ''}
                  `}>
                    {isCompleted ? (
                      <CheckCircle size={18} className="text-whistle-accent" />
                    ) : (
                      <StepIcon size={18} className={isCurrent ? 'text-whistle-accent' : 'text-gray-500'} />
                    )}
                    <span className="absolute -bottom-5 text-[10px] font-mono text-gray-500 whitespace-nowrap">
                      {step.id}
                    </span>
                  </div>
                  
                  {/* Connector Line */}
                  {index < STEPS.length - 1 && (
                    <div className={`
                      w-8 lg:w-12 h-0.5 mx-1
                      ${currentStep > step.id ? 'bg-whistle-accent' : 'bg-gray-700'}
                    `} />
                  )}
                </div>
              )
            })}
          </div>
          
          {/* Current Step Label */}
          <div className="text-center mt-6">
            <p className="text-whistle-accent font-mono text-sm uppercase tracking-wider">
              Step {currentStep}: {STEPS[currentStep - 1]?.title}
            </p>
            <p className="text-gray-500 text-xs mt-1">
              {STEPS[currentStep - 1]?.description}
            </p>
          </div>
        </div>

        {/* Error/Success Messages */}
        {error && (
          <div className="flex items-center gap-2 p-3 mb-4 border border-red-500/30 bg-red-500/10 text-red-400 text-sm font-mono">
            <AlertCircle size={16} />
            {error}
          </div>
        )}
        
        {success && (
          <div className="flex items-center gap-2 p-3 mb-4 border border-whistle-accent/30 bg-whistle-accent/10 text-whistle-accent text-sm font-mono">
            <CheckCircle size={16} />
            {success}
            {txSig && (
              <a 
                href={`https://solscan.io/tx/${txSig}`}
                target="_blank"
                rel="noopener noreferrer"
                className="ml-auto flex items-center gap-1 hover:underline"
              >
                View tx <ExternalLink size={12} />
              </a>
            )}
          </div>
        )}

        {/* Step Content */}
        <div className="border border-gray-800 p-4">
          {/* Step 1: Connect Wallet */}
          {currentStep === 1 && (
            <div className="text-center py-4">
              <Wallet size={48} className="mx-auto text-gray-500 mb-4" />
              <h3 className="text-white font-bold mb-2">Connect Your Wallet</h3>
              <p className="text-gray-500 text-sm mb-4">
                Connect a Solana wallet to get started
              </p>
              <WalletButton />
            </div>
          )}

          {/* Step 2: Get WHISTLE */}
          {currentStep === 2 && (
            <div className="text-center py-4">
              <Coins size={48} className="mx-auto text-yellow-400 mb-4" />
              <h3 className="text-white font-bold mb-2">Get WHISTLE Tokens</h3>
              <p className="text-gray-500 text-sm mb-2">
                You need at least <span className="text-whistle-accent font-mono">{MIN_PROVIDER_BOND}</span> WHISTLE
              </p>
              <p className="text-gray-600 text-xs mb-4">
                Current balance: <span className="text-white font-mono">{whistleBalance?.toLocaleString() || '0'}</span> WHISTLE
              </p>
              <a
                href={`https://pump.fun/coin/${contractConfig.mint}`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-primary inline-flex items-center gap-2"
              >
                Buy on pump.fun <ExternalLink size={14} />
              </a>
            </div>
          )}

          {/* Step 3: Have SOL */}
          {currentStep === 3 && (
            <div className="text-center py-4">
              <Zap size={48} className="mx-auto text-purple-400 mb-4" />
              <h3 className="text-white font-bold mb-2">Get SOL for Fees</h3>
              <p className="text-gray-500 text-sm mb-2">
                You need SOL for transaction fees
              </p>
              <p className="text-gray-600 text-xs mb-4">
                Current balance: <span className="text-white font-mono">{solBalance?.toFixed(4) || '0'}</span> SOL
              </p>
              <p className="text-gray-500 text-xs">
                Minimum ~0.01 SOL recommended
              </p>
            </div>
          )}

          {/* Step 4: Stake WHISTLE */}
          {currentStep === 4 && (
            <div className="py-4">
              <div className="text-center mb-4">
                <Lock size={48} className="mx-auto text-blue-400 mb-4" />
                <h3 className="text-white font-bold mb-2">Stake WHISTLE</h3>
                <p className="text-gray-500 text-sm">
                  Stake tokens to participate in the network
                </p>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-gray-500 text-xs uppercase tracking-wider mb-2">
                    Stake Amount (WHISTLE)
                  </label>
                  <input
                    type="number"
                    value={stakeAmount}
                    onChange={(e) => setStakeAmount(Number(e.target.value))}
                    min={1000}
                    className="w-full"
                  />
                </div>
                
                <button
                  onClick={handleStake}
                  disabled={loading}
                  className="w-full btn-primary"
                >
                  {loading ? (
                    <><Loader2 size={16} className="animate-spin" /> Staking...</>
                  ) : (
                    <><Lock size={16} /> Stake {stakeAmount} WHISTLE</>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Step 5: Register Provider */}
          {currentStep === 5 && (
            <div className="py-4">
              <div className="text-center mb-4">
                <Server size={48} className="mx-auto text-whistle-accent mb-4" />
                <h3 className="text-white font-bold mb-2">Register as Provider</h3>
                <p className="text-gray-500 text-sm">
                  Bond WHISTLE and set your RPC endpoint
                </p>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-gray-500 text-xs uppercase tracking-wider mb-2">
                    RPC Endpoint URL
                  </label>
                  <input
                    type="text"
                    value={endpoint}
                    onChange={(e) => setEndpoint(e.target.value)}
                    placeholder="https://your-rpc-endpoint.com"
                    className="w-full"
                  />
                </div>
                
                <div>
                  <label className="block text-gray-500 text-xs uppercase tracking-wider mb-2">
                    Bond Amount (WHISTLE)
                  </label>
                  <input
                    type="number"
                    value={bondAmount}
                    onChange={(e) => setBondAmount(Number(e.target.value))}
                    min={MIN_PROVIDER_BOND}
                    className="w-full"
                  />
                  <p className="text-gray-600 text-xs mt-1">
                    Minimum: {MIN_PROVIDER_BOND} WHISTLE
                  </p>
                </div>
                
                <button
                  onClick={handleRegister}
                  disabled={loading || !endpoint || bondAmount < MIN_PROVIDER_BOND}
                  className="w-full btn-primary"
                >
                  {loading ? (
                    <><Loader2 size={16} className="animate-spin" /> Registering...</>
                  ) : (
                    <><Server size={16} /> Register Provider</>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Step 6: Complete - Start Earning */}
          {currentStep === 6 && (
            <div className="text-center py-4">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-whistle-accent/20 border-2 border-whistle-accent flex items-center justify-center">
                <CheckCircle size={32} className="text-whistle-accent" />
              </div>
              <h3 className="text-whistle-accent font-bold text-xl mb-2">You're All Set!</h3>
              <p className="text-gray-500 text-sm mb-4">
                Start your cache node to begin earning rewards
              </p>
              
              <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="p-3 bg-whistle-dark border border-gray-800">
                  <p className="text-gray-500 text-xs uppercase">WHISTLE</p>
                  <p className="text-whistle-accent font-mono font-bold">{whistleBalance?.toLocaleString()}</p>
                </div>
                <div className="p-3 bg-whistle-dark border border-gray-800">
                  <p className="text-gray-500 text-xs uppercase">Staked</p>
                  <p className="text-white font-mono font-bold">{formatWhistle(stakerAccount?.stakedAmount || 0)}</p>
                </div>
                <div className="p-3 bg-whistle-dark border border-gray-800">
                  <p className="text-gray-500 text-xs uppercase">Bond</p>
                  <p className="text-white font-mono font-bold">{formatWhistle(providerAccount?.stakeBond || 0)}</p>
                </div>
              </div>
              
              <div className="p-3 bg-whistle-accent/10 border border-whistle-accent/30">
                <p className="text-whistle-accent text-sm font-bold mb-1">Next: Run Your Cache Node</p>
                <p className="text-gray-400 text-xs">
                  Scroll down to "Server Cache Node Setup" for instructions
                </p>
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-800">
            <button
              onClick={goBack}
              disabled={!canGoBack()}
              className={`flex items-center gap-2 px-4 py-2 font-mono text-sm uppercase tracking-wider transition-all ${
                canGoBack() 
                  ? 'text-gray-400 hover:text-white border border-gray-700 hover:border-gray-500' 
                  : 'text-gray-600 cursor-not-allowed'
              }`}
            >
              <ChevronRight size={16} className="rotate-180" />
              Back
            </button>
            
            <div className="text-gray-500 text-xs font-mono">
              {currentStep} / 6
            </div>
            
            <button
              onClick={goNext}
              disabled={!canGoNext()}
              className={`flex items-center gap-2 px-4 py-2 font-mono text-sm uppercase tracking-wider transition-all ${
                canGoNext() 
                  ? 'text-whistle-accent border border-whistle-accent/50 hover:bg-whistle-accent/10' 
                  : 'text-gray-600 border border-gray-700 cursor-not-allowed'
              }`}
            >
              Next
              <ChevronRight size={16} />
            </button>
          </div>
        </div>

        {/* Rewards Info */}
        <div className="mt-4 grid grid-cols-3 gap-3">
          <div className="text-center p-3 border border-gray-800">
            <Zap size={20} className="mx-auto mb-2 text-whistle-accent" />
            <p className="text-white font-bold">70%</p>
            <p className="text-gray-500 text-xs uppercase">Query Revenue</p>
          </div>
          <div className="text-center p-3 border border-gray-800">
            <Shield size={20} className="mx-auto mb-2 text-whistle-accent2" />
            <p className="text-white font-bold">{MIN_PROVIDER_BOND}</p>
            <p className="text-gray-500 text-xs uppercase">Min Bond</p>
          </div>
          <div className="text-center p-3 border border-gray-800">
            <Award size={20} className="mx-auto mb-2 text-yellow-400" />
            <p className="text-white font-bold">1.5x</p>
            <p className="text-gray-500 text-xs uppercase">Server Bonus</p>
          </div>
        </div>
      </div>
    </div>
  )
}
