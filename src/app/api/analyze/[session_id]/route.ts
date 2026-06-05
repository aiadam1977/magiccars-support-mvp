export const dynamic = 'force-dynamic'

/**
 * POST /api/analyze/:session_id
 *
 * Manually triggers or re-triggers visual analysis for a session.
 * Useful for the /demo page simulator and testing.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getSession, updateSession } from '@/lib/db'
import { runAnalysis } from '@/lib/analysis'

export const runtime = 'nodejs'

export async function POST(
  req: NextRequest,
  { params }: { params: { session_id: string } }
) {
  try {
    const { session_id } = params

    const session = await getSession(session_id)
    if (!session) {
      return NextResponse.json({ success: false, error: 'Session not found.' }, { status: 404 })
    }

    if (session.status === 'pending') {
      return NextResponse.json(
        { success: false, error: 'No upload found for this session yet.' },
        { status: 400 }
      )
    }

    // Allow re-analysis even if already complete (for demo)
    await updateSession(session_id, { status: 'analyzing' })

    const analysis = await runAnalysis({
      fileUrl: session.file_path || '',
      fileType: session.file_type || 'image/jpeg',
      issueType: session.issue_type,
      issueDescription: session.issue_description,
      note: session.note,
    })

    await updateSession(session_id, { status: 'complete', analysis })

    return NextResponse.json({
      success: true,
      session_id,
      analysis_status: 'complete',
      ...analysis,
    })
  } catch (err) {
    console.error('[analyze] Error:', err)
    await updateSession(params.session_id, { status: 'error' })
    return NextResponse.json(
      { success: false, error: 'Analysis failed. Please try again.' },
      { status: 500 }
    )
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: { session_id: string } }
) {
  const { session_id } = params
  const session = await getSession(session_id)

  if (!session) {
    return NextResponse.json({ success: false, error: 'Session not found.' }, { status: 404 })
  }

  return NextResponse.json({
    success: true,
    session_id,
    status: session.status,
    analysis: session.analysis || null,
  })
}
