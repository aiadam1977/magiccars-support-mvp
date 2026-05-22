/**
 * POST /api/retell/create_visual_session
 *
 * Called by Retell AI when the agent wants the caller to upload a photo or video.
 * Creates a visual diagnostic session and emails the secure upload link to the caller.
 */

import { NextRequest, NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'
import { createSession, VisualSession } from '@/lib/db'
import { sendEmail } from '@/lib/email'

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

    // Send the upload link via email if an address was provided
    let email_sent = false
    if (caller_email) {
      try {
        const firstName = caller_name.split(' ')[0] || caller_name
        const htmlBody = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #cc0000;">MagicCars Visual Diagnostic</h2>
            <p>Hi ${firstName},</p>
            <p>Harold from MagicCars Technical Support has created a secure upload link for you.
               Please use the button below to upload a photo or short video of your vehicle issue so our system can analyze it right away.</p>
            <div style="text-align: center; margin: 32px 0;">
              <a href="${upload_url}"
                 style="background: #cc0000; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-size: 16px; font-weight: bold;">
                Upload Photo / Video
              </a>
            </div>
            <p style="color: #666; font-size: 13px;">Or copy this link into your browser:<br>
              <a href="${upload_url}" style="color: #cc0000;">${upload_url}</a>
            </p>
            <p style="color: #666; font-size: 12px;">This link is unique to your support session and expires after your call.</p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;">
            <p style="color: #999; font-size: 11px;">MagicCars Technical Support</p>
          </div>
        `
        await sendEmail(
          caller_email,
          'MagicCars — Your Diagnostic Upload Link',
          htmlBody,
          'MagicCars Support'
        )
        email_sent = true
      } catch (emailErr) {
        // Non-fatal — session is still created, agent can read the URL aloud as fallback
        console.error('[create_visual_session] Email send failed:', emailErr)
      }
    }

    return NextResponse.json({
      success: true,
      session_id,
      upload_url,
      email_sent,
      message: email_sent
        ? `Upload link emailed to ${caller_email}. Caller should check their inbox.`
        : 'Upload link created. No email address provided — read the link to the caller or have them check their inbox if email was collected.',
    })
  } catch (err) {
    console.error('[create_visual_session] Error:', err)
    return NextResponse.json(
      { success: false, error: 'Failed to create visual session.' },
      { status: 500 }
    )
  }
}
