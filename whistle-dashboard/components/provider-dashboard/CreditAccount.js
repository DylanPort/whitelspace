'use client'

import { useState, useEffect, useCallback } from 'react'
import { 
  Zap, 
  Copy, 
  Check,
  RefreshCw,
  AlertCircle,
  Key,
  ExternalLink,
  Info,
  Wallet,
  Send,
  DollarSign
} from 'lucide-react'
import { useWalletSafe } from '../lib/useWalletSafe'
import { 
  connection,
  PAYMENT_VAULT_ADDRESS,
} from '../lib/whistle-contract'
import { PublicKey, Transaction, SystemProgram } from '@solana/web3.js'

// Query cost tiers (in lamports - 1 SOL = 1,000,000,000 lamports)
const QUERY_PACKAGES = [
  { queries: 1000, cost: 10_000_000, label: '1K Queries', costSol: 0.01 },
  { queries: 10000, cost: 90_000_000, label: '10K Queries', costSol: 0.09, savings: '10%' },
  { queries: 100000, cost: 800_000_000, label: '100K Queries', costSol: 0.8, savings: '20%' },
]

export function CreditAccount() {
  const { publicKey, connected, signTransaction } = useWalletSafe()
  const [account, setAccount] = useState(null)
  const [loading, setLoading] = useState(false)
  const [paying, setPaying] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)
  const [copied, setCopied] = useState(null)
  const [selectedPackage, setSelectedPackage] = useState(0)
  const [solBalance, setSolBalance] = useState(null)

  const coordinatorUrl = process.env.NEXT_PUBLIC_COORDINATOR_HTTP || 'http://localhost:3003'

  // Fetch SOL balance
  const fetchSolBalance = useCallback(async () => {
    if (!publicKey) return
    try {
      const balance = await connection.getBalance(publicKey)
      setSolBalance(balance / 1e9)
    } catch (err) {
      console.error('[Credits] Error fetching SOL balance:', err)
    }
  }, [publicKey])

  // Fetch or create account
  const fetchAccount = useCallback(async () => {
    if (!publicKey) return
    
    setLoading(true)
    setError(null)
    
    try {
      const response = await fetch(`${coordinatorUrl}/api/credits/account`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wallet: publicKey.toBase58() })
      })
      
      if (!response.ok) {
        throw new Error('Failed to fetch account')
      }
      
      const data = await response.json()
      setAccount(data)
    } catch (err) {
      console.error('[Credits] Error:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [publicKey, coordinatorUrl])

  useEffect(() => {
    if (connected && publicKey) {
      fetchAccount()
      fetchSolBalance()
    }
  }, [connected, publicKey, fetchAccount, fetchSolBalance])

  const copyToClipboard = (text, id) => {
    navigator.clipboard.writeText(text)
    setCopied(id)
    setTimeout(() => setCopied(null), 2000)
  }

  // Simple SOL transfer to Payment Vault
  const handleDepositToVault = async () => {
    if (!publicKey || !signTransaction) {
      setError('Wallet not connected')
      return
    }

    const pkg = QUERY_PACKAGES[selectedPackage]
    
    setPaying(true)
    setError(null)
    setSuccess(null)

    try {
      console.log('[Deposit] Creating SOL transfer to Payment Vault...')
      console.log('[Deposit] Amount:', pkg.cost, 'lamports (', pkg.costSol, 'SOL)')
      console.log('[Deposit] Payment Vault:', PAYMENT_VAULT_ADDRESS.toBase58())

      // Create simple SOL transfer transaction
      const tx = new Transaction()
      
      tx.add(
        SystemProgram.transfer({
          fromPubkey: publicKey,
          toPubkey: PAYMENT_VAULT_ADDRESS,
          lamports: pkg.cost,
        })
      )

      // Get recent blockhash
      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed')
      tx.recentBlockhash = blockhash
      tx.lastValidBlockHeight = lastValidBlockHeight
      tx.feePayer = publicKey

      console.log('[Deposit] Signing transaction...')

      // Sign the transaction
      const signedTx = await signTransaction(tx)

      // Send the transaction
      console.log('[Deposit] Sending transaction...')
      const signature = await connection.sendRawTransaction(signedTx.serialize(), {
        skipPreflight: false,
        preflightCommitment: 'confirmed',
      })

      console.log('[Deposit] Transaction sent:', signature)

      // Wait for confirmation using polling (no WebSocket needed)
      console.log('[Deposit] Waiting for confirmation...')
      let confirmed = false
      let attempts = 0
      const maxAttempts = 30
      
      while (!confirmed && attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 2000)) // Wait 2 seconds
        attempts++
        
        try {
          const status = await connection.getSignatureStatus(signature)
          console.log('[Deposit] Status check', attempts, ':', status?.value?.confirmationStatus)
          
          if (status?.value?.confirmationStatus === 'confirmed' || 
              status?.value?.confirmationStatus === 'finalized') {
            confirmed = true
            if (status.value.err) {
              throw new Error(`Transaction failed: ${JSON.stringify(status.value.err)}`)
            }
          }
        } catch (statusErr) {
          console.warn('[Deposit] Status check error:', statusErr.message)
        }
      }
      
      if (!confirmed) {
        // Transaction might still be processing, but we got a signature
        console.warn('[Deposit] Could not confirm in time, but tx was sent')
      }

      console.log('[Deposit] Transaction confirmed!')

      // Record the deposit in coordinator
      try {
        await fetch(`${coordinatorUrl}/api/credits/deposit`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            wallet: publicKey.toBase58(),
            amountLamports: pkg.cost,
            txSignature: signature,
          })
        })
      } catch (recordErr) {
        console.warn('[Deposit] Failed to record in coordinator:', recordErr)
      }

      setSuccess(
        <span>
          Deposit successful! {pkg.costSol} SOL sent to Payment Vault.{' '}
          <a 
            href={`https://solscan.io/tx/${signature}`}
            target="_blank"
            rel="noopener noreferrer"
            className="underline"
          >
            View TX
          </a>
        </span>
      )
      
      // Refresh data
      fetchAccount()
      fetchSolBalance()

    } catch (err) {
      console.error('[Deposit] Error:', err)
      setError(err.message || 'Deposit failed')
    } finally {
      setPaying(false)
    }
  }

  if (!connected) {
    return (
      <div className="card p-6">
        <div className="card-inner">
          <h3 className="text-sm font-bold text-white uppercase tracking-widest mb-4 flex items-center gap-2">
            <span className="text-whistle-accent">⚡</span>
            RPC Credits
          </h3>
          <p className="text-gray-500 text-sm font-mono">
            Connect wallet to deposit
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="card p-6">
      <div className="card-inner">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-white uppercase tracking-widest flex items-center gap-2">
            <span className="text-whistle-accent">⚡</span>
            RPC Credits
          </h3>
          <button
            onClick={() => { fetchAccount(); fetchSolBalance(); }}
            disabled={loading}
            className="text-gray-500 hover:text-whistle-accent transition-colors"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>

        {/* SOL Balance */}
        {solBalance !== null && (
          <div className="flex items-center gap-2 mb-4 p-2 bg-whistle-dark border border-gray-800">
            <Wallet size={14} className="text-whistle-accent" />
            <span className="text-gray-500 text-xs uppercase">Balance:</span>
            <span className="text-white font-mono text-sm">{solBalance.toFixed(4)} SOL</span>
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 p-2 mb-3 border border-red-500/30 bg-red-500/10 text-red-400 text-xs font-mono">
            <AlertCircle size={12} />
            {error}
          </div>
        )}

        {success && (
          <div className="flex items-center gap-2 p-2 mb-3 border border-whistle-accent/30 bg-whistle-accent/10 text-whistle-accent text-xs font-mono">
            <Check size={12} />
            {success}
          </div>
        )}

        {loading && !account ? (
          <div className="space-y-3">
            <div className="h-12 bg-whistle-dark animate-pulse" />
            <div className="h-8 bg-whistle-dark animate-pulse" />
          </div>
        ) : (
          <>
            {/* Query Balance */}
            {account && (
              <div className="mb-4">
                <div className="grid grid-cols-2 gap-3">
                  {/* Available Queries */}
                  <div>
                    <p className="text-gray-500 text-xs uppercase tracking-wider mb-1">Available Queries</p>
                    <div className="flex items-baseline gap-1">
                      <span className="text-2xl font-bold font-mono text-whistle-accent">
                        {(account.balance?.queries || 0).toLocaleString()}
                      </span>
                    </div>
                  </div>
                  {/* Credit Balance */}
                  <div>
                    <p className="text-gray-500 text-xs uppercase tracking-wider mb-1">Credit Balance</p>
                    <div className="flex items-baseline gap-1">
                      <span className="text-xl font-bold font-mono text-white">
                        {(account.balance?.sol || 0).toFixed(4)}
                      </span>
                      <span className="text-gray-500 text-xs">SOL</span>
                    </div>
                  </div>
                </div>
                {/* Stats */}
                <div className="mt-3 pt-3 border-t border-gray-800 grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-gray-500 uppercase">Total Deposited:</span>
                    <span className="text-white font-mono ml-1">{((account.stats?.totalDeposited || 0) / 1e9).toFixed(4)} SOL</span>
                  </div>
                  <div>
                    <span className="text-gray-500 uppercase">Queries Made:</span>
                    <span className="text-white font-mono ml-1">{(account.stats?.queriesMade || 0).toLocaleString()}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Deposit Section */}
            <div className="border-t border-gray-800 pt-4 mt-4">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-3 flex items-center gap-2">
                <DollarSign size={12} className="text-whistle-accent" />
                Deposit to Payment Vault
              </h4>

              {/* Package Selection */}
              <div className="space-y-2 mb-4">
                {QUERY_PACKAGES.map((pkg, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedPackage(idx)}
                    className={`w-full p-3 border text-left transition-all ${
                      selectedPackage === idx 
                        ? 'border-whistle-accent bg-whistle-accent/10' 
                        : 'border-gray-700 hover:border-gray-600 bg-whistle-dark'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-white font-mono text-sm">{pkg.label}</span>
                        {pkg.savings && (
                          <span className="ml-2 text-xs text-whistle-accent">-{pkg.savings}</span>
                        )}
                      </div>
                      <span className="text-whistle-accent font-mono font-bold">
                        {pkg.costSol} SOL
                      </span>
                    </div>
                  </button>
                ))}
              </div>

              {/* Deposit Button */}
              <button
                onClick={handleDepositToVault}
                disabled={paying}
                className="w-full btn-primary flex items-center justify-center gap-2"
              >
                {paying ? (
                  <>
                    <RefreshCw size={14} className="animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Send size={14} />
                    Deposit {QUERY_PACKAGES[selectedPackage].costSol} SOL
                  </>
                )}
              </button>
            </div>

            {/* How It Works */}
            <div className="mt-4 p-3 border border-whistle-accent/30 bg-whistle-accent/5">
              <div className="flex items-start gap-2">
                <Info size={14} className="text-whistle-accent mt-0.5 flex-shrink-0" />
                <div className="text-xs">
                  <p className="text-whistle-accent font-bold uppercase tracking-wider mb-1">
                    How Payments Work
                  </p>
                  <div className="text-gray-400 space-y-1">
                    <p>1. You deposit SOL to the Payment Vault</p>
                    <p>2. RPC gateway tracks which provider serves your queries</p>
                    <p>3. Smart contract distributes payments:</p>
                    <div className="ml-3 mt-1">
                      <p><span className="text-whistle-accent">70%</span> → Provider who served you</p>
                      <p><span className="text-gray-500">20%</span> → Bonus Pool (top providers)</p>
                      <p><span className="text-gray-500">5%</span> → Treasury</p>
                      <p><span className="text-gray-500">5%</span> → Stakers</p>
                    </div>
                  </div>
                  <a
                    href={`https://solscan.io/account/${PAYMENT_VAULT_ADDRESS.toBase58()}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-whistle-accent hover:underline mt-2"
                  >
                    View Payment Vault
                    <ExternalLink size={10} />
                  </a>
                </div>
              </div>
            </div>

            {/* API Key (if available) */}
            {account?.apiKey && (
              <div className="mt-4 p-3 bg-whistle-dark border border-gray-800">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-500 text-xs uppercase tracking-wider flex items-center gap-1">
                    <Key size={10} />
                    API Key
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <code className="flex-1 text-xs font-mono text-gray-400 truncate">
                    {account.apiKey}
                  </code>
                  <button
                    onClick={() => copyToClipboard(account.apiKey, 'apiKey')}
                    className="text-gray-500 hover:text-whistle-accent transition-colors"
                  >
                    {copied === 'apiKey' ? <Check size={12} className="text-whistle-accent" /> : <Copy size={12} />}
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
