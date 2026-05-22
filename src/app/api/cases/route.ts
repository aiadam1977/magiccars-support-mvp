/**
 * GET /api/cases
 *
 * Returns all support cases, sorted newest first.
 * Each case is enriched with custom_analysis_data and from_number from the
 * matching call-metadata record (populated by the post_call_analysis_data webhook).
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAllCases, getCallMeta } from '@/lib/db'

export async function GET(_req: NextRequest) {
  try {
    const cases = await getAllCases()

    // Enrich each case with post-call analysis data from the call-meta record
    const enriched = await Promise.all(
      cases.map(async c => {
        if (!c.call_id) return c
        const meta = await getCallMeta(c.call_id)
        if (!meta) return c
        return {
          ...c,
          from_number: meta.from_number,
          call_summary: meta.call_summary,
          call_completion_rating: meta.call_completion_rating,
          user_sentiment: meta.user_sentiment,
          recording_url: meta.recording_url,
          custom_analysis_data: meta.custom_analysis_data,
        }
      })
    )

    return NextResponse.json({ success: true, cases: enriched, total: enriched.length })
  } catch (err) {
    console.error('[GET /api/cases] Error:', err)
    return NextResponse.json(
      { success: false, error: 'Failed to retrieve cases.' },
      { status: 500 }
    )
  }
}
