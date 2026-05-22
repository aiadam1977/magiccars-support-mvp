/**
 * POST /api/retell/create_visual_session
 *
 * Called by Retell AI when the agent wants the caller to upload a photo or video.
 * Creates a visual diagnostic session and sends the upload link via Twilio SMS.
 */

import { NextRequest, NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'
import { createSession, VisualSession } from '@/lib/db'

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
      caller_phone = '',
      caller_email = '',
      caller_name = 'Unknown Caller',
      vehicle_id = 'magiccars-12v-2wd-jeep',
      vehicle_year = '2024',
      vehicle_make = 'Magic Cars',
      vehicle_model = '12V 2WD Ride-On Jeep',
      issue_type = 'general',
      issue_description = '',
    } = body

    if (!caller_phone && !call_id) {
      return NextResponse.json(
        { success: false, error: 'caller_phone or call_id is required.' },
        { status: 400 }
      )
    }

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

    const smsTarget = caller_phone || caller_email // fall back to email field if phone was passed there
    if (caller_phone) {
      const firstName = caller_name.split(' ')[0] || caller_name
      const message = `Hi ${firstName}, here is your MagicCars diagnostic upload link. Please open it and upload a photo or short video of the issue so Harold can analyze it right away:\n\n${upload_url}`

      const smsResult = await sendSms(caller_phone, message)
      sms_sent = smsResult.success
      sms_error = smsResult.error
    }

    void smsTarget // suppress unused warning

    return NextResponse.json({
      success: true,
      session_id,
      upload_url,
      sms_sent,
      ...(sms_error && { sms_error }),
      message: sms_sent
        ? `Upload link sent via SMS to ${caller_phone}.`
        : `Upload link created. SMS not sent${sms_error ? ': ' + sms_error : ' — Twilio not configured'}.`,
    })
  } catch (err) {
    console.error('[create_visual_session] Error:', err)
    return NextResponse.json(
      { success: false, error: 'Failed to create visual session.' },
      { status: 500 }
    )
  }
}
