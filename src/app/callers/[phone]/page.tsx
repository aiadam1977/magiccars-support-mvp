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
  escalation_reason?: string
  recommended_route?: string
  status?: string
  priority?: string
  assigned_to?: string
  user_sentiment?: string
  call_summary?: string
  call_completion_rating?: string
  call_successful?: boolean
  duration_ms?: number
  start_timestamp?: number
  recording_url?: string
  transcript?: string
  custom_analysis_data?: Record<string, string>
  notes?: Array<{ id: string; text: string; timestamp: string }>
  activity?: Array<{ id: string; type: string; timestamp: string; label: string; detail?: string }>
  created_at: string
  stored_at: string
}

// ─── Constants ────────────────────────────────────────────────────────────────

const ROUTE_LABEL: Record<string, string> = {
  self_fix: 'Self-Fix', replacement_part: 'Replace Part',
  warranty_replacement: 'Warranty', out_of_warranty: 'Out-of-Warranty',
  safety_stop: 'Safety Stop', human_support: 'Human Agent',
}
const ROUTE_COLOR: Record<string, string> = {
  self_fix: 'bg-green-100 text-green-700', replacement_part: 'bg-blue-100 text-blue-700',
  warranty_replacement: 'bg-purple-100 text-purple-700', out_of_warranty: 'bg-orange-100 text-orange-700',
  safety_stop: 'bg-red-600 text-white', human_support: 'bg-gray-100 text-gray-700',
}
const STATUS_COLOR: Record<string, string> = {
  open: 'bg-yellow-100 text-yellow-700', assigned: 'bg-blue-100 text-blue-700',
  resolved: 'bg-green-100 text-green-700',
}
const SENTIMENT_COLOR: Record<string, string> = {
  Positive: 'text-green-600', Neutral: 'text-slate-500',
  Negative: 'text-red-500', Unknown: 'text-slate-400',
}
const CAD_LABELS: Record<string, string> = {
  issue_category: 'Issue Category', vehicle_model: 'Vehicle Model',
  recommended_route: 'Route', resolution_provided: 'Resolution',
  service_case_created: 'Case Created', visual_diagnostic_used: 'Visual Diagnostic',
  caller_satisfaction: 'Satisfaction', follow_up_required: 'Follow-Up Required',
  caller_email: 'Caller Email', caller_name: 'Caller Name',
  order_number: 'Order Number', session_id: 'Session ID', case_id: 'Case ID',
}
const ACTIVITY_DOT: Record<string, string> = {
  case_created: 'bg-blue-400', status_changed: 'bg-green-400', email_sent: 'bg-purple-400',
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit',
  })
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
function cadLabel(key: string): string {
  return CAD_LABELS[key] ?? key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

// ─── Expanded detail panel ────────────────────────────────────────────────────

function CallDetailPanel({ r }: { r: CallRecord }) {
  const [showTranscript, setShowTranscript] = useState(false)
  const cad = r.custom_analysis_data ?? {}
  const cadEntries = Object.entries(cad).filter(([, v]) => v && v.trim())

  return (
    <div className="border-t border-slate-100 bg-slate-50/60 px-5 py-5 space-y-4">

      {/* Top grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">

        {/* Call Details */}
        <div className="bg-white rounded-xl border border-gray-100 p-4 space-y-2.5">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Call Details</p>
          <Row label="Date">{formatDate(r.start_timestamp ? new Date(r.start_timestamp).toISOString() : r.created_at)}</Row>
          <Row label="Duration">{formatDuration(r.duration_ms)}</Row>
          <Row label="Phone">{formatPhone(r.from_number || r.caller_phone)}</Row>
          {r.call_successful !== undefined && (
            <Row label="Completed">
              <span className={r.call_successful ? 'text-green-600 font-medium' : 'text-red-500 font-medium'}>
                {r.call_successful ? 'Yes' : 'No'}
              </span>
            </Row>
          )}
          {r.call_completion_rating && <Row label="Rating">{r.call_completion_rating}</Row>}
          {r.user_sentiment && (
            <Row label="Sentiment">
              <span className={`font-medium ${SENTIMENT_COLOR[r.user_sentiment] ?? ''}`}>{r.user_sentiment}</span>
            </Row>
          )}
          {r.recording_url && (
            <div className="pt-1">
              <p className="text-xs text-slate-400 mb-1">Recording</p>
              <audio controls src={r.recording_url} className="w-full" preload="metadata" />
            </div>
          )}
        </div>

        {/* Post-Call Data */}
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Post-Call Data</p>
          {cadEntries.length === 0 && !r.user_sentiment ? (
            <p className="text-xs text-slate-300 italic">Awaiting post-call analysis</p>
          ) : (
            <div className="space-y-2">
              {cadEntries
                .filter(([key]) => key !== 'resolution_provided')
                .map(([key, val]) => (
                  <Row key={key} label={cadLabel(key)}>
                    {key === 'recommended_route' ? (
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${ROUTE_COLOR[val] ?? 'bg-gray-100 text-gray-600'}`}>
                        {ROUTE_LABEL[val] ?? val}
                      </span>
                    ) : key === 'follow_up_required' || key === 'service_case_created' ? (
                      <span className={val === 'yes' ? (key === 'follow_up_required' ? 'text-red-500 font-medium' : 'text-green-600 font-medium') : 'text-slate-400'}>
                        {val === 'yes' ? 'Yes' : 'No'}
                      </span>
                    ) : (
                      <span className="capitalize">{val.replace(/_/g, ' ')}</span>
                    )}
                  </Row>
                ))
              }
            </div>
          )}
        </div>

        {/* Case Info */}
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Case Info</p>
          {r.has_case && r.case_id ? (
            <div className="space-y-2">
              <Row label="Case ID">
                <Link href={`/cases/${r.case_id}`} className="font-mono text-xs text-[#E31837] hover:underline">
                  {r.case_id}
                </Link>
              </Row>
              {r.status && (
                <Row label="Status">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLOR[r.status] ?? 'bg-slate-100 text-slate-500'}`}>
                    {r.status}
                  </span>
                </Row>
              )}
              {r.priority && r.priority !== 'normal' && (
                <Row label="Priority">
                  <span className={`text-xs font-semibold ${r.priority === 'urgent' ? 'text-red-600' : 'text-green-600'}`}>
                    {r.priority}
                  </span>
                </Row>
              )}
              {r.assigned_to && <Row label="Assigned To">{r.assigned_to}</Row>}
              <div className="pt-2">
                <Link href={`/cases/${r.case_id}`} className="text-xs text-[#E31837] hover:underline font-medium">
                  Open full case →
                </Link>
              </div>
            </div>
          ) : (
            <p className="text-xs text-slate-400 italic">No service case for this call.</p>
          )}
        </div>
      </div>

      {/* Issue + Summary + Resolution */}
      {(r.issue_description || r.call_summary || cad.resolution_provided) && (
        <div className="bg-white rounded-xl border border-gray-100 p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {r.issue_description && (
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5">Issue Reported</p>
              <p className="text-sm text-slate-700 leading-relaxed">{r.issue_description}</p>
              {r.escalation_reason && (
                <p className="text-xs text-slate-500 mt-2 italic">{r.escalation_reason}</p>
              )}
            </div>
          )}
          <div className="space-y-3">
            {r.call_summary && (
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5">Call Summary</p>
                <p className="text-sm text-slate-700 leading-relaxed">{r.call_summary}</p>
              </div>
            )}
            {cad.resolution_provided && (
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5">Resolution</p>
                <p className="text-sm text-slate-700 leading-relaxed">{cad.resolution_provided}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Notes */}
      {r.notes && r.notes.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Internal Notes</p>
          <div className="space-y-2">
            {r.notes.map(note => (
              <div key={note.id} className="bg-amber-50 border border-amber-100 rounded-lg px-3 py-2.5">
                <p className="text-xs text-slate-700 leading-relaxed">{note.text}</p>
                <p className="text-xs text-slate-400 mt-1">{formatDate(note.timestamp)}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Activity timeline */}
      {r.activity && r.activity.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-4">Activity</p>
          <div className="relative">
            <div className="absolute left-[7px] top-2 bottom-2 w-px bg-slate-100" />
            <div className="space-y-3">
              {r.activity.map(entry => (
                <div key={entry.id} className="flex items-start gap-3 pl-1">
                  <div className={`mt-1 w-3.5 h-3.5 rounded-full flex-shrink-0 ring-2 ring-white ${ACTIVITY_DOT[entry.type] ?? 'bg-slate-300'}`} />
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-slate-700">{entry.label}</p>
                    {entry.detail && <p className="text-xs text-slate-400 mt-0.5 truncate">{entry.detail}</p>}
                    <p className="text-xs text-slate-300 mt-0.5">{formatDate(entry.timestamp)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Transcript */}
      {r.transcript && (
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Transcript</p>
            <button onClick={() => setShowTranscript(s => !s)} className="text-xs text-[#E31837] hover:underline font-medium">
              {showTranscript ? 'Collapse' : 'Expand'}
            </button>
          </div>
          {showTranscript ? (
            <div className="max-h-64 overflow-y-auto">
              <pre className="text-xs text-slate-600 whitespace-pre-wrap leading-relaxed font-sans">{r.transcript}</pre>
            </div>
          ) : (
            <p className="text-xs text-slate-400 italic line-clamp-2">{r.transcript.slice(0, 200)}…</p>
          )}
        </div>
      )}
    </div>
  )
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2">
      <span className="text-xs text-slate-400 w-24 flex-shrink-0 pt-0.5">{label}</span>
      <span className="text-xs text-slate-700">{children}</span>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function CallerHistoryPage() {
  const { phone } = useParams() as { phone: string }
  const decoded = decodeURIComponent(phone)
  const [records, setRecords] = useState<CallRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/records')
      .then(r => r.json())
      .then(d => {
        if (!d.success) return
        const norm = (p?: string) => (p ?? '').replace(/\D/g, '')
        const target = norm(decoded)
        const matched = (d.records as CallRecord[]).filter(r =>
          norm(r.caller_phone) === target || norm(r.from_number) === target
        )
        setRecords(matched)
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [decoded])

  const callerName  = records.find(r => r.caller_name && r.caller_name !== 'Unknown')?.caller_name ?? 'Unknown Caller'
  const totalCalls  = records.length
  const totalCases  = records.filter(r => r.has_case).length
  const openCases   = records.filter(r => r.has_case && r.status !== 'resolved').length
  const safetyCount = records.filter(r => r.recommended_route === 'safety_stop').length

  return (
    <div className="min-h-screen bg-slate-50">
      <Nav />
      <div className="max-w-5xl mx-auto px-4 py-8">

        {/* Breadcrumb */}
        <div className="mb-5 text-sm text-slate-400">
          <Link href="/callers" className="hover:text-[#E31837]">Customers</Link>
          <span className="mx-2">/</span>
          <span className="text-slate-600">{callerName}</span>
        </div>

        {/* Header */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 mb-5">
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-xl font-bold text-slate-800">{callerName}</h1>
              <p className="text-slate-500 text-sm mt-0.5">{formatPhone(decoded)}</p>
              {records[0]?.custom_analysis_data?.caller_email && (
                <p className="text-xs text-slate-400 mt-0.5">{records[0].custom_analysis_data.caller_email}</p>
              )}
            </div>
            <div className="flex gap-5 text-center">
              <div>
                <p className="text-2xl font-bold text-slate-800">{totalCalls}</p>
                <p className="text-xs text-slate-400">Calls</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-800">{totalCases}</p>
                <p className="text-xs text-slate-400">Cases</p>
              </div>
              {openCases > 0 && (
                <div>
                  <p className="text-2xl font-bold text-amber-600">{openCases}</p>
                  <p className="text-xs text-slate-400">Open</p>
                </div>
              )}
              {safetyCount > 0 && (
                <div>
                  <p className="text-2xl font-bold text-red-600">{safetyCount}</p>
                  <p className="text-xs text-slate-400">Safety</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {loading && <div className="text-center py-12 text-slate-400">Loading history…</div>}

        {!loading && records.length === 0 && (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm text-center py-12">
            <p className="text-slate-400">No records found for this number.</p>
            <Link href="/callers" className="btn-secondary text-sm mt-4 inline-block">Back to Customers</Link>
          </div>
        )}

        {!loading && records.length > 0 && (
          <div className="space-y-2">
            {records.map(r => {
              const key     = r.call_id || r.case_id || r.stored_at
              const isOpen  = expanded === key
              const cad     = r.custom_analysis_data ?? {}
              const route   = r.recommended_route ?? cad?.recommended_route
              const isSafety = route === 'safety_stop'

              return (
                <div
                  key={key}
                  className={`bg-white rounded-xl border shadow-sm overflow-hidden ${isSafety ? 'border-red-200' : 'border-gray-100'}`}
                >
                  {/* Summary row — clickable */}
                  <button
                    onClick={() => setExpanded(isOpen ? null : key)}
                    className="w-full text-left px-5 py-4 flex flex-wrap items-center gap-x-5 gap-y-2 hover:bg-slate-50 transition-colors"
                  >
                    {/* Date + duration */}
                    <div className="min-w-[140px]">
                      <p className="text-xs font-medium text-slate-700">{formatDate(r.created_at)}</p>
                      <p className="text-xs text-slate-400 mt-0.5">{formatDuration(r.duration_ms)}</p>
                    </div>

                    {/* Vehicle */}
                    {(r.vehicle ?? cad.vehicle_model) && (
                      <p className="text-xs text-slate-500 italic max-w-[160px] truncate">
                        {r.vehicle ?? cad.vehicle_model}
                      </p>
                    )}

                    {/* Issue category */}
                    {cad.issue_category && (
                      <p className="text-xs font-medium text-slate-600 capitalize">{cad.issue_category}</p>
                    )}

                    {/* Route badge */}
                    {route && (
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${ROUTE_COLOR[route] ?? 'bg-gray-100 text-gray-600'}`}>
                        {ROUTE_LABEL[route] ?? route}
                      </span>
                    )}

                    {/* Sentiment */}
                    {r.user_sentiment && (
                      <span className={`text-xs font-medium ${SENTIMENT_COLOR[r.user_sentiment] ?? 'text-slate-400'}`}>
                        {r.user_sentiment}
                      </span>
                    )}

                    {/* Status */}
                    {r.has_case && r.status && (
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLOR[r.status] ?? 'bg-slate-100 text-slate-500'}`}>
                        {r.status}
                      </span>
                    )}

                    {/* Call successful */}
                    {r.call_successful !== undefined && (
                      <span className={`text-xs font-medium ${r.call_successful ? 'text-green-600' : 'text-red-400'}`}>
                        {r.call_successful ? '✓ Complete' : '✗ Incomplete'}
                      </span>
                    )}

                    {/* Case ID */}
                    {r.case_id && (
                      <span className="text-xs font-mono text-slate-400 hidden lg:inline">{r.case_id}</span>
                    )}

                    <div className="ml-auto text-slate-300 text-xs">{isOpen ? '▲' : '▼'}</div>
                  </button>

                  {/* Expanded detail */}
                  {isOpen && <CallDetailPanel r={r} />}
                </div>
              )
            })}
          </div>
        )}

      </div>
    </div>
  )
}
