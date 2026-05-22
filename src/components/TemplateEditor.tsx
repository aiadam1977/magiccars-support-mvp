'use client'

import { useState } from 'react'
import Link from 'next/link'

const CATEGORIES = [
  { value: 'general', label: 'General' },
  { value: 'warranty', label: 'Warranty' },
  { value: 'parts', label: 'Parts' },
  { value: 'self_fix', label: 'Self-Fix' },
  { value: 'safety', label: 'Safety' },
  { value: 'follow_up', label: 'Follow-Up' },
]

const VARIABLES = [
  { key: '{{caller_name}}', desc: "Caller's full name" },
  { key: '{{caller_phone}}', desc: 'Phone number on file' },
  { key: '{{caller_email}}', desc: "Caller's email address" },
  { key: '{{case_id}}', desc: 'Support case reference number' },
  { key: '{{vehicle}}', desc: 'Vehicle description' },
  { key: '{{issue_description}}', desc: 'Issue as reported by caller' },
  { key: '{{recommended_route}}', desc: 'AI-recommended resolution route' },
  { key: '{{analysis_summary}}', desc: 'AI analysis summary from call' },
]

// Sample values for preview substitution
const SAMPLE_VARS: Record<string, string> = {
  caller_name: 'Sarah Chen',
  caller_phone: '(310) 555-0182',
  caller_email: 'sarah.chen@email.com',
  case_id: 'MC-MPG9AA3',
  vehicle: 'Magic Cars 12V Ride-On Jeep 2024',
  issue_description: 'Vehicle does not move after charging overnight',
  recommended_route: 'replacement_part',
  analysis_summary:
    'Battery terminals appear corroded. Replacement battery pack recommended.',
}

function previewSubstitute(text: string): string {
  return text.replace(/\{\{(\w+)\}\}/g, (match, key: string) => {
    return SAMPLE_VARS[key] !== undefined ? `[${SAMPLE_VARS[key]}]` : match
  })
}

interface TemplateEditorProps {
  initialValues?: {
    name: string
    category: string
    subject: string
    body: string
  }
  onSave: (data: { name: string; category: string; subject: string; body: string }) => Promise<void>
}

export default function TemplateEditor({ initialValues, onSave }: TemplateEditorProps) {
  const [name, setName] = useState(initialValues?.name ?? '')
  const [category, setCategory] = useState(initialValues?.category ?? 'general')
  const [subject, setSubject] = useState(initialValues?.subject ?? '')
  const [body, setBody] = useState(initialValues?.body ?? '')
  const [preview, setPreview] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function insertVariable(v: string) {
    setBody(prev => prev + v)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim() || !subject.trim() || !body.trim()) {
      setError('Name, subject, and body are all required.')
      return
    }
    setSaving(true)
    setError('')
    try {
      await onSave({ name: name.trim(), category, subject: subject.trim(), body })
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Name + Category */}
      <div className="card">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
              Template Name
            </label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Warranty Replacement Confirmation"
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#E31837]/30 focus:border-[#E31837]"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
              Category
            </label>
            <select
              value={category}
              onChange={e => setCategory(e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#E31837]/30 focus:border-[#E31837] bg-white"
            >
              {CATEGORIES.map(c => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Subject */}
      <div className="card">
        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
          Email Subject
        </label>
        <input
          type="text"
          value={subject}
          onChange={e => setSubject(e.target.value)}
          placeholder="e.g. Your MagicCars support case {{case_id}} — update"
          className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 font-mono focus:outline-none focus:ring-2 focus:ring-[#E31837]/30 focus:border-[#E31837]"
        />
        {subject && (
          <p className="text-xs text-slate-400 mt-1.5 font-mono">
            Preview: {previewSubstitute(subject)}
          </p>
        )}
      </div>

      {/* Body + Variables */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <div className="card h-full flex flex-col">
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Email Body
              </label>
              <button
                type="button"
                onClick={() => setPreview(p => !p)}
                className="text-xs text-[#E31837] hover:underline font-medium"
              >
                {preview ? 'Edit' : 'Preview with sample data →'}
              </button>
            </div>

            {preview ? (
              <div className="flex-1 border border-slate-200 rounded-lg p-4 bg-white text-sm text-slate-700 leading-relaxed whitespace-pre-wrap font-sans min-h-[320px] overflow-auto">
                {previewSubstitute(body) || (
                  <span className="text-slate-300 italic">Body is empty</span>
                )}
              </div>
            ) : (
              <textarea
                value={body}
                onChange={e => setBody(e.target.value)}
                rows={16}
                placeholder={'Hi {{caller_name}},\n\nThank you for contacting MagicCars...\n\nCase Reference: {{case_id}}'}
                className="flex-1 w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-800 font-mono leading-relaxed focus:outline-none focus:ring-2 focus:ring-[#E31837]/30 focus:border-[#E31837] resize-none"
              />
            )}
          </div>
        </div>

        <div className="card">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
            Insert Variable
          </p>
          <div className="space-y-1.5">
            {VARIABLES.map(v => (
              <button
                key={v.key}
                type="button"
                onClick={() => insertVariable(v.key)}
                className="w-full text-left group"
              >
                <div className="flex items-start gap-2 rounded-lg px-2.5 py-2 hover:bg-slate-50 transition-colors">
                  <code className="text-xs text-[#E31837] font-mono flex-shrink-0 mt-0.5">
                    {v.key}
                  </code>
                </div>
                <div className="px-2.5 pb-1 -mt-1">
                  <p className="text-xs text-slate-400 leading-tight">{v.desc}</p>
                </div>
              </button>
            ))}
          </div>
          <p className="text-xs text-slate-300 mt-3 leading-relaxed">
            Click any variable to append it to the body at the current cursor position.
          </p>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={saving}
          className="btn-primary text-sm"
        >
          {saving ? 'Saving...' : 'Save Template'}
        </button>
        <Link href="/templates" className="btn-secondary text-sm">
          Cancel
        </Link>
      </div>
    </form>
  )
}
