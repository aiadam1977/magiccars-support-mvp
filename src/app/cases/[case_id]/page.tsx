'use client'

import { useState, useEffect } from 'react'
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

export default function CaseDetailPage() {
  const { case_id } = useParams() as { case_id: string }
  const [serviceCase, setServiceCase] = useState<ServiceCase | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

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
  const mediaUrl =
    serviceCase.session_id && serviceCase.file_name
      ? `/uploads/${serviceCase.session_id}/${serviceCase.file_name}`
      : null

  return (
    <div className="min-h-screen bg-slate-50">
      <Nav />
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
            <div className="flex gap-2 flex-wrap">
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
          <Link href="/demo" className="btn-primary text-sm">
            New Demo Session
          </Link>
        </div>
      </div>
    </div>
  )
}
