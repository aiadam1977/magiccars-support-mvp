export const dynamic = 'force-dynamic'

/**
 * GET /api/track/:case_id
 *
 * Public endpoint — no authentication required.
 * Returns limited case info for the customer-facing tracking page.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getCase } from '@/lib/db'

export async function GET(
  _req: NextRequest,
  { params }: { params: { case_id: string } }
) {
  try {
    const serviceCase = await getCase(params.case_id)
    if (!serviceCase) {
      return NextResponse.json({ success: false, error: 'Case not found.' }, { status: 404 })
    }

    // Return only the fields the customer should see — no internal notes, activity log, etc.
    return NextResponse.json({
      success: true,
      case: {
        case_id:           serviceCase.case_id,
        caller_name:       serviceCase.caller_name,
        vehicle:           serviceCase.vehicle,
        issue_description: serviceCase.issue_description,
        recommended_route: serviceCase.recommended_route,
        status:            serviceCase.status,
        created_at:        serviceCase.created_at,
        updated_at:        serviceCase.updated_at,
      },
    })
  } catch (err) {
    console.error('[GET /api/track/:case_id]', err)
    return NextResponse.json({ success: false, error: 'Failed to load case.' }, { status: 500 })
  }
}
