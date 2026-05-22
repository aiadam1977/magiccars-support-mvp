/**
 * POST /api/retell/create_service_case
 *
 * Called by Retell AI when the caller agrees to create a support case.
 * Stores case with full context, linked to the visual session.
 */

import { NextRequest, NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'
import { createCase, getSession, ServiceCase } from '@/lib/db'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    const {
      call_id = '',
      session_id = '',
      caller_name = 'Unknown Caller',
      caller_phone = '',
      vehicle = 'Magic Cars 12V 2WD Ride-On Jeep',
      issue_description = '',
      analysis_summary = '',
      recommended_route = 'human_support',
      escalation_reason = '',
    } = body

    const case_id = `MC-${Date.now().toString(36).toUpperCase()}`
    const base_url = process.env.APP_BASE_URL || 'http://localhost:3000'
    const case_url = `${base_url}/cases/${case_id}`
    const now = new Date().toISOString()

    // Pull analysis and media from session if available
    const session = session_id ? await getSession(session_id) : null

    const serviceCase: ServiceCase = {
      case_id,
      call_id,
      session_id,
      caller_name,
      caller_phone,
      vehicle,
      issue_description,
      analysis_summary,
      recommended_route,
      escalation_reason,
      analysis: session?.analysis,
      file_path: session?.file_path,
      file_name: session?.file_name,
      file_type: session?.file_type,
      status: 'open',
      created_at: now,
      updated_at: now,
    }

    await createCase(serviceCase)

    return NextResponse.json({
      success: true,
      case_id,
      case_url,
      message: `Support case ${case_id} created successfully. The case includes the visual evidence and AI analysis summary.`,
    })
  } catch (err) {
    console.error('[create_service_case] Error:', err)
    return NextResponse.json(
      { success: false, error: 'Failed to create support case.' },
      { status: 500 }
    )
  }
}
