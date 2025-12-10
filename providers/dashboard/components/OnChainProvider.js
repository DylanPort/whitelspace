'use client'

import { useState, useEffect, useCallback } from 'react'
import { 
  Coins, 
  CheckCircle, 
  AlertCircle, 
  Loader2, 
  ExternalLink,
  Heart,
  Award,
  Zap,
  Server,
  RefreshCw
} from 'lucide-react'
import { WalletButton } from './WalletButton'
import { useWalletSafe } from '../lib/useWalletSafe'
import {
  fetchStakerAccount,
  fetchProviderAccount,
  fetchStakingPool,
  fetchTokenVaultBalance,
  fetchPaymentVault,
  createRegisterProviderTx,
  createRecordHeartbeatTx,
  createClaimProviderEarningsTx,
  createDeregisterProviderTx,
  createStakeTx,
  createClaimStakerRewardsTx,
  formatWhistle,
  formatSol,
  contractConfig,
  MIN_PROVIDER_BOND,
  connection,
} from '../lib/whistle-contract'

export function OnChainProvider() {
  const { publicKey, connected, signTransaction } = useWalletSafe()
  const [mounted, setMounted] = useState(false)
  
  const [stakerAccount, setStakerAccount] = useState(null)
  const [providerAccount, setProviderAccount] = useState(null)
  const [stakingPool, setStakingPool] = useState(null)
  const [paymentVault, setPaymentVault] = useState(null)
  
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)
  const [txSig, setTxSig] = useState(null)
  
  const [endpoint, setEndpoint] = useState('https://rpc.whistle.ninja')
  const [bondAmount, setBondAmount] = useState(MIN_PROVIDER_BOND)
  const [stakeAmount, setStakeAmount] = useState(1000)

  useEffect(() => {
    setMounted(true)
  }, [])

  const fetchData = useCallback(async () => {
    if (!publicKey) return
    
    try {
      setLoading(true)
      const [staker, provider, pool, payment] = await Promise.all([
        fetchStakerAccount(publicKey),
        fetchProviderAccount(publicKey),
        fetchStakingPool(),
        fetchPaymentVault(),
      ])
      
      setStakerAccount(staker)
      setProviderAccount(provider)
      setStakingPool(pool)
      setPaymentVault(payment)
    } catch (err) {
      console.error('Error fetching data:', err)
    } finally {
      setLoading(false)
    }
  }, [publicKey])

  useEffect(() => {
    if (connected && publicKey) {
      fetchData()
    }
  }, [connected, publicKey, fetchData])

  // Polling-based transaction confirmation (no WebSocket needed)
  const confirmTransactionPolling = async (signature, blockhash, lastValidBlockHeight) => {
    const maxRetries = 30
    for (let i = 0; i < maxRetries; i++) {
      const status = await connection.getSignatureStatus(signature)
      
      if (status?.value?.confirmationStatus === 'confirmed' || 
          status?.value?.confirmationStatus === 'finalized') {
        return
      }
      
      if (status?.value?.err) {
        throw new Error(`Transaction failed: ${JSON.stringify(status.value.err)}`)
      }
      
      const currentBlockHeight = await connection.getBlockHeight()
      if (currentBlockHeight > lastValidBlockHeight) {
        throw new Error('Transaction expired. Please try again.')
      }
      
      await new Promise(resolve => setTimeout(resolve, 1000))
    }
    throw new Error('Transaction confirmation timeout')
  }

  const handleRegisterProvider = async () => {
    if (!publicKey || !signTransaction) return
    
    try {
      setLoading(true)
      setError(null)
      setSuccess(null)
      
      const tx = await createRegisterProviderTx(publicKey, endpoint, bondAmount)
      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash()
      tx.recentBlockhash = blockhash
      tx.feePayer = publicKey
      
      const signed = await signTransaction(tx)
      const sig = await connection.sendRawTransaction(signed.serialize())
      
      setSuccess('Transaction sent! Confirming...')
      await confirmTransactionPolling(sig, blockhash, lastValidBlockHeight)
      
      setTxSig(sig)
      setSuccess('Successfully registered as provider!')
      fetchData()
    } catch (err) {
      setError(err.message || 'Failed to register')
    } finally {
      setLoading(false)
    }
  }

  const handleHeartbeat = async () => {
    if (!publicKey || !signTransaction) return
    
    try {
      setLoading(true)
      setError(null)
      
      const tx = await createRecordHeartbeatTx(publicKey)
      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash()
      tx.recentBlockhash = blockhash
      tx.feePayer = publicKey
      
      const signed = await signTransaction(tx)
      const sig = await connection.sendRawTransaction(signed.serialize())
      
      setSuccess('Transaction sent! Confirming...')
      await confirmTransactionPolling(sig, blockhash, lastValidBlockHeight)
      
      setTxSig(sig)
      setSuccess('Heartbeat recorded!')
      fetchData()
    } catch (err) {
      setError(err.message || 'Failed to send heartbeat')
    } finally {
      setLoading(false)
    }
  }

  const handleClaimEarnings = async () => {
    if (!publicKey || !signTransaction) return
    
    try {
      setLoading(true)
      setError(null)
      
      const tx = await createClaimProviderEarningsTx(publicKey)
      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash()
      tx.recentBlockhash = blockhash
      tx.feePayer = publicKey
      
      const signed = await signTransaction(tx)
      const sig = await connection.sendRawTransaction(signed.serialize())
      
      setSuccess('Transaction sent! Confirming...')
      await confirmTransactionPolling(sig, blockhash, lastValidBlockHeight)
      
      setTxSig(sig)
      setSuccess('Earnings claimed!')
      fetchData()
    } catch (err) {
      setError(err.message || 'Failed to claim earnings')
    } finally {
      setLoading(false)
    }
  }

  const handleWithdrawBond = async () => {
    if (!publicKey || !signTransaction) return
    
    // Check if there are pending earnings that need to be claimed first
    if (providerAccount && providerAccount.pendingEarnings > 0) {
      setError('Please claim your earnings before withdrawing your bond')
      return
    }
    
    // Confirm action
    const confirmed = window.confirm(
      `Are you sure you want to withdraw your bonded tokens? This will deregister you as a provider.\n\n` +
      `Bonded: ${formatWhistle(providerAccount?.stakeBond || 0)} WHISTLE\n\n` +
      `This action cannot be undone. You will need to register again to become a provider.`
    )
    
    if (!confirmed) return
    
    try {
      setLoading(true)
      setError(null)
      
      const tx = await createDeregisterProviderTx(publicKey)
      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash()
      tx.recentBlockhash = blockhash
      tx.feePayer = publicKey
      
      const signed = await signTransaction(tx)
      const sig = await connection.sendRawTransaction(signed.serialize())
      
      setSuccess('Transaction sent! Confirming...')
      await confirmTransactionPolling(sig, blockhash, lastValidBlockHeight)
      
      setTxSig(sig)
      setSuccess('Bond withdrawn! You have been deregistered as a provider.')
      fetchData()
    } catch (err) {
      setError(err.message || 'Failed to withdraw bond')
    } finally {
      setLoading(false)
    }
  }

  const handleStake = async () => {
    if (!publicKey || !signTransaction) return
    
    try {
      setLoading(true)
      setError(null)
      
      const tx = await createStakeTx(publicKey, stakeAmount)
      tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash
      tx.feePayer = publicKey
      
      const signed = await signTransaction(tx)
      const sig = await connection.sendRawTransaction(signed.serialize())
      
      await connection.confirmTransaction(sig, 'confirmed')
      
      setTxSig(sig)
      setSuccess(`Staked ${stakeAmount} WHISTLE!`)
      fetchData()
    } catch (err) {
      setError(err.message || 'Failed to stake')
    } finally {
      setLoading(false)
    }
  }

  const handleClaimStakerRewards = async () => {
    if (!publicKey || !signTransaction) return
    
    try {
      setLoading(true)
      setError(null)
      
      const tx = await createClaimStakerRewardsTx(publicKey)
      tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash
      tx.feePayer = publicKey
      
      const signed = await signTransaction(tx)
      const sig = await connection.sendRawTransaction(signed.serialize())
      
      await connection.confirmTransaction(sig, 'confirmed')
      
      setTxSig(sig)
      setSuccess('Staker rewards claimed!')
      fetchData()
    } catch (err) {
      setError(err.message || 'Failed to claim rewards')
    } finally {
      setLoading(false)
    }
  }

  if (!mounted) {
    return (
      <div className="card p-6">
        <div className="h-40 bg-gray-800/50 rounded animate-pulse" />
      </div>
    )
  }

  if (!connected) {
    return (
      <div className="card p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-gray-800 rounded-lg">
            <Coins size={24} className="text-gray-500" />
          </div>
          <div>
            <h3 className="text-lg font-semibold">On-Chain Provider</h3>
            <p className="text-gray-400 text-sm">WHTT Contract Integration</p>
          </div>
        </div>
        <p className="text-gray-500 text-center py-4 mb-4">
          Connect your wallet to interact with the WHISTLE contract
        </p>
        <div className="flex justify-center">
          <WalletButton />
        </div>
      </div>
    )
  }

  return (
    <div className="card p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-whistle-accent/20 rounded-lg">
            <Coins size={24} className="text-whistle-accent" />
          </div>
          <div>
            <h3 className="text-lg font-semibold">On-Chain Provider</h3>
            <p className="text-gray-400 text-sm">WHTT Contract - Mainnet</p>
          </div>
        </div>
        <button
          onClick={fetchData}
          disabled={loading}
          className="p-2 text-gray-400 hover:text-white transition-colors"
        >
          <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 mb-4 bg-whistle-red/10 border border-whistle-red/30 rounded-lg text-whistle-red text-sm">
          <AlertCircle size={16} />
          {error}
        </div>
      )}
      
      {success && (
        <div className="flex items-center gap-2 p-3 mb-4 bg-whistle-green/10 border border-whistle-green/30 rounded-lg text-whistle-green text-sm">
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

      <div className="bg-gray-800/50 rounded-lg p-4 mb-6">
        <h4 className="text-sm font-semibold text-gray-400 mb-3">Contract Addresses</h4>
        <div className="space-y-2 text-xs">
          <div className="flex justify-between">
            <span className="text-gray-500">Program ID:</span>
            <a 
              href={`https://solscan.io/account/${contractConfig.programId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono text-whistle-accent hover:underline"
            >
              {contractConfig.programId.slice(0, 8)}...{contractConfig.programId.slice(-4)}
            </a>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">WHISTLE Token:</span>
            <a 
              href={`https://solscan.io/token/${contractConfig.mint}`}
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono text-whistle-accent hover:underline"
            >
              {contractConfig.mint.slice(0, 8)}...{contractConfig.mint.slice(-4)}
            </a>
          </div>
        </div>
      </div>

      {stakingPool && (
        <div className="grid grid-cols-2 gap-3 mb-6">
          <div className="bg-gray-800/50 rounded-lg p-3">
            <div className="flex items-center gap-1 text-gray-400 text-xs mb-1">
              <Coins size={12} />
              Total Staked
            </div>
            <p className="text-lg font-mono text-white">
              {formatWhistle(stakingPool.totalStaked)} WHISTLE
            </p>
          </div>
          
          <div className="bg-gray-800/50 rounded-lg p-3">
            <div className="flex items-center gap-1 text-gray-400 text-xs mb-1">
              <Zap size={12} />
              Access Tokens
            </div>
            <p className="text-lg font-mono text-white">
              {formatWhistle(stakingPool.totalAccessTokens)}
            </p>
          </div>
        </div>
      )}

      <div className="border border-gray-700 rounded-lg p-4 mb-4">
        <h4 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
          <Award size={16} className="text-whistle-accent" />
          Your Staking
        </h4>
        
        {stakerAccount ? (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-gray-400">Staked:</span>
                <p className="font-mono text-white">{formatWhistle(stakerAccount.stakedAmount)} WHISTLE</p>
              </div>
              <div>
                <span className="text-gray-400">Pending Rewards:</span>
                <p className="font-mono text-whistle-green">{formatSol(stakerAccount.pendingRewards)} SOL</p>
              </div>
            </div>
            
            {stakerAccount.pendingRewards > 0 && (
              <button
                onClick={handleClaimStakerRewards}
                disabled={loading}
                className="w-full py-2 bg-whistle-green/20 text-whistle-green border border-whistle-green/50 rounded-lg text-sm font-semibold hover:bg-whistle-green/30 transition-colors flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 size={16} className="animate-spin" /> : <Award size={16} />}
                Claim Staker Rewards
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-gray-500 text-sm">You have not staked any WHISTLE yet.</p>
            
            <div className="flex gap-2">
              <input
                type="number"
                value={stakeAmount}
                onChange={(e) => setStakeAmount(Number(e.target.value))}
                className="flex-1 bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm"
                placeholder="Amount"
              />
              <button
                onClick={handleStake}
                disabled={loading}
                className="px-4 py-2 bg-whistle-accent text-black rounded-lg text-sm font-semibold hover:bg-whistle-accent/90 transition-colors flex items-center gap-2"
              >
                {loading ? <Loader2 size={16} className="animate-spin" /> : <Coins size={16} />}
                Stake
              </button>
            </div>
            
            <p className="text-gray-500 text-xs">
              Need WHISTLE? <a href={`https://pump.fun/coin/${contractConfig.mint}`} target="_blank" rel="noopener noreferrer" className="text-whistle-accent hover:underline">Buy on pump.fun</a>
            </p>
          </div>
        )}
      </div>

      <div className="border border-gray-700 rounded-lg p-4">
        <h4 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
          <Server size={16} className="text-whistle-accent2" />
          Provider Status
        </h4>
        
        {providerAccount ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2 mb-2">
              <span className={`w-2 h-2 rounded-full ${providerAccount.isActive ? 'bg-whistle-green' : 'bg-whistle-red'}`} />
              <span className={`text-sm ${providerAccount.isActive ? 'text-whistle-green' : 'text-whistle-red'}`}>
                {providerAccount.isActive ? 'Active' : 'Inactive'}
              </span>
            </div>
            
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-gray-400">Bond:</span>
                <p className="font-mono text-white">{formatWhistle(providerAccount.stakeBond)} WHISTLE</p>
              </div>
              <div>
                <span className="text-gray-400">Pending Earnings:</span>
                <p className="font-mono text-whistle-green">{formatSol(providerAccount.pendingEarnings)} SOL</p>
              </div>
              <div>
                <span className="text-gray-400">Total Earned:</span>
                <p className="font-mono text-white">{formatSol(providerAccount.totalEarned)} SOL</p>
              </div>
              <div>
                <span className="text-gray-400">Queries Served:</span>
                <p className="font-mono text-white">{Number(providerAccount.queriesServed).toLocaleString()}</p>
              </div>
            </div>

            <div className="flex gap-2 flex-wrap">
              <button
                onClick={handleHeartbeat}
                disabled={loading}
                className="flex-1 py-2 bg-gray-700 text-white rounded-lg text-sm font-semibold hover:bg-gray-600 transition-colors flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 size={16} className="animate-spin" /> : <Heart size={16} />}
                Send Heartbeat
              </button>
              
              {providerAccount.pendingEarnings > 0 && (
                <button
                  onClick={handleClaimEarnings}
                  disabled={loading}
                  className="flex-1 py-2 bg-whistle-green/20 text-whistle-green border border-whistle-green/50 rounded-lg text-sm font-semibold hover:bg-whistle-green/30 transition-colors flex items-center justify-center gap-2"
                >
                  {loading ? <Loader2 size={16} className="animate-spin" /> : <Coins size={16} />}
                  Claim Earnings
                </button>
              )}
            </div>
            
            <div className="pt-2 border-t border-gray-700">
              <button
                onClick={handleWithdrawBond}
                disabled={loading || providerAccount.pendingEarnings > 0}
                className="w-full py-2 bg-whistle-red/20 text-whistle-red border border-whistle-red/50 rounded-lg text-sm font-semibold hover:bg-whistle-red/30 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                title={providerAccount.pendingEarnings > 0 ? 'Claim earnings before withdrawing bond' : 'Withdraw your bonded tokens and deregister as provider'}
              >
                {loading ? <Loader2 size={16} className="animate-spin" /> : <Coins size={16} />}
                Withdraw Bond ({formatWhistle(providerAccount.stakeBond)} WHISTLE)
              </button>
              {providerAccount.pendingEarnings > 0 && (
                <p className="text-xs text-gray-500 mt-1 text-center">
                  Claim earnings first before withdrawing
                </p>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-gray-500 text-sm">Register as a provider to earn from RPC queries.</p>
            
            <div className="space-y-2">
              <input
                type="text"
                value={endpoint}
                onChange={(e) => setEndpoint(e.target.value)}
                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm"
                placeholder="Your RPC endpoint URL"
              />
              
              <div className="flex gap-2">
                <input
                  type="number"
                  value={bondAmount}
                  onChange={(e) => setBondAmount(Number(e.target.value))}
                  className="w-32 bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm"
                  placeholder="Bond"
                />
                <button
                  onClick={handleRegisterProvider}
                  disabled={loading}
                  className="flex-1 py-2 bg-gradient-to-r from-whistle-accent to-whistle-accent2 text-black rounded-lg text-sm font-semibold hover:opacity-90 transition-colors flex items-center justify-center gap-2"
                >
                  {loading ? <Loader2 size={16} className="animate-spin" /> : <Server size={16} />}
                  Register Provider
                </button>
              </div>
            </div>
            
            <p className="text-gray-500 text-xs">
              Minimum bond: {MIN_PROVIDER_BOND} WHISTLE
            </p>
          </div>
        )}
      </div>

      {paymentVault && (
        <div className="mt-4 bg-gray-800/30 rounded-lg p-3">
          <h5 className="text-xs font-semibold text-gray-400 mb-2">Payment Vault</h5>
          <div className="grid grid-cols-3 gap-2 text-xs">
            <div>
              <span className="text-gray-500">Staker Pool:</span>
              <p className="font-mono text-white">{formatSol(paymentVault.stakerRewardsPool)} SOL</p>
            </div>
            <div>
              <span className="text-gray-500">Bonus Pool:</span>
              <p className="font-mono text-white">{formatSol(paymentVault.bonusPool)} SOL</p>
            </div>
            <div>
              <span className="text-gray-500">Total Collected:</span>
              <p className="font-mono text-white">{formatSol(paymentVault.totalCollected)} SOL</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

