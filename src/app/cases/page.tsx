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
  /** All post-call analysis fields from Retell — open-ended so new fields appear automatically */
  custom_analysis_data?: Record<string, string>
  analysis?: {
    likely_issue?: string
    confidence_level?: string
    escalation_required?: boolean
  }
  activity?: Array<{
    id: string
    type: 'case_created' | 'status_changed' | 'email_sent'
    timestamp: string
    label: string
    detail?: string
  }>
  notes?: Array<{ id: string; text: string; timestamp: string }>
  priority?: 'urgent' | 'normal' | 'low'
  assigned_to?: string
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

// ─── Post-call field labels ───────────────────────────────────────────────────
// Known keys get a clean label; any unknown key Retell starts sending will be
// humanised automatically (snake_case → Title Case).

const CAD_LABELS: Record<string, string> = {
  issue_category:        'Issue Category',
  vehicle_model:         'Vehicle Model',
  recommended_route:     'Recommended Route',
  resolution_provided:   'Resolution Provided',
  service_case_created:  'Case Created',
  visual_diagnostic_used:'Visual Diagnostic',
  caller_satisfaction:   'Caller Satisfaction',
  follow_up_required:    'Follow-Up Required',
  caller_email:          'Caller Email',
  caller_name:           'Caller Name',
  order_number:          'Order Number',
  session_id:            'Session ID',
  case_id:               'Case ID',
}

/** Long-form fields rendered as paragraphs rather than chips */
const CAD_LONG_FIELDS = new Set(['resolution_provided'])

function cadLabel(key: string): string {
  return CAD_LABELS[key] ?? key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
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

function exportToCsv(records: UnifiedRecord[]) {
  const headers = [
    'Case ID', 'Call ID', 'Caller Name', 'Phone', 'Email', 'Vehicle',
    'Issue Description', 'Issue Category', 'Route', 'Status', 'Priority',
    'Sentiment', 'Satisfaction', 'Follow-Up', 'Case Created', 'Visual Diagnostic',
    'Call Successful', 'Duration (s)', 'Call Summary', 'Resolution Provided',
    'Date Created',
  ]
  const rows = records.map(r => {
    const cad = r.custom_analysis_data ?? {}
    return [
      r.case_id ?? '', r.call_id ?? '',
      r.caller_name, r.caller_phone || r.from_number || '',
      r.caller_email ?? cad.caller_email ?? '',
      r.vehicle ?? cad.vehicle_model ?? '',
      r.issue_description ?? '',
      cad.issue_category ?? '', r.recommended_route ?? '', r.status ?? '',
      r.priority ?? 'normal', r.user_sentiment ?? '',
      cad.caller_satisfaction ?? '', cad.follow_up_required ?? '',
      cad.service_case_created ?? '', cad.visual_diagnostic_used ?? '',
      r.call_successful != null ? String(r.call_successful) : '',
      r.duration_ms ? String(Math.round(r.duration_ms / 1000)) : '',
      (r.call_summary ?? '').replace(/\n/g, ' '),
      (cad.resolution_provided ?? '').replace(/\n/g, ' '),
      r.created_at,
    ].map(v => `"${String(v).replace(/"/g, '""')}"`)
  })
  const csv = [headers.map(h => `"${h}"`).join(','), ...rows.map(r => r.join(','))].join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a'); a.href = url
  a.download = `magiccars-activity-${new Date().toISOString().slice(0, 10)}.csv`
  a.click(); URL.revokeObjectURL(url)
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
  onSent?: () => void
}

function SendEmailModal({ record, onClose, onSent }: SendEmailModalProps) {
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
      if (d.success) { setSent(true); setSentSubject(editSubject); onSent?.() }
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
  onDelete: (callId: string, caseId?: string) => Promise<void>
  deleting: boolean
  confirmDelete: boolean
  onConfirmDelete: () => void
  onCancelDelete: () => void
  onEmail: () => void
  onRecordUpdated: (updatedRecord: Partial<UnifiedRecord> & { case_id: string }) => void
}

const PRIORITY_CONFIG = {
  urgent: { label: 'Urgent', color: 'bg-red-100 text-red-700 border-red-200', dot: 'bg-red-500' },
  normal: { label: 'Normal', color: 'bg-slate-100 text-slate-600 border-slate-200', dot: 'bg-slate-400' },
  low:    { label: 'Low',    color: 'bg-green-100 text-green-700 border-green-200', dot: 'bg-green-400' },
}

function ExpandedPanel({
  record, onStatusChange, statusSaving,
  onDelete, deleting, confirmDelete, onConfirmDelete, onCancelDelete, onEmail, onRecordUpdated,
}: ExpandedPanelProps) {
  const [showTranscript, setShowTranscript] = useState(false)
  const [noteText, setNoteText] = useState('')
  const [savingNote, setSavingNote] = useState(false)
  const [prioritySaving, setPrioritySaving] = useState(false)
  const [assignSaving, setAssignSaving] = useState(false)
  const [teamMembers, setTeamMembers] = useState<Array<{ email: string; name: string }>>([])

  useEffect(() => {
    fetch('/api/users').then(r => r.json()).then(d => {
      if (d.success) setTeamMembers([
        { email: 'info@mymagiccars.com', name: 'Admin' },
        ...d.users.map((u: { email: string; name: string }) => ({ email: u.email, name: u.name })),
      ])
    }).catch(() => {})
  }, [])
  const cad = record.custom_analysis_data
  const isSafety = record.recommended_route === 'safety_stop'

  async function handleAddNote() {
    if (!noteText.trim() || !record.case_id) return
    setSavingNote(true)
    try {
      const res = await fetch(`/api/cases/${record.case_id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ add_note: noteText.trim() }),
      })
      const d = await res.json()
      if (d.success) {
        onRecordUpdated({ case_id: record.case_id, notes: d.case?.notes })
        setNoteText('')
      }
    } catch { /* silent */ }
    finally { setSavingNote(false) }
  }

  async function handlePriorityChange(p: 'urgent' | 'normal' | 'low') {
    if (!record.case_id || record.priority === p) return
    setPrioritySaving(true)
    try {
      const res = await fetch(`/api/cases/${record.case_id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priority: p }),
      })
      const d = await res.json()
      if (d.success) onRecordUpdated({ case_id: record.case_id, priority: p })
    } catch { /* silent */ } finally { setPrioritySaving(false) }
  }

  async function handleAssign(assignee: string) {
    if (!record.case_id) return
    setAssignSaving(true)
    try {
      const res = await fetch(`/api/cases/${record.case_id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assigned_to: assignee }),
      })
      const d = await res.json()
      if (d.success) onRecordUpdated({ case_id: record.case_id, assigned_to: assignee })
    } catch { /* silent */ } finally { setAssignSaving(false) }
  }

  const hasEmail = !!(record.caller_email || record.custom_analysis_data?.caller_email)

  return (
    <div className={`border-t px-5 py-5 space-y-5 ${isSafety ? 'bg-red-50/40 border-red-200' : 'bg-slate-50/60 border-gray-100'}`}>

      {/* ── Action bar ── */}
      <div className="flex items-center gap-3 flex-wrap">
        <button onClick={onEmail} className="btn-primary text-xs flex items-center gap-1.5">
          ✉ Send Email to Caller
        </button>
        {record.case_id && (
          <Link href={`/cases/${record.case_id}`} className="btn-secondary text-xs">
            Open Full Case →
          </Link>
        )}
        {/* Priority toggle */}
        {record.has_case && (
          <div className="flex items-center gap-1 rounded-lg border border-slate-200 p-0.5 bg-slate-50">
            {(['urgent', 'normal', 'low'] as const).map(p => {
              const cfg = PRIORITY_CONFIG[p]
              return (
                <button
                  key={p}
                  onClick={() => handlePriorityChange(p)}
                  disabled={prioritySaving}
                  className={`px-2 py-0.5 rounded text-xs font-semibold border transition-all ${
                    (record.priority ?? 'normal') === p
                      ? cfg.color + ' ring-1'
                      : 'bg-white text-slate-400 border-transparent hover:bg-slate-100'
                  }`}
                >
                  {cfg.label}
                </button>
              )
            })}
          </div>
        )}
        <div className="ml-auto">
          {confirmDelete ? (
            <span className="inline-flex items-center gap-2">
              <span className="text-xs text-slate-500">Delete this record?</span>
              <button
                onClick={() => onDelete(record.call_id, record.case_id)}
                disabled={deleting}
                className="px-2.5 py-1 rounded text-xs font-semibold bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
              >
                {deleting ? '…' : 'Yes, delete'}
              </button>
              <button
                onClick={onCancelDelete}
                className="px-2.5 py-1 rounded text-xs font-semibold bg-slate-100 text-slate-600 hover:bg-slate-200"
              >
                Cancel
              </button>
            </span>
          ) : (
            <button
              onClick={onConfirmDelete}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Delete record
            </button>
          )}
        </div>
      </div>

      {/* ── Top grid: Call Details | Post-Call Data (2-col) | Case Info ── */}
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

        {/* Post-call data — fully dynamic, renders every field Retell sends */}
        <div className="bg-white rounded-xl border border-gray-100 p-4 sm:col-span-1 lg:col-span-2">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Post-Call Data</p>

          {/* Top-level call analysis fields */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 mb-3">
            {record.call_successful !== undefined && (
              <DetailField label="Call Successful">
                <span className={record.call_successful ? 'text-green-600 font-medium' : 'text-red-500 font-medium'}>
                  {record.call_successful ? 'Yes' : 'No'}
                </span>
              </DetailField>
            )}
            {record.user_sentiment && (
              <DetailField label="User Sentiment">
                <span className={`font-medium ${SENTIMENT_COLOR[record.user_sentiment] ?? ''}`}>
                  {record.user_sentiment}
                </span>
              </DetailField>
            )}
            {record.call_completion_rating && (
              <DetailField label="Completion Rating">{record.call_completion_rating}</DetailField>
            )}

            {/* Every custom_analysis_data field — short values as chips */}
            {cad && Object.entries(cad)
              .filter(([key, val]) => val && val.trim() && !CAD_LONG_FIELDS.has(key))
              .map(([key, val]) => (
                <DetailField key={key} label={cadLabel(key)}>
                  {key === 'recommended_route' ? (
                    <Badge
                      label={ROUTE_LABEL[val] ?? val}
                      color={ROUTE_COLOR[val] ?? 'bg-gray-100 text-gray-600'}
                    />
                  ) : key === 'follow_up_required' || key === 'service_case_created' ? (
                    <span className={val === 'yes' ? (key === 'follow_up_required' ? 'text-red-500 font-medium' : 'text-green-600 font-medium') : 'text-slate-400'}>
                      {val === 'yes' ? 'Yes' : 'No'}
                    </span>
                  ) : key === 'session_id' || key === 'case_id' ? (
                    <span className="font-mono text-[11px] break-all">{val}</span>
                  ) : (
                    <span className="capitalize">{val.replace(/_/g, ' ')}</span>
                  )}
                </DetailField>
              ))
            }
          </div>

          {/* Long-form fields rendered as paragraphs */}
          {cad && Object.entries(cad)
            .filter(([key, val]) => val && val.trim() && CAD_LONG_FIELDS.has(key))
            .map(([key, val]) => (
              <div key={key} className="border-t border-slate-50 pt-2.5 mt-2.5">
                <p className="text-xs text-slate-400 mb-1">{cadLabel(key)}</p>
                <p className="text-xs text-slate-700 leading-relaxed">{val}</p>
              </div>
            ))
          }

          {!record.call_successful && !record.user_sentiment && (!cad || Object.keys(cad).length === 0) && (
            <p className="text-xs text-slate-300 italic">Awaiting post-call analysis from Retell</p>
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
              {/* Assignment */}
              {teamMembers.length > 0 && (
                <DetailField label="Assigned to">
                  <select
                    value={record.assigned_to ?? ''}
                    onChange={e => handleAssign(e.target.value)}
                    disabled={assignSaving}
                    className="text-xs border border-slate-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-[#E31837]/30 bg-white w-full mt-0.5"
                  >
                    <option value="">Unassigned</option>
                    {teamMembers.map(m => (
                      <option key={m.email} value={m.email}>{m.name}</option>
                    ))}
                  </select>
                </DetailField>
              )}

              <div className="pt-2">
                <Link href={`/cases/${record.case_id}`} className="text-xs text-[#E31837] hover:underline font-medium">
                  Open full case →
                </Link>
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

      {/* ── Activity timeline ── */}
      {record.activity && record.activity.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-4">Activity</p>
          <div className="relative">
            {/* Vertical line */}
            <div className="absolute left-[7px] top-2 bottom-2 w-px bg-slate-100" />
            <div className="space-y-4">
              {record.activity.map(entry => {
                const dotColor =
                  entry.type === 'case_created' ? 'bg-blue-400' :
                  entry.type === 'email_sent'   ? 'bg-purple-400' :
                  entry.type === 'status_changed' ? 'bg-green-400' :
                  'bg-slate-300'
                return (
                  <div key={entry.id} className="flex items-start gap-3 pl-1">
                    <div className={`mt-1 w-3.5 h-3.5 rounded-full flex-shrink-0 ${dotColor} ring-2 ring-white`} />
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-slate-700">{entry.label}</p>
                      {entry.detail && (
                        <p className="text-xs text-slate-400 mt-0.5 truncate">{entry.detail}</p>
                      )}
                      <p className="text-xs text-slate-300 mt-0.5">
                        {new Date(entry.timestamp).toLocaleString('en-US', {
                          month: 'short', day: 'numeric', year: 'numeric',
                          hour: 'numeric', minute: '2-digit',
                        })}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── Internal notes ── */}
      {record.has_case && (
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Internal Notes</p>
          {record.notes && record.notes.length > 0 && (
            <div className="space-y-2.5 mb-3">
              {record.notes.map(note => (
                <div key={note.id} className="bg-amber-50 border border-amber-100 rounded-lg px-3 py-2.5">
                  <p className="text-xs text-slate-700 leading-relaxed">{note.text}</p>
                  <p className="text-xs text-slate-400 mt-1">
                    {new Date(note.timestamp).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                  </p>
                </div>
              ))}
            </div>
          )}
          <div className="flex gap-2">
            <input
              type="text"
              value={noteText}
              onChange={e => setNoteText(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAddNote() } }}
              placeholder="Add an internal note…"
              className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-[#E31837]/30 focus:border-[#E31837]"
            />
            <button
              onClick={handleAddNote}
              disabled={savingNote || !noteText.trim()}
              className="btn-primary text-xs disabled:opacity-50"
            >
              {savingNote ? '…' : 'Add'}
            </button>
          </div>
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

// ─── Aging helpers ────────────────────────────────────────────────────────────

function getDaysOpen(record: UnifiedRecord): number | null {
  if (!record.has_case || record.status === 'resolved') return null
  const created = new Date(record.created_at).getTime()
  return Math.floor((Date.now() - created) / (1000 * 60 * 60 * 24))
}

function AgingBadge({ days }: { days: number }) {
  if (days < 3) return null
  const isUrgent = days >= 7
  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-semibold ${
      isUrgent ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
    }`}>
      {days}d open
    </span>
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
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null)
  const [newCount, setNewCount] = useState(0)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [bulkStatus, setBulkStatus] = useState('')
  const [bulkSaving, setBulkSaving] = useState(false)
  const [savedFilters, setSavedFilters] = useState<Array<{ name: string; query: string }>>([])

  // Load saved filters from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem('mc_saved_filters')
      if (stored) setSavedFilters(JSON.parse(stored))
    } catch { /* ignore */ }
  }, [])

  function saveCurrentFilter() {
    if (!query.trim()) return
    const name = prompt('Name this filter:')
    if (!name) return
    const updated = [...savedFilters.filter(f => f.name !== name), { name, query: query.trim() }]
    setSavedFilters(updated)
    try { localStorage.setItem('mc_saved_filters', JSON.stringify(updated)) } catch { /* ignore */ }
  }

  function deleteSavedFilter(name: string) {
    const updated = savedFilters.filter(f => f.name !== name)
    setSavedFilters(updated)
    try { localStorage.setItem('mc_saved_filters', JSON.stringify(updated)) } catch { /* ignore */ }
  }

  // Request notification permission on mount
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission()
    }
  }, [])

  function fireNotification(title: string, body: string) {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, { body, icon: '/favicon.ico' })
    }
  }

  useEffect(() => {
    fetch('/api/records')
      .then(r => r.json())
      .then(d => { if (d.success) { setRecords(d.records); setLastRefresh(new Date()) } })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const id = setInterval(async () => {
      try {
        const res = await fetch('/api/records')
        const d = await res.json()
        if (!d.success) return
        setRecords(prev => {
          const prevIds = new Set(prev.map(r => r.call_id || r.case_id))
          const incoming: UnifiedRecord[] = d.records
          const added = incoming.filter(r => !prevIds.has(r.call_id || r.case_id))
          if (added.length > 0) {
            setNewCount(n => n + added.length)
            // Fire notification for safety escalations
            const safetyNew = added.filter(r => r.recommended_route === 'safety_stop')
            if (safetyNew.length > 0) {
              fireNotification(
                '🚨 Safety Escalation',
                `${safetyNew[0].caller_name} — ${safetyNew[0].vehicle ?? 'unknown vehicle'}`
              )
            } else if (added.some(r => r.has_case)) {
              fireNotification('New Case Created', `${added[0].caller_name} — ${added[0].custom_analysis_data?.issue_category ?? 'new issue'}`)
            }
          }
          return d.records
        })
        setLastRefresh(new Date())
      } catch { /* silent */ }
    }, 30_000)
    return () => clearInterval(id)
  }, [])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return records
    return records.filter(r => recordSearchText(r).includes(q))
  }, [records, query])

  async function refreshRecords() {
    try {
      const res = await fetch('/api/records')
      const d = await res.json()
      if (d.success) setRecords(d.records)
    } catch { /* silent */ }
  }

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
        // Update status + activity from the fresh case the API returns
        setRecords(prev => prev.map(r =>
          r.case_id === caseId
            ? { ...r, status: newStatus, activity: d.case?.activity ?? r.activity }
            : r
        ))
      }
    } catch { /* silent */ }
    finally { setStatusSaving(false) }
  }

  async function handleDelete(callId: string, caseId?: string) {
    setDeleting(callId)
    try {
      const url = `/api/records/${encodeURIComponent(callId)}${caseId ? `?case_id=${encodeURIComponent(caseId)}` : ''}`
      const res = await fetch(url, { method: 'DELETE' })
      const d = await res.json()
      if (d.success) {
        // Remove the record entirely from the list
        setRecords(prev => prev.filter(r => r.call_id !== callId))
        setConfirmDelete(null)
        setExpanded(null)
      }
    } catch { /* silent */ }
    finally { setDeleting(null) }
  }

  function toggleSelect(key: string) {
    setSelected(prev => { const n = new Set(prev); n.has(key) ? n.delete(key) : n.add(key); return n })
  }
  function toggleSelectAll() {
    if (selected.size === filtered.length) setSelected(new Set())
    else setSelected(new Set(filtered.map(r => r.call_id || r.case_id || r.stored_at)))
  }

  async function handleBulkStatus() {
    if (!bulkStatus || selected.size === 0) return
    setBulkSaving(true)
    const caseIds = filtered
      .filter(r => selected.has(r.call_id || r.case_id || r.stored_at) && r.case_id)
      .map(r => r.case_id!)
    await Promise.all(caseIds.map(id =>
      fetch(`/api/cases/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: bulkStatus }) })
    ))
    await refreshRecords()
    setSelected(new Set()); setBulkStatus(''); setBulkSaving(false)
  }

  async function handleBulkDelete() {
    if (selected.size === 0) return
    setBulkSaving(true)
    const toDelete = filtered.filter(r => selected.has(r.call_id || r.case_id || r.stored_at))
    await Promise.all(toDelete.map(r => {
      const url = `/api/records/${encodeURIComponent(r.call_id)}${r.case_id ? `?case_id=${encodeURIComponent(r.case_id)}` : ''}`
      return fetch(url, { method: 'DELETE' })
    }))
    await refreshRecords()
    setSelected(new Set()); setBulkSaving(false)
  }

  const totalCases = records.filter(r => r.has_case).length
  const safetyCount = records.filter(r => r.recommended_route === 'safety_stop').length

  return (
    <div className="min-h-screen bg-slate-50">
      <Nav />
      {emailRecord && (
        <SendEmailModal
          record={emailRecord}
          onClose={() => setEmailRecord(null)}
          onSent={refreshRecords}
        />
      )}
      <div className="max-w-7xl mx-auto px-4 py-8">

        {/* Header */}
        <div className="flex items-center justify-between mb-5 flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold text-[#E31837]">All Activity</h1>
            <p className="text-slate-500 text-sm mt-1 flex items-center gap-2 flex-wrap">
              <span>{records.length} call{records.length !== 1 ? 's' : ''}</span>
              {totalCases > 0 && <span className="text-slate-400">· {totalCases} case{totalCases !== 1 ? 's' : ''}</span>}
              {query && filtered.length !== records.length && <span className="text-slate-400">· {filtered.length} matching</span>}
              {safetyCount > 0 && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-red-600 text-white">
                  {safetyCount} safety
                </span>
              )}
              {lastRefresh && (
                <span className="text-slate-300 text-xs">· {lastRefresh.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</span>
              )}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {newCount > 0 && (
              <button
                onClick={() => { setNewCount(0) }}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-600 text-white hover:bg-blue-700 animate-pulse"
              >
                {newCount} new — tap to dismiss
              </button>
            )}
            <button
              onClick={() => { refreshRecords(); setNewCount(0) }}
              className="btn-secondary text-sm flex items-center gap-1.5"
              title="Refresh"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Refresh
            </button>
            {filtered.length > 0 && (
              <button onClick={() => exportToCsv(filtered)} className="btn-secondary text-sm flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Export CSV
              </button>
            )}
            <Link href="/demo" className="btn-primary text-sm">+ Test Session</Link>
          </div>
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

        {/* Quick filter chips */}
        <div className="mb-3 flex items-center gap-2 flex-wrap">
          {[
            { label: 'Open safety', query: 'safety' },
            { label: 'Follow-up', query: 'follow_up_required: yes' },
            { label: 'Open cases', query: 'open' },
            { label: 'Unresolved', query: 'open assigned' },
          ].map(f => (
            <button
              key={f.label}
              onClick={() => setQuery(q => q === f.query ? '' : f.query)}
              className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-all ${
                query === f.query
                  ? 'bg-[#E31837] text-white border-[#E31837]'
                  : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'
              }`}
            >
              {f.label}
            </button>
          ))}
          {savedFilters.map(f => (
            <span key={f.name} className="inline-flex items-center gap-1">
              <button
                onClick={() => setQuery(q => q === f.query ? '' : f.query)}
                className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-all ${
                  query === f.query
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'
                }`}
              >
                {f.name}
              </button>
              <button onClick={() => deleteSavedFilter(f.name)} className="text-slate-300 hover:text-red-500 text-xs leading-none">×</button>
            </span>
          ))}
          {query && (
            <button onClick={saveCurrentFilter} className="px-2.5 py-1 rounded-full text-xs font-medium border border-dashed border-slate-300 text-slate-400 hover:border-slate-400 hover:text-slate-600">
              + Save filter
            </button>
          )}
        </div>

        {/* Bulk action toolbar */}
        {selected.size > 0 && (
          <div className="mb-3 flex items-center gap-3 flex-wrap px-4 py-3 bg-blue-50 border border-blue-200 rounded-xl">
            <span className="text-sm font-semibold text-blue-800">{selected.size} selected</span>
            <select
              value={bulkStatus}
              onChange={e => setBulkStatus(e.target.value)}
              className="text-sm border border-blue-200 rounded-lg px-2.5 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-300"
            >
              <option value="">Change status…</option>
              <option value="open">Open</option>
              <option value="assigned">Assigned</option>
              <option value="resolved">Resolved</option>
            </select>
            {bulkStatus && (
              <button onClick={handleBulkStatus} disabled={bulkSaving} className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50">
                {bulkSaving ? '…' : 'Apply'}
              </button>
            )}
            <button onClick={handleBulkDelete} disabled={bulkSaving} className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 ml-auto">
              {bulkSaving ? '…' : `Delete ${selected.size}`}
            </button>
            <button onClick={() => setSelected(new Set())} className="text-xs text-blue-600 hover:underline">Clear</button>
          </div>
        )}

        {loading && <div className="text-center py-16 text-slate-400">Loading…</div>}

        {!loading && records.length === 0 && (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm text-center py-16">
            <div className="text-4xl mb-3">📞</div>
            <h2 className="text-lg font-semibold text-slate-600 mb-2">No Activity Yet</h2>
            <p className="text-slate-400 text-sm mb-5">Calls will appear here as soon as Harold receives his first inbound call.</p>
            <Link href="/demo" className="btn-primary text-sm">Test Session</Link>
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
            {/* Select all */}
            <div className="flex items-center gap-2 px-1 mb-1">
              <input
                type="checkbox"
                checked={selected.size === filtered.length && filtered.length > 0}
                onChange={toggleSelectAll}
                className="w-3.5 h-3.5 accent-[#E31837]"
              />
              <span className="text-xs text-slate-400">Select all</span>
            </div>
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
                  <div className="flex items-start">
                    <div className="px-3 py-5 flex items-center">
                      <input
                        type="checkbox"
                        checked={selected.has(key)}
                        onChange={() => toggleSelect(key)}
                        onClick={e => e.stopPropagation()}
                        className="w-3.5 h-3.5 accent-[#E31837]"
                      />
                    </div>
                  <button
                    onClick={() => setExpanded(isOpen ? null : key)}
                    className="flex-1 text-left px-3 py-4 flex flex-wrap items-center gap-x-5 gap-y-2 hover:bg-slate-50 transition-colors"
                  >
                    {/* Caller */}
                    <div className="min-w-[140px]">
                      <div className="font-semibold text-slate-800 text-sm">{record.caller_name}</div>
                      {(record.from_number || record.caller_phone) && (
                        <Link
                          href={`/callers/${encodeURIComponent(record.from_number || record.caller_phone)}`}
                          onClick={e => e.stopPropagation()}
                          className="text-xs text-slate-400 mt-0.5 hover:text-[#E31837] hover:underline block"
                        >
                          {formatPhone(record.from_number || record.caller_phone)}
                        </Link>
                      )}
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

                    {/* Aging badge */}
                    {(() => { const d = getDaysOpen(record); return d !== null ? <AgingBadge days={d} /> : null })()}

                    {/* Priority badge */}
                    {record.priority && record.priority !== 'normal' && (
                      <span className={`text-xs font-semibold px-1.5 py-0.5 rounded ${
                        record.priority === 'urgent' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                      }`}>
                        {record.priority}
                      </span>
                    )}

                    {/* Case ID */}
                    {record.case_id && (
                      <span className="text-xs font-mono text-slate-400 hidden lg:inline">{record.case_id}</span>
                    )}

                    <div className="ml-auto text-slate-300 text-xs">{isOpen ? '▲' : '▼'}</div>
                  </button>
                  </div>

                  {/* Expanded panel */}
                  {isOpen && (
                    <ExpandedPanel
                      record={record}
                      onStatusChange={handleStatusChange}
                      statusSaving={statusSaving}
                      onDelete={handleDelete}
                      deleting={deleting === key}
                      confirmDelete={confirmDelete === key}
                      onConfirmDelete={() => setConfirmDelete(key)}
                      onCancelDelete={() => setConfirmDelete(null)}
                      onEmail={() => setEmailRecord(record)}
                      onRecordUpdated={upd => setRecords(prev => prev.map(r =>
                        r.case_id === upd.case_id ? { ...r, ...upd } : r
                      ))}
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
