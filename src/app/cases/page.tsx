'use client'

import { useState, useEffect } from 'react'
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
  // Enriched from call-meta
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

const CONF_COLOR: Record<string, string> = {
  low: 'bg-yellow-100 text-yellow-700',
  medium: 'bg-orange-100 text-orange-700',
  high: 'bg-red-100 text-red-700',
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
  if (!phone) return '—'
  const digits = phone.replace(/\D/g, '')
  if (digits.length === 11 && digits.startsWith('1')) {
    return `+1 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`
  }
  return phone
}

export default function CasesPage() {
  const [cases, setCases] = useState<ServiceCase[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/cases')
      .then(r => r.json())
      .then(d => {
        if (d.success) setCases(d.cases)
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const safetyCount = cases.filter(c => c.recommended_route === 'safety_stop').length

  return (
    <div className="min-h-screen bg-slate-50">
      <Nav />
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold text-[#E31837]">Support Cases</h1>
            <p className="text-slate-500 text-sm mt-1">
              {cases.length} case{cases.length !== 1 ? 's' : ''} total
              {safetyCount > 0 && (
                <span className="ml-3 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-red-600 text-white">
                  {safetyCount} safety escalation{safetyCount !== 1 ? 's' : ''}
                </span>
              )}
            </p>
          </div>
          <Link href="/demo" className="btn-primary text-sm">
            + New Demo Session
          </Link>
        </div>

        {loading && (
          <div className="text-center py-16 text-slate-400">Loading cases...</div>
        )}

        {!loading && cases.length === 0 && (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm text-center py-16">
            <div className="text-4xl mb-3">📋</div>
            <h2 className="text-lg font-semibold text-slate-600 mb-2">No Cases Yet</h2>
            <p className="text-slate-400 text-sm mb-5">
              Cases are created when Harold escalates an issue during a call.
            </p>
            <Link href="/demo" className="btn-primary text-sm">
              Go to Demo Simulator
            </Link>
          </div>
        )}

        {!loading && cases.length > 0 && (
          <div className="overflow-x-auto rounded-xl border border-gray-100 shadow-sm bg-white">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-gray-100">
                <tr>
                  {[
                    'Case ID',
                    'Caller',
                    'Phone',
                    'Vehicle',
                    'Issue Category',
                    'Route',
                    'Sentiment',
                    'Satisfaction',
                    'Follow-Up',
                    'Status',
                    'Created',
                  ].map(h => (
                    <th
                      key={h}
                      className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {cases.map(c => {
                  const cad = c.custom_analysis_data
                  const isSafety = c.recommended_route === 'safety_stop'
                  const route = cad?.recommended_route || c.recommended_route
                  return (
                    <tr
                      key={c.case_id}
                      className={`hover:bg-slate-50 transition-colors ${isSafety ? 'bg-red-50' : ''}`}
                    >
                      {/* Case ID — links to full detail page */}
                      <td className="px-4 py-3 font-mono text-xs text-[#E31837] whitespace-nowrap">
                        <Link
                          href={`/cases/${c.case_id}`}
                          className="hover:underline font-semibold"
                        >
                          {c.case_id}
                        </Link>
                      </td>

                      {/* Caller name */}
                      <td className="px-4 py-3 font-medium text-slate-800 whitespace-nowrap">
                        {c.caller_name}
                      </td>

                      {/* Phone */}
                      <td className="px-4 py-3 text-slate-500 whitespace-nowrap text-xs">
                        {formatPhone(c.from_number || c.caller_phone)}
                      </td>

                      {/* Vehicle */}
                      <td className="px-4 py-3 text-slate-600 whitespace-nowrap max-w-[160px] truncate text-xs">
                        {c.vehicle}
                      </td>

                      {/* Issue category from post-call analysis */}
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
                        {c.user_sentiment ? (
                          <span className={`font-medium ${SENTIMENT_COLOR[c.user_sentiment] ?? 'text-slate-400'}`}>
                            {c.user_sentiment}
                          </span>
                        ) : '—'}
                      </td>

                      {/* Caller satisfaction */}
                      <td className="px-4 py-3 whitespace-nowrap text-xs capitalize text-slate-500">
                        {cad?.caller_satisfaction ?? '—'}
                      </td>

                      {/* Follow-up required */}
                      <td className="px-4 py-3 whitespace-nowrap text-xs">
                        {cad?.follow_up_required
                          ? <span className={cad.follow_up_required === 'yes' ? 'text-red-500 font-medium' : 'text-slate-400'}>{cad.follow_up_required === 'yes' ? 'Yes' : 'No'}</span>
                          : '—'}
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLOR[c.status] ?? 'bg-slate-100 text-slate-500'}`}>
                          {c.status}
                        </span>
                      </td>

                      {/* AI confidence — shown only if analysis present */}
                      <td className="px-4 py-3 text-slate-400 text-xs whitespace-nowrap">
                        {formatDate(c.created_at)}
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
