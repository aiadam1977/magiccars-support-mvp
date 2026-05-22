/**
 * GET /api/cases
 *
 * Returns all support cases, sorted newest first.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAllCases } from '@/lib/db'

export async function GET(req: NextRequest) {
  try {
    const cases = await getAllCases()
    return NextResponse.json({ success: true, cases, total: cases.length })
  } catch (err) {
    console.error('[GET /api/cases] Error:', err)
    return NextResponse.json(
      { success: false, error: 'Failed to retrieve cases.' },
      { status: 500 }
    )
  }
}
