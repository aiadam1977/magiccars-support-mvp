/**
 * POST /api/retell/get_visual_analysis
 *
 * Called by Retell AI after the caller uploads media.
 * Returns the analysis status and results when ready.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getSession, getSessionByCallId } from '@/lib/db'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { session_id, call_id } = body

    if (!session_id && !call_id) {
      return NextResponse.json(
        { success: false, error: 'session_id or call_id is required.' },
        { status: 400 }
      )
    }

    // Prefer session_id; fall back to call_id index if the LLM dropped session_id
    const session = session_id
      ? await getSession(session_id)
      : await getSessionByCallId(call_id)

    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Session not found.' },
        { status: 404 }
      )
    }

    if (session.status === 'pending') {
      return NextResponse.json({
        success: true,
        status: 'waiting_for_upload',
        message: 'No upload received yet. Still waiting for the caller to send a photo or video.',
      })
    }

    if (session.status === 'uploaded' || session.status === 'analyzing') {
      return NextResponse.json({
        success: true,
        status: 'analysis_pending',
        message: 'Upload received. Analysis is still processing — check back in a moment.',
      })
    }

    if (session.status === 'error') {
      return NextResponse.json({
        success: false,
        status: 'error',
        message:
          'Analysis encountered an error. Please ask the caller to re-upload or escalate to a specialist.',
      })
    }

    if (session.status === 'complete' && session.analysis) {
      const a = session.analysis
      return NextResponse.json({
        success: true,
        status: 'complete',
        session_id,
        visual_summary: a.visual_summary,
        likely_issue: a.likely_issue,
        confidence_level: a.confidence_level,
        safe_owner_steps: a.safe_owner_steps,
        do_not_do: a.do_not_do,
        escalation_required: a.escalation_required,
        recommended_route: a.recommended_route,
        service_case_summary: a.service_case_summary,
      })
    }

    return NextResponse.json({
      success: true,
      status: 'waiting_for_upload',
      message: 'Waiting for upload.',
    })
  } catch (err) {
    console.error('[get_visual_analysis] Error:', err)
    return NextResponse.json(
      { success: false, error: 'Failed to retrieve analysis.' },
      { status: 500 }
    )
  }
}
