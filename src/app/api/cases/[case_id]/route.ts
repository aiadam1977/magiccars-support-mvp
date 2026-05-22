/**
 * GET /api/cases/:case_id
 *
 * Returns a single support case with full details.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getCase, getCallMeta } from '@/lib/db'

export async function GET(
  req: NextRequest,
  { params }: { params: { case_id: string } }
) {
  try {
    const { case_id } = params
    const serviceCase = await getCase(case_id)

    if (!serviceCase) {
      return NextResponse.json({ success: false, error: 'Case not found.' }, { status: 404 })
    }

    // Enrich with call-meta if not already attached (handles older cases created before webhook merge)
    let enriched = serviceCase
    if (serviceCase.call_id && !serviceCase.call_metadata) {
      const meta = await getCallMeta(serviceCase.call_id)
      if (meta) {
        enriched = { ...serviceCase, call_metadata: meta }
      }
    }

    // Surface custom_analysis_data at the top level for the detail page
    const callMeta = enriched.call_metadata as (typeof enriched.call_metadata & { custom_analysis_data?: Record<string, string> }) | undefined
    return NextResponse.json({
      success: true,
      case: {
        ...enriched,
        from_number: callMeta?.from_number,
        custom_analysis_data: callMeta?.custom_analysis_data,
      },
    })
  } catch (err) {
    console.error('[GET /api/cases/:case_id] Error:', err)
    return NextResponse.json(
      { success: false, error: 'Failed to retrieve case.' },
      { status: 500 }
    )
  }
}
