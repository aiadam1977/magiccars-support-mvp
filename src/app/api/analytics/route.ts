export const dynamic = 'force-dynamic'

/**
 * GET /api/analytics
 *
 * Aggregates call and case data for the dashboard home page.
 */

import { NextResponse } from 'next/server'
import { getAllCallMeta, getAllCases } from '@/lib/db'

function dayKey(ts: number | string): string {
  const d = new Date(typeof ts === 'number' ? ts : ts)
  return d.toISOString().slice(0, 10) // "YYYY-MM-DD"
}

function startOfDay(daysAgo: number): number {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() - daysAgo)
  return d.getTime()
}

export async function GET() {
  try {
    const [metas, cases] = await Promise.all([getAllCallMeta(), getAllCases()])

    const now     = Date.now()
    const todayMs = startOfDay(0)
    const weekMs  = startOfDay(7)

    // ── Totals ───────────────────────────────────────────────────────────────
    const callsTotal   = metas.length
    const callsToday   = metas.filter(m => new Date(m.stored_at).getTime() >= todayMs).length
    const casesTotal   = cases.length
    const casesOpen    = cases.filter(c => c.status === 'open').length
    const casesAssigned = cases.filter(c => c.status === 'assigned').length
    const casesResolved = cases.filter(c => c.status === 'resolved').length
    const casesResolvedThisWeek = cases.filter(
      c => c.status === 'resolved' && new Date(c.updated_at).getTime() >= weekMs
    ).length
    const safetyCases = cases.filter(c => c.recommended_route === 'safety_stop').length
    const openSafetyCases = cases.filter(
      c => c.recommended_route === 'safety_stop' && c.status !== 'resolved'
    ).length
    const followUpRequired = cases.filter(
      c => (c as unknown as { custom_analysis_data?: { follow_up_required?: string } })
        .custom_analysis_data?.follow_up_required === 'yes' && c.status !== 'resolved'
    ).length

    // ── Call volume — last 14 days ────────────────────────────────────────────
    const volumeMap = new Map<string, number>()
    for (let i = 13; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i)
      volumeMap.set(d.toISOString().slice(0, 10), 0)
    }
    const cutoff = startOfDay(14)
    for (const m of metas) {
      const ts = new Date(m.stored_at).getTime()
      if (ts >= cutoff) {
        const k = dayKey(m.stored_at)
        if (volumeMap.has(k)) volumeMap.set(k, (volumeMap.get(k) ?? 0) + 1)
      }
    }
    const callVolume = Array.from(volumeMap.entries()).map(([date, count]) => ({ date, count }))

    // ── Issue categories ──────────────────────────────────────────────────────
    const catMap = new Map<string, number>()
    for (const m of metas) {
      const cat = m.custom_analysis_data?.issue_category
      if (cat) catMap.set(cat, (catMap.get(cat) ?? 0) + 1)
    }
    const issueCategories = Array.from(catMap.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([category, count]) => ({ category, count }))

    // ── Resolution route breakdown ────────────────────────────────────────────
    const routeMap = new Map<string, number>()
    for (const c of cases) {
      const r = c.recommended_route || 'not_determined'
      routeMap.set(r, (routeMap.get(r) ?? 0) + 1)
    }
    const routeBreakdown = Array.from(routeMap.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([route, count]) => ({ route, count }))

    // ── Harold performance ────────────────────────────────────────────────────
    const analyzedCalls = metas.filter(m => m.custom_analysis_data && Object.keys(m.custom_analysis_data).length > 0)
    const completedCalls = metas.filter(m => m.call_successful === true)
    const visualDiagUsed = metas.filter(
      m => m.custom_analysis_data?.visual_diagnostic_used === 'yes'
    )
    const caseCreatedCalls = metas.filter(
      m => m.custom_analysis_data?.service_case_created === 'yes'
    )
    const totalDuration = metas.reduce((sum, m) => sum + (m.duration_ms ?? 0), 0)
    const callsWithDuration = metas.filter(m => m.duration_ms)

    const harold = {
      completion_rate:       callsTotal > 0 ? Math.round((completedCalls.length / callsTotal) * 100) : 0,
      analysis_rate:         callsTotal > 0 ? Math.round((analyzedCalls.length / callsTotal) * 100) : 0,
      visual_diagnostic_rate: callsTotal > 0 ? Math.round((visualDiagUsed.length / callsTotal) * 100) : 0,
      case_creation_rate:    callsTotal > 0 ? Math.round((caseCreatedCalls.length / callsTotal) * 100) : 0,
      avg_duration_ms:       callsWithDuration.length > 0
        ? Math.round(totalDuration / callsWithDuration.length)
        : 0,
    }

    // ── Sentiment breakdown ───────────────────────────────────────────────────
    const sentimentMap = new Map<string, number>()
    for (const m of metas) {
      if (m.user_sentiment) {
        sentimentMap.set(m.user_sentiment, (sentimentMap.get(m.user_sentiment) ?? 0) + 1)
      }
    }
    const sentimentBreakdown = Array.from(sentimentMap.entries())
      .map(([sentiment, count]) => ({ sentiment, count }))

    // ── Avg resolution time (open → resolved) ─────────────────────────────────
    const resolvedWithTimes = cases.filter(
      c => c.status === 'resolved' && c.created_at && c.updated_at
    )
    const avgResolutionMs = resolvedWithTimes.length > 0
      ? resolvedWithTimes.reduce((sum, c) =>
          sum + (new Date(c.updated_at).getTime() - new Date(c.created_at).getTime()), 0
        ) / resolvedWithTimes.length
      : 0

    return NextResponse.json({
      success: true,
      generated_at: new Date().toISOString(),
      totals: {
        calls_total: callsTotal,
        calls_today: callsToday,
        cases_total: casesTotal,
        cases_open: casesOpen,
        cases_assigned: casesAssigned,
        cases_resolved: casesResolved,
        cases_resolved_this_week: casesResolvedThisWeek,
        safety_cases: safetyCases,
        open_safety_cases: openSafetyCases,
        follow_up_required: followUpRequired,
      },
      call_volume: callVolume,
      issue_categories: issueCategories,
      route_breakdown: routeBreakdown,
      sentiment_breakdown: sentimentBreakdown,
      harold,
      avg_resolution_ms: avgResolutionMs,
      // Server-side timestamp so client knows data freshness
      server_now: now,
    })
  } catch (err) {
    console.error('[GET /api/analytics]', err)
    return NextResponse.json({ success: false, error: 'Failed to load analytics.' }, { status: 500 })
  }
}
