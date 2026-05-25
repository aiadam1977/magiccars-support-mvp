'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import Nav from '@/components/Nav'

interface ServiceCase {
  case_id: string
  call_id: string
  caller_name: string
  caller_phone: string
  caller_email?: string
  vehicle: string
  issue_description: string
  recommended_route: string
  escalation_reason: string
  status: string
  created_at: string
  from_number?: string
  call_summary?: string
  call_completion_rating?: string
  user_sentiment?: string
  recording_url?: string
  custom_analysis_data?: {
    issue_category?: string
    vehicle_model?: string
    recommended_route?: string
    resolution_provided?: string
    service_case_created?: string
    visual_diagnostic_used?: string
    caller_satisfaction?: string
    follow_up_required?: string
    caller_email?: string
    session_id?: string
    case_id?: string
  }
  analysis?: {
    likely_issue: string
    confidence_level: string
    escalation_required: boolean
  }
}

const ROUTE_LABEL: Record<string, string> = {
  self_fix: 'Self-Fix',
  replacement_part: 'Replace Part',
  warranty_replacement: 'Warranty',
  out_of_warranty: 'Out-of-Warranty',
  safety_stop: 'Safety Stop',
  human_support: 'Human Agent',
  not_determined: 'Not Determined',
}

const ROUTE_COLOR: Record<string, string> = {
  self_fix: 'bg-green-100 text-green-700',
  replacement_part: 'bg-blue-100 text-blue-700',
  warranty_replacement: 'bg-purple-100 text-purple-700',
  out_of_warranty: 'bg-orange-100 text-orange-700',
  safety_stop: 'bg-red-600 text-white',
  human_support: 'bg-gray-100 text-gray-700',
  not_determined: 'bg-slate-100 text-slate-500',
}

const SENTIMENT_COLOR: Record<string, string> = {
  Positive: 'text-green-600',
  Neutral: 'text-slate-500',
  Negative: 'text-red-500',
  Unknown: 'text-slate-400',
}

const STATUS_COLOR: Record<string, string> = {
  open: 'bg-yellow-100 text-yellow-700',
  assigned: 'bg-blue-100 text-blue-700',
  resolved: 'bg-green-100 text-green-700',
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function formatPhone(phone?: string) {
  if (!phone) return ''
  const digits = phone.replace(/\D/g, '')
  if (digits.length === 11 && digits.startsWith('1')) {
    return `+1 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`
  }
  return phone
}

/** Build a single searchable string from all case fields */
function caseSearchText(c: ServiceCase): string {
  const cad = c.custom_analysis_data
  return [
    c.case_id,
    c.caller_name,
    c.caller_phone,
    c.caller_email,
    formatPhone(c.from_number || c.caller_phone),
    c.vehicle,
    c.issue_description,
    c.escalation_reason,
    c.recommended_route,
    ROUTE_LABEL[c.recommended_route] ?? '',
    c.status,
    formatDate(c.created_at),
    c.call_summary,
    c.user_sentiment,
    cad?.issue_category,
    cad?.vehicle_model,
    cad?.recommended_route,
    cad?.caller_satisfaction,
    cad?.follow_up_required,
    cad?.caller_email,
    cad?.resolution_provided,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
}

export default function CasesPage() {
  const [cases, setCases] = useState<ServiceCase[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/cases')
      .then(r => r.json())
      .then(d => { if (d.success) setCases(d.cases) })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return cases
    return cases.filter(c => caseSearchText(c).includes(q))
  }, [cases, query])

  const safetyCount = cases.filter(c => c.recommended_route === 'safety_stop').length

  async function handleDelete(case_id: string) {
    setDeleting(case_id)
    try {
      const res = await fetch(`/api/cases/${case_id}`, { method: 'DELETE' })
      const d = await res.json()
      if (d.success) {
        setCases(prev => prev.filter(c => c.case_id !== case_id))
        setConfirmDelete(null)
      }
    } catch { /* silently fail — row stays */ }
    finally { setDeleting(null) }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Nav />
      <div className="max-w-7xl mx-auto px-4 py-8">

        {/* Header */}
        <div className="flex items-center justify-between mb-5 flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold text-[#E31837]">Support Cases</h1>
            <p className="text-slate-500 text-sm mt-1">
              {cases.length} case{cases.length !== 1 ? 's' : ''} total
              {query && filtered.length !== cases.length && (
                <span className="ml-2 text-slate-400">· {filtered.length} matching</span>
              )}
              {safetyCount > 0 && (
                <span className="ml-3 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-red-600 text-white">
                  {safetyCount} safety escalation{safetyCount !== 1 ? 's' : ''}
                </span>
              )}
            </p>
          </div>
          <Link href="/demo" className="btn-primary text-sm">+ New Demo Session</Link>
        </div>

        {/* Search bar */}
        <div className="mb-4 relative">
          <span className="absolute inset-y-0 left-3 flex items-center text-slate-400 pointer-events-none">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
            </svg>
          </span>
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search by name, phone, vehicle, issue, date, status…"
            className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-[#E31837]/30 focus:border-[#E31837]"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="absolute inset-y-0 right-3 flex items-center text-slate-400 hover:text-slate-600 text-lg leading-none"
            >
              ×
            </button>
          )}
        </div>

        {loading && (
          <div className="text-center py-16 text-slate-400">Loading cases...</div>
        )}

        {!loading && cases.length === 0 && (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm text-center py-16">
            <div className="text-4xl mb-3">📋</div>
            <h2 className="text-lg font-semibold text-slate-600 mb-2">No Cases Yet</h2>
            <p className="text-slate-400 text-sm mb-5">Cases are created when Harold escalates an issue during a call.</p>
            <Link href="/demo" className="btn-primary text-sm">Go to Demo Simulator</Link>
          </div>
        )}

        {!loading && cases.length > 0 && filtered.length === 0 && (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm text-center py-16">
            <div className="text-3xl mb-3">🔍</div>
            <h2 className="text-lg font-semibold text-slate-600 mb-2">No matches for &ldquo;{query}&rdquo;</h2>
            <p className="text-slate-400 text-sm mb-4">Try a name, phone number, vehicle, issue type, date, or status.</p>
            <button onClick={() => setQuery('')} className="btn-secondary text-sm">Clear search</button>
          </div>
        )}

        {!loading && filtered.length > 0 && (
          <div className="overflow-x-auto rounded-xl border border-gray-100 shadow-sm bg-white">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-gray-100">
                <tr>
                  {[
                    'Case ID', 'Caller', 'Phone', 'Vehicle',
                    'Issue Category', 'Route', 'Sentiment',
                    'Satisfaction', 'Follow-Up', 'Status', 'Created', '',
                  ].map((h, i) => (
                    <th
                      key={i}
                      className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map(c => {
                  const cad = c.custom_analysis_data
                  const isSafety = c.recommended_route === 'safety_stop'
                  const route = cad?.recommended_route || c.recommended_route
                  const isConfirming = confirmDelete === c.case_id
                  const isDeleting = deleting === c.case_id

                  return (
                    <tr
                      key={c.case_id}
                      className={`hover:bg-slate-50 transition-colors ${isSafety ? 'bg-red-50' : ''} ${isConfirming ? 'bg-red-50' : ''}`}
                    >
                      {/* Case ID */}
                      <td className="px-4 py-3 font-mono text-xs text-[#E31837] whitespace-nowrap">
                        <Link href={`/cases/${c.case_id}`} className="hover:underline font-semibold">
                          {c.case_id}
                        </Link>
                      </td>

                      {/* Caller */}
                      <td className="px-4 py-3 font-medium text-slate-800 whitespace-nowrap">
                        {c.caller_name}
                      </td>

                      {/* Phone */}
                      <td className="px-4 py-3 text-slate-500 whitespace-nowrap text-xs">
                        {formatPhone(c.from_number || c.caller_phone) || '—'}
                      </td>

                      {/* Vehicle */}
                      <td className="px-4 py-3 text-slate-600 whitespace-nowrap max-w-[160px] truncate text-xs">
                        {c.vehicle}
                      </td>

                      {/* Issue category */}
                      <td className="px-4 py-3 text-slate-600 capitalize whitespace-nowrap text-xs">
                        {cad?.issue_category ?? '—'}
                      </td>

                      {/* Route */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${ROUTE_COLOR[route] ?? 'bg-gray-100 text-gray-600'}`}>
                          {ROUTE_LABEL[route] ?? route}
                        </span>
                      </td>

                      {/* Sentiment */}
                      <td className="px-4 py-3 whitespace-nowrap text-xs">
                        {c.user_sentiment
                          ? <span className={`font-medium ${SENTIMENT_COLOR[c.user_sentiment] ?? 'text-slate-400'}`}>{c.user_sentiment}</span>
                          : '—'}
                      </td>

                      {/* Satisfaction */}
                      <td className="px-4 py-3 whitespace-nowrap text-xs capitalize text-slate-500">
                        {cad?.caller_satisfaction ?? '—'}
                      </td>

                      {/* Follow-up */}
                      <td className="px-4 py-3 whitespace-nowrap text-xs">
                        {cad?.follow_up_required
                          ? <span className={cad.follow_up_required === 'yes' ? 'text-red-500 font-medium' : 'text-slate-400'}>
                              {cad.follow_up_required === 'yes' ? 'Yes' : 'No'}
                            </span>
                          : '—'}
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLOR[c.status] ?? 'bg-slate-100 text-slate-500'}`}>
                          {c.status}
                        </span>
                      </td>

                      {/* Created */}
                      <td className="px-4 py-3 text-slate-400 text-xs whitespace-nowrap">
                        {formatDate(c.created_at)}
                      </td>

                      {/* Delete */}
                      <td className="px-3 py-3 whitespace-nowrap text-right">
                        {isConfirming ? (
                          <span className="inline-flex items-center gap-1.5">
                            <span className="text-xs text-slate-500 mr-0.5">Delete?</span>
                            <button
                              onClick={() => handleDelete(c.case_id)}
                              disabled={isDeleting}
                              className="px-2 py-1 rounded text-xs font-semibold bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
                            >
                              {isDeleting ? '…' : 'Yes'}
                            </button>
                            <button
                              onClick={() => setConfirmDelete(null)}
                              className="px-2 py-1 rounded text-xs font-semibold bg-slate-100 text-slate-600 hover:bg-slate-200"
                            >
                              Cancel
                            </button>
                          </span>
                        ) : (
                          <button
                            onClick={() => setConfirmDelete(c.case_id)}
                            title="Delete case"
                            className="p-1.5 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
