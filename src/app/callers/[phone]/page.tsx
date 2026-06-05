'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import Nav from '@/components/Nav'

interface CallRecord {
  call_id: string
  case_id?: string
  has_case: boolean
  caller_name: string
  caller_phone: string
  from_number?: string
  vehicle?: string
  issue_description?: string
  recommended_route?: string
  status?: string
  user_sentiment?: string
  call_summary?: string
  duration_ms?: number
  call_successful?: boolean
  custom_analysis_data?: Record<string, string>
  created_at: string
  stored_at: string
}

const ROUTE_LABEL: Record<string, string> = {
  self_fix: 'Self-Fix', replacement_part: 'Replace Part', warranty_replacement: 'Warranty',
  out_of_warranty: 'Out-of-Warranty', safety_stop: 'Safety Stop', human_support: 'Human Agent',
}
const ROUTE_COLOR: Record<string, string> = {
  self_fix: 'bg-green-100 text-green-700', replacement_part: 'bg-blue-100 text-blue-700',
  warranty_replacement: 'bg-purple-100 text-purple-700', out_of_warranty: 'bg-orange-100 text-orange-700',
  safety_stop: 'bg-red-600 text-white', human_support: 'bg-gray-100 text-gray-700',
}
const STATUS_COLOR: Record<string, string> = {
  open: 'bg-yellow-100 text-yellow-700', assigned: 'bg-blue-100 text-blue-700', resolved: 'bg-green-100 text-green-700',
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })
}
function formatDuration(ms?: number) {
  if (!ms) return '—'
  const s = Math.round(ms / 1000), m = Math.floor(s / 60)
  return m > 0 ? `${m}m ${s % 60}s` : `${s}s`
}
function formatPhone(p?: string) {
  if (!p) return '—'
  const d = p.replace(/\D/g, '')
  if (d.length === 11 && d.startsWith('1')) return `+1 (${d.slice(1,4)}) ${d.slice(4,7)}-${d.slice(7)}`
  return p
}

export default function CallerHistoryPage() {
  const { phone } = useParams() as { phone: string }
  const decoded = decodeURIComponent(phone)
  const [records, setRecords] = useState<CallRecord[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/records')
      .then(r => r.json())
      .then(d => {
        if (!d.success) return
        const norm = (p?: string) => (p ?? '').replace(/\D/g, '')
        const target = norm(decoded)
        const matched = (d.records as CallRecord[]).filter(r =>
          norm(r.caller_phone) === target ||
          norm(r.from_number) === target
        )
        setRecords(matched)
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [decoded])

  const callerName = records.find(r => r.caller_name && r.caller_name !== 'Unknown')?.caller_name ?? 'Unknown Caller'
  const totalCalls = records.length
  const totalCases = records.filter(r => r.has_case).length
  const safetyCount = records.filter(r => r.recommended_route === 'safety_stop').length

  return (
    <div className="min-h-screen bg-slate-50">
      <Nav />
      <div className="max-w-4xl mx-auto px-4 py-8">

        {/* Breadcrumb */}
        <div className="mb-5 text-sm text-slate-400">
          <Link href="/cases" className="hover:text-[#E31837]">All Activity</Link>
          <span className="mx-2">/</span>
          <span className="text-slate-600">{formatPhone(decoded)}</span>
        </div>

        {/* Header */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 mb-5">
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-xl font-bold text-slate-800">{callerName}</h1>
              <p className="text-slate-500 text-sm mt-0.5">{formatPhone(decoded)}</p>
            </div>
            <div className="flex gap-4 text-center">
              <div>
                <p className="text-2xl font-bold text-slate-800">{totalCalls}</p>
                <p className="text-xs text-slate-400">Total Calls</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-800">{totalCases}</p>
                <p className="text-xs text-slate-400">Cases Created</p>
              </div>
              {safetyCount > 0 && (
                <div>
                  <p className="text-2xl font-bold text-red-600">{safetyCount}</p>
                  <p className="text-xs text-slate-400">Safety Flags</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {loading && <div className="text-center py-12 text-slate-400">Loading history…</div>}

        {!loading && records.length === 0 && (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm text-center py-12">
            <p className="text-slate-400">No records found for this number.</p>
            <Link href="/cases" className="btn-secondary text-sm mt-4 inline-block">Back to Activity</Link>
          </div>
        )}

        {!loading && records.length > 0 && (
          <div className="space-y-3">
            {records.map(r => {
              const cad = r.custom_analysis_data
              const route = r.recommended_route ?? cad?.recommended_route
              return (
                <div key={r.call_id || r.case_id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="text-xs text-slate-400">{formatDate(r.created_at)}</span>
                        <span className="text-xs text-slate-400">·</span>
                        <span className="text-xs text-slate-500">{formatDuration(r.duration_ms)}</span>
                        {r.call_successful !== undefined && (
                          <span className={`text-xs font-medium ${r.call_successful ? 'text-green-600' : 'text-red-500'}`}>
                            {r.call_successful ? '✓ Complete' : '✗ Incomplete'}
                          </span>
                        )}
                      </div>
                      {r.vehicle && <p className="text-sm font-medium text-slate-700">{r.vehicle}</p>}
                      {r.issue_description && <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{r.issue_description}</p>}
                      {r.call_summary && !r.issue_description && (
                        <p className="text-xs text-slate-500 mt-0.5 line-clamp-2 italic">{r.call_summary}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-wrap flex-shrink-0">
                      {route && (
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${ROUTE_COLOR[route] ?? 'bg-gray-100 text-gray-600'}`}>
                          {ROUTE_LABEL[route] ?? route}
                        </span>
                      )}
                      {r.status && (
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLOR[r.status] ?? 'bg-slate-100 text-slate-500'}`}>
                          {r.status}
                        </span>
                      )}
                      {r.case_id && (
                        <Link href={`/cases/${r.case_id}`} className="text-xs font-mono text-[#E31837] hover:underline">
                          {r.case_id}
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

      </div>
    </div>
  )
}
