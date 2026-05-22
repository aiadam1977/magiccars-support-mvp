'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Nav from '@/components/Nav'

interface ServiceCase {
  case_id: string
  caller_name: string
  caller_phone: string
  vehicle: string
  issue_description: string
  recommended_route: string
  status: string
  created_at: string
  analysis?: {
    likely_issue: string
    confidence_level: string
    escalation_required: boolean
  }
}

const ROUTE_LABEL: Record<string, string> = {
  self_fix: 'Self-Fix Guide',
  replacement_part: 'Replacement Part',
  warranty_replacement: 'Warranty Replacement',
  out_of_warranty: 'Out-of-Warranty',
  safety_stop: 'Stop Use — Safety',
  human_support: 'Human Agent',
}

const ROUTE_COLOR: Record<string, string> = {
  self_fix: 'bg-green-100 text-green-700',
  replacement_part: 'bg-blue-100 text-blue-700',
  warranty_replacement: 'bg-purple-100 text-purple-700',
  out_of_warranty: 'bg-orange-100 text-orange-700',
  safety_stop: 'bg-red-600 text-white',
  human_support: 'bg-gray-100 text-gray-700',
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
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold text-[#E31837]">Support Case Dashboard</h1>
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
          <div className="card text-center py-16">
            <div className="text-4xl mb-3">📋</div>
            <h2 className="text-lg font-semibold text-slate-600 mb-2">No Cases Yet</h2>
            <p className="text-slate-400 text-sm mb-5">
              Run the demo simulator to create your first support case.
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
                    'Parent',
                    'Phone',
                    'Vehicle',
                    'Issue',
                    'Likely Issue',
                    'Confidence',
                    'Route',
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
                  const isSafety = c.recommended_route === 'safety_stop'
                  return (
                    <tr
                      key={c.case_id}
                      className={`hover:bg-slate-50 transition-colors ${
                        isSafety ? 'bg-red-50' : ''
                      }`}
                    >
                      <td className="px-4 py-3 font-mono text-xs text-[#E31837] whitespace-nowrap">
                        <Link
                          href={`/cases/${c.case_id}`}
                          className="hover:underline font-semibold"
                        >
                          {c.case_id}
                        </Link>
                      </td>
                      <td className="px-4 py-3 font-medium text-slate-800 whitespace-nowrap">
                        {c.caller_name}
                      </td>
                      <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                        {c.caller_phone}
                      </td>
                      <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{c.vehicle}</td>
                      <td className="px-4 py-3 text-slate-600 max-w-[200px] truncate">
                        {c.issue_description}
                      </td>
                      <td className="px-4 py-3 text-slate-600 max-w-[180px] truncate">
                        {c.analysis?.likely_issue || '—'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {c.analysis?.confidence_level ? (
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                              CONF_COLOR[c.analysis.confidence_level] || 'bg-gray-100 text-gray-600'
                            }`}
                          >
                            {c.analysis.confidence_level}
                          </span>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                            ROUTE_COLOR[c.recommended_route] || 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          {ROUTE_LABEL[c.recommended_route] || c.recommended_route}
                        </span>
                      </td>
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
