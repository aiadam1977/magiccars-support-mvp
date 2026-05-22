'use client'

import { useRouter } from 'next/navigation'
import TemplateEditor from '@/components/TemplateEditor'
import Nav from '@/components/Nav'

export default function NewTemplatePage() {
  const router = useRouter()

  async function handleSave(data: {
    name: string
    category: string
    subject: string
    body: string
  }) {
    const res = await fetch('/api/templates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    const d = await res.json()
    if (d.success) {
      router.push('/templates')
    } else {
      throw new Error(d.error || 'Failed to create template')
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Nav />
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="mb-5 text-sm text-slate-400">
          <a href="/templates" className="hover:text-[#E31837]">Email Templates</a>
          <span className="mx-2">/</span>
          <span className="text-slate-600">New Template</span>
        </div>
        <h1 className="text-2xl font-bold text-[#E31837] mb-6">New Email Template</h1>
        <TemplateEditor onSave={handleSave} />
      </div>
    </div>
  )
}
