'use client'

import { useState, useEffect } from 'react'
import Nav from '@/components/Nav'

interface CallRecord {
  call_id: string
  caller_name: string
  from_number?: string
  call_summary?: string
  call_completion_rating?: string
  call_successful?: boolean
  user_sentiment?: string
  duration_ms?: number
  start_timestamp?: number
  recording_url?: string
  stored_at: string
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

const ROUTE_LABEL: Record<string, string> = {
  self_fix: 'Self-Fix',
  replacement_part: 'Replace Part',
  warranty_replacement: 'Warranty',
  out_of_warranty: 'Out-of-Warranty',
  safety_stop: 'Safety Stop',
  human_support: 'Human Agent',
  not_determined: 'Not Determined',
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

function formatDuration(ms?: number) {
  if (!ms) return '—'
  const secs = Math.round(ms / 1000)
  const m = Math.floor(secs / 60)
  const s = secs % 60
  return m > 0 ? `${m}m ${s}s` : `${s}s`
}

function formatDate(iso?: string | number) {
  if (!iso) return '—'
  return new Date(typeof iso === 'number' ? iso : iso).toLocaleString('en-US', {
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

export default function CallsPage() {
  const [calls, setCalls] = useState<CallRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/calls')
      .then(r => r.json())
      .then(d => {
        if (d.success) setCalls(d.calls)
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const withAnalysis = calls.filter(c => c.custom_analysis_data)
  const withCases = calls.filter(c => c.custom_analysis_data?.service_case_created === 'yes')
  const safetyCount = calls.filter(c => c.custom_analysis_data?.recommended_route === 'safety_stop').length

  return (
    <div className="min-h-screen bg-slate-50">
      <Nav />
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold text-[#E31837]">All Calls</h1>
            <p className="text-slate-500 text-sm mt-1">
              {calls.length} call{calls.length !== 1 ? 's' : ''} total
              {withAnalysis.length > 0 && (
                <span className="ml-2 text-slate-400">
                  · {withAnalysis.length} analyzed
                </span>
              )}
              {withCases.length > 0 && (
                <span className="ml-2 text-slate-400">
                  · {withCases.length} case{withCases.length !== 1 ? 's' : ''} created
                </span>
              )}
              {safetyCount > 0 && (
                <span className="ml-3 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-red-600 text-white">
                  {safetyCount} safety escalation{safetyCount !== 1 ? 's' : ''}
                </span>
              )}
            </p>
          </div>
        </div>

        {loading && (
          <div className="text-center py-16 text-slate-400">Loading calls...</div>
        )}

        {!loading && calls.length === 0 && (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm text-center py-16">
            <div className="text-4xl mb-3">📞</div>
            <h2 className="text-lg font-semibold text-slate-600 mb-2">No Calls Yet</h2>
            <p className="text-slate-400 text-sm">
              Calls will appear here once Harold receives his first inbound call.
            </p>
          </div>
        )}

        {!loading && calls.length > 0 && (
          <div className="space-y-3">
            {calls.map(call => {
              const cad = call.custom_analysis_data
              const isSafety = cad?.recommended_route === 'safety_stop'
              const isOpen = expanded === call.call_id

              return (
                <div
                  key={call.call_id}
                  className={`bg-white rounded-xl border shadow-sm overflow-hidden transition-all ${
                    isSafety ? 'border-red-300' : 'border-gray-100'
                  }`}
                >
                  {/* Summary row — always visible */}
                  <button
                    onClick={() => setExpanded(isOpen ? null : call.call_id)}
                    className="w-full text-left px-5 py-4 flex flex-wrap items-center gap-x-6 gap-y-2 hover:bg-slate-50 transition-colors"
                  >
                    {/* Caller info */}
                    <div className="min-w-[140px]">
                      <div className="font-semibold text-slate-800 text-sm">{call.caller_name}</div>
                      <div className="text-xs text-slate-400 mt-0.5">{formatPhone(call.from_number)}</div>
                    </div>

                    {/* Date */}
                    <div className="text-xs text-slate-400 min-w-[130px]">
                      {formatDate(call.start_timestamp || call.stored_at)}
                    </div>

                    {/* Duration */}
                    <div className="text-xs text-slate-500 w-16">
                      {formatDuration(call.duration_ms)}
                    </div>

                    {/* Issue category */}
                    {cad?.issue_category && (
                      <div className="text-xs text-slate-600 capitalize font-medium">
                        {cad.issue_category}
                      </div>
                    )}

                    {/* Vehicle */}
                    {cad?.vehicle_model && (
                      <div className="text-xs text-slate-500 italic">
                        {cad.vehicle_model}
                      </div>
                    )}

                    {/* Route badge */}
                    {cad?.recommended_route && (
                      <Badge
                        label={ROUTE_LABEL[cad.recommended_route] ?? cad.recommended_route}
                        color={ROUTE_COLOR[cad.recommended_route] ?? 'bg-gray-100 text-gray-600'}
                      />
                    )}

                    {/* Sentiment */}
                    {call.user_sentiment && (
                      <span className={`text-xs font-medium ${SENTIMENT_COLOR[call.user_sentiment] ?? 'text-slate-400'}`}>
                        {call.user_sentiment}
                      </span>
                    )}

                    {/* Expand chevron */}
                    <div className="ml-auto text-slate-300 text-xs">
                      {isOpen ? '▲' : '▼'}
                    </div>
                  </button>

                  {/* Expanded detail panel */}
                  {isOpen && (
                    <div className={`border-t px-5 py-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 ${
                      isSafety ? 'border-red-200 bg-red-50/40' : 'border-gray-100 bg-slate-50/60'
                    }`}>
                      {/* Call info */}
                      <Section title="Call Details">
                        <Field label="Call ID" value={<span className="font-mono text-xs">{call.call_id}</span>} />
                        <Field label="Date" value={formatDate(call.start_timestamp || call.stored_at)} />
                        <Field label="Duration" value={formatDuration(call.duration_ms)} />
                        <Field label="Phone" value={formatPhone(call.from_number)} />
                        {call.call_successful !== undefined && (
                          <Field
                            label="Call Successful"
                            value={
                              <span className={`font-medium ${call.call_successful ? 'text-green-600' : 'text-red-500'}`}>
                                {call.call_successful ? 'Yes' : 'No'}
                              </span>
                            }
                          />
                        )}
                        {call.call_completion_rating && (
                          <Field label="Completion" value={call.call_completion_rating} />
                        )}
                        {call.recording_url && (
                          <Field
                            label="Recording"
                            value={
                              <a
                                href={call.recording_url}
                                target="_blank"
                                rel="noreferrer"
                                className="text-[#E31837] hover:underline text-xs"
                              >
                                Listen
                              </a>
                            }
                          />
                        )}
                      </Section>

                      {/* Post-call analysis */}
                      {cad && (
                        <Section title="Post-Call Analysis">
                          <Field label="Issue Category" value={<span className="capitalize">{cad.issue_category ?? '—'}</span>} />
                          <Field label="Vehicle" value={cad.vehicle_model ?? '—'} />
                          <Field
                            label="Route"
                            value={
                              cad.recommended_route ? (
                                <Badge
                                  label={ROUTE_LABEL[cad.recommended_route] ?? cad.recommended_route}
                                  color={ROUTE_COLOR[cad.recommended_route] ?? 'bg-gray-100 text-gray-600'}
                                />
                              ) : '—'
                            }
                          />
                          {call.user_sentiment && (
                            <Field
                              label="Sentiment"
                              value={
                                <span className={`font-medium ${SENTIMENT_COLOR[call.user_sentiment] ?? ''}`}>
                                  {call.user_sentiment}
                                </span>
                              }
                            />
                          )}
                          {cad.caller_satisfaction && (
                            <Field
                              label="Satisfaction"
                              value={
                                <Badge
                                  label={cad.caller_satisfaction}
                                  color={SATISFACTION_COLOR[cad.caller_satisfaction] ?? 'bg-gray-100 text-gray-600'}
                                />
                              }
                            />
                          )}
                        </Section>
                      )}

                      {/* Outcomes */}
                      {cad && (
                        <Section title="Outcomes">
                          <Field label="Case Created" value={<YesNo value={cad.service_case_created} />} />
                          <Field label="Visual Diagnostic" value={
                            cad.visual_diagnostic_used
                              ? <span className="capitalize text-xs text-slate-600">{cad.visual_diagnostic_used.replace(/_/g, ' ')}</span>
                              : '—'
                          } />
                          <Field label="Follow-Up Required" value={<YesNo value={cad.follow_up_required} />} />
                          {cad.caller_email && <Field label="Caller Email" value={<span className="text-xs">{cad.caller_email}</span>} />}
                          {cad.session_id && (
                            <Field label="Session ID" value={<span className="font-mono text-xs">{cad.session_id}</span>} />
                          )}
                          {cad.case_id && (
                            <Field label="Case ID" value={<span className="font-mono text-xs">{cad.case_id}</span>} />
                          )}
                        </Section>
                      )}

                      {/* Summary */}
                      {(call.call_summary || cad?.resolution_provided) && (
                        <div className="sm:col-span-2 lg:col-span-3">
                          {call.call_summary && (
                            <div className="mb-3">
                              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Call Summary</div>
                              <p className="text-sm text-slate-700 leading-relaxed">{call.call_summary}</p>
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
