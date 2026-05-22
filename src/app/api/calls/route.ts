/**
 * GET /api/calls
 *
 * Returns all call-metadata records, newest first, enriched with caller_name
 * pulled from the matching session or case record when available.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAllCallMeta, getSessionByCallId, getAllCases } from '@/lib/db'

export async function GET(_req: NextRequest) {
  try {
    const [metas, cases] = await Promise.all([getAllCallMeta(), getAllCases()])

    // Build a lookup: call_id → case (for caller_name when no session exists)
    const caseByCallId = new Map(cases.map(c => [c.call_id, c]))

    const calls = await Promise.all(
      metas.map(async meta => {
        // Try to resolve caller_name from session → case → post-call data → fallback
        let caller_name: string | undefined

        const session = await getSessionByCallId(meta.call_id)
        if (session?.caller_name && session.caller_name !== 'Unknown Caller') {
          caller_name = session.caller_name
        }

        if (!caller_name) {
          const matchedCase = caseByCallId.get(meta.call_id)
          if (matchedCase?.caller_name && matchedCase.caller_name !== 'Unknown Caller') {
            caller_name = matchedCase.caller_name
          }
        }

        return {
          ...meta,
          caller_name: caller_name ?? 'Unknown',
        }
      })
    )

    return NextResponse.json({ success: true, calls, total: calls.length })
  } catch (err) {
    console.error('[GET /api/calls] Error:', err)
    return NextResponse.json(
      { success: false, error: 'Failed to retrieve calls.' },
      { status: 500 }
    )
  }
}
