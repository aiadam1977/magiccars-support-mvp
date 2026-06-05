export const dynamic = 'force-dynamic'

/**
 * GET /api/records
 *
 * Unified feed of every call and every service case in one sorted list.
 *
 * Matching strategy (two passes):
 *   1. Match call-meta → case via call_id  (primary)
 *   2. Match call-meta → case via custom_analysis_data.case_id  (fallback — handles
 *      calls where Harold created a case but the call_id wasn't stored on the case)
 *   3. Append any cases that weren't matched in either pass (legacy / orphan records)
 *   4. Sort newest-first.
 *
 * Caller name resolution: session → case.caller_name → custom_analysis_data.caller_name → 'Unknown'
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAllCallMeta, getAllCases, getSessionByCallId } from '@/lib/db'

export async function GET(_req: NextRequest) {
  try {
    const [metas, cases] = await Promise.all([getAllCallMeta(), getAllCases()])

    // Build two lookup maps — by call_id and by case_id
    const caseByCallId = new Map(cases.map(c => [c.call_id, c]))
    const caseById     = new Map(cases.map(c => [c.case_id, c]))

    const callIdInMeta = new Set(metas.map(m => m.call_id))

    // Track which case_ids have been matched so we don't double-render them
    const matchedCaseIds = new Set<string>()

    // ── Records sourced from call-meta ──────────────────────────────────────
    const fromCalls = await Promise.all(
      metas.map(async meta => {
        // Primary match: call_id
        let matchedCase = meta.call_id ? caseByCallId.get(meta.call_id) : undefined

        // Fallback match: case_id stored in post-call analysis data
        if (!matchedCase && meta.custom_analysis_data?.case_id) {
          matchedCase = caseById.get(meta.custom_analysis_data.case_id)
        }

        if (matchedCase) {
          matchedCaseIds.add(matchedCase.case_id)
        }

        // Caller name: session → case → post-call analysis → fallback
        let caller_name = 'Unknown'
        const session = await getSessionByCallId(meta.call_id)
        if (session?.caller_name && session.caller_name !== 'Unknown Caller') {
          caller_name = session.caller_name
        } else if (matchedCase?.caller_name && matchedCase.caller_name !== 'Unknown Caller') {
          caller_name = matchedCase.caller_name
        } else if (meta.custom_analysis_data?.caller_name) {
          caller_name = meta.custom_analysis_data.caller_name
        }

        return {
          // Identifiers
          call_id:  meta.call_id,
          case_id:  matchedCase?.case_id,
          has_case: !!matchedCase,

          // Caller
          caller_name,
          caller_phone: matchedCase?.caller_phone || meta.from_number || '',
          caller_email: matchedCase?.caller_email || meta.custom_analysis_data?.caller_email,
          from_number:  meta.from_number,

          // Vehicle / issue (from case)
          vehicle:           matchedCase?.vehicle,
          issue_description: matchedCase?.issue_description,
          escalation_reason: matchedCase?.escalation_reason,
          analysis:          matchedCase?.analysis,
          activity:          matchedCase?.activity,

          // Resolution
          recommended_route:
            matchedCase?.recommended_route ||
            meta.custom_analysis_data?.recommended_route,
          status: matchedCase?.status,

          // Call metadata
          recording_url:         meta.recording_url,
          transcript:            meta.transcript,
          duration_ms:           meta.duration_ms,
          start_timestamp:       meta.start_timestamp,
          end_timestamp:         meta.end_timestamp,
          user_sentiment:        meta.user_sentiment,
          call_summary:          meta.call_summary,
          call_completion_rating: meta.call_completion_rating,
          call_successful:       meta.call_successful,
          custom_analysis_data:  meta.custom_analysis_data,

          // Dates
          created_at: matchedCase?.created_at || meta.stored_at,
          stored_at:  meta.stored_at,
        }
      })
    )

    // ── Cases with no matching call-meta (legacy / orphan records) ──────────
    // Exclude any case already matched above (by call_id OR by case_id fallback)
    const fromOrphans = cases
      .filter(c => !matchedCaseIds.has(c.case_id) && (!c.call_id || !callIdInMeta.has(c.call_id)))
      .map(c => ({
        call_id:          c.call_id || '',
        case_id:          c.case_id,
        has_case:         true,
        caller_name:      c.caller_name,
        caller_phone:     c.caller_phone,
        caller_email:     c.caller_email,
        from_number:      c.caller_phone,
        vehicle:          c.vehicle,
        issue_description: c.issue_description,
        escalation_reason: c.escalation_reason,
        analysis:         c.analysis,
        activity:         c.activity,
        recommended_route: c.recommended_route,
        status:           c.status,
        recording_url:    c.call_metadata?.recording_url,
        transcript:       c.call_metadata?.transcript,
        duration_ms:      c.call_metadata?.duration_ms,
        start_timestamp:  c.call_metadata?.start_timestamp,
        end_timestamp:    c.call_metadata?.end_timestamp,
        user_sentiment:   c.call_metadata?.user_sentiment,
        call_summary:     c.call_metadata?.call_summary,
        call_completion_rating: c.call_metadata?.call_completion_rating,
        call_successful:  (c.call_metadata as (typeof c.call_metadata & { call_successful?: boolean }) | undefined)?.call_successful,
        custom_analysis_data: c.call_metadata?.custom_analysis_data,
        created_at:       c.created_at,
        stored_at:        c.created_at,
      }))

    // ── Merge and sort newest-first ─────────────────────────────────────────
    const records = [...fromCalls, ...fromOrphans].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )

    return NextResponse.json({ success: true, records, total: records.length })
  } catch (err) {
    console.error('[GET /api/records] Error:', err)
    return NextResponse.json(
      { success: false, error: 'Failed to retrieve records.' },
      { status: 500 }
    )
  }
}
