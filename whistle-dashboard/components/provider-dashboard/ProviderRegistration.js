'use client'

import { useState, useEffect } from 'react'
import { useWalletSafe } from '@/lib/provider-dashboard/useWalletSafe'
import { UserPlus, CheckCircle, AlertCircle, Loader2 } from 'lucide-react'
import { WalletButton } from './WalletButton'
import bs58 from 'bs58'

export function ProviderRegistration() {
  const { publicKey, signMessage, connected } = useWalletSafe()
  const [mounted, setMounted] = useState(false)
  
  const [name, setName] = useState('')
  const [rpcEndpoint, setRpcEndpoint] = useState('')
  const [providerType, setProviderType] = useState('validator')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)
  const [registered, setRegistered] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const walletAddress = publicKey?.toBase58()

  const handleRegister = async () => {
    if (!publicKey || !signMessage) return

    setLoading(true)
    setError(null)
    setSuccess(false)

    try {
      // Create message to sign
      const timestamp = Date.now()
      const message = `WHISTLE Provider Registration\n\nWallet: ${walletAddress}\nTimestamp: ${timestamp}\n\nBy signing this message, you agree to register as a WHISTLE provider.`
      
      // Sign message
      const encodedMessage = new TextEncoder().encode(message)
      const signatureBytes = await signMessage(encodedMessage)
      const signature = bs58.encode(signatureBytes)

      // For now, just show success (API integration can come later)
      console.log('Registration data:', {
        wallet: walletAddress,
        name,
        rpcEndpoint,
        providerType,
        signature,
        message
      })

      setSuccess(true)
      setRegistered(true)
      
    } catch (err) {
      if (err.message?.includes('User rejected')) {
        setError('Signature rejected by user')
      } else {
        setError(err.message)
      }
    } finally {
      setLoading(false)
    }
  }

  // Don't render wallet-dependent content until mounted (avoids hydration issues)
  if (!mounted) {
    return (
      <div className="card p-6">
        <div className="text-center py-8">
          <UserPlus size={48} className="mx-auto text-gray-600 mb-4" />
          <h3 className="text-lg font-semibold mb-2">Connect Wallet to Register</h3>
          <p className="text-gray-400 mb-6">
            Connect your Solana wallet to register as a WHISTLE provider
          </p>
          <div className="flex justify-center">
            <button className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-400">
              Loading...
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Not connected
  if (!connected) {
    return (
      <div className="card p-6">
        <div className="text-center py-8">
          <UserPlus size={48} className="mx-auto text-gray-600 mb-4" />
          <h3 className="text-lg font-semibold mb-2">Connect Wallet to Register</h3>
          <p className="text-gray-400 mb-6">
            Connect your Solana wallet to register as a WHISTLE provider
          </p>
          <div className="flex justify-center">
            <WalletButton />
          </div>
        </div>
      </div>
    )
  }

  // Already registered (this session)
  if (registered) {
    return (
      <div className="card p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-whistle-green/20 rounded-lg">
            <CheckCircle className="text-whistle-green" size={24} />
          </div>
          <div>
            <h3 className="text-lg font-semibold">Registration Complete</h3>
            <p className="text-gray-400 text-sm">You've signed up as a provider</p>
          </div>
        </div>

        <div className="space-y-3 mt-4">
          <div>
            <p className="text-gray-400 text-sm">Wallet</p>
            <p className="font-mono text-whistle-accent text-sm break-all">{walletAddress}</p>
          </div>
          
          {name && (
            <div>
              <p className="text-gray-400 text-sm">Name</p>
              <p className="text-white">{name}</p>
            </div>
          )}
          
          <div>
            <p className="text-gray-400 text-sm">Type</p>
            <p className="text-white capitalize">{providerType}</p>
          </div>
          
          <div>
            <p className="text-gray-400 text-sm">Status</p>
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-sm bg-whistle-green/20 text-whistle-green">
              Registered
            </span>
          </div>
        </div>
      </div>
    )
  }

  // Registration form
  return (
    <div className="card p-6">
      <h3 className="text-lg font-semibold mb-4">Register as Provider</h3>
      
      <div className="space-y-4">
        {/* Wallet (readonly) */}
        <div>
          <label className="block text-gray-400 text-sm mb-1">Wallet Address</label>
          <input
            type="text"
            value={walletAddress || ''}
            disabled
            className="w-full bg-gray-800/50 border border-gray-700 rounded-lg px-4 py-2 font-mono text-xs text-gray-400 truncate"
          />
        </div>

        {/* Name */}
        <div>
          <label className="block text-gray-400 text-sm mb-1">Display Name (optional)</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="My Validator"
            className="w-full bg-gray-800/50 border border-gray-700 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:border-whistle-accent focus:outline-none"
          />
        </div>

        {/* Provider Type */}
        <div>
          <label className="block text-gray-400 text-sm mb-1">Provider Type</label>
          <select
            value={providerType}
            onChange={(e) => setProviderType(e.target.value)}
            className="w-full bg-gray-800/50 border border-gray-700 rounded-lg px-4 py-2 text-white focus:border-whistle-accent focus:outline-none"
          >
            <option value="validator">Validator (RPC Node)</option>
            <option value="cache">Cache Node</option>
          </select>
        </div>

        {/* RPC Endpoint */}
        <div>
          <label className="block text-gray-400 text-sm mb-1">RPC Endpoint (optional)</label>
          <input
            type="text"
            value={rpcEndpoint}
            onChange={(e) => setRpcEndpoint(e.target.value)}
            placeholder="https://your-rpc.example.com"
            className="w-full bg-gray-800/50 border border-gray-700 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:border-whistle-accent focus:outline-none"
          />
          <p className="text-gray-500 text-xs mt-1">
            Your public RPC endpoint for the WHISTLE network
          </p>
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-center gap-2 p-3 bg-whistle-red/10 border border-whistle-red/30 rounded-lg text-whistle-red text-sm">
            <AlertCircle size={18} />
            {error}
          </div>
        )}

        {/* Success */}
        {success && (
          <div className="flex items-center gap-2 p-3 bg-whistle-green/10 border border-whistle-green/30 rounded-lg text-whistle-green text-sm">
            <CheckCircle size={18} />
            Successfully registered as a provider!
          </div>
        )}

        {/* Submit */}
        <button
          onClick={handleRegister}
          disabled={loading}
          className="btn-primary w-full flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <Loader2 className="animate-spin" size={18} />
              Signing...
            </>
          ) : (
            <>
              <UserPlus size={18} />
              Register as Provider
            </>
          )}
        </button>

        <p className="text-gray-500 text-xs text-center">
          You'll be asked to sign a message to verify wallet ownership.
          No transaction fees required.
        </p>
      </div>
    </div>
  )
}
