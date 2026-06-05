'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import Nav from '@/components/Nav'

// ─── Types ────────────────────────────────────────────────────────────────────

interface AnalysisResult {
  visual_summary: string
  likely_issue: string
  confidence_level: string
  safe_owner_steps: string[]
  do_not_do: string[]
  escalation_required: boolean
  recommended_route: string
  service_case_summary: string
}

interface CallMetadata {
  call_id: string
  from_number?: string
  recording_url?: string
  public_log_url?: string
  transcript?: string
  duration_ms?: number
  start_timestamp?: number
  end_timestamp?: number
  user_sentiment?: string
  call_summary?: string
  call_completion_rating?: string
  call_successful?: boolean
  dynamic_variables?: Record<string, unknown>
  custom_analysis_data?: Record<string, string>
  stored_at: string
}

interface CaseActivity {
  id: string
  type: 'case_created' | 'status_changed' | 'email_sent'
  timestamp: string
  label: string
  detail?: string
}

interface ServiceCase {
  case_id: string
  call_id: string
  session_id: string
  caller_name: string
  caller_phone: string
  caller_email?: string
  vehicle: string
  issue_description: string
  analysis_summary: string
  recommended_route: string
  escalation_reason: string
  status: string
  analysis?: AnalysisResult
  call_metadata?: CallMetadata
  from_number?: string
  custom_analysis_data?: Record<string, string>
  file_path?: string
  file_name?: string
  file_type?: string
  activity?: CaseActivity[]
  created_at: string
  updated_at: string
}

interface EditForm {
  caller_name: string
  caller_phone: string
  caller_email: string
  vehicle: string
  issue_description: string
  escalation_reason: string
}

interface EmailTemplate {
  template_id: string
  name: string
  category: string
  subject: string
  body: string
}

// ─── Constants ────────────────────────────────────────────────────────────────

const ROUTE_LABEL: Record<string, string> = {
  self_fix: 'Self-Fix Guide',
  replacement_part: 'Send Replacement Part',
  warranty_replacement: 'Full Warranty Replacement',
  out_of_warranty: 'Out-of-Warranty Repair',
  safety_stop: 'Stop Use Immediately',
  human_support: 'Transfer to Human Agent',
}

const CONF_BADGE: Record<string, string> = {
  low: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  medium: 'bg-orange-100 text-orange-800 border-orange-200',
  high: 'bg-red-100 text-red-800 border-red-200',
}

const ROUTE_BADGE: Record<string, string> = {
  self_fix: 'bg-green-100 text-green-800',
  replacement_part: 'bg-blue-100 text-blue-800',
  warranty_replacement: 'bg-purple-100 text-purple-800',
  out_of_warranty: 'bg-orange-100 text-orange-800',
  safety_stop: 'bg-red-600 text-white',
  human_support: 'bg-gray-100 text-gray-800',
}

const SENTIMENT_BADGE: Record<string, string> = {
  Positive: 'bg-green-100 text-green-700',
  Neutral: 'bg-gray-100 text-gray-600',
  Negative: 'bg-red-100 text-red-700',
  Unknown: 'bg-slate-100 text-slate-500',
}

const STATUS_CONFIG: Record<string, { label: string; active: string; inactive: string }> = {
  open: {
    label: 'Open',
    active: 'bg-yellow-100 text-yellow-800 border-yellow-300 ring-1 ring-yellow-400',
    inactive: 'bg-white text-slate-500 border-slate-200 hover:bg-yellow-50 hover:text-yellow-700',
  },
  assigned: {
    label: 'Assigned',
    active: 'bg-blue-100 text-blue-800 border-blue-300 ring-1 ring-blue-400',
    inactive: 'bg-white text-slate-500 border-slate-200 hover:bg-blue-50 hover:text-blue-700',
  },
  resolved: {
    label: 'Resolved',
    active: 'bg-green-100 text-green-800 border-green-300 ring-1 ring-green-400',
    inactive: 'bg-white text-slate-500 border-slate-200 hover:bg-green-50 hover:text-green-700',
  },
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function formatDuration(ms: number): string {
  const totalSec = Math.round(ms / 1000)
  const mins = Math.floor(totalSec / 60)
  const secs = totalSec % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-1">
      <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
        {title}
      </h3>
      {children}
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
        {label}
      </label>
      {children}
    </div>
  )
}

const inputCls =
  'w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#E31837]/30 focus:border-[#E31837] bg-white'

const textareaCls =
  'w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#E31837]/30 focus:border-[#E31837] bg-white resize-none leading-relaxed'

// ─── Status Toggle ────────────────────────────────────────────────────────────

interface StatusToggleProps {
  current: string
  saving: boolean
  onChange: (status: string) => void
}

function StatusToggle({ current, saving, onChange }: StatusToggleProps) {
  return (
    <div className="flex items-center gap-1 rounded-lg border border-slate-200 p-0.5 bg-slate-50">
      {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
        <button
          key={key}
          onClick={() => { if (key !== current && !saving) onChange(key) }}
          disabled={saving}
          className={`px-3 py-1 rounded-md text-xs font-semibold border transition-all ${
            key === current ? cfg.active : cfg.inactive
          } ${saving ? 'opacity-60 cursor-not-allowed' : ''}`}
        >
          {saving && key === current ? 'Saving…' : cfg.label}
        </button>
      ))}
    </div>
  )
}

// ─── Call Recording Panel ─────────────────────────────────────────────────────

function CallRecordingPanel({ meta }: { meta: CallMetadata }) {
  const [showTranscript, setShowTranscript] = useState(false)
  const [showVars, setShowVars] = useState(false)

  const dynVars = meta.dynamic_variables
    ? Object.entries(meta.dynamic_variables).filter(([, v]) => v !== null && v !== '')
    : []

  return (
    <div className="space-y-4">
      {/* Stats row */}
      <div className="card">
        <Section title="Call Summary">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
            {meta.duration_ms !== undefined && (
              <div className="bg-slate-50 rounded-lg px-3 py-2.5">
                <p className="text-xs text-slate-400 mb-0.5">Duration</p>
                <p className="font-semibold text-slate-700 font-mono">{formatDuration(meta.duration_ms)}</p>
              </div>
            )}
            {meta.user_sentiment && (
              <div className="bg-slate-50 rounded-lg px-3 py-2.5">
                <p className="text-xs text-slate-400 mb-0.5">Caller Sentiment</p>
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${SENTIMENT_BADGE[meta.user_sentiment] || 'bg-slate-100 text-slate-500'}`}>
                  {meta.user_sentiment}
                </span>
              </div>
            )}
            {meta.call_successful !== undefined && (
              <div className="bg-slate-50 rounded-lg px-3 py-2.5">
                <p className="text-xs text-slate-400 mb-0.5">Call Successful</p>
                <p className={`font-semibold text-sm ${meta.call_successful ? 'text-green-600' : 'text-red-500'}`}>
                  {meta.call_successful ? 'Yes' : 'No'}
                </p>
              </div>
            )}
            {meta.call_completion_rating && (
              <div className="bg-slate-50 rounded-lg px-3 py-2.5">
                <p className="text-xs text-slate-400 mb-0.5">Completion</p>
                <p className="font-semibold text-slate-700 text-sm">{meta.call_completion_rating}</p>
              </div>
            )}
            {meta.stored_at && (
              <div className="bg-slate-50 rounded-lg px-3 py-2.5">
                <p className="text-xs text-slate-400 mb-0.5">Webhook Received</p>
                <p className="text-xs text-slate-500">
                  {new Date(meta.stored_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                </p>
              </div>
            )}
          </div>
          {meta.call_summary && (
            <p className="text-sm text-slate-600 leading-relaxed italic border-t border-slate-100 pt-3">
              {meta.call_summary}
            </p>
          )}
        </Section>
      </div>

      {/* Recording player */}
      {meta.recording_url && (
        <div className="card">
          <Section title="Call Recording">
            <audio controls src={meta.recording_url} className="w-full" preload="metadata" />
            {meta.public_log_url && (
              <a href={meta.public_log_url} target="_blank" rel="noopener noreferrer" className="text-xs text-[#E31837] hover:underline mt-2 inline-block">
                View full call log in Retell →
              </a>
            )}
          </Section>
        </div>
      )}

      {/* Transcript */}
      {meta.transcript && (
        <div className="card">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Call Transcript</h3>
            <button onClick={() => setShowTranscript(s => !s)} className="text-xs text-[#E31837] hover:underline font-medium">
              {showTranscript ? 'Collapse' : 'Expand'}
            </button>
          </div>
          {showTranscript ? (
            <div className="max-h-72 overflow-y-auto">
              <pre className="text-xs text-slate-600 whitespace-pre-wrap leading-relaxed font-sans">{meta.transcript}</pre>
            </div>
          ) : (
            <p className="text-xs text-slate-400 italic line-clamp-2">{meta.transcript.slice(0, 200)}…</p>
          )}
        </div>
      )}

      {/* Post-call analysis data */}
      {meta.custom_analysis_data && Object.keys(meta.custom_analysis_data).length > 0 && (
        <div className="card">
          <Section title="Post-Call Analysis">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {[
                { key: 'issue_category', label: 'Issue Category' },
                { key: 'vehicle_model', label: 'Vehicle' },
                { key: 'recommended_route', label: 'Route' },
                { key: 'caller_satisfaction', label: 'Caller Satisfaction' },
                { key: 'visual_diagnostic_used', label: 'Visual Diagnostic' },
                { key: 'follow_up_required', label: 'Follow-Up Required' },
                { key: 'service_case_created', label: 'Case Created' },
                { key: 'caller_email', label: 'Caller Email' },
                { key: 'session_id', label: 'Session ID' },
                { key: 'case_id', label: 'Case ID' },
              ].map(({ key, label }) => {
                const val = meta.custom_analysis_data?.[key]
                if (!val) return null
                return (
                  <div key={key} className="bg-slate-50 rounded-lg px-3 py-2.5">
                    <p className="text-xs text-slate-400 mb-0.5">{label}</p>
                    <p className="text-xs font-medium text-slate-700 capitalize break-all">{val.replace(/_/g, ' ')}</p>
                  </div>
                )
              })}
            </div>
            {meta.custom_analysis_data.resolution_provided && (
              <div className="mt-3 bg-slate-50 rounded-lg px-3 py-2.5">
                <p className="text-xs text-slate-400 mb-1">Resolution Provided</p>
                <p className="text-xs text-slate-700 leading-relaxed">{meta.custom_analysis_data.resolution_provided}</p>
              </div>
            )}
          </Section>
        </div>
      )}

      {/* Dynamic variables */}
      {dynVars.length > 0 && (
        <div className="card">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Extracted Post-Call Variables</h3>
            <button onClick={() => setShowVars(s => !s)} className="text-xs text-[#E31837] hover:underline font-medium">
              {showVars ? 'Collapse' : `Show all ${dynVars.length}`}
            </button>
          </div>
          <div className={`space-y-1 ${!showVars ? 'max-h-32 overflow-hidden' : ''}`}>
            {dynVars.map(([key, value]) => (
              <div key={key} className="flex items-start justify-between gap-3 py-1.5 border-b border-slate-50 last:border-0">
                <span className="text-xs font-mono text-slate-400 flex-shrink-0">{key}</span>
                <span className="text-xs text-slate-700 text-right">{String(value)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Send Email Modal ─────────────────────────────────────────────────────────

interface SendEmailModalProps {
  serviceCase: ServiceCase
  onClose: () => void
}

function previewBody(body: string, vars: Record<string, string>): string {
  return body.replace(/\{\{(\w+)\}\}/g, (match, key: string) => {
    return vars[key] !== undefined ? vars[key] : match
  })
}

function SendEmailModal({ serviceCase, onClose }: SendEmailModalProps) {
  const [templates, setTemplates] = useState<EmailTemplate[]>([])
  const [selectedId, setSelectedId] = useState('')
  const [overrideEmail, setOverrideEmail] = useState(serviceCase.caller_email || '')
  const [editSubject, setEditSubject] = useState('')
  const [editBody, setEditBody] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [sentSubject, setSentSubject] = useState('')
  const [sentMessage, setSentMessage] = useState('')
  const [error, setError] = useState('')
  const [loadingTemplates, setLoadingTemplates] = useState(true)

  function buildVars(email: string): Record<string, string> {
    return {
      caller_name: serviceCase.caller_name,
      caller_phone: serviceCase.caller_phone,
      caller_email: email,
      case_id: serviceCase.case_id,
      vehicle: serviceCase.vehicle,
      issue_description: serviceCase.issue_description,
      recommended_route: serviceCase.recommended_route,
      analysis_summary: serviceCase.analysis?.service_case_summary || serviceCase.analysis_summary || '',
    }
  }

  // Populate editable fields whenever the template selection changes
  useEffect(() => {
    const selected = templates.find(t => t.template_id === selectedId)
    if (!selected) return
    const vars = buildVars(overrideEmail)
    setEditSubject(previewBody(selected.subject, vars))
    setEditBody(previewBody(selected.body, vars))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId, templates])

  useEffect(() => {
    fetch('/api/templates')
      .then(r => r.json())
      .then(d => {
        if (d.success) {
          setTemplates(d.templates)
          if (d.templates.length > 0) setSelectedId(d.templates[0].template_id)
        }
      })
      .catch(console.error)
      .finally(() => setLoadingTemplates(false))
  }, [])

  async function handleSend() {
    if (!overrideEmail.trim()) { setError('An email address is required.'); return }
    if (!editSubject.trim()) { setError('Subject cannot be empty.'); return }
    if (!editBody.trim()) { setError('Email body cannot be empty.'); return }
    setSending(true); setError('')
    try {
      const res = await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          case_id: serviceCase.case_id,
          override_email: overrideEmail.trim(),
          final_subject: editSubject,
          final_body: editBody,
        }),
      })
      const d = await res.json()
      if (d.success) { setSent(true); setSentSubject(editSubject); setSentMessage(d.message) }
      else setError(d.error || 'Failed to send email.')
    } catch { setError('Network error — please try again.') }
    finally { setSending(false) }
  }

  const canSend = !sending && !!overrideEmail.trim() && !!editSubject.trim() && !!editBody.trim()

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-8 px-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div>
            <h2 className="text-lg font-bold text-slate-800">Send Email</h2>
            <p className="text-sm text-slate-400">Case {serviceCase.case_id} · {serviceCase.caller_name}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl leading-none p-1">×</button>
        </div>

        {sent ? (
          <div className="flex-1 flex flex-col items-center justify-center py-16 px-6 text-center">
            <div className="text-5xl mb-4">✅</div>
            <h3 className="text-lg font-semibold text-slate-800 mb-2">Email sent!</h3>
            <p className="text-sm text-slate-500 mb-1">Sent to: {overrideEmail}</p>
            <p className="text-xs text-slate-500 mb-1 italic">{sentSubject}</p>
            <p className="text-xs text-slate-400 mb-6">{sentMessage}</p>
            <button onClick={onClose} className="btn-secondary text-sm">Close</button>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
              {/* To */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">To</label>
                <input
                  type="email"
                  value={overrideEmail}
                  onChange={e => setOverrideEmail(e.target.value)}
                  placeholder="caller@email.com"
                  className={inputCls}
                />
                {!serviceCase.caller_email && (
                  <p className="text-xs text-amber-600 mt-1">No email captured during call — enter manually.</p>
                )}
              </div>

              {/* Template picker */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Template</label>
                  <Link href="/templates" target="_blank" className="text-xs text-[#E31837] hover:underline">Manage →</Link>
                </div>
                {loadingTemplates ? (
                  <div className="text-sm text-slate-400">Loading...</div>
                ) : templates.length === 0 ? (
                  <div className="text-sm text-slate-400">No templates yet. <Link href="/templates" className="text-[#E31837] hover:underline">Create one →</Link></div>
                ) : (
                  <select value={selectedId} onChange={e => setSelectedId(e.target.value)} className={inputCls}>
                    {templates.map(t => <option key={t.template_id} value={t.template_id}>{t.name}</option>)}
                  </select>
                )}
              </div>

              {/* Editable subject + body */}
              {(editSubject || editBody) && (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                      Subject
                    </label>
                    <input
                      type="text"
                      value={editSubject}
                      onChange={e => setEditSubject(e.target.value)}
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        Body
                      </label>
                      <span className="text-xs text-slate-400">Edit freely — this is what gets sent</span>
                    </div>
                    <textarea
                      rows={12}
                      value={editBody}
                      onChange={e => setEditBody(e.target.value)}
                      className={textareaCls}
                    />
                  </div>
                </>
              )}

              {error && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>}
            </div>

            <div className="px-6 py-4 border-t border-slate-100 flex items-center gap-3">
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

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function CaseDetailPage() {
  const { case_id } = useParams() as { case_id: string }
  const [serviceCase, setServiceCase] = useState<ServiceCase | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [showEmailModal, setShowEmailModal] = useState(false)

  // Edit state
  const [editing, setEditing] = useState(false)
  const [editForm, setEditForm] = useState<EditForm>({
    caller_name: '',
    caller_phone: '',
    caller_email: '',
    vehicle: '',
    issue_description: '',
    escalation_reason: '',
  })
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')

  // Status state (separate from full edit — saves immediately on click)
  const [statusSaving, setStatusSaving] = useState(false)

  useEffect(() => {
    fetch(`/api/cases/${case_id}`)
      .then(r => r.json())
      .then(d => {
        if (d.success) setServiceCase(d.case)
        else setLoadError('Case not found.')
      })
      .catch(() => setLoadError('Failed to load case.'))
      .finally(() => setLoading(false))
  }, [case_id])

  function startEditing() {
    if (!serviceCase) return
    setEditForm({
      caller_name: serviceCase.caller_name,
      caller_phone: serviceCase.caller_phone,
      caller_email: serviceCase.caller_email || '',
      vehicle: serviceCase.vehicle,
      issue_description: serviceCase.issue_description,
      escalation_reason: serviceCase.escalation_reason,
    })
    setSaveError('')
    setEditing(true)
  }

  function cancelEditing() {
    setEditing(false)
    setSaveError('')
  }

  async function handleSave() {
    if (!serviceCase) return
    setSaving(true)
    setSaveError('')
    try {
      const res = await fetch(`/api/cases/${case_id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      })
      const d = await res.json()
      if (d.success) {
        setServiceCase(prev => prev ? { ...prev, ...editForm, updated_at: d.case.updated_at } : prev)
        setEditing(false)
      } else {
        setSaveError(d.error || 'Failed to save changes.')
      }
    } catch {
      setSaveError('Network error — please try again.')
    } finally {
      setSaving(false)
    }
  }

  async function handleStatusChange(newStatus: string) {
    if (!serviceCase || newStatus === serviceCase.status) return
    setStatusSaving(true)
    try {
      const res = await fetch(`/api/cases/${case_id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      const d = await res.json()
      if (d.success) {
        setServiceCase(prev => prev ? { ...prev, status: newStatus, updated_at: d.case.updated_at } : prev)
      }
    } catch { /* silent — status badge will revert on next load */ }
    finally { setStatusSaving(false) }
  }

  if (loading) return (
    <div className="min-h-screen bg-slate-50"><Nav />
      <div className="text-center py-24 text-slate-400">Loading case...</div>
    </div>
  )

  if (loadError || !serviceCase) return (
    <div className="min-h-screen bg-slate-50"><Nav />
      <div className="max-w-3xl mx-auto px-4 py-16 text-center">
        <p className="text-red-600 text-lg">{loadError || 'Case not found.'}</p>
        <Link href="/cases" className="btn-primary mt-4 inline-block text-sm">Back to Cases</Link>
      </div>
    </div>
  )

  const a = serviceCase.analysis
  const meta = serviceCase.call_metadata
  const isSafety = serviceCase.recommended_route === 'safety_stop'
  const isImage = serviceCase.file_type?.startsWith('image/')
  const mediaUrl = serviceCase.file_path ? `/api/media/${serviceCase.session_id}` : null

  // ─── Caller / Vehicle / Issue cards ───────────────────────────────────────

  const callerCard = (
    <div className="card">
      <div className="flex items-start justify-between mb-2">
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Parent / Caller</h3>
      </div>
      {editing ? (
        <div className="space-y-3">
          <Field label="Name">
            <input
              className={inputCls}
              value={editForm.caller_name}
              onChange={e => setEditForm(f => ({ ...f, caller_name: e.target.value }))}
            />
          </Field>
          <Field label="Phone">
            <input
              className={inputCls}
              value={editForm.caller_phone}
              onChange={e => setEditForm(f => ({ ...f, caller_phone: e.target.value }))}
            />
          </Field>
          <Field label="Email">
            <input
              type="email"
              className={inputCls}
              value={editForm.caller_email}
              placeholder="No email on file"
              onChange={e => setEditForm(f => ({ ...f, caller_email: e.target.value }))}
            />
          </Field>
        </div>
      ) : (
        <>
          <p className="font-semibold text-slate-800">{serviceCase.caller_name}</p>
          <p className="text-slate-500 text-sm">{serviceCase.caller_phone}</p>
          {serviceCase.caller_email && <p className="text-slate-500 text-sm">{serviceCase.caller_email}</p>}
          {!serviceCase.caller_email && <p className="text-xs text-amber-500 mt-1">No email on file</p>}
        </>
      )}
    </div>
  )

  const vehicleCard = (
    <div className="card">
      <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Vehicle</h3>
      {editing ? (
        <input
          className={inputCls}
          value={editForm.vehicle}
          onChange={e => setEditForm(f => ({ ...f, vehicle: e.target.value }))}
        />
      ) : (
        <p className="font-semibold text-slate-800">{serviceCase.vehicle}</p>
      )}
    </div>
  )

  const statusCard = (
    <div className="card">
      <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Case Status</h3>
      <StatusToggle
        current={serviceCase.status}
        saving={statusSaving}
        onChange={handleStatusChange}
      />
      {serviceCase.updated_at && (
        <p className="text-xs text-slate-300 mt-2">
          Updated {new Date(serviceCase.updated_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
        </p>
      )}
    </div>
  )

  const issueCard = (
    <div className="card">
      <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Issue Reported</h3>
      {editing ? (
        <textarea
          rows={4}
          className={textareaCls}
          value={editForm.issue_description}
          onChange={e => setEditForm(f => ({ ...f, issue_description: e.target.value }))}
        />
      ) : (
        <p className="text-slate-700 text-sm leading-relaxed">{serviceCase.issue_description}</p>
      )}
    </div>
  )

  const escalationCard = serviceCase.escalation_reason ? (
    <div className={`card ${isSafety ? 'border-red-300 bg-red-50' : 'border-red-100'}`}>
      <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Escalation Reason</h3>
      {editing ? (
        <textarea
          rows={3}
          className={textareaCls}
          value={editForm.escalation_reason}
          onChange={e => setEditForm(f => ({ ...f, escalation_reason: e.target.value }))}
        />
      ) : (
        <p className="text-slate-700 text-sm">{serviceCase.escalation_reason}</p>
      )}
    </div>
  ) : null

  return (
    <div className="min-h-screen bg-slate-50">
      <Nav />
      {showEmailModal && <SendEmailModal serviceCase={serviceCase} onClose={() => setShowEmailModal(false)} />}

      <div className="max-w-5xl mx-auto px-4 py-8">

        {isSafety && (
          <div className="mb-5 p-4 bg-red-600 rounded-xl text-white">
            <p className="font-bold text-base">SAFETY ESCALATION — Stop Use Immediately</p>
            <p className="text-sm mt-1 text-red-100">This vehicle must not be used until resolved by a specialist.</p>
          </div>
        )}

        {/* Breadcrumb */}
        <div className="mb-5 text-sm text-slate-400">
          <Link href="/cases" className="hover:text-[#E31837]">Support Cases</Link>
          <span className="mx-2">/</span>
          <span className="font-mono text-slate-600">{serviceCase.case_id}</span>
        </div>

        {/* Header card */}
        <div className="card mb-5">
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-xl font-bold text-[#E31837] font-mono">{serviceCase.case_id}</h1>
              <p className="text-slate-400 text-xs mt-1">{formatDate(serviceCase.created_at)}</p>
            </div>
            <div className="flex gap-2 flex-wrap items-center">
              {a && (
                <>
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border ${CONF_BADGE[a.confidence_level] || 'bg-gray-100 text-gray-700'}`}>
                    Confidence: {a.confidence_level}
                  </span>
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${ROUTE_BADGE[a.recommended_route] || 'bg-gray-100 text-gray-700'}`}>
                    {ROUTE_LABEL[a.recommended_route] || a.recommended_route}
                  </span>
                  {a.escalation_required && !isSafety && (
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700 border border-red-200">
                      Escalation Required
                    </span>
                  )}
                </>
              )}
              {editing ? (
                <>
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="btn-primary text-xs disabled:opacity-50"
                  >
                    {saving ? 'Saving…' : 'Save Changes'}
                  </button>
                  <button onClick={cancelEditing} className="btn-secondary text-xs">Cancel</button>
                </>
              ) : (
                <>
                  <button onClick={startEditing} className="btn-secondary text-xs flex items-center gap-1.5">
                    ✏ Edit Details
                  </button>
                  <button onClick={() => setShowEmailModal(true)} className="btn-primary text-xs flex items-center gap-1.5">
                    ✉ Send Email
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Save error */}
          {saveError && (
            <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {saveError}
            </div>
          )}
        </div>

        {/* ── Layout with call recording ── */}
        {meta ? (
          <div className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div className="space-y-4">
                {callerCard}
                {vehicleCard}
                {statusCard}
              </div>
              <div className="md:col-span-2 space-y-4">
                {issueCard}
                {escalationCard}
                {a && (
                  <div className="card">
                    <Section title="AI Likely Issue">
                      <p className="text-slate-700 text-sm leading-relaxed">{a.likely_issue}</p>
                    </Section>
                  </div>
                )}
              </div>
            </div>

            {/* Call recording section */}
            <div>
              <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#E31837] inline-block"></span>
                Call Recording &amp; Post-Call Data
              </h2>
              <CallRecordingPanel meta={meta} />
            </div>

            {/* Visual diagnostic */}
            {(mediaUrl || a) && (
              <div>
                <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-blue-400 inline-block"></span>
                  Visual Diagnostic
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {mediaUrl && (
                    <div className="card">
                      <Section title="Uploaded Media">
                        {isImage ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={mediaUrl} alt="Uploaded vehicle media" className="w-full max-h-72 object-contain rounded-lg bg-slate-100" />
                        ) : (
                          <video src={mediaUrl} controls className="w-full max-h-72 rounded-lg bg-black" />
                        )}
                        <p className="text-xs text-slate-400 mt-1">{serviceCase.file_name}</p>
                      </Section>
                    </div>
                  )}
                  {a && (
                    <div className="space-y-4">
                      <div className="card">
                        <Section title="AI Visual Summary">
                          <p className="text-slate-700 text-sm leading-relaxed">{a.visual_summary}</p>
                        </Section>
                      </div>
                      <div className="card">
                        <Section title="Safe Steps for Parent">
                          <ul className="space-y-2">
                            {a.safe_owner_steps.map((s, i) => (
                              <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                                <span className="mt-0.5 flex-shrink-0 w-5 h-5 rounded-full bg-green-100 text-green-700 text-xs flex items-center justify-center font-bold">{i + 1}</span>
                                {s}
                              </li>
                            ))}
                          </ul>
                        </Section>
                      </div>
                      <div className="card border-red-100 bg-red-50">
                        <Section title="Do Not Do">
                          <ul className="space-y-2">
                            {a.do_not_do.map((d, i) => (
                              <li key={i} className="flex items-start gap-2 text-sm text-red-700">
                                <span className="mt-0.5 flex-shrink-0">✕</span>{d}
                              </li>
                            ))}
                          </ul>
                        </Section>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        ) : (
          /* ── Layout without call recording ── */
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="space-y-4">
              {callerCard}
              {vehicleCard}
              {statusCard}
              <div className="card border-dashed border-slate-200 bg-slate-50 text-center py-4">
                <p className="text-xs text-slate-400">⏳ Call recording not yet received</p>
                <p className="text-xs text-slate-300 mt-1">Arrives via Retell webhook after call ends</p>
              </div>
            </div>
            <div className="md:col-span-2 space-y-4">
              {issueCard}
              {escalationCard}
              {mediaUrl && (
                <div className="card">
                  <Section title="Uploaded Media">
                    {isImage ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={mediaUrl} alt="Uploaded vehicle media" className="w-full max-h-80 object-contain rounded-lg bg-slate-100" />
                    ) : (
                      <video src={mediaUrl} controls className="w-full max-h-80 rounded-lg bg-black" />
                    )}
                    <p className="text-xs text-slate-400 mt-1">{serviceCase.file_name}</p>
                  </Section>
                </div>
              )}
              {a ? (
                <>
                  <div className="card"><Section title="AI Visual Summary"><p className="text-slate-700 text-sm leading-relaxed">{a.visual_summary}</p></Section></div>
                  <div className="card"><Section title="Likely Issue"><p className="text-slate-700 text-sm leading-relaxed">{a.likely_issue}</p></Section></div>
                  <div className="card">
                    <Section title="Safe Steps for Parent">
                      <ul className="space-y-2">
                        {a.safe_owner_steps.map((s, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                            <span className="mt-0.5 flex-shrink-0 w-5 h-5 rounded-full bg-green-100 text-green-700 text-xs flex items-center justify-center font-bold">{i + 1}</span>
                            {s}
                          </li>
                        ))}
                      </ul>
                    </Section>
                  </div>
                  <div className="card border-red-100 bg-red-50">
                    <Section title="Do Not Do">
                      <ul className="space-y-2">
                        {a.do_not_do.map((d, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-red-700">
                            <span className="mt-0.5 flex-shrink-0">✕</span>{d}
                          </li>
                        ))}
                      </ul>
                    </Section>
                  </div>
                  <div className="card"><Section title="Support Case Summary"><p className="text-slate-600 text-sm leading-relaxed italic">{a.service_case_summary}</p></Section></div>
                </>
              ) : (
                <div className="card text-center py-8 text-slate-400 text-sm">No AI analysis attached to this case.</div>
              )}
            </div>
          </div>
        )}

        {/* Activity timeline */}
        {serviceCase.activity && serviceCase.activity.length > 0 && (
          <div className="mt-6 card">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">Activity</h3>
            <div className="relative">
              <div className="absolute left-[7px] top-2 bottom-2 w-px bg-slate-100" />
              <div className="space-y-4">
                {serviceCase.activity.map(entry => {
                  const dotColor =
                    entry.type === 'case_created'   ? 'bg-blue-400' :
                    entry.type === 'email_sent'     ? 'bg-purple-400' :
                    entry.type === 'status_changed' ? 'bg-green-400' :
                    'bg-slate-300'
                  return (
                    <div key={entry.id} className="flex items-start gap-3 pl-1">
                      <div className={`mt-1 w-3.5 h-3.5 rounded-full flex-shrink-0 ${dotColor} ring-2 ring-white`} />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-700">{entry.label}</p>
                        {entry.detail && (
                          <p className="text-xs text-slate-400 mt-0.5">{entry.detail}</p>
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

        <div className="mt-6 flex gap-3 flex-wrap">
          <Link href="/cases" className="btn-secondary text-sm">Back to All Cases</Link>
          {!editing && (
            <button onClick={() => setShowEmailModal(true)} className="btn-primary text-sm">✉ Send Email to Caller</button>
          )}
          {editing && (
            <>
              <button onClick={handleSave} disabled={saving} className="btn-primary text-sm disabled:opacity-50">
                {saving ? 'Saving…' : 'Save Changes'}
              </button>
              <button onClick={cancelEditing} className="btn-secondary text-sm">Cancel</button>
            </>
          )}
          <Link href="/demo" className="btn-secondary text-sm">New Demo Session</Link>
        </div>
      </div>
    </div>
  )
}
