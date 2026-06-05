'use client'

import { useState, useEffect } from 'react'
import Nav from '@/components/Nav'

interface TeamMember { user_id: string; email: string; name: string; role: string; created_at: string }

export default function TeamPage() {
  const [members, setMembers] = useState<TeamMember[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ email: '', name: '', password: '', role: 'agent' as 'admin' | 'agent' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [deleting, setDeleting] = useState<string | null>(null)

  function load() {
    setLoading(true)
    fetch('/api/users').then(r => r.json()).then(d => { if (d.success) setMembers(d.users) })
      .catch(console.error).finally(() => setLoading(false))
  }

  useEffect(load, [])

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault(); setError(''); setSaving(true)
    try {
      const res = await fetch('/api/users', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const d = await res.json()
      if (d.success) { setShowAdd(false); setForm({ email: '', name: '', password: '', role: 'agent' }); load() }
      else setError(d.error || 'Failed to add user.')
    } catch { setError('Network error.') } finally { setSaving(false) }
  }

  async function handleDelete(email: string) {
    setDeleting(email)
    try {
      await fetch('/api/users', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email }) })
      setMembers(prev => prev.filter(m => m.email !== email))
    } catch { /* silent */ } finally { setDeleting(null) }
  }

  const inputCls = 'w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#E31837]/30 focus:border-[#E31837]'

  return (
    <div className="min-h-screen bg-slate-50">
      <Nav />
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-[#E31837]">Team</h1>
            <p className="text-slate-400 text-sm mt-1">Manage who has access to the dashboard</p>
          </div>
          <button onClick={() => setShowAdd(s => !s)} className="btn-primary text-sm">+ Add Member</button>
        </div>

        {/* Add form */}
        {showAdd && (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 mb-5">
            <h2 className="text-sm font-semibold text-slate-700 mb-4">Add Team Member</h2>
            <form onSubmit={handleAdd} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Name</label>
                  <input className={inputCls} value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))} placeholder="Jane Smith" required />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Email</label>
                  <input type="email" className={inputCls} value={form.email} onChange={e => setForm(f => ({...f, email: e.target.value}))} placeholder="jane@example.com" required />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Password</label>
                  <input type="password" className={inputCls} value={form.password} onChange={e => setForm(f => ({...f, password: e.target.value}))} placeholder="••••••••" required />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Role</label>
                  <select className={inputCls} value={form.role} onChange={e => setForm(f => ({...f, role: e.target.value as 'admin' | 'agent'}))}>
                    <option value="agent">Agent</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
              </div>
              {error && <p className="text-sm text-red-600">{error}</p>}
              <div className="flex gap-2">
                <button type="submit" disabled={saving} className="btn-primary text-sm disabled:opacity-50">{saving ? 'Adding…' : 'Add Member'}</button>
                <button type="button" onClick={() => setShowAdd(false)} className="btn-secondary text-sm">Cancel</button>
              </div>
            </form>
          </div>
        )}

        {/* Master admin */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden mb-3">
          <div className="px-5 py-3 bg-slate-50 border-b border-gray-100">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Master Admin</p>
          </div>
          <div className="px-5 py-4 flex items-center justify-between">
            <div>
              <p className="font-semibold text-slate-800 text-sm">Admin</p>
              <p className="text-xs text-slate-400">{process.env.NEXT_PUBLIC_ADMIN_EMAIL ?? 'info@mymagiccars.com'}</p>
            </div>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700">Admin</span>
          </div>
        </div>

        {/* Team members */}
        {loading ? (
          <div className="text-center py-8 text-slate-400">Loading…</div>
        ) : members.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm text-center py-10 text-slate-400 text-sm">
            No additional team members yet. Add one above.
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-3 bg-slate-50 border-b border-gray-100">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Team Members ({members.length})</p>
            </div>
            <div className="divide-y divide-gray-50">
              {members.map(m => (
                <div key={m.user_id} className="px-5 py-4 flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-slate-800 text-sm">{m.name}</p>
                    <p className="text-xs text-slate-400">{m.email}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                      m.role === 'admin' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'
                    }`}>{m.role}</span>
                    <button
                      onClick={() => handleDelete(m.email)}
                      disabled={deleting === m.email}
                      className="text-xs text-slate-400 hover:text-red-500 transition-colors disabled:opacity-50"
                    >
                      {deleting === m.email ? '…' : 'Remove'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
