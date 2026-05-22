/**
 * GET /api/sessions
 *
 * Returns all visual sessions (for demo simulator).
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAllSessions } from '@/lib/db'

export async function GET(req: NextRequest) {
  try {
    const sessions = getAllSessions()
    return NextResponse.json({ success: true, sessions, total: sessions.length })
  } catch (err) {
    console.error('[GET /api/sessions] Error:', err)
    return NextResponse.json(
      { success: false, error: 'Failed to retrieve sessions.' },
      { status: 500 }
    )
  }
}
