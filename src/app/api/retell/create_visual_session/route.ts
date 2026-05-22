/**
 * POST /api/retell/create_visual_session
 *
 * Called by Retell AI when the agent wants the caller to upload a photo or video.
 * Creates a visual diagnostic session and sends the upload link via Twilio SMS.
 *
 * Phone number resolution order:
 *   1. KV cache mc:call-phone:{call_id} — written by webhook on call_started
 *   2. Body param caller_phone — if LLM passed it
 *   3. Retell GET /v2/get-call/{call_id} → from_number — direct API lookup
 */

import { NextRequest, NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'
import { createSession, getCallPhone, getLastCallPhone, VisualSession } from '@/lib/db'

/** Returns true if the string is an uninterpolated Retell template like {{from_number}} */
function isTemplateLiteral(val: string): boolean {
  return /^\{\{.*\}\}$/.test(val.trim())
}

async function resolveCallerPhone(
  body_phone: string,
  call_id: string
): Promise<string> {
  // 1. KV by call_id — populated by webhook on call_started
  if (call_id) {
    const cached = await getCallPhone(call_id)
    if (cached) return cached
  }

  // 2. Body param — if LLM passed a real phone number
  if (body_phone && !isTemplateLiteral(body_phone)) return body_phone

  // 3. Last-call fallback — set by call_started webhook, TTL 30 min.
  //    Works reliably for a sequential support line even when Harold omits call_id.
  const last = await getLastCallPhone()
  if (last) return last

  return ''
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
    console.info('[create_visual_session] raw body:', JSON.stringify(body))

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
      debug_call_id: call_id || 'NOT_PROVIDED',
      debug_phone: caller_phone || 'NOT_RESOLVED',
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
