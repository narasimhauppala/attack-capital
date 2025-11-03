'use client'

import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { format } from 'date-fns'
import { useState } from 'react'

interface CallLog {
  id: string
  callSid: string | null
  toNumber: string
  fromNumber: string | null
  strategy: string
  status: string
  amdResult: string | null
  latencyMs: number | null
  startedAt: string
  answeredAt: string | null
  completedAt: string | null
  createdAt: string
}

interface CallLogsResponse {
  callLogs: CallLog[]
}

export default function HistoryPage() {
  const [filterStrategy, setFilterStrategy] = useState<string>('ALL')
  const [filterStatus, setFilterStatus] = useState<string>('ALL')

  const { data, isLoading, error, refetch } = useQuery<CallLogsResponse>({
    queryKey: ['callLogs'],
    queryFn: async () => {
      const response = await fetch('/api/calls')
      if (!response.ok) {
        throw new Error('Failed to fetch call logs')
      }
      return response.json()
    },
    refetchInterval: 5000, // Auto-refresh every 5 seconds
  })

  const filteredLogs = data?.callLogs.filter((log) => {
    if (filterStrategy !== 'ALL' && log.strategy !== filterStrategy) return false
    if (filterStatus !== 'ALL' && log.status !== filterStatus) return false
    return true
  })

  const exportToCsv = () => {
    if (!filteredLogs || filteredLogs.length === 0) {
      alert('No data to export')
      return
    }

    const headers = [
      'Call SID',
      'To Number',
      'Strategy',
      'Status',
      'AMD Result',
      'Latency (ms)',
      'Started At',
      'Completed At',
    ]

    const rows = filteredLogs.map((log) => [
      log.callSid || '',
      log.toNumber,
      log.strategy,
      log.status,
      log.amdResult || '',
      log.latencyMs?.toString() || '',
      log.startedAt,
      log.completedAt || '',
    ])

    const csvContent = [
      headers.join(','),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `amd-call-logs-${format(new Date(), 'yyyy-MM-dd-HHmmss')}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    window.URL.revokeObjectURL(url)
  }

  // Calculate statistics
  const stats = filteredLogs
    ? {
        total: filteredLogs.length,
        completed: filteredLogs.filter((l) => l.status === 'COMPLETED').length,
        avgLatency:
          filteredLogs
            .filter((l) => l.latencyMs)
            .reduce((sum, l) => sum + (l.latencyMs || 0), 0) /
            filteredLogs.filter((l) => l.latencyMs).length || 0,
      }
    : { total: 0, completed: 0, avgLatency: 0 }

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <Link
              href="/"
              className="text-gray-400 hover:text-white transition-colors inline-flex items-center gap-2 mb-4"
            >
              ← Back to Home
            </Link>
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-4xl font-bold text-white mb-2">Call History</h1>
                <p className="text-gray-300">View and analyze AMD call logs</p>
              </div>
              <button
                onClick={exportToCsv}
                className="bg-purple-600 hover:bg-purple-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
              >
                Export CSV
              </button>
            </div>
          </div>

          {/* Statistics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-xl p-6">
              <div className="text-gray-400 text-sm mb-1">Total Calls</div>
              <div className="text-3xl font-bold text-white">{stats.total}</div>
            </div>
            <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-xl p-6">
              <div className="text-gray-400 text-sm mb-1">Completed</div>
              <div className="text-3xl font-bold text-white">{stats.completed}</div>
            </div>
            <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-xl p-6">
              <div className="text-gray-400 text-sm mb-1">Avg Latency</div>
              <div className="text-3xl font-bold text-white">
                {stats.avgLatency > 0 ? Math.round(stats.avgLatency) : 0}ms
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-xl p-6 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-white mb-2">Strategy</label>
                <select
                  value={filterStrategy}
                  onChange={(e) => setFilterStrategy(e.target.value)}
                  className="w-full px-4 py-2 bg-white/5 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="ALL">All Strategies</option>
                  <option value="TWILIO_NATIVE">Twilio Native</option>
                  <option value="JAMBONZ_SIP">Jambonz SIP</option>
                  <option value="HUGGINGFACE_ML">HuggingFace ML</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-white mb-2">Status</label>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="w-full px-4 py-2 bg-white/5 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="INITIATED">Initiated</option>
                  <option value="RINGING">Ringing</option>
                  <option value="IN_PROGRESS">In Progress</option>
                  <option value="COMPLETED">Completed</option>
                  <option value="FAILED">Failed</option>
                  <option value="BUSY">Busy</option>
                  <option value="NO_ANSWER">No Answer</option>
                </select>
              </div>
              <div className="flex items-end">
                <button
                  onClick={() => refetch()}
                  className="w-full bg-white/5 hover:bg-white/10 border border-white/20 text-white py-2 px-4 rounded-lg transition-colors"
                >
                  Refresh
                </button>
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-xl overflow-hidden">
            {isLoading && (
              <div className="p-8 text-center text-gray-400">Loading call logs...</div>
            )}

            {error && (
              <div className="p-8 text-center text-red-400">
                Error loading call logs: {error.message}
              </div>
            )}

            {!isLoading && !error && filteredLogs && filteredLogs.length === 0 && (
              <div className="p-8 text-center text-gray-400">
                No call logs found. <Link href="/dial" className="text-purple-400 hover:text-purple-300">Place a call</Link> to get started.
              </div>
            )}

            {!isLoading && !error && filteredLogs && filteredLogs.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-white/10">
                      <th className="px-6 py-4 text-left text-sm font-medium text-gray-300">To Number</th>
                      <th className="px-6 py-4 text-left text-sm font-medium text-gray-300">Strategy</th>
                      <th className="px-6 py-4 text-left text-sm font-medium text-gray-300">Status</th>
                      <th className="px-6 py-4 text-left text-sm font-medium text-gray-300">AMD Result</th>
                      <th className="px-6 py-4 text-left text-sm font-medium text-gray-300">Latency</th>
                      <th className="px-6 py-4 text-left text-sm font-medium text-gray-300">Started</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredLogs.map((log) => (
                      <tr key={log.id} className="border-b border-white/5 hover:bg-white/5">
                        <td className="px-6 py-4 text-sm text-white">{log.toNumber}</td>
                        <td className="px-6 py-4 text-sm text-gray-300">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-500/20 text-purple-300">
                            {log.strategy.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-300">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              log.status === 'COMPLETED'
                                ? 'bg-green-500/20 text-green-300'
                                : log.status === 'FAILED'
                                ? 'bg-red-500/20 text-red-300'
                                : 'bg-yellow-500/20 text-yellow-300'
                            }`}
                          >
                            {log.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-white">
                          {log.amdResult || '-'}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-300">
                          {log.latencyMs ? `${log.latencyMs}ms` : '-'}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-300">
                          {format(new Date(log.startedAt), 'MMM dd, HH:mm:ss')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  )
}
