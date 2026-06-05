/**
 * POST /api/retell/create_service_case
 *
 * Called by Retell AI when the caller agrees to create a support case.
 * Stores case with full context, linked to the visual session.
 */

import { NextRequest, NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'
import { createCase, getSession, ServiceCase, type CaseActivity } from '@/lib/db'
import { notifySlackNewCase } from '@/lib/slack'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    const {
      call_id = '',
      session_id = '',
      caller_name = 'Unknown Caller',
      caller_phone = '',
      caller_email = '',
      vehicle = 'Magic Cars 12V 2WD Ride-On Jeep',
      issue_description = '',
      analysis_summary = '',
      recommended_route = 'human_support',
      escalation_reason = '',
    } = body

    const case_id = `MC-${Date.now().toString(36).toUpperCase()}`
    const proto = req.headers.get('x-forwarded-proto') || 'http'
    const host = req.headers.get('host') || 'localhost:3000'
    const base_url = process.env.APP_BASE_URL || `${proto}://${host}`
    const case_url = `${base_url}/cases/${case_id}`
    const now = new Date().toISOString()

    // Pull analysis and media from session if available
    const session = session_id ? await getSession(session_id) : null

    const initialActivity: CaseActivity = {
      id: `act-${Date.now().toString(36)}`,
      type: 'case_created',
      timestamp: now,
      label: 'Case opened',
      detail: recommended_route !== 'human_support' ? recommended_route.replace(/_/g, ' ') : undefined,
    }

    const serviceCase: ServiceCase = {
      case_id,
      call_id,
      session_id,
      caller_name,
      caller_phone,
      ...(caller_email && { caller_email }),
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
      activity: [initialActivity],
      created_at: now,
      updated_at: now,
    }

    await createCase(serviceCase)

    // Fire-and-forget Slack notification (doesn't block the response)
    notifySlackNewCase({
      case_id,
      caller_name,
      caller_phone,
      vehicle,
      issue_description,
      recommended_route,
      is_safety: recommended_route === 'safety_stop',
      case_url,
    }).catch(() => {/* silent */})

    // Build customer-facing tracking URL
    const tracking_url = `${base_url}/track/${case_id}`

    // SMS the tracking link to the caller if we have their phone number
    if (caller_phone) {
      try {
        const accountSid = process.env.TWILIO_ACCOUNT_SID
        const authToken  = process.env.TWILIO_AUTH_TOKEN
        const fromNumber = process.env.TWILIO_PHONE_NUMBER
        if (accountSid && authToken && fromNumber) {
          const body = `MagicCars: Your support case ${case_id} has been created. Track your status here: ${tracking_url}`
          const creds = Buffer.from(`${accountSid}:${authToken}`).toString('base64')
          await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
            method: 'POST',
            headers: { Authorization: `Basic ${creds}`, 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({ To: caller_phone, From: fromNumber, Body: body }),
          })
        }
      } catch { /* non-blocking */ }
    }

    return NextResponse.json({
      success: true,
      case_id,
      case_url,
      tracking_url,
      message: `Support case ${case_id} created successfully. Tracking link sent to caller.`,
    })
  } catch (err) {
    console.error('[create_service_case] Error:', err)
    return NextResponse.json(
      { success: false, error: 'Failed to create support case.' },
      { status: 500 }
    )
  }
}
