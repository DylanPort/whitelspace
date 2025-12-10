'use client'

import { useState, useEffect, useCallback } from 'react'
import { 
  Coins, 
  CheckCircle, 
  AlertCircle, 
  Loader2, 
  ExternalLink
} from 'lucide-react'
import { WalletButton } from './WalletButton'
import { useWalletSafe } from '../lib/useWalletSafe'
import {
  fetchProviderAccount,
  createDeregisterProviderTx,
  formatWhistle,
  connection
} from '../lib/whistle-contract'

export function OnChainProvider() {
  const { publicKey, connected, signTransaction } = useWalletSafe()
  const [mounted, setMounted] = useState(false)
  const [providerAccount, setProviderAccount] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)
  const [txSig, setTxSig] = useState(null)

  useEffect(() => {
    setMounted(true)
  }, [])

  const fetchData = useCallback(async () => {
    if (!publicKey) return
    
    try {
      setLoading(true)
      const provider = await fetchProviderAccount(publicKey)
      setProviderAccount(provider)
    } catch (err) {
      console.error('Error fetching provider account:', err)
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

  if (!mounted) {
    return (
      <div className="card p-6">
        <div className="h-32 bg-gray-800/50 rounded animate-pulse" />
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
            <h3 className="text-lg font-semibold">Withdraw Bond</h3>
            <p className="text-gray-400 text-sm">Connect wallet to withdraw</p>
          </div>
        </div>
        <div className="flex justify-center">
          <WalletButton />
        </div>
      </div>
    )
  }

  if (!providerAccount) {
    return (
      <div className="card p-6">
        <div className="text-center py-4">
          <Coins size={32} className="mx-auto mb-3 text-gray-500" />
          <p className="text-gray-400 text-sm">You are not registered as a provider.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="card p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-whistle-accent/20 rounded-lg">
          <Coins size={24} className="text-whistle-accent" />
        </div>
        <div>
          <h3 className="text-lg font-semibold">Withdraw Bond</h3>
          <p className="text-gray-400 text-sm">Deregister and withdraw tokens</p>
        </div>
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

      <div className="border border-gray-700 rounded-lg p-4">
        <div className="text-center mb-4">
          <p className="text-gray-400 text-sm mb-2">Bonded Amount</p>
          <p className="text-2xl font-mono font-bold text-white">
            {formatWhistle(providerAccount.stakeBond)} WHISTLE
          </p>
        </div>

        {providerAccount.pendingEarnings > 0 && (
          <div className="mb-4 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
            <p className="text-yellow-400 text-xs text-center">
              ⚠️ You have pending earnings. Please claim them before withdrawing your bond.
            </p>
          </div>
        )}

        <button
          onClick={handleWithdrawBond}
          disabled={loading || providerAccount.pendingEarnings > 0}
          className="w-full py-3 bg-whistle-red/20 text-whistle-red border border-whistle-red/50 rounded-lg text-sm font-semibold hover:bg-whistle-red/30 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          title={providerAccount.pendingEarnings > 0 ? 'Claim earnings before withdrawing bond' : 'Withdraw your bonded tokens and deregister as provider'}
        >
          {loading ? <Loader2 size={18} className="animate-spin" /> : <Coins size={18} />}
          Withdraw Bond
        </button>
      </div>
    </div>
  )
}
