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
    visual_summary?: string
    service_case_summary?: string
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

const SATISFACTION_COLOR: Record<string, string> = {
  satisfied: 'bg-green-100 text-green-700',
  neutral: 'bg-slate-100 text-slate-600',
  frustrated: 'bg-red-100 text-red-600',
  unknown: 'bg-slate-100 text-slate-400',
}

const STATUS_COLOR: Record<string, string> = {
  open: 'bg-yellow-100 text-yellow-700',
  assigned: 'bg-blue-100 text-blue-700',
  resolved: 'bg-green-100 text-green-700',
}

function Badge({ label, color }: { label: string; color: string }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${color}`}>
      {label}
    </span>
  )
}

function YesNo({ value }: { value?: string }) {
  if (!value) return <span className="text-slate-300">—</span>
  const yes = value === 'yes'
  return (
    <span className={`font-medium ${yes ? 'text-green-600' : 'text-slate-400'}`}>
      {yes ? 'Yes' : 'No'}
    </span>
  )
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

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">{title}</div>
      <div className="space-y-2">{children}</div>
    </div>
  )
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2">
      <span className="text-xs text-slate-400 w-28 flex-shrink-0 pt-0.5">{label}</span>
      <span className="text-xs text-slate-700">{value}</span>
    </div>
  )
}

export default function CasesPage() {
  const [cases, setCases] = useState<ServiceCase[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<string | null>(null)

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
          <div className="space-y-3">
            {cases.map(c => {
              const cad = c.custom_analysis_data
              const isSafety = c.recommended_route === 'safety_stop'
              const isOpen = expanded === c.case_id

              return (
                <div
                  key={c.case_id}
                  className={`bg-white rounded-xl border shadow-sm overflow-hidden transition-all ${
                    isSafety ? 'border-red-300' : 'border-gray-100'
                  }`}
                >
                  {/* Summary row */}
                  <button
                    onClick={() => setExpanded(isOpen ? null : c.case_id)}
                    className="w-full text-left px-5 py-4 flex flex-wrap items-center gap-x-6 gap-y-2 hover:bg-slate-50 transition-colors"
                  >
                    {/* Case ID */}
                    <div className="font-mono text-xs text-[#E31837] font-semibold min-w-[120px]">
                      {c.case_id}
                    </div>

                    {/* Caller */}
                    <div className="min-w-[140px]">
                      <div className="font-semibold text-slate-800 text-sm">{c.caller_name}</div>
                      <div className="text-xs text-slate-400 mt-0.5">{formatPhone(c.from_number || c.caller_phone)}</div>
                    </div>

                    {/* Date */}
                    <div className="text-xs text-slate-400 min-w-[130px]">
                      {formatDate(c.created_at)}
                    </div>

                    {/* Vehicle */}
                    <div className="text-xs text-slate-500 italic max-w-[160px] truncate">
                      {c.vehicle}
                    </div>

                    {/* Route badge */}
                    <Badge
                      label={ROUTE_LABEL[c.recommended_route] ?? c.recommended_route}
                      color={ROUTE_COLOR[c.recommended_route] ?? 'bg-gray-100 text-gray-600'}
                    />

                    {/* Status badge */}
                    <Badge
                      label={c.status}
                      color={STATUS_COLOR[c.status] ?? 'bg-slate-100 text-slate-500'}
                    />

                    {/* Sentiment */}
                    {c.user_sentiment && (
                      <span className={`text-xs font-medium ${SENTIMENT_COLOR[c.user_sentiment] ?? 'text-slate-400'}`}>
                        {c.user_sentiment}
                      </span>
                    )}

                    <div className="ml-auto text-slate-300 text-xs">
                      {isOpen ? '▲' : '▼'}
                    </div>
                  </button>

                  {/* Expanded detail panel */}
                  {isOpen && (
                    <div className={`border-t px-5 py-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 ${
                      isSafety ? 'border-red-200 bg-red-50/40' : 'border-gray-100 bg-slate-50/60'
                    }`}>
                      {/* Case info */}
                      <Section title="Case Details">
                        <Field label="Case ID" value={
                          <Link href={`/cases/${c.case_id}`} className="font-mono text-xs text-[#E31837] hover:underline">
                            {c.case_id}
                          </Link>
                        } />
                        <Field label="Call ID" value={<span className="font-mono text-xs">{c.call_id || '—'}</span>} />
                        <Field label="Created" value={formatDate(c.created_at)} />
                        <Field label="Status" value={<Badge label={c.status} color={STATUS_COLOR[c.status] ?? 'bg-slate-100 text-slate-500'} />} />
                        <Field label="Phone" value={formatPhone(c.from_number || c.caller_phone)} />
                        {(c.caller_email || cad?.caller_email) && (
                          <Field label="Email" value={<span className="text-xs">{c.caller_email ?? cad?.caller_email}</span>} />
                        )}
                        {c.recording_url && (
                          <Field label="Recording" value={
                            <a href={c.recording_url} target="_blank" rel="noreferrer" className="text-[#E31837] hover:underline text-xs">
                              Listen
                            </a>
                          } />
                        )}
                        {c.call_completion_rating && (
                          <Field label="Call Successful" value={c.call_completion_rating} />
                        )}
                      </Section>

                      {/* Post-call analysis */}
                      <Section title="Post-Call Analysis">
                        <Field label="Issue Category" value={<span className="capitalize">{cad?.issue_category ?? '—'}</span>} />
                        <Field label="Vehicle" value={cad?.vehicle_model ?? c.vehicle ?? '—'} />
                        <Field label="Route" value={
                          <Badge
                            label={ROUTE_LABEL[c.recommended_route] ?? c.recommended_route}
                            color={ROUTE_COLOR[c.recommended_route] ?? 'bg-gray-100 text-gray-600'}
                          />
                        } />
                        {c.user_sentiment && (
                          <Field label="Sentiment" value={
                            <span className={`font-medium ${SENTIMENT_COLOR[c.user_sentiment] ?? ''}`}>
                              {c.user_sentiment}
                            </span>
                          } />
                        )}
                        {cad?.caller_satisfaction && (
                          <Field label="Satisfaction" value={
                            <Badge
                              label={cad.caller_satisfaction}
                              color={SATISFACTION_COLOR[cad.caller_satisfaction] ?? 'bg-gray-100 text-gray-600'}
                            />
                          } />
                        )}
                        {c.analysis?.confidence_level && (
                          <Field label="AI Confidence" value={
                            <span className="capitalize">{c.analysis.confidence_level}</span>
                          } />
                        )}
                        {c.analysis?.likely_issue && (
                          <Field label="Likely Issue" value={c.analysis.likely_issue} />
                        )}
                      </Section>

                      {/* Outcomes */}
                      <Section title="Outcomes">
                        <Field label="Visual Diagnostic" value={
                          cad?.visual_diagnostic_used
                            ? <span className="capitalize text-xs">{cad.visual_diagnostic_used.replace(/_/g, ' ')}</span>
                            : '—'
                        } />
                        <Field label="Follow-Up" value={<YesNo value={cad?.follow_up_required} />} />
                        <Field label="Escalation Reason" value={
                          <span className="text-xs leading-relaxed">{c.escalation_reason || '—'}</span>
                        } />
                        {cad?.session_id && (
                          <Field label="Session ID" value={<span className="font-mono text-xs">{cad.session_id}</span>} />
                        )}
                      </Section>

                      {/* Summaries */}
                      {(c.call_summary || cad?.resolution_provided || c.issue_description) && (
                        <div className="sm:col-span-2 lg:col-span-3 space-y-3">
                          {c.issue_description && (
                            <div>
                              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Issue Description</div>
                              <p className="text-sm text-slate-700 leading-relaxed">{c.issue_description}</p>
                            </div>
                          )}
                          {c.call_summary && (
                            <div>
                              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Call Summary</div>
                              <p className="text-sm text-slate-700 leading-relaxed">{c.call_summary}</p>
                            </div>
                          )}
                          {cad?.resolution_provided && (
                            <div>
                              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Resolution Provided</div>
                              <p className="text-sm text-slate-700 leading-relaxed">{cad.resolution_provided}</p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
