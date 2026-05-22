'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Nav from '@/components/Nav'
import TemplateEditor from '@/components/TemplateEditor'

interface EmailTemplate {
  template_id: string
  name: string
  category: string
  subject: string
  body: string
}

export default function EditTemplatePage() {
  const { template_id } = useParams() as { template_id: string }
  const router = useRouter()
  const [template, setTemplate] = useState<EmailTemplate | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch(`/api/templates/${template_id}`)
      .then(r => r.json())
      .then(d => {
        if (d.success) setTemplate(d.template)
        else setError('Template not found.')
      })
      .catch(() => setError('Failed to load template.'))
      .finally(() => setLoading(false))
  }, [template_id])

  async function handleSave(data: {
    name: string
    category: string
    subject: string
    body: string
  }) {
    const res = await fetch(`/api/templates/${template_id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    const d = await res.json()
    if (d.success) {
      router.push('/templates')
    } else {
      throw new Error(d.error || 'Failed to save template')
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Nav />
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="mb-5 text-sm text-slate-400">
          <a href="/templates" className="hover:text-[#E31837]">Email Templates</a>
          <span className="mx-2">/</span>
          <span className="text-slate-600">{template?.name || 'Edit Template'}</span>
        </div>
        <h1 className="text-2xl font-bold text-[#E31837] mb-6">Edit Template</h1>

        {loading && <div className="text-center py-16 text-slate-400">Loading...</div>}
        {error && <div className="text-center py-16 text-red-500">{error}</div>}
        {!loading && !error && template && (
          <TemplateEditor initialValues={template} onSave={handleSave} />
        )}
      </div>
    </div>
  )
}
