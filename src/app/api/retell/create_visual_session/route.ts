/**
 * POST /api/retell/create_visual_session
 *
 * Called by Retell AI when the agent wants the caller to upload a photo or video.
 * Creates a visual diagnostic session and sends the upload link via Twilio SMS.
 *
 * Phone number resolution order:
 *   1. caller_phone parameter (if Harold passes it)
 *   2. Retell GET /get-call/{call_id} → from_number  (fallback — never relies on LLM)
 */

import { NextRequest, NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'
import { createSession, VisualSession } from '@/lib/db'

async function resolveCallerPhone(
  caller_phone: string,
  call_id: string
): Promise<string> {
  if (caller_phone) return caller_phone

  if (!call_id) return ''

  const retellKey = process.env.RETELL_API_KEY
  if (!retellKey) {
    console.warn('[create_visual_session] RETELL_API_KEY not set — cannot resolve from_number')
    return ''
  }

  try {
    const res = await fetch(`https://api.retellai.com/get-call/${call_id}`, {
      headers: { Authorization: `Bearer ${retellKey}` },
    })
    if (!res.ok) {
      console.warn('[create_visual_session] Retell get-call failed:', res.status)
      return ''
    }
    const data = await res.json() as { from_number?: string }
    return data.from_number ?? ''
  } catch (err) {
    console.error('[create_visual_session] Error fetching call from Retell:', err)
    return ''
  }
}

async function sendSms(to: string, body: string): Promise<{ success: boolean; error?: string }> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID
  const authToken = process.env.TWILIO_AUTH_TOKEN
  const fromNumber = process.env.TWILIO_FROM_NUMBER

  if (!accountSid || !authToken || !fromNumber) {
    console.warn('[create_visual_session] Twilio credentials not configured — SMS not sent')
    return { success: false, error: 'Twilio credentials not configured' }
  }

  const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`
  const credentials = Buffer.from(`${accountSid}:${authToken}`).toString('base64')
  const params = new URLSearchParams({ To: to, From: fromNumber, Body: body })

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  })

  if (!response.ok) {
    const errorBody = await response.text()
    console.error('[create_visual_session] Twilio error:', response.status, errorBody)
    return { success: false, error: `Twilio ${response.status}: ${errorBody}` }
  }

  return { success: true }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    const {
      call_id = '',
      caller_phone: raw_phone = '',
      caller_email = '',
      caller_name = 'Unknown Caller',
      vehicle_id = 'magiccars-12v-2wd-jeep',
      vehicle_year = '2024',
      vehicle_make = 'Magic Cars',
      vehicle_model = '12V 2WD Ride-On Jeep',
      issue_type = 'general',
      issue_description = '',
    } = body

    // Always resolve the phone — falls back to Retell API if LLM didn't pass it
    const caller_phone = await resolveCallerPhone(raw_phone, call_id)

    const session_id = uuidv4()
    const base_url = process.env.APP_BASE_URL || 'https://magiccars-support-mvp.vercel.app'
    const upload_url = `${base_url}/upload/${session_id}`
    const now = new Date().toISOString()

    const session: VisualSession = {
      session_id,
      call_id,
      caller_phone,
      caller_name,
      vehicle_id,
      vehicle_year,
      vehicle_make,
      vehicle_model,
      issue_type,
      issue_description,
      status: 'pending',
      upload_url,
      created_at: now,
      updated_at: now,
    }

    await createSession(session)

    // Send the upload link via Twilio SMS
    let sms_sent = false
    let sms_error: string | undefined

    if (caller_phone) {
      const firstName = caller_name.split(' ')[0] || caller_name
      const message =
        `Hi ${firstName}, here is your MagicCars diagnostic upload link. ` +
        `Please open it and upload a photo or short video of the issue so Harold can analyze it right away:\n\n${upload_url}`

      const smsResult = await sendSms(caller_phone, message)
      sms_sent = smsResult.success
      sms_error = smsResult.error
    } else {
      console.warn('[create_visual_session] No caller_phone resolved — SMS skipped')
    }

    void caller_email // not used for SMS delivery

    return NextResponse.json({
      success: true,
      session_id,
      upload_url,
      sms_sent,
      ...(sms_error && { sms_error }),
      message: sms_sent
        ? `Upload link sent via SMS to ${caller_phone}.`
        : caller_phone
          ? `Upload link created. SMS failed: ${sms_error ?? 'unknown error'}.`
          : `Upload link created. SMS skipped — phone number not available.`,
    })
  } catch (err) {
    console.error('[create_visual_session] Error:', err)
    return NextResponse.json(
      { success: false, error: 'Failed to create visual session.' },
      { status: 500 }
    )
  }
}
