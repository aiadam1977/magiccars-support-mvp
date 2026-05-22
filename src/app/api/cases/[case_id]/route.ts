/**
 * GET /api/cases/:case_id
 *
 * Returns a single support case with full details.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getCase } from '@/lib/db'

export async function GET(
  req: NextRequest,
  { params }: { params: { case_id: string } }
) {
  try {
    const { case_id } = params
    const serviceCase = getCase(case_id)

    if (!serviceCase) {
      return NextResponse.json({ success: false, error: 'Case not found.' }, { status: 404 })
    }

    return NextResponse.json({ success: true, case: serviceCase })
  } catch (err) {
    console.error('[GET /api/cases/:case_id] Error:', err)
    return NextResponse.json(
      { success: false, error: 'Failed to retrieve case.' },
      { status: 500 }
    )
  }
}
