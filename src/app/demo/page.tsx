'use client'

import { useState } from 'react'
import Link from 'next/link'
import Nav from '@/components/Nav'

const ISSUE_PRESETS = [
  {
    label: 'No Power — Vehicle Will Not Turn On',
    issue_type: 'no_power',
    description: "The vehicle will not turn on at all. No lights, no sound, nothing happens when I flip the switch.",
  },
  {
    label: 'Lights Work But Won\'t Move',
    issue_type: 'no_movement',
    description: "The lights and music are on but when my child presses the pedal the vehicle won't move at all.",
  },
  {
    label: 'Remote Control Not Working',
    issue_type: 'remote_failure',
    description: "The parent remote won't connect. I put in fresh batteries and tried the pairing procedure but still nothing.",
  },
  {
    label: 'Steering Not Working',
    issue_type: 'steering_failure',
    description: "The vehicle drives forward and backward but won't steer left or right when I use the remote.",
  },
  {
    label: 'Battery / Charger Problems',
    issue_type: 'battery_issues',
    description: "The charger light won't come on when I plug it in. I'm not sure if the battery is charging.",
  },
  {
    label: 'Dies Too Quickly',
    issue_type: 'short_runtime',
    description: "After a full charge the vehicle only runs for about 5 minutes then stops completely.",
  },
  {
    label: 'Grinding or Clicking Noise',
    issue_type: 'grinding_noise',
    description: "There is a grinding noise coming from the rear of the vehicle when my child tries to drive it.",
  },
  {
    label: 'One Wheel Not Spinning',
    issue_type: 'one_wheel',
    description: "The left rear wheel spins but the right rear wheel is completely stationary when the pedal is pressed.",
  },
  {
    label: 'Won\'t Go in Reverse',
    issue_type: 'no_reverse',
    description: "The vehicle drives forward fine but when I move the gear selector to Reverse it won't move.",
  },
  {
    label: 'Drives Very Slowly',
    issue_type: 'speed_slow',
    description: "The vehicle is extremely slow — slower than normal even on a hard flat floor with a full charge.",
  },
  {
    label: 'Lights or Music Not Working',
    issue_type: 'lights_audio',
    description: "The headlights don't come on and the music system is completely silent even though the vehicle drives.",
  },
  {
    label: 'Water / Weather Damage',
    issue_type: 'water_damage',
    description: "The vehicle got caught in the rain yesterday and now it behaves strangely — lights flicker and it won't drive.",
  },
  {
    label: 'Broken or Damaged Parts',
    issue_type: 'physical_damage',
    description: "The front bumper cracked off after a minor bump and one of the side panels has a large crack in it.",
  },
  {
    label: 'Burning Smell — SAFETY',
    issue_type: 'burning_smell',
    description: "I can smell something burning from the vehicle while my child was riding it. I stopped them immediately.",
  },
  {
    label: 'Battery Swelling — SAFETY',
    issue_type: 'battery_swelling',
    description: "I opened the battery compartment and the battery looks swollen and puffy. It looks deformed.",
  },
]

interface SessionResult {
  success: boolean
  session_id: string
  upload_url: string
  message: string
}

interface AnalysisResult {
  success: boolean
  session_id: string
  analysis_status: string
  visual_summary: string
  likely_issue: string
  confidence_level: string
  safe_owner_steps: string[]
  do_not_do: string[]
  escalation_required: boolean
  recommended_route: string
  service_case_summary: string
}

interface CaseResult {
  success: boolean
  case_id: string
  case_url: string
  message: string
}

type Step = 'form' | 'session_created' | 'upload_ready' | 'uploaded' | 'analyzed' | 'case_created'

const ROUTE_LABEL: Record<string, string> = {
  self_fix: 'Self-Fix Guide',
  replacement_part: 'Send Replacement Part',
  warranty_replacement: 'Full Warranty Replacement',
  out_of_warranty: 'Out-of-Warranty Repair',
  safety_stop: 'Stop Use Immediately',
  human_support: 'Transfer to Human Agent',
}

const ROUTE_COLOR: Record<string, string> = {
  self_fix: 'bg-green-100 text-green-800',
  replacement_part: 'bg-blue-100 text-blue-800',
  warranty_replacement: 'bg-purple-100 text-purple-800',
  out_of_warranty: 'bg-orange-100 text-orange-800',
  safety_stop: 'bg-red-600 text-white',
  human_support: 'bg-gray-100 text-gray-800',
}

export default function TestSessionPage() {
  const [step, setStep] = useState<Step>('form')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Form state
  const [callerName, setCallerName] = useState('Jennifer Park')
  const [callerPhone, setCallerPhone] = useState('+15125550187')
  const [selectedPreset, setSelectedPreset] = useState(6) // grinding_noise default
  const [issueType, setIssueType] = useState(ISSUE_PRESETS[6].issue_type)
  const [issueDescription, setIssueDescription] = useState(ISSUE_PRESETS[6].description)

  // Results
  const [session, setSession] = useState<SessionResult | null>(null)
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [uploadNote, setUploadNote] = useState('')
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null)
  const [serviceCase, setServiceCase] = useState<CaseResult | null>(null)

  function handlePresetChange(index: number) {
    setSelectedPreset(index)
    setIssueType(ISSUE_PRESETS[index].issue_type)
    setIssueDescription(ISSUE_PRESETS[index].description)
  }

  async function createSession() {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/retell/create_visual_session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          call_id: `test-call-${Date.now()}`,
          caller_phone: callerPhone,
          caller_name: callerName,
          vehicle_id: 'magiccars-12v-2wd-jeep',
          vehicle_year: '2024',
          vehicle_make: 'Magic Cars',
          vehicle_model: '12V 2WD Ride-On Jeep',
          issue_type: issueType,
          issue_description: issueDescription,
        }),
      })
      const data: SessionResult = await res.json()
      if (!data.success) throw new Error(data.message || 'Failed to create session')
      setSession(data)
      setStep('session_created')
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error creating session')
    } finally {
      setLoading(false)
    }
  }

  async function uploadMedia() {
    if (!uploadFile || !session) return
    setLoading(true)
    setError('')
    try {
      const formData = new FormData()
      formData.append('file', uploadFile)
      if (uploadNote) formData.append('note', uploadNote)

      const res = await fetch(`/api/upload/${session.session_id}`, {
        method: 'POST',
        body: formData,
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.message || 'Upload failed')
      setStep('uploaded')
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Upload error')
    } finally {
      setLoading(false)
    }
  }

  async function runAnalysis() {
    if (!session) return
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/analyze/${session.session_id}`, { method: 'POST' })
      const data: AnalysisResult = await res.json()
      if (!data.success) throw new Error('Analysis failed')
      setAnalysis(data)
      setStep('analyzed')
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Analysis error')
    } finally {
      setLoading(false)
    }
  }

  async function createCase() {
    if (!session || !analysis) return
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/retell/create_service_case', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          call_id: `test-call-${Date.now()}`,
          session_id: session.session_id,
          caller_name: callerName,
          caller_phone: callerPhone,
          vehicle: 'Magic Cars 12V 2WD Ride-On Jeep',
          issue_description: issueDescription,
          analysis_summary: analysis.service_case_summary,
          recommended_route: analysis.recommended_route,
          escalation_reason: analysis.escalation_required
            ? `Escalation required. Confidence: ${analysis.confidence_level}. Route: ${analysis.recommended_route}.`
            : 'No escalation required.',
        }),
      })
      const data: CaseResult = await res.json()
      if (!data.success) throw new Error('Failed to create case')
      setServiceCase(data)
      setStep('case_created')
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Case creation error')
    } finally {
      setLoading(false)
    }
  }

  function reset() {
    setStep('form')
    setSession(null)
    setUploadFile(null)
    setUploadNote('')
    setAnalysis(null)
    setServiceCase(null)
    setError('')
  }

  const isSafetyIssue = issueType === 'burning_smell' || issueType === 'battery_swelling'

  return (
    <div className="min-h-screen bg-slate-50">
      <Nav />
      <div className="max-w-4xl mx-auto px-4 py-8">

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-[#E31837]">MagicCars Support — Test Session</h1>
          <p className="text-slate-500 mt-1">
            Run the full AI support call flow for Magic Cars 12V 2WD Ride-On Jeep.
          </p>
        </div>

        {/* Progress steps */}
        <StepIndicator current={step} />

        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        {/* ── STEP 1: Create Session ───────────────────────────────────── */}
        {(step === 'form' || step === 'session_created') && (
          <div className="card mt-6">
            <h2 className="text-lg font-semibold text-[#E31837] mb-4">
              Step 1 — Parent Info &amp; Issue
            </h2>
            <p className="text-sm text-slate-500 mb-5">
              Enter caller details and issue information to run a visual diagnostic session.
            </p>

            <div className="grid grid-cols-2 gap-4 mb-5">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Parent Name</label>
                <input
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#E31837]"
                  value={callerName}
                  onChange={e => setCallerName(e.target.value)}
                  disabled={step !== 'form'}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Parent Phone</label>
                <input
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#E31837]"
                  value={callerPhone}
                  onChange={e => setCallerPhone(e.target.value)}
                  disabled={step !== 'form'}
                />
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Issue Preset
                <span className="ml-2 text-xs font-normal text-slate-400">
                  ({ISSUE_PRESETS.length} issues covered)
                </span>
              </label>
              <div className="flex flex-col gap-2 max-h-[420px] overflow-y-auto pr-1">
                {ISSUE_PRESETS.map((issue, i) => {
                  const isSafety =
                    issue.issue_type === 'burning_smell' ||
                    issue.issue_type === 'battery_swelling'
                  return (
                    <label
                      key={i}
                      className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                        selectedPreset === i
                          ? isSafety
                            ? 'border-red-500 bg-red-50'
                            : 'border-[#E31837] bg-[#FFF0F2]'
                          : 'border-slate-200 hover:border-slate-300'
                      } ${step !== 'form' ? 'pointer-events-none opacity-60' : ''}`}
                    >
                      <input
                        type="radio"
                        name="preset"
                        checked={selectedPreset === i}
                        onChange={() => handlePresetChange(i)}
                        className="mt-0.5"
                        disabled={step !== 'form'}
                      />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-slate-800">{issue.label}</span>
                          {isSafety && (
                            <span className="text-xs font-bold bg-red-600 text-white px-1.5 py-0.5 rounded">
                              SAFETY
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-slate-500 mt-0.5">{issue.description}</div>
                      </div>
                    </label>
                  )
                })}
              </div>
            </div>

            {isSafetyIssue && step === 'form' && (
              <div className="mb-4 p-3 bg-red-50 border border-red-300 rounded-lg">
                <p className="text-sm font-semibold text-red-700">
                  Safety Issue Selected — Agent will immediately escalate this case.
                </p>
              </div>
            )}

            <div className="mb-5">
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Issue Description (editable)
              </label>
              <textarea
                rows={3}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#E31837]"
                value={issueDescription}
                onChange={e => setIssueDescription(e.target.value)}
                disabled={step !== 'form'}
              />
            </div>

            {step === 'form' && (
              <button className="btn-primary" onClick={createSession} disabled={loading}>
                {loading ? 'Creating session...' : 'Create Visual Session'}
              </button>
            )}

            {step === 'session_created' && session && (
              <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="text-green-700 font-semibold mb-2">Session Created</div>
                <div className="text-sm text-green-800 mb-1">
                  <span className="font-medium">Session ID:</span> {session.session_id}
                </div>
                <div className="text-sm text-green-800 mb-3">
                  <span className="font-medium">Upload URL:</span>{' '}
                  <a
                    href={session.upload_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline text-[#E31837]"
                  >
                    {session.upload_url}
                  </a>
                </div>
                <p className="text-xs text-slate-500">
                  In a live call, the agent sends this URL via SMS. Open it in a new tab to see the
                  parent upload experience.
                </p>
              </div>
            )}
          </div>
        )}

        {/* ── STEP 2: Upload Media ─────────────────────────────────────── */}
        {(step === 'session_created' || step === 'upload_ready' || step === 'uploaded') &&
          session && (
            <div className="card mt-4">
              <h2 className="text-lg font-semibold text-[#E31837] mb-1">
                Step 2 — Upload Photo or Video
              </h2>
              <p className="text-sm text-slate-500 mb-4">
                Upload a photo or video of the vehicle issue to run the visual diagnostic.
              </p>

              {step !== 'uploaded' && (
                <>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Select Photo or Video
                    </label>
                    <input
                      type="file"
                      accept="image/*,video/*"
                      className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-[#FFF0F2] file:text-[#E31837] hover:file:bg-red-100"
                      onChange={e => setUploadFile(e.target.files?.[0] || null)}
                    />
                    {!uploadFile && (
                      <p className="text-xs text-slate-400 mt-1">
                        Upload any photo or video of the vehicle issue to trigger the visual analysis.
                      </p>
                    )}
                  </div>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Optional Note
                    </label>
                    <input
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#E31837]"
                      placeholder="e.g. Noise only happens when driving on grass"
                      value={uploadNote}
                      onChange={e => setUploadNote(e.target.value)}
                    />
                  </div>
                  <div className="flex gap-3">
                    <button
                      className="btn-primary"
                      onClick={uploadMedia}
                      disabled={loading || !uploadFile}
                    >
                      {loading ? 'Uploading...' : 'Upload Media'}
                    </button>
                    <a
                      href={session.upload_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-secondary text-sm"
                    >
                      Open Parent Upload Page
                    </a>
                  </div>
                </>
              )}

              {step === 'uploaded' && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-blue-700 text-sm font-medium">
                  Upload received. Ready to analyze.
                </div>
              )}
            </div>
          )}

        {/* ── STEP 3: Analyze ──────────────────────────────────────────── */}
        {(step === 'uploaded' || step === 'analyzed') && session && (
          <div className="card mt-4">
            <h2 className="text-lg font-semibold text-[#E31837] mb-1">
              Step 3 — Visual Analysis
            </h2>
            <p className="text-sm text-slate-500 mb-4">
              MagicCars Support runs AI vision analysis against the ride-on vehicle knowledge base.
            </p>

            {step === 'uploaded' && (
              <button className="btn-orange" onClick={runAnalysis} disabled={loading}>
                {loading ? 'Analyzing...' : 'Run Analysis'}
              </button>
            )}

            {step === 'analyzed' && analysis && (
              <AnalysisCard
                analysis={analysis}
                routeLabel={ROUTE_LABEL}
                routeColor={ROUTE_COLOR}
              />
            )}
          </div>
        )}

        {/* ── STEP 4: Create Support Case ──────────────────────────────── */}
        {step === 'analyzed' && analysis && (
          <div className="card mt-4">
            <h2 className="text-lg font-semibold text-[#E31837] mb-1">
              Step 4 — Create Support Case
            </h2>
            <p className="text-sm text-slate-500 mb-4">
              {analysis.recommended_route === 'safety_stop'
                ? 'SAFETY ISSUE — Create an immediate escalation case.'
                : analysis.escalation_required
                ? 'This issue requires follow-up. Create a support case with the visual evidence attached.'
                : 'No immediate escalation required, but you can still create a case for documentation.'}
            </p>
            <button className="btn-primary" onClick={createCase} disabled={loading}>
              {loading ? 'Creating case...' : 'Create Support Case'}
            </button>
          </div>
        )}

        {/* ── STEP 5: Case Created ─────────────────────────────────────── */}
        {step === 'case_created' && serviceCase && (
          <div className="card mt-4 border-green-200 bg-green-50">
            <h2 className="text-lg font-semibold text-green-700 mb-2">Support Case Created</h2>
            <p className="text-sm text-slate-700 mb-1">
              <span className="font-medium">Case ID:</span>{' '}
              <span className="font-mono">{serviceCase.case_id}</span>
            </p>
            <div className="flex gap-3 mt-4 flex-wrap">
              <Link href={`/cases/${serviceCase.case_id}`} className="btn-primary text-sm">
                View Case Detail
              </Link>
              <Link href="/cases" className="btn-secondary text-sm">
                Support Case Dashboard
              </Link>
              <button onClick={reset} className="btn-secondary text-sm">
                Run Another Test
              </button>
            </div>
          </div>
        )}

        {/* API Reference */}
        <div className="mt-10 card bg-slate-800 text-slate-100">
          <h3 className="font-semibold text-slate-200 mb-3 text-sm">Quick API Reference</h3>
          <div className="space-y-2 text-xs font-mono">
            <div>
              <span className="text-[#FF6B35]">POST</span> /api/retell/create_visual_session
            </div>
            <div>
              <span className="text-blue-400">POST</span> /api/upload/:session_id
            </div>
            <div>
              <span className="text-blue-400">POST</span> /api/analyze/:session_id
            </div>
            <div>
              <span className="text-[#FF6B35]">POST</span> /api/retell/get_visual_analysis
            </div>
            <div>
              <span className="text-[#FF6B35]">POST</span> /api/retell/create_service_case
            </div>
            <div>
              <span className="text-green-400">GET</span> /api/cases
            </div>
            <div>
              <span className="text-green-400">GET</span> /api/cases/:case_id
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Sub-components ─────────────────────────────────────────────────────────

function StepIndicator({ current }: { current: Step }) {
  const steps: { key: Step[]; label: string }[] = [
    { key: ['form', 'session_created'], label: 'Create Session' },
    { key: ['session_created', 'upload_ready', 'uploaded'], label: 'Upload Media' },
    { key: ['uploaded', 'analyzed'], label: 'Analyze' },
    { key: ['analyzed', 'case_created'], label: 'Support Case' },
  ]

  const order: Step[] = ['form', 'session_created', 'uploaded', 'analyzed', 'case_created']
  const currentIndex = order.indexOf(current)

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {steps.map((s, i) => {
        const done = currentIndex > i
        const active = currentIndex === i || s.key.includes(current)
        return (
          <div key={i} className="flex items-center gap-2">
            <div
              className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full transition-colors ${
                done
                  ? 'bg-green-100 text-green-700'
                  : active
                  ? 'bg-[#E31837] text-white'
                  : 'bg-gray-100 text-gray-400'
              }`}
            >
              <span>{done ? '✓' : i + 1}</span>
              <span>{s.label}</span>
            </div>
            {i < steps.length - 1 && <div className="w-5 h-px bg-gray-300" />}
          </div>
        )
      })}
    </div>
  )
}

function AnalysisCard({
  analysis,
  routeLabel,
  routeColor,
}: {
  analysis: AnalysisResult
  routeLabel: Record<string, string>
  routeColor: Record<string, string>
}) {
  const isSafety = analysis.recommended_route === 'safety_stop'

  return (
    <div className="space-y-4">
      {isSafety && (
        <div className="p-4 bg-red-600 rounded-lg text-white">
          <p className="font-bold text-base">SAFETY ESCALATION — Stop Use Immediately</p>
          <p className="text-sm mt-1 text-red-100">
            This vehicle must not be used until the issue is resolved. A specialist will follow up.
          </p>
        </div>
      )}

      <div className="flex gap-3 flex-wrap">
        <span
          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
            analysis.confidence_level === 'high'
              ? 'bg-red-100 text-red-800'
              : analysis.confidence_level === 'medium'
              ? 'bg-orange-100 text-orange-800'
              : 'bg-yellow-100 text-yellow-800'
          }`}
        >
          Confidence: {analysis.confidence_level}
        </span>
        <span
          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
            routeColor[analysis.recommended_route] || 'bg-gray-100 text-gray-800'
          }`}
        >
          {routeLabel[analysis.recommended_route] || analysis.recommended_route}
        </span>
        {analysis.escalation_required && !isSafety && (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
            Escalation Required
          </span>
        )}
      </div>

      <div>
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
          Visual Summary
        </p>
        <p className="text-sm text-slate-700">{analysis.visual_summary}</p>
      </div>

      <div>
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
          Likely Issue
        </p>
        <p className="text-sm text-slate-700">{analysis.likely_issue}</p>
      </div>

      <div>
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
          Safe Steps for Parent
        </p>
        <ul className="list-disc list-inside space-y-1">
          {analysis.safe_owner_steps.map((s, i) => (
            <li key={i} className="text-sm text-slate-700">
              {s}
            </li>
          ))}
        </ul>
      </div>

      <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
        <p className="text-xs font-semibold text-red-600 uppercase tracking-wide mb-1">
          Do Not Do
        </p>
        <ul className="list-disc list-inside space-y-1">
          {analysis.do_not_do.map((d, i) => (
            <li key={i} className="text-sm text-red-700">
              {d}
            </li>
          ))}
        </ul>
      </div>

      <div>
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
          Support Case Summary
        </p>
        <p className="text-sm text-slate-600 italic">{analysis.service_case_summary}</p>
      </div>
    </div>
  )
}
