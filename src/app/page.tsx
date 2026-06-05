'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Nav from '@/components/Nav'

interface AnalyticsData {
  totals: {
    calls_total: number
    calls_today: number
    cases_total: number
    cases_open: number
    cases_assigned: number
    cases_resolved: number
    cases_resolved_this_week: number
    safety_cases: number
    open_safety_cases: number
    follow_up_required: number
  }
  call_volume: Array<{ date: string; count: number }>
  issue_categories: Array<{ category: string; count: number }>
  route_breakdown: Array<{ route: string; count: number }>
  sentiment_breakdown: Array<{ sentiment: string; count: number }>
  harold: {
    completion_rate: number
    analysis_rate: number
    visual_diagnostic_rate: number
    case_creation_rate: number
    avg_duration_ms: number
  }
  avg_resolution_ms: number
}

const ROUTE_LABEL: Record<string, string> = {
  self_fix: 'Self-Fix', replacement_part: 'Replace Part',
  warranty_replacement: 'Warranty', out_of_warranty: 'Out-of-Warranty',
  safety_stop: 'Safety Stop', human_support: 'Human Agent', not_determined: 'Not Determined',
}
const ROUTE_COLOR: Record<string, string> = {
  self_fix: 'bg-green-500', replacement_part: 'bg-blue-500',
  warranty_replacement: 'bg-purple-500', out_of_warranty: 'bg-orange-500',
  safety_stop: 'bg-red-600', human_support: 'bg-gray-400', not_determined: 'bg-slate-300',
}
const SENTIMENT_COLOR: Record<string, string> = {
  Positive: 'bg-green-500', Neutral: 'bg-slate-400', Negative: 'bg-red-500', Unknown: 'bg-slate-300',
}

function formatDuration(ms: number) {
  if (!ms) return '—'
  const s = Math.round(ms / 1000), m = Math.floor(s / 60)
  return m > 0 ? `${m}m ${s % 60}s` : `${s}s`
}
function formatResolutionTime(ms: number) {
  if (!ms) return '—'
  const h = Math.round(ms / 3_600_000)
  return h < 24 ? `${h}h` : `${Math.round(h / 24)}d`
}

function StatCard({ label, value, sub, color, href }: {
  label: string; value: string | number; sub?: string; color?: string; href?: string
}) {
  const inner = (
    <div className={`bg-white rounded-xl border shadow-sm p-5 h-full ${href ? 'hover:border-[#E31837]/30 transition-colors' : ''}`}>
      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">{label}</p>
      <p className={`text-3xl font-bold ${color ?? 'text-slate-800'}`}>{value}</p>
      {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
    </div>
  )
  return href ? <Link href={href} className="block">{inner}</Link> : inner
}

function BarChart({ data, maxVal, colorFn }: {
  data: Array<{ label: string; value: number }>; maxVal: number; colorFn?: (l: string) => string
}) {
  return (
    <div className="space-y-2">
      {data.map(({ label, value }) => (
        <div key={label} className="flex items-center gap-3">
          <span className="text-xs text-slate-500 w-28 flex-shrink-0 capitalize truncate">{label}</span>
          <div className="flex-1 bg-slate-100 rounded-full h-2 overflow-hidden">
            <div className={`h-2 rounded-full ${colorFn ? colorFn(label) : 'bg-[#E31837]'}`}
              style={{ width: maxVal > 0 ? `${(value / maxVal) * 100}%` : '0%' }} />
          </div>
          <span className="text-xs font-semibold text-slate-600 w-6 text-right">{value}</span>
        </div>
      ))}
    </div>
  )
}

function MiniBarChart({ data }: { data: Array<{ date: string; count: number }> }) {
  const max = Math.max(...data.map(d => d.count), 1)
  const today = new Date().toISOString().slice(0, 10)
  return (
    <div className="flex items-end gap-0.5 h-16">
      {data.map(({ date, count }) => (
        <div key={date} className="flex-1 flex flex-col items-center group relative">
          <div
            className={`w-full rounded-sm ${date === today ? 'bg-[#E31837]' : 'bg-slate-200 group-hover:bg-slate-300'}`}
            style={{ height: `${Math.max((count / max) * 100, 4)}%` }}
          />
          <div className="absolute bottom-full mb-1 hidden group-hover:block bg-slate-800 text-white text-xs rounded px-1.5 py-0.5 whitespace-nowrap z-10 pointer-events-none">
            {new Date(date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}: {count}
          </div>
        </div>
      ))}
    </div>
  )
}

function RateBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div>
      <div className="flex justify-between mb-1">
        <span className="text-xs text-slate-500">{label}</span>
        <span className="text-xs font-semibold text-slate-700">{value}%</span>
      </div>
      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div className={`h-1.5 rounded-full ${color}`} style={{ width: `${value}%` }} />
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null)

  function load() {
    fetch('/api/analytics')
      .then(r => r.json())
      .then(d => { if (d.success) { setData(d); setLastRefresh(new Date()) } })
      .catch(console.error)
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
    const id = setInterval(load, 60_000)
    return () => clearInterval(id)
  }, [])

  if (loading) return <div className="min-h-screen bg-slate-50"><Nav /><div className="text-center py-24 text-slate-400">Loading…</div></div>
  if (!data) return <div className="min-h-screen bg-slate-50"><Nav /><div className="text-center py-24 text-red-500">Failed to load analytics.</div></div>

  const { totals, call_volume, issue_categories, route_breakdown, sentiment_breakdown, harold } = data
  const maxIssue = Math.max(...issue_categories.map(i => i.count), 1)
  const maxRoute = Math.max(...route_breakdown.map(r => r.count), 1)
  const maxSenti = Math.max(...sentiment_breakdown.map(s => s.count), 1)

  return (
    <div className="min-h-screen bg-slate-50">
      <Nav />
      <div className="max-w-7xl mx-auto px-4 py-8">

        {/* Header */}
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-[#E31837]">Dashboard</h1>
            <p className="text-slate-400 text-sm mt-1">
              {lastRefresh ? `Updated ${lastRefresh.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}` : ''}
            </p>
          </div>
          <button onClick={load} className="btn-secondary text-sm flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh
          </button>
        </div>

        {/* Alerts */}
        {totals.open_safety_cases > 0 && (
          <Link href="/cases" className="block mb-4">
            <div className="p-4 bg-red-600 rounded-xl text-white flex items-center gap-3">
              <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span className="font-semibold">{totals.open_safety_cases} open safety escalation{totals.open_safety_cases !== 1 ? 's' : ''} — tap to review</span>
            </div>
          </Link>
        )}
        {totals.follow_up_required > 0 && (
          <div className="mb-4 p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-sm flex items-center gap-2">
            <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            <strong>{totals.follow_up_required}</strong>&nbsp;case{totals.follow_up_required !== 1 ? 's' : ''} require follow-up
            <Link href="/cases" className="ml-auto text-amber-700 hover:underline font-medium text-xs">View →</Link>
          </div>
        )}

        {/* KPI cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-5">
          <StatCard label="Calls Today"        value={totals.calls_today}              sub={`${totals.calls_total} all time`} href="/cases" />
          <StatCard label="Open Cases"         value={totals.cases_open}               sub={`${totals.cases_assigned} assigned`} color={totals.cases_open > 0 ? 'text-amber-600' : undefined} href="/cases" />
          <StatCard label="Resolved This Week" value={totals.cases_resolved_this_week} sub={`${totals.cases_resolved} all time`} color="text-green-600" />
          <StatCard label="Safety Escalations" value={totals.open_safety_cases}        sub={`${totals.safety_cases} total`} color={totals.open_safety_cases > 0 ? 'text-red-600' : undefined} href="/cases" />
          <StatCard label="Avg Call Duration"  value={formatDuration(harold.avg_duration_ms)} />
        </div>

        {/* Main grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-5">
          {/* Call volume */}
          <div className="lg:col-span-2 bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-slate-700">Call Volume — Last 14 Days</h2>
              <span className="text-xs bg-red-50 text-[#E31837] px-2 py-0.5 rounded-full font-medium">Red = today</span>
            </div>
            <MiniBarChart data={call_volume} />
            <div className="flex justify-between mt-2">
              <span className="text-xs text-slate-400">
                {call_volume[0] ? new Date(call_volume[0].date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''}
              </span>
              <span className="text-xs text-slate-400">Today</span>
            </div>
          </div>

          {/* Harold performance */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <h2 className="text-sm font-semibold text-slate-700 mb-4">Harold Performance</h2>
            <div className="space-y-3">
              <RateBar label="Call Completion"       value={harold.completion_rate}        color="bg-green-500" />
              <RateBar label="Post-Call Analysis"    value={harold.analysis_rate}          color="bg-blue-500" />
              <RateBar label="Visual Diagnostic Used" value={harold.visual_diagnostic_rate} color="bg-purple-500" />
              <RateBar label="Case Creation Rate"    value={harold.case_creation_rate}     color="bg-[#E31837]" />
            </div>
            <div className="mt-4 pt-4 border-t border-slate-50 grid grid-cols-2 gap-3">
              <div className="bg-slate-50 rounded-lg p-3">
                <p className="text-xs text-slate-400">Avg Duration</p>
                <p className="text-sm font-bold text-slate-700">{formatDuration(harold.avg_duration_ms)}</p>
              </div>
              <div className="bg-slate-50 rounded-lg p-3">
                <p className="text-xs text-slate-400">Avg Resolution</p>
                <p className="text-sm font-bold text-slate-700">{formatResolutionTime(data.avg_resolution_ms)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-5">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <h2 className="text-sm font-semibold text-slate-700 mb-4">Issue Categories</h2>
            {issue_categories.length === 0
              ? <p className="text-xs text-slate-300 italic">No data yet</p>
              : <BarChart data={issue_categories.slice(0, 8).map(i => ({ label: i.category, value: i.count }))} maxVal={maxIssue} />
            }
          </div>
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <h2 className="text-sm font-semibold text-slate-700 mb-4">Resolution Routes</h2>
            {route_breakdown.length === 0
              ? <p className="text-xs text-slate-300 italic">No data yet</p>
              : <BarChart
                  data={route_breakdown.map(r => ({ label: ROUTE_LABEL[r.route] ?? r.route, value: r.count }))}
                  maxVal={maxRoute}
                  colorFn={label => {
                    const k = Object.entries(ROUTE_LABEL).find(([, v]) => v === label)?.[0] ?? ''
                    return ROUTE_COLOR[k] ?? 'bg-slate-400'
                  }}
                />
            }
          </div>
          <div className="space-y-4">
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
              <h2 className="text-sm font-semibold text-slate-700 mb-3">Caller Sentiment</h2>
              {sentiment_breakdown.length === 0
                ? <p className="text-xs text-slate-300 italic">No data yet</p>
                : <BarChart data={sentiment_breakdown.map(s => ({ label: s.sentiment, value: s.count }))} maxVal={maxSenti} colorFn={l => SENTIMENT_COLOR[l] ?? 'bg-slate-400'} />
              }
            </div>
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
              <h2 className="text-sm font-semibold text-slate-700 mb-3">Case Status</h2>
              {[
                { label: 'Open', value: totals.cases_open, color: 'bg-yellow-400' },
                { label: 'Assigned', value: totals.cases_assigned, color: 'bg-blue-400' },
                { label: 'Resolved', value: totals.cases_resolved, color: 'bg-green-500' },
              ].map(({ label, value, color }) => (
                <div key={label} className="flex items-center gap-3 mb-2">
                  <span className="text-xs text-slate-500 w-16">{label}</span>
                  <div className="flex-1 bg-slate-100 rounded-full h-2 overflow-hidden">
                    <div className={`h-2 rounded-full ${color}`}
                      style={{ width: totals.cases_total > 0 ? `${(value / totals.cases_total) * 100}%` : '0%' }} />
                  </div>
                  <span className="text-xs font-semibold text-slate-600 w-6 text-right">{value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Quick links */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { href: '/cases', label: 'All Activity', icon: '📋', desc: `${totals.calls_total} records` },
            { href: '/templates', label: 'Email Templates', icon: '✉', desc: 'Manage templates' },
            { href: '/demo', label: 'Demo Simulator', icon: '🎮', desc: 'Test Harold' },
          ].map(({ href, label, icon, desc }) => (
            <Link key={href} href={href} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 hover:border-[#E31837]/30 transition-colors flex items-center gap-3">
              <span className="text-xl">{icon}</span>
              <div><p className="text-sm font-semibold text-slate-700">{label}</p><p className="text-xs text-slate-400">{desc}</p></div>
            </Link>
          ))}
        </div>

      </div>
    </div>
  )
}
