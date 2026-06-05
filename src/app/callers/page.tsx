'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import Nav from '@/components/Nav'

interface CallerSummary {
  phone: string
  display_phone: string
  name: string
  email?: string
  total_calls: number
  total_cases: number
  open_cases: number
  last_call: string
  vehicles: string[]
  issue_categories: string[]
  has_safety: boolean
  sentiments: string[]
}

function formatPhone(p?: string) {
  if (!p) return '—'
  const d = p.replace(/\D/g, '')
  if (d.length === 11 && d.startsWith('1')) return `+1 (${d.slice(1,4)}) ${d.slice(4,7)}-${d.slice(7)}`
  return p
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: 'numeric', minute: '2-digit',
  })
}

export default function CallersPage() {
  const [callers, setCallers] = useState<CallerSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')

  useEffect(() => {
    fetch('/api/records')
      .then(r => r.json())
      .then(d => {
        if (!d.success) return
        // Group records by normalized phone number
        const norm = (p?: string) => (p ?? '').replace(/\D/g, '')
        const byPhone = new Map<string, CallerSummary>()

        for (const r of d.records) {
          const phone = norm(r.from_number || r.caller_phone)
          if (!phone) continue

          const existing = byPhone.get(phone)
          const cad = r.custom_analysis_data ?? {}
          const vehicle = r.vehicle ?? cad.vehicle_model ?? ''
          const cat = cad.issue_category ?? ''
          const isSafety = r.recommended_route === 'safety_stop'
          const sentiment = r.user_sentiment ?? ''
          const email = r.caller_email ?? cad.caller_email ?? ''

          if (!existing) {
            byPhone.set(phone, {
              phone,
              display_phone: r.from_number || r.caller_phone || phone,
              name: r.caller_name !== 'Unknown' ? r.caller_name : 'Unknown',
              email: email || undefined,
              total_calls: 1,
              total_cases: r.has_case ? 1 : 0,
              open_cases: (r.has_case && r.status !== 'resolved') ? 1 : 0,
              last_call: r.created_at,
              vehicles: vehicle ? [vehicle] : [],
              issue_categories: cat ? [cat] : [],
              has_safety: isSafety,
              sentiments: sentiment ? [sentiment] : [],
            })
          } else {
            existing.total_calls++
            if (r.has_case) existing.total_cases++
            if (r.has_case && r.status !== 'resolved') existing.open_cases++
            if (new Date(r.created_at) > new Date(existing.last_call)) {
              existing.last_call = r.created_at
              // Update name from more recent records
              if (r.caller_name && r.caller_name !== 'Unknown') existing.name = r.caller_name
              if (email) existing.email = email
            }
            if (vehicle && !existing.vehicles.includes(vehicle)) existing.vehicles.push(vehicle)
            if (cat && !existing.issue_categories.includes(cat)) existing.issue_categories.push(cat)
            if (isSafety) existing.has_safety = true
            if (sentiment && !existing.sentiments.includes(sentiment)) existing.sentiments.push(sentiment)
          }
        }

        const sorted = Array.from(byPhone.values())
          .sort((a, b) => new Date(b.last_call).getTime() - new Date(a.last_call).getTime())
        setCallers(sorted)
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return callers
    return callers.filter(c =>
      c.name.toLowerCase().includes(q) ||
      c.phone.includes(q.replace(/\D/g, '')) ||
      formatPhone(c.display_phone).includes(q) ||
      (c.email ?? '').toLowerCase().includes(q) ||
      c.vehicles.some(v => v.toLowerCase().includes(q)) ||
      c.issue_categories.some(cat => cat.toLowerCase().includes(q))
    )
  }, [callers, query])

  const SENTIMENT_COLOR: Record<string, string> = {
    Positive: 'text-green-600', Neutral: 'text-slate-500', Negative: 'text-red-500',
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Nav />
      <div className="max-w-5xl mx-auto px-4 py-8">

        {/* Header */}
        <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold text-[#E31837]">Customer Lookup</h1>
            <p className="text-slate-500 text-sm mt-1">
              {callers.length} unique caller{callers.length !== 1 ? 's' : ''}
              {query && filtered.length !== callers.length && (
                <span className="ml-2 text-slate-400">· {filtered.length} matching</span>
              )}
            </p>
          </div>
        </div>

        {/* Search */}
        <div className="mb-5 relative">
          <span className="absolute inset-y-0 left-3 flex items-center text-slate-400 pointer-events-none">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
            </svg>
          </span>
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search by name, phone number, email, vehicle…"
            autoFocus
            className="w-full pl-9 pr-9 py-3 border border-slate-200 rounded-xl text-sm bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-[#E31837]/30 focus:border-[#E31837]"
          />
          {query && (
            <button onClick={() => setQuery('')} className="absolute inset-y-0 right-3 flex items-center text-slate-400 hover:text-slate-600 text-lg">×</button>
          )}
        </div>

        {loading && <div className="text-center py-16 text-slate-400">Loading…</div>}

        {!loading && callers.length === 0 && (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm text-center py-16">
            <div className="text-4xl mb-3">📞</div>
            <p className="text-slate-400">No callers yet.</p>
          </div>
        )}

        {!loading && callers.length > 0 && filtered.length === 0 && (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm text-center py-12">
            <div className="text-3xl mb-3">🔍</div>
            <p className="text-slate-500 font-medium">No matches for &ldquo;{query}&rdquo;</p>
            <button onClick={() => setQuery('')} className="btn-secondary text-sm mt-4">Clear search</button>
          </div>
        )}

        {!loading && filtered.length > 0 && (
          <div className="space-y-2">
            {filtered.map(caller => (
              <Link
                key={caller.phone}
                href={`/callers/${encodeURIComponent(caller.display_phone || caller.phone)}`}
                className={`block bg-white rounded-xl border shadow-sm hover:border-[#E31837]/30 transition-colors p-4 ${
                  caller.has_safety ? 'border-red-200 bg-red-50/30' : 'border-gray-100'
                }`}
              >
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  {/* Caller info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-slate-800">{caller.name}</p>
                      {caller.has_safety && (
                        <span className="px-1.5 py-0.5 rounded text-xs font-semibold bg-red-100 text-red-700">Safety flag</span>
                      )}
                      {caller.open_cases > 0 && (
                        <span className="px-1.5 py-0.5 rounded text-xs font-semibold bg-amber-100 text-amber-700">
                          {caller.open_cases} open case{caller.open_cases !== 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-slate-500 mt-0.5">{formatPhone(caller.display_phone)}</p>
                    {caller.email && <p className="text-xs text-slate-400 mt-0.5">{caller.email}</p>}
                    {caller.vehicles.length > 0 && (
                      <p className="text-xs text-slate-400 mt-1 italic">{caller.vehicles.slice(0, 2).join(', ')}</p>
                    )}
                    {caller.issue_categories.length > 0 && (
                      <div className="flex gap-1 mt-1.5 flex-wrap">
                        {caller.issue_categories.slice(0, 3).map(cat => (
                          <span key={cat} className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 text-xs capitalize">{cat}</span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Stats */}
                  <div className="flex gap-5 text-center flex-shrink-0">
                    <div>
                      <p className="text-lg font-bold text-slate-800">{caller.total_calls}</p>
                      <p className="text-xs text-slate-400">Calls</p>
                    </div>
                    <div>
                      <p className="text-lg font-bold text-slate-800">{caller.total_cases}</p>
                      <p className="text-xs text-slate-400">Cases</p>
                    </div>
                    <div className="text-right">
                      {caller.sentiments.length > 0 && (
                        <p className={`text-sm font-medium ${SENTIMENT_COLOR[caller.sentiments[0]] ?? 'text-slate-400'}`}>
                          {caller.sentiments[0]}
                        </p>
                      )}
                      <p className="text-xs text-slate-400 mt-0.5">{formatDate(caller.last_call)}</p>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

      </div>
    </div>
  )
}
