'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import Link from 'next/link'
import Nav from '@/components/Nav'

// ─── Types ────────────────────────────────────────────────────────────────────

interface UnifiedRecord {
  call_id: string
  case_id?: string
  has_case: boolean
  caller_name: string
  caller_phone: string
  caller_email?: string
  from_number?: string
  vehicle?: string
  issue_description?: string
  escalation_reason?: string
  recommended_route?: string
  status?: string
  recording_url?: string
  transcript?: string
  duration_ms?: number
  start_timestamp?: number
  user_sentiment?: string
  call_summary?: string
  call_completion_rating?: string
  call_successful?: boolean
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
    likely_issue?: string
    confidence_level?: string
    escalation_required?: boolean
  }
  created_at: string
  stored_at: string
}

interface EmailTemplate {
  template_id: string
  name: string
  subject: string
  body: string
}

function previewBody(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (match, key: string) =>
    vars[key] !== undefined ? vars[key] : match
  )
}

// ─── Constants ────────────────────────────────────────────────────────────────

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

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  open:     { label: 'Open',     color: 'bg-yellow-100 text-yellow-700' },
  assigned: { label: 'Assigned', color: 'bg-blue-100 text-blue-700' },
  resolved: { label: 'Resolved', color: 'bg-green-100 text-green-700' },
}

const SENTIMENT_COLOR: Record<string, string> = {
  Positive: 'text-green-600',
  Neutral:  'text-slate-500',
  Negative: 'text-red-500',
  Unknown:  'text-slate-400',
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(iso?: string | number) {
  if (!iso) return '—'
  return new Date(typeof iso === 'number' ? iso : iso).toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: 'numeric', minute: '2-digit',
  })
}

function formatDuration(ms?: number) {
  if (!ms) return '—'
  const s = Math.round(ms / 1000)
  const m = Math.floor(s / 60)
  return m > 0 ? `${m}m ${s % 60}s` : `${s}s`
}

function formatPhone(phone?: string) {
  if (!phone) return '—'
  const d = phone.replace(/\D/g, '')
  if (d.length === 11 && d.startsWith('1')) return `+1 (${d.slice(1,4)}) ${d.slice(4,7)}-${d.slice(7)}`
  return phone
}

function recordSearchText(r: UnifiedRecord): string {
  const cad = r.custom_analysis_data
  return [
    r.call_id, r.case_id,
    r.caller_name, r.caller_phone, r.caller_email,
    formatPhone(r.from_number || r.caller_phone),
    r.vehicle,
    r.issue_description, r.escalation_reason,
    r.recommended_route, ROUTE_LABEL[r.recommended_route ?? ''] ?? '',
    r.status,
    r.user_sentiment,
    r.call_summary,
    formatDate(r.created_at),
    cad?.issue_category, cad?.vehicle_model,
    cad?.caller_satisfaction, cad?.follow_up_required,
    cad?.caller_email, cad?.resolution_provided,
  ].filter(Boolean).join(' ').toLowerCase()
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Badge({ label, color }: { label: string; color: string }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${color}`}>
      {label}
    </span>
  )
}

function DetailField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs text-slate-400 mb-0.5">{label}</p>
      <div className="text-xs font-medium text-slate-700">{children}</div>
    </div>
  )
}

// ─── Send Email Modal ─────────────────────────────────────────────────────────

interface SendEmailModalProps {
  record: UnifiedRecord
  onClose: () => void
}

function SendEmailModal({ record, onClose }: SendEmailModalProps) {
  const [templates, setTemplates] = useState<EmailTemplate[]>([])
  const [selectedId, setSelectedId] = useState('')
  const [toEmail, setToEmail] = useState(
    record.caller_email || record.custom_analysis_data?.caller_email || ''
  )
  const [editSubject, setEditSubject] = useState('')
  const [editBody, setEditBody] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [sentSubject, setSentSubject] = useState('')
  const [error, setError] = useState('')
  const [loadingTemplates, setLoadingTemplates] = useState(true)

  const caseVars: Record<string, string> = {
    caller_name: record.caller_name,
    caller_phone: record.caller_phone || record.from_number || '',
    caller_email: toEmail,
    case_id: record.case_id || '',
    vehicle: record.vehicle || record.custom_analysis_data?.vehicle_model || '',
    issue_description: record.issue_description || '',
    recommended_route: record.recommended_route || '',
    analysis_summary: record.call_summary || '',
  }

  const populateFromTemplate = useCallback((templateId: string, tmplList: EmailTemplate[]) => {
    const t = tmplList.find(x => x.template_id === templateId)
    if (!t) return
    setEditSubject(previewBody(t.subject, caseVars))
    setEditBody(previewBody(t.body, caseVars))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [record, toEmail])

  useEffect(() => {
    fetch('/api/templates')
      .then(r => r.json())
      .then(d => {
        if (d.success && d.templates.length > 0) {
          setTemplates(d.templates)
          setSelectedId(d.templates[0].template_id)
          populateFromTemplate(d.templates[0].template_id, d.templates)
        }
      })
      .catch(console.error)
      .finally(() => setLoadingTemplates(false))
  }, [populateFromTemplate])

  function handleTemplateChange(id: string) {
    setSelectedId(id)
    populateFromTemplate(id, templates)
  }

  async function handleSend() {
    if (!toEmail.trim()) { setError('An email address is required.'); return }
    if (!editSubject.trim()) { setError('Subject cannot be empty.'); return }
    if (!editBody.trim()) { setError('Body cannot be empty.'); return }
    setSending(true); setError('')
    try {
      const res = await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          override_email: toEmail.trim(),
          final_subject: editSubject,
          final_body: editBody,
        }),
      })
      const d = await res.json()
      if (d.success) { setSent(true); setSentSubject(editSubject) }
      else setError(d.error || 'Failed to send email.')
    } catch { setError('Network error — please try again.') }
    finally { setSending(false) }
  }

  const inputCls = 'w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#E31837]/30 focus:border-[#E31837]'
  const canSend = !sending && !!toEmail.trim() && !!editSubject.trim() && !!editBody.trim()

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-8 px-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div>
            <h2 className="text-lg font-bold text-slate-800">Send Email</h2>
            <p className="text-sm text-slate-400">{record.caller_name} · {formatPhone(record.from_number || record.caller_phone)}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl leading-none p-1">×</button>
        </div>

        {sent ? (
          <div className="flex-1 flex flex-col items-center justify-center py-16 px-6 text-center">
            <div className="text-5xl mb-4">✅</div>
            <h3 className="text-lg font-semibold text-slate-800 mb-2">Email sent!</h3>
            <p className="text-sm text-slate-500 mb-1">Sent to: {toEmail}</p>
            <p className="text-xs text-slate-400 italic mb-6">{sentSubject}</p>
            <button onClick={onClose} className="btn-secondary text-sm">Close</button>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">To</label>
                <input type="email" value={toEmail} onChange={e => setToEmail(e.target.value)} placeholder="caller@email.com" className={inputCls} />
                {!record.caller_email && !record.custom_analysis_data?.caller_email && (
                  <p className="text-xs text-amber-600 mt-1">No email captured during call — enter manually.</p>
                )}
              </div>
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Template</label>
                  <Link href="/templates" target="_blank" className="text-xs text-[#E31837] hover:underline">Manage →</Link>
                </div>
                {loadingTemplates ? (
                  <div className="text-sm text-slate-400">Loading...</div>
                ) : templates.length === 0 ? (
                  <div className="text-sm text-slate-400">No templates. <Link href="/templates" className="text-[#E31837] hover:underline">Create one →</Link></div>
                ) : (
                  <select value={selectedId} onChange={e => handleTemplateChange(e.target.value)} className={inputCls}>
                    {templates.map(t => <option key={t.template_id} value={t.template_id}>{t.name}</option>)}
                  </select>
                )}
              </div>
              {(editSubject || editBody) && (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Subject</label>
                    <input type="text" value={editSubject} onChange={e => setEditSubject(e.target.value)} className={inputCls} />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Body</label>
                      <span className="text-xs text-slate-400">Edit freely — this is what gets sent</span>
                    </div>
                    <textarea rows={12} value={editBody} onChange={e => setEditBody(e.target.value)}
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#E31837]/30 focus:border-[#E31837] resize-none leading-relaxed"
                    />
                  </div>
                </>
              )}
              {error && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>}
            </div>
            <div className="px-6 py-4 border-t border-slate-100 flex gap-3">
              <button onClick={handleSend} disabled={!canSend} className="btn-primary text-sm disabled:opacity-50">
                {sending ? 'Sending…' : 'Send Email'}
              </button>
              <button onClick={onClose} className="btn-secondary text-sm">Cancel</button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// ─── Expanded Panel ───────────────────────────────────────────────────────────

interface ExpandedPanelProps {
  record: UnifiedRecord
  onStatusChange: (caseId: string, status: string) => Promise<void>
  statusSaving: boolean
  onDelete: (caseId: string) => Promise<void>
  deleting: boolean
  confirmDelete: boolean
  onConfirmDelete: () => void
  onCancelDelete: () => void
  onEmail: () => void
}

function ExpandedPanel({
  record, onStatusChange, statusSaving,
  onDelete, deleting, confirmDelete, onConfirmDelete, onCancelDelete, onEmail,
}: ExpandedPanelProps) {
  const [showTranscript, setShowTranscript] = useState(false)
  const cad = record.custom_analysis_data
  const isSafety = record.recommended_route === 'safety_stop'

  const hasEmail = !!(record.caller_email || record.custom_analysis_data?.caller_email)

  return (
    <div className={`border-t px-5 py-5 space-y-5 ${isSafety ? 'bg-red-50/40 border-red-200' : 'bg-slate-50/60 border-gray-100'}`}>

      {/* ── Action bar ── */}
      <div className="flex items-center gap-3 flex-wrap">
        <button
          onClick={onEmail}
          className="btn-primary text-xs flex items-center gap-1.5"
        >
          ✉ Send Email to Caller
        </button>
        {!hasEmail && (
          <span className="text-xs text-slate-400">No email on file — you can enter one in the modal</span>
        )}
        {record.case_id && (
          <Link href={`/cases/${record.case_id}`} className="btn-secondary text-xs">
            Open Full Case →
          </Link>
        )}
      </div>

      {/* ── Top grid ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

        {/* Call details */}
        <div className="bg-white rounded-xl border border-gray-100 p-4 space-y-2.5">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Call Details</p>
          <DetailField label="Call ID"><span className="font-mono text-[11px]">{record.call_id || '—'}</span></DetailField>
          <DetailField label="Date">{formatDate(record.start_timestamp || record.created_at)}</DetailField>
          <DetailField label="Duration">{formatDuration(record.duration_ms)}</DetailField>
          <DetailField label="Phone">{formatPhone(record.from_number || record.caller_phone)}</DetailField>
          {record.call_successful !== undefined && (
            <DetailField label="Call Successful">
              <span className={record.call_successful ? 'text-green-600' : 'text-red-500'}>
                {record.call_successful ? 'Yes' : 'No'}
              </span>
            </DetailField>
          )}
          {record.call_completion_rating && (
            <DetailField label="Completion">{record.call_completion_rating}</DetailField>
          )}
          {record.recording_url && (
            <DetailField label="Recording">
              <audio controls src={record.recording_url} className="w-full mt-1" preload="metadata" />
            </DetailField>
          )}
        </div>

        {/* Post-call analysis */}
        <div className="bg-white rounded-xl border border-gray-100 p-4 space-y-2.5">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Post-Call Analysis</p>
          {cad?.issue_category && <DetailField label="Issue Category"><span className="capitalize">{cad.issue_category}</span></DetailField>}
          {(cad?.vehicle_model || record.vehicle) && <DetailField label="Vehicle">{cad?.vehicle_model || record.vehicle}</DetailField>}
          {record.recommended_route && (
            <DetailField label="Route">
              <Badge
                label={ROUTE_LABEL[record.recommended_route] ?? record.recommended_route}
                color={ROUTE_COLOR[record.recommended_route] ?? 'bg-gray-100 text-gray-600'}
              />
            </DetailField>
          )}
          {record.user_sentiment && (
            <DetailField label="Sentiment">
              <span className={`font-medium ${SENTIMENT_COLOR[record.user_sentiment] ?? ''}`}>
                {record.user_sentiment}
              </span>
            </DetailField>
          )}
          {cad?.caller_satisfaction && <DetailField label="Satisfaction"><span className="capitalize">{cad.caller_satisfaction}</span></DetailField>}
          {cad?.visual_diagnostic_used && <DetailField label="Visual Diagnostic"><span className="capitalize">{cad.visual_diagnostic_used.replace(/_/g, ' ')}</span></DetailField>}
          {!cad?.issue_category && !record.recommended_route && !record.user_sentiment && (
            <p className="text-xs text-slate-300 italic">Awaiting post-call analysis</p>
          )}
        </div>

        {/* Outcomes */}
        <div className="bg-white rounded-xl border border-gray-100 p-4 space-y-2.5">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Outcomes</p>
          {cad?.service_case_created && (
            <DetailField label="Case Created">
              <span className={cad.service_case_created === 'yes' ? 'text-green-600 font-medium' : 'text-slate-400'}>
                {cad.service_case_created === 'yes' ? 'Yes' : 'No'}
              </span>
            </DetailField>
          )}
          {cad?.follow_up_required && (
            <DetailField label="Follow-Up">
              <span className={cad.follow_up_required === 'yes' ? 'text-red-500 font-medium' : 'text-slate-400'}>
                {cad.follow_up_required === 'yes' ? 'Required' : 'Not required'}
              </span>
            </DetailField>
          )}
          {cad?.caller_email && <DetailField label="Caller Email">{cad.caller_email}</DetailField>}
          {record.caller_email && !cad?.caller_email && <DetailField label="Caller Email">{record.caller_email}</DetailField>}
          {cad?.session_id && <DetailField label="Session ID"><span className="font-mono text-[11px]">{cad.session_id}</span></DetailField>}
          {!cad?.service_case_created && !cad?.follow_up_required && !record.caller_email && (
            <p className="text-xs text-slate-300 italic">No outcome data yet</p>
          )}
        </div>

        {/* Case info */}
        <div className="bg-white rounded-xl border border-gray-100 p-4 space-y-2.5">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Case Info</p>
          {record.has_case && record.case_id ? (
            <>
              <DetailField label="Case ID">
                <Link href={`/cases/${record.case_id}`} className="font-mono text-[11px] text-[#E31837] hover:underline">
                  {record.case_id}
                </Link>
              </DetailField>
              {record.vehicle && <DetailField label="Vehicle">{record.vehicle}</DetailField>}
              {record.status && (
                <DetailField label="Status">
                  <div className="flex gap-1 mt-1 flex-wrap">
                    {(['open', 'assigned', 'resolved'] as const).map(s => (
                      <button
                        key={s}
                        disabled={statusSaving}
                        onClick={() => onStatusChange(record.case_id!, s)}
                        className={`px-2 py-0.5 rounded text-xs font-semibold border transition-all ${
                          s === record.status
                            ? STATUS_CONFIG[s].color + ' border-transparent ring-1 ring-offset-0'
                            : 'bg-white text-slate-400 border-slate-200 hover:border-slate-300'
                        } ${statusSaving ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        {STATUS_CONFIG[s].label}
                      </button>
                    ))}
                  </div>
                </DetailField>
              )}
              <div className="pt-2 flex flex-col gap-1.5">
                <Link href={`/cases/${record.case_id}`} className="text-xs text-[#E31837] hover:underline font-medium">
                  Open full case →
                </Link>
                {confirmDelete ? (
                  <span className="inline-flex items-center gap-1.5 mt-1">
                    <span className="text-xs text-slate-500">Delete case?</span>
                    <button onClick={() => onDelete(record.case_id!)} disabled={deleting} className="px-2 py-0.5 rounded text-xs font-semibold bg-red-600 text-white hover:bg-red-700 disabled:opacity-50">
                      {deleting ? '…' : 'Yes'}
                    </button>
                    <button onClick={onCancelDelete} className="px-2 py-0.5 rounded text-xs font-semibold bg-slate-100 text-slate-600 hover:bg-slate-200">Cancel</button>
                  </span>
                ) : (
                  <button onClick={onConfirmDelete} className="text-xs text-slate-400 hover:text-red-500 text-left">
                    Delete case
                  </button>
                )}
              </div>
            </>
          ) : (
            <p className="text-xs text-slate-400 italic">No service case created for this call.</p>
          )}
        </div>
      </div>

      {/* ── Full-width rows ── */}
      {(record.call_summary || cad?.resolution_provided || record.issue_description) && (
        <div className="bg-white rounded-xl border border-gray-100 p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {record.issue_description && (
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5">Issue Reported</p>
              <p className="text-sm text-slate-700 leading-relaxed">{record.issue_description}</p>
              {record.escalation_reason && (
                <p className="text-xs text-slate-500 mt-2 italic">{record.escalation_reason}</p>
              )}
            </div>
          )}
          {(record.call_summary || cad?.resolution_provided) && (
            <div className="space-y-3">
              {record.call_summary && (
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5">Call Summary</p>
                  <p className="text-sm text-slate-700 leading-relaxed">{record.call_summary}</p>
                </div>
              )}
              {cad?.resolution_provided && (
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5">Resolution Documented</p>
                  <p className="text-sm text-slate-700 leading-relaxed">{cad.resolution_provided}</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Transcript ── */}
      {record.transcript && (
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Transcript</p>
            <button onClick={() => setShowTranscript(s => !s)} className="text-xs text-[#E31837] hover:underline font-medium">
              {showTranscript ? 'Collapse' : 'Expand'}
            </button>
          </div>
          {showTranscript ? (
            <div className="max-h-64 overflow-y-auto">
              <pre className="text-xs text-slate-600 whitespace-pre-wrap leading-relaxed font-sans">{record.transcript}</pre>
            </div>
          ) : (
            <p className="text-xs text-slate-400 italic line-clamp-2">{record.transcript.slice(0, 200)}…</p>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ActivityPage() {
  const [records, setRecords] = useState<UnifiedRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [expanded, setExpanded] = useState<string | null>(null)
  const [statusSaving, setStatusSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [emailRecord, setEmailRecord] = useState<UnifiedRecord | null>(null)

  useEffect(() => {
    fetch('/api/records')
      .then(r => r.json())
      .then(d => { if (d.success) setRecords(d.records) })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return records
    return records.filter(r => recordSearchText(r).includes(q))
  }, [records, query])

  async function handleStatusChange(caseId: string, newStatus: string) {
    const record = records.find(r => r.case_id === caseId)
    if (!record || record.status === newStatus) return
    setStatusSaving(true)
    try {
      const res = await fetch(`/api/cases/${caseId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      const d = await res.json()
      if (d.success) {
        setRecords(prev => prev.map(r => r.case_id === caseId ? { ...r, status: newStatus } : r))
      }
    } catch { /* silent */ }
    finally { setStatusSaving(false) }
  }

  async function handleDelete(caseId: string) {
    setDeleting(caseId)
    try {
      const res = await fetch(`/api/cases/${caseId}`, { method: 'DELETE' })
      const d = await res.json()
      if (d.success) {
        setRecords(prev => prev.map(r =>
          r.case_id === caseId ? { ...r, has_case: false, case_id: undefined, status: undefined } : r
        ))
        setConfirmDelete(null)
        setExpanded(null)
      }
    } catch { /* silent */ }
    finally { setDeleting(null) }
  }

  const totalCases = records.filter(r => r.has_case).length
  const safetyCount = records.filter(r => r.recommended_route === 'safety_stop').length

  return (
    <div className="min-h-screen bg-slate-50">
      <Nav />
      {emailRecord && (
        <SendEmailModal record={emailRecord} onClose={() => setEmailRecord(null)} />
      )}
      <div className="max-w-7xl mx-auto px-4 py-8">

        {/* Header */}
        <div className="flex items-center justify-between mb-5 flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold text-[#E31837]">All Activity</h1>
            <p className="text-slate-500 text-sm mt-1">
              {records.length} call{records.length !== 1 ? 's' : ''}
              {totalCases > 0 && <span className="ml-2 text-slate-400">· {totalCases} case{totalCases !== 1 ? 's' : ''}</span>}
              {query && filtered.length !== records.length && <span className="ml-2 text-slate-400">· {filtered.length} matching</span>}
              {safetyCount > 0 && (
                <span className="ml-3 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-red-600 text-white">
                  {safetyCount} safety
                </span>
              )}
            </p>
          </div>
          <Link href="/demo" className="btn-primary text-sm">+ New Demo Session</Link>
        </div>

        {/* Search */}
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
            className="w-full pl-9 pr-9 py-2.5 border border-slate-200 rounded-xl text-sm bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-[#E31837]/30 focus:border-[#E31837]"
          />
          {query && (
            <button onClick={() => setQuery('')} className="absolute inset-y-0 right-3 flex items-center text-slate-400 hover:text-slate-600 text-lg leading-none">×</button>
          )}
        </div>

        {loading && <div className="text-center py-16 text-slate-400">Loading…</div>}

        {!loading && records.length === 0 && (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm text-center py-16">
            <div className="text-4xl mb-3">📞</div>
            <h2 className="text-lg font-semibold text-slate-600 mb-2">No Activity Yet</h2>
            <p className="text-slate-400 text-sm mb-5">Calls will appear here as soon as Harold receives his first inbound call.</p>
            <Link href="/demo" className="btn-primary text-sm">Go to Demo Simulator</Link>
          </div>
        )}

        {!loading && records.length > 0 && filtered.length === 0 && (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm text-center py-16">
            <div className="text-3xl mb-3">🔍</div>
            <h2 className="text-lg font-semibold text-slate-600 mb-2">No matches for &ldquo;{query}&rdquo;</h2>
            <p className="text-slate-400 text-sm mb-4">Try a name, phone number, vehicle, date, or status.</p>
            <button onClick={() => setQuery('')} className="btn-secondary text-sm">Clear search</button>
          </div>
        )}

        {!loading && filtered.length > 0 && (
          <div className="space-y-2">
            {filtered.map(record => {
              const key = record.call_id || record.case_id || record.stored_at
              const isOpen = expanded === key
              const cad = record.custom_analysis_data
              const isSafety = record.recommended_route === 'safety_stop'
              const route = record.recommended_route

              return (
                <div
                  key={key}
                  className={`bg-white rounded-xl border shadow-sm overflow-hidden transition-all ${isSafety ? 'border-red-300' : 'border-gray-100'}`}
                >
                  {/* Summary row */}
                  <button
                    onClick={() => setExpanded(isOpen ? null : key)}
                    className="w-full text-left px-5 py-4 flex flex-wrap items-center gap-x-5 gap-y-2 hover:bg-slate-50 transition-colors"
                  >
                    {/* Caller */}
                    <div className="min-w-[140px]">
                      <div className="font-semibold text-slate-800 text-sm">{record.caller_name}</div>
                      <div className="text-xs text-slate-400 mt-0.5">{formatPhone(record.from_number || record.caller_phone)}</div>
                    </div>

                    {/* Date */}
                    <div className="text-xs text-slate-400 min-w-[120px]">
                      {formatDate(record.start_timestamp || record.created_at)}
                    </div>

                    {/* Duration */}
                    <div className="text-xs text-slate-500 w-14">{formatDuration(record.duration_ms)}</div>

                    {/* Vehicle */}
                    {(cad?.vehicle_model || record.vehicle) && (
                      <div className="text-xs text-slate-500 italic max-w-[140px] truncate">
                        {cad?.vehicle_model || record.vehicle}
                      </div>
                    )}

                    {/* Issue category */}
                    {cad?.issue_category && (
                      <div className="text-xs text-slate-600 capitalize font-medium">{cad.issue_category}</div>
                    )}

                    {/* Route */}
                    {route && (
                      <Badge
                        label={ROUTE_LABEL[route] ?? route}
                        color={ROUTE_COLOR[route] ?? 'bg-gray-100 text-gray-600'}
                      />
                    )}

                    {/* Sentiment */}
                    {record.user_sentiment && (
                      <span className={`text-xs font-medium ${SENTIMENT_COLOR[record.user_sentiment] ?? 'text-slate-400'}`}>
                        {record.user_sentiment}
                      </span>
                    )}

                    {/* Status / Case badge */}
                    {record.has_case && record.status ? (
                      <Badge
                        label={STATUS_CONFIG[record.status]?.label ?? record.status}
                        color={STATUS_CONFIG[record.status]?.color ?? 'bg-slate-100 text-slate-500'}
                      />
                    ) : (
                      <span className="text-xs text-slate-300">No case</span>
                    )}

                    {/* Case ID */}
                    {record.case_id && (
                      <span className="text-xs font-mono text-slate-400 hidden lg:inline">{record.case_id}</span>
                    )}

                    <div className="ml-auto text-slate-300 text-xs">{isOpen ? '▲' : '▼'}</div>
                  </button>

                  {/* Expanded panel */}
                  {isOpen && (
                    <ExpandedPanel
                      record={record}
                      onStatusChange={handleStatusChange}
                      statusSaving={statusSaving}
                      onDelete={handleDelete}
                      deleting={deleting === record.case_id}
                      confirmDelete={confirmDelete === record.case_id}
                      onConfirmDelete={() => setConfirmDelete(record.case_id!)}
                      onCancelDelete={() => setConfirmDelete(null)}
                      onEmail={() => setEmailRecord(record)}
                    />
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
