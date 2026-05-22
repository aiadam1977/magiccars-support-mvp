'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import Nav from '@/components/Nav'

interface EmailTemplate {
  template_id: string
  name: string
  category: string
  subject: string
  body: string
  created_at: string
  updated_at: string
}

const CATEGORY_LABEL: Record<string, string> = {
  general: 'General',
  warranty: 'Warranty',
  parts: 'Parts',
  self_fix: 'Self-Fix',
  safety: 'Safety',
  follow_up: 'Follow-Up',
}

const CATEGORY_COLOR: Record<string, string> = {
  general: 'bg-gray-100 text-gray-700',
  warranty: 'bg-purple-100 text-purple-700',
  parts: 'bg-blue-100 text-blue-700',
  self_fix: 'bg-green-100 text-green-700',
  safety: 'bg-red-100 text-red-700',
  follow_up: 'bg-orange-100 text-orange-700',
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<EmailTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [seeding, setSeeding] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)

  const load = useCallback(() => {
    setLoading(true)
    fetch('/api/templates')
      .then(r => r.json())
      .then(d => { if (d.success) setTemplates(d.templates) })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])

  async function handleSeed() {
    setSeeding(true)
    try {
      const res = await fetch('/api/templates/seed', { method: 'POST' })
      const d = await res.json()
      if (d.success) load()
    } catch (e) {
      console.error(e)
    } finally {
      setSeeding(false)
    }
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Delete template "${name}"? This cannot be undone.`)) return
    setDeleting(id)
    try {
      await fetch(`/api/templates/${id}`, { method: 'DELETE' })
      setTemplates(prev => prev.filter(t => t.template_id !== id))
    } catch (e) {
      console.error(e)
    } finally {
      setDeleting(null)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Nav />
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="flex items-start justify-between mb-6 flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold text-[#E31837]">Email Templates</h1>
            <p className="text-slate-500 text-sm mt-1">
              {templates.length} template{templates.length !== 1 ? 's' : ''} · Variables like{' '}
              <code className="text-xs bg-slate-100 px-1.5 py-0.5 rounded font-mono">{'{{caller_name}}'}</code>{' '}
              are substituted automatically when you send.
            </p>
          </div>
          <div className="flex gap-2">
            <Link
              href="/templates/new"
              className="btn-primary text-sm"
            >
              + New Template
            </Link>
          </div>
        </div>

        {/* Variable reference */}
        <div className="card mb-5 bg-slate-50 border-slate-200">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
            Available Variables
          </p>
          <div className="flex flex-wrap gap-2">
            {[
              '{{caller_name}}',
              '{{caller_phone}}',
              '{{caller_email}}',
              '{{case_id}}',
              '{{vehicle}}',
              '{{issue_description}}',
              '{{recommended_route}}',
              '{{analysis_summary}}',
            ].map(v => (
              <code
                key={v}
                className="text-xs bg-white border border-slate-200 text-slate-600 px-2 py-1 rounded font-mono"
              >
                {v}
              </code>
            ))}
          </div>
        </div>

        {loading && (
          <div className="text-center py-16 text-slate-400">Loading templates...</div>
        )}

        {!loading && templates.length === 0 && (
          <div className="card text-center py-16">
            <div className="text-4xl mb-3">✉️</div>
            <h2 className="text-lg font-semibold text-slate-600 mb-2">No Templates Yet</h2>
            <p className="text-slate-400 text-sm mb-5 max-w-sm mx-auto">
              Start with our pre-built templates for the most common support scenarios, or create your own from scratch.
            </p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={handleSeed}
                disabled={seeding}
                className="btn-primary text-sm"
              >
                {seeding ? 'Loading defaults...' : 'Load Default Templates'}
              </button>
              <Link href="/templates/new" className="btn-secondary text-sm">
                Create from Scratch
              </Link>
            </div>
          </div>
        )}

        {!loading && templates.length > 0 && (
          <div className="space-y-3">
            {templates.map(t => (
              <div
                key={t.template_id}
                className="card hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <h2 className="font-semibold text-slate-800 text-base">{t.name}</h2>
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          CATEGORY_COLOR[t.category] || 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {CATEGORY_LABEL[t.category] || t.category}
                      </span>
                    </div>
                    <p className="text-sm text-slate-500 font-mono truncate mb-1">
                      Subject: {t.subject}
                    </p>
                    <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                      {t.body.slice(0, 160).replace(/\n/g, ' ')}…
                    </p>
                    <p className="text-xs text-slate-300 mt-2">
                      Updated {formatDate(t.updated_at)}
                    </p>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <Link
                      href={`/templates/${t.template_id}`}
                      className="btn-secondary text-xs"
                    >
                      Edit
                    </Link>
                    <button
                      onClick={() => handleDelete(t.template_id, t.name)}
                      disabled={deleting === t.template_id}
                      className="px-3 py-1.5 text-xs font-medium rounded-lg text-red-600 hover:bg-red-50 border border-red-200 transition-colors disabled:opacity-50"
                    >
                      {deleting === t.template_id ? '...' : 'Delete'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
