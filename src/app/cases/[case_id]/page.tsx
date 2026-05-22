'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import Nav from '@/components/Nav'

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
  file_path?: string
  file_name?: string
  file_type?: string
  created_at: string
  updated_at: string
}

interface EmailTemplate {
  template_id: string
  name: string
  category: string
  subject: string
  body: string
}

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

// ─── Send Email Modal ─────────────────────────────────────────────────────────

interface SendEmailModalProps {
  serviceCase: ServiceCase
  onClose: () => void
}

const SAMPLE_VARS: Record<string, string> = {}

function previewBody(body: string, vars: Record<string, string>): string {
  return body.replace(/\{\{(\w+)\}\}/g, (match, key: string) => {
    return vars[key] !== undefined ? vars[key] : match
  })
}

function SendEmailModal({ serviceCase, onClose }: SendEmailModalProps) {
  const [templates, setTemplates] = useState<EmailTemplate[]>([])
  const [selectedId, setSelectedId] = useState('')
  const [overrideEmail, setOverrideEmail] = useState(serviceCase.caller_email || '')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [sentMessage, setSentMessage] = useState('')
  const [error, setError] = useState('')
  const [loadingTemplates, setLoadingTemplates] = useState(true)

  const caseVars: Record<string, string> = {
    caller_name: serviceCase.caller_name,
    caller_phone: serviceCase.caller_phone,
    caller_email: overrideEmail,
    case_id: serviceCase.case_id,
    vehicle: serviceCase.vehicle,
    issue_description: serviceCase.issue_description,
    recommended_route: serviceCase.recommended_route,
    analysis_summary:
      serviceCase.analysis?.service_case_summary || serviceCase.analysis_summary || '',
  }

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

  const selected = templates.find(t => t.template_id === selectedId)

  async function handleSend() {
    if (!overrideEmail.trim()) {
      setError('An email address is required to send.')
      return
    }
    if (!selectedId) {
      setError('Please select a template.')
      return
    }
    setSending(true)
    setError('')
    try {
      const res = await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          case_id: serviceCase.case_id,
          template_id: selectedId,
          override_email: overrideEmail.trim(),
        }),
      })
      const d = await res.json()
      if (d.success) {
        setSent(true)
        setSentMessage(d.message)
      } else {
        setError(d.error || 'Failed to send email.')
      }
    } catch {
      setError('Network error — please try again.')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-12 px-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div>
            <h2 className="text-lg font-bold text-slate-800">Send Email</h2>
            <p className="text-sm text-slate-400">
              Case {serviceCase.case_id} · {serviceCase.caller_name}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 text-xl leading-none p-1"
          >
            ×
          </button>
        </div>

        {sent ? (
          <div className="flex-1 flex flex-col items-center justify-center py-16 px-6 text-center">
            <div className="text-5xl mb-4">✅</div>
            <h3 className="text-lg font-semibold text-slate-800 mb-2">Email sent!</h3>
            <p className="text-sm text-slate-500 mb-1">Sent to: {overrideEmail}</p>
            <p className="text-xs text-slate-400 mb-6">{sentMessage}</p>
            <button onClick={onClose} className="btn-secondary text-sm">
              Close
            </button>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
              {/* To: field */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                  Send To
                </label>
                <input
                  type="email"
                  value={overrideEmail}
                  onChange={e => setOverrideEmail(e.target.value)}
                  placeholder="caller@email.com"
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#E31837]/30 focus:border-[#E31837]"
                />
                {!serviceCase.caller_email && (
                  <p className="text-xs text-amber-600 mt-1">
                    No email captured during call. Enter the caller's email address above.
                  </p>
                )}
              </div>

              {/* Template selector */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Template
                  </label>
                  <Link
                    href="/templates"
                    target="_blank"
                    className="text-xs text-[#E31837] hover:underline"
                  >
                    Manage templates →
                  </Link>
                </div>
                {loadingTemplates ? (
                  <div className="text-sm text-slate-400">Loading templates...</div>
                ) : templates.length === 0 ? (
                  <div className="text-sm text-slate-400">
                    No templates yet.{' '}
                    <Link href="/templates" className="text-[#E31837] hover:underline">
                      Create one →
                    </Link>
                  </div>
                ) : (
                  <select
                    value={selectedId}
                    onChange={e => setSelectedId(e.target.value)}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-[#E31837]/30 focus:border-[#E31837]"
                  >
                    {templates.map(t => (
                      <option key={t.template_id} value={t.template_id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Preview */}
              {selected && (
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                    Preview (variables substituted)
                  </p>
                  <div className="border border-slate-200 rounded-lg overflow-hidden">
                    <div className="bg-slate-50 border-b border-slate-200 px-4 py-2.5">
                      <p className="text-xs text-slate-500">
                        <span className="font-medium">Subject: </span>
                        {previewBody(selected.subject, caseVars)}
                      </p>
                    </div>
                    <div className="px-4 py-3 max-h-52 overflow-y-auto">
                      <pre className="text-sm text-slate-700 font-sans whitespace-pre-wrap leading-relaxed">
                        {previewBody(selected.body, caseVars)}
                      </pre>
                    </div>
                  </div>
                </div>
              )}

              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                  {error}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-slate-100 flex items-center gap-3">
              <button
                onClick={handleSend}
                disabled={sending || !selectedId || !overrideEmail.trim()}
                className="btn-primary text-sm disabled:opacity-50"
              >
                {sending ? 'Sending...' : 'Send Email'}
              </button>
              <button onClick={onClose} className="btn-secondary text-sm">
                Cancel
              </button>
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
  const [error, setError] = useState('')
  const [showEmailModal, setShowEmailModal] = useState(false)

  useEffect(() => {
    fetch(`/api/cases/${case_id}`)
      .then(r => r.json())
      .then(d => {
        if (d.success) setServiceCase(d.case)
        else setError('Case not found.')
      })
      .catch(() => setError('Failed to load case.'))
      .finally(() => setLoading(false))
  }, [case_id])

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Nav />
        <div className="text-center py-24 text-slate-400">Loading case...</div>
      </div>
    )
  }

  if (error || !serviceCase) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Nav />
        <div className="max-w-3xl mx-auto px-4 py-16 text-center">
          <p className="text-red-600 text-lg">{error || 'Case not found.'}</p>
          <Link href="/cases" className="btn-primary mt-4 inline-block text-sm">
            Back to Cases
          </Link>
        </div>
      </div>
    )
  }

  const a = serviceCase.analysis
  const isSafety = serviceCase.recommended_route === 'safety_stop'
  const isImage = serviceCase.file_type?.startsWith('image/')
  const mediaUrl = serviceCase.file_path ? `/api/media/${serviceCase.session_id}` : null

  return (
    <div className="min-h-screen bg-slate-50">
      <Nav />

      {showEmailModal && (
        <SendEmailModal
          serviceCase={serviceCase}
          onClose={() => setShowEmailModal(false)}
        />
      )}

      <div className="max-w-4xl mx-auto px-4 py-8">

        {/* Safety banner */}
        {isSafety && (
          <div className="mb-5 p-4 bg-red-600 rounded-xl text-white">
            <p className="font-bold text-base">SAFETY ESCALATION — Stop Use Immediately</p>
            <p className="text-sm mt-1 text-red-100">
              This vehicle must not be used until the issue has been resolved by a MagicCars
              specialist.
            </p>
          </div>
        )}

        {/* Breadcrumb */}
        <div className="mb-5 text-sm text-slate-400">
          <Link href="/cases" className="hover:text-[#E31837]">
            Support Cases
          </Link>
          <span className="mx-2">/</span>
          <span className="font-mono text-slate-600">{serviceCase.case_id}</span>
        </div>

        {/* Header */}
        <div className="card mb-5">
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-xl font-bold text-[#E31837] font-mono">
                {serviceCase.case_id}
              </h1>
              <p className="text-slate-400 text-xs mt-1">{formatDate(serviceCase.created_at)}</p>
            </div>
            <div className="flex gap-2 flex-wrap items-center">
              {a && (
                <>
                  <span
                    className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border ${
                      CONF_BADGE[a.confidence_level] || 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    Confidence: {a.confidence_level}
                  </span>
                  <span
                    className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
                      ROUTE_BADGE[a.recommended_route] || 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    {ROUTE_LABEL[a.recommended_route] || a.recommended_route}
                  </span>
                  {a.escalation_required && !isSafety && (
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700 border border-red-200">
                      Escalation Required
                    </span>
                  )}
                </>
              )}
              <button
                onClick={() => setShowEmailModal(true)}
                className="btn-primary text-xs flex items-center gap-1.5"
              >
                ✉ Send Email
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">

          {/* Left column: caller + vehicle */}
          <div className="space-y-4">
            <div className="card">
              <Section title="Parent / Caller">
                <p className="font-semibold text-slate-800">{serviceCase.caller_name}</p>
                <p className="text-slate-500 text-sm">{serviceCase.caller_phone}</p>
                {serviceCase.caller_email && (
                  <p className="text-slate-500 text-sm">{serviceCase.caller_email}</p>
                )}
                {!serviceCase.caller_email && (
                  <p className="text-xs text-amber-500 mt-1">No email on file</p>
                )}
              </Section>
            </div>

            <div className="card">
              <Section title="Vehicle">
                <p className="font-semibold text-slate-800">{serviceCase.vehicle}</p>
              </Section>
            </div>

            <div className="card">
              <Section title="Issue Reported">
                <p className="text-slate-700 text-sm leading-relaxed">
                  {serviceCase.issue_description}
                </p>
              </Section>
            </div>

            {serviceCase.escalation_reason && (
              <div className={`card ${isSafety ? 'border-red-300 bg-red-50' : 'border-red-100'}`}>
                <Section title="Escalation Reason">
                  <p className="text-slate-700 text-sm">{serviceCase.escalation_reason}</p>
                </Section>
              </div>
            )}

            <div className="card">
              <Section title="Case Status">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                  {serviceCase.status}
                </span>
              </Section>
            </div>
          </div>

          {/* Right column: media + analysis */}
          <div className="md:col-span-2 space-y-4">

            {/* Uploaded media */}
            {mediaUrl && (
              <div className="card">
                <Section title="Uploaded Media">
                  {isImage ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={mediaUrl}
                      alt="Uploaded vehicle media"
                      className="w-full max-h-80 object-contain rounded-lg bg-slate-100"
                    />
                  ) : (
                    <video
                      src={mediaUrl}
                      controls
                      className="w-full max-h-80 rounded-lg bg-black"
                    />
                  )}
                  <p className="text-xs text-slate-400 mt-1">{serviceCase.file_name}</p>
                </Section>
              </div>
            )}

            {/* AI Analysis */}
            {a && (
              <>
                <div className="card">
                  <Section title="AI Visual Summary">
                    <p className="text-slate-700 text-sm leading-relaxed">{a.visual_summary}</p>
                  </Section>
                </div>

                <div className="card">
                  <Section title="Likely Issue">
                    <p className="text-slate-700 text-sm leading-relaxed">{a.likely_issue}</p>
                  </Section>
                </div>

                <div className="card">
                  <Section title="Safe Steps for Parent">
                    <ul className="space-y-2">
                      {a.safe_owner_steps.map((s, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                          <span className="mt-0.5 flex-shrink-0 w-5 h-5 rounded-full bg-green-100 text-green-700 text-xs flex items-center justify-center font-bold">
                            {i + 1}
                          </span>
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
                          <span className="mt-0.5 flex-shrink-0">✕</span>
                          {d}
                        </li>
                      ))}
                    </ul>
                  </Section>
                </div>

                <div className="card">
                  <Section title="Support Case Summary">
                    <p className="text-slate-600 text-sm leading-relaxed italic">
                      {a.service_case_summary}
                    </p>
                  </Section>
                </div>
              </>
            )}

            {!a && (
              <div className="card text-center py-8 text-slate-400 text-sm">
                No AI analysis attached to this case.
              </div>
            )}
          </div>
        </div>

        <div className="mt-6 flex gap-3">
          <Link href="/cases" className="btn-secondary text-sm">
            Back to All Cases
          </Link>
          <button
            onClick={() => setShowEmailModal(true)}
            className="btn-primary text-sm"
          >
            ✉ Send Email to Caller
          </button>
          <Link href="/demo" className="btn-secondary text-sm">
            New Demo Session
          </Link>
        </div>
      </div>
    </div>
  )
}
