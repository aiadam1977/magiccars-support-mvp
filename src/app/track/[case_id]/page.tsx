'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'

interface TrackedCase {
  case_id: string
  caller_name: string
  vehicle: string
  issue_description: string
  recommended_route: string
  status: string
  created_at: string
  updated_at: string
}

const STATUS_INFO: Record<string, { label: string; color: string; bg: string; desc: string }> = {
  open:     { label: 'Received',    color: 'text-amber-700',  bg: 'bg-amber-100',  desc: 'Our team has received your case and will be in touch shortly.' },
  assigned: { label: 'In Progress', color: 'text-blue-700',   bg: 'bg-blue-100',   desc: 'A specialist has been assigned to your case and is working on it.' },
  resolved: { label: 'Resolved',    color: 'text-green-700',  bg: 'bg-green-100',  desc: 'Your case has been resolved. Please reach out if you need further help.' },
}

const ROUTE_LABEL: Record<string, string> = {
  self_fix: 'Self-Fix Guide', replacement_part: 'Replacement Part',
  warranty_replacement: 'Warranty Replacement', out_of_warranty: 'Service Repair',
  safety_stop: 'Safety Review', human_support: 'Specialist Follow-Up',
}

export default function TrackCasePage() {
  const { case_id } = useParams() as { case_id: string }
  const [serviceCase, setServiceCase] = useState<TrackedCase | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    fetch(`/api/track/${case_id}`)
      .then(r => r.json())
      .then(d => {
        if (d.success) setServiceCase(d.case)
        else setNotFound(true)
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false))
  }, [case_id])

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center px-4 py-12">
      {/* Logo */}
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 bg-[#E31837] rounded-xl flex items-center justify-center">
          <span className="font-black text-white text-sm">MC</span>
        </div>
        <span className="font-bold text-xl text-slate-800 tracking-tight">MagicCars Support</span>
      </div>

      <div className="w-full max-w-md">
        {loading && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center text-slate-400">
            Loading your case…
          </div>
        )}

        {notFound && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center">
            <div className="text-4xl mb-4">🔍</div>
            <h2 className="text-lg font-bold text-slate-700 mb-2">Case Not Found</h2>
            <p className="text-slate-400 text-sm">We couldn&apos;t find a case with ID <span className="font-mono font-semibold">{case_id}</span>. Please check the link and try again.</p>
          </div>
        )}

        {serviceCase && (() => {
          const statusInfo = STATUS_INFO[serviceCase.status] ?? STATUS_INFO.open
          const steps = ['open', 'assigned', 'resolved']
          const currentStep = steps.indexOf(serviceCase.status)
          return (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              {/* Status header */}
              <div className={`px-6 py-5 ${statusInfo.bg}`}>
                <p className={`text-xs font-semibold uppercase tracking-wide ${statusInfo.color} mb-1`}>Case Status</p>
                <p className={`text-2xl font-bold ${statusInfo.color}`}>{statusInfo.label}</p>
                <p className={`text-sm mt-1 ${statusInfo.color} opacity-80`}>{statusInfo.desc}</p>
              </div>

              {/* Progress steps */}
              <div className="px-6 py-4 border-b border-slate-100">
                <div className="flex items-center gap-0">
                  {steps.map((step, i) => {
                    const done = i <= currentStep
                    const isLast = i === steps.length - 1
                    return (
                      <div key={step} className="flex items-center flex-1">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                          done ? 'bg-[#E31837] text-white' : 'bg-slate-200 text-slate-400'
                        }`}>
                          {done ? '✓' : i + 1}
                        </div>
                        {!isLast && <div className={`flex-1 h-0.5 mx-1 ${i < currentStep ? 'bg-[#E31837]' : 'bg-slate-200'}`} />}
                      </div>
                    )
                  })}
                </div>
                <div className="flex justify-between mt-1">
                  <span className="text-xs text-slate-400">Received</span>
                  <span className="text-xs text-slate-400">In Progress</span>
                  <span className="text-xs text-slate-400">Resolved</span>
                </div>
              </div>

              {/* Case details */}
              <div className="px-6 py-5 space-y-4">
                <div>
                  <p className="text-xs text-slate-400 mb-0.5">Case Reference</p>
                  <p className="font-mono font-semibold text-slate-700">{serviceCase.case_id}</p>
                </div>
                {serviceCase.vehicle && (
                  <div>
                    <p className="text-xs text-slate-400 mb-0.5">Vehicle</p>
                    <p className="text-sm font-medium text-slate-700">{serviceCase.vehicle}</p>
                  </div>
                )}
                {serviceCase.issue_description && (
                  <div>
                    <p className="text-xs text-slate-400 mb-0.5">Issue Reported</p>
                    <p className="text-sm text-slate-600 leading-relaxed">{serviceCase.issue_description}</p>
                  </div>
                )}
                {serviceCase.recommended_route && serviceCase.recommended_route !== 'human_support' && (
                  <div>
                    <p className="text-xs text-slate-400 mb-0.5">Resolution Type</p>
                    <p className="text-sm font-medium text-slate-700">{ROUTE_LABEL[serviceCase.recommended_route] ?? serviceCase.recommended_route}</p>
                  </div>
                )}
                <div>
                  <p className="text-xs text-slate-400 mb-0.5">Last Updated</p>
                  <p className="text-sm text-slate-600">
                    {new Date(serviceCase.updated_at).toLocaleString('en-US', { month: 'long', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })}
                  </p>
                </div>
              </div>

              {/* Footer */}
              <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 text-center">
                <p className="text-xs text-slate-400">
                  Questions? Call us or visit{' '}
                  <a href="https://magiccars.com" className="text-[#E31837] hover:underline" target="_blank" rel="noopener noreferrer">
                    magiccars.com
                  </a>
                </p>
              </div>
            </div>
          )
        })()}
      </div>
    </div>
  )
}
