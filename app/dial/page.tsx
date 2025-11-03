'use client'

import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import Link from 'next/link'

type Strategy = 'TWILIO_NATIVE' | 'JAMBONZ_SIP' | 'HUGGINGFACE_ML'

interface DialRequest {
  toNumber: string
  strategy: Strategy
}

interface DialResponse {
  success: boolean
  callLogId: string
  callSid?: string
  error?: string
}

export default function DialPage() {
  const [phoneNumber, setPhoneNumber] = useState('')
  const [strategy, setStrategy] = useState<Strategy>('TWILIO_NATIVE')

  const dialMutation = useMutation({
    mutationFn: async (data: DialRequest) => {
      const response = await fetch('/api/dial', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to place call')
      }

      return response.json() as Promise<DialResponse>
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!phoneNumber.trim()) {
      alert('Please enter a phone number')
      return
    }

    dialMutation.mutate({
      toNumber: phoneNumber,
      strategy,
    })
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <Link
              href="/"
              className="text-gray-400 hover:text-white transition-colors inline-flex items-center gap-2 mb-4"
            >
              ← Back to Home
            </Link>
            <h1 className="text-4xl font-bold text-white mb-2">Make a Call</h1>
            <p className="text-gray-300">
              Place an outbound call with AMD detection
            </p>
          </div>

          {/* Dial Form */}
          <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-2xl p-8 mb-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Phone Number Input */}
              <div>
                <label htmlFor="phoneNumber" className="block text-sm font-medium text-white mb-2">
                  Phone Number
                </label>
                <input
                  type="tel"
                  id="phoneNumber"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="+1234567890"
                  className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  disabled={dialMutation.isPending}
                />
                <p className="mt-1 text-sm text-gray-400">
                  Include country code (e.g., +1 for US)
                </p>
              </div>

              {/* Strategy Selection */}
              <div>
                <label htmlFor="strategy" className="block text-sm font-medium text-white mb-2">
                  AMD Strategy
                </label>
                <select
                  id="strategy"
                  value={strategy}
                  onChange={(e) => setStrategy(e.target.value as Strategy)}
                  className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500 [&>option]:bg-slate-800 [&>option]:text-white"
                  disabled={dialMutation.isPending}
                >
                  <option value="TWILIO_NATIVE" className="bg-slate-800 text-white">Twilio Native AMD</option>
                  <option value="JAMBONZ_SIP" className="bg-slate-800 text-white">Jambonz SIP</option>
                  <option value="HUGGINGFACE_ML" className="bg-slate-800 text-white">HuggingFace ML (wav2vec2)</option>
                </select>
              </div>

              {/* Strategy Description */}
              <div className="bg-white/5 rounded-lg p-4">
                <h3 className="text-sm font-medium text-white mb-2">Strategy Info:</h3>
                {strategy === 'TWILIO_NATIVE' && (
                  <p className="text-sm text-gray-300">
                    Built-in Twilio AMD. ~90% accuracy, ~2100ms latency. Simple setup.
                  </p>
                )}
                {strategy === 'JAMBONZ_SIP' && (
                  <p className="text-sm text-gray-300">
                    SIP trunk via Jambonz. ~93% accuracy, ~1800ms latency. Medium complexity.
                  </p>
                )}
                {strategy === 'HUGGINGFACE_ML' && (
                  <p className="text-sm text-gray-300">
                    ML-powered detection. ~95% accuracy, ~2200ms latency. Advanced setup.
                  </p>
                )}
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={dialMutation.isPending}
                className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white font-medium py-3 px-4 rounded-lg transition-colors duration-200"
              >
                {dialMutation.isPending ? 'Placing Call...' : 'Place Call'}
              </button>
            </form>
          </div>

          {/* Status Display */}
          {dialMutation.isSuccess && (
            <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4 mb-6">
              <h3 className="text-green-400 font-medium mb-2">✓ Call Initiated</h3>
              <p className="text-sm text-gray-300">
                Call SID: {dialMutation.data.callSid}
              </p>
              <p className="text-sm text-gray-300">
                Call Log ID: {dialMutation.data.callLogId}
              </p>
              <Link
                href={`/history`}
                className="inline-block mt-3 text-sm text-purple-400 hover:text-purple-300"
              >
                View in Call History →
              </Link>
            </div>
          )}

          {dialMutation.isError && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 mb-6">
              <h3 className="text-red-400 font-medium mb-2">✗ Call Failed</h3>
              <p className="text-sm text-gray-300">
                {dialMutation.error instanceof Error
                  ? dialMutation.error.message
                  : 'An unknown error occurred'}
              </p>
            </div>
          )}

          {/* Quick Links */}
          <div className="text-center">
            <Link
              href="/history"
              className="text-purple-400 hover:text-purple-300 transition-colors"
            >
              View Call History →
            </Link>
          </div>
        </div>
      </div>
    </main>
  )
}
