/**
 * POST /api/retell/create_visual_session
 *
 * Called by Retell AI when the agent wants the caller to upload a photo or video.
 * Creates a visual diagnostic session and returns a secure upload URL.
 */

import { NextRequest, NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'
import { createSession, VisualSession } from '@/lib/db'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    const {
      call_id = '',
      caller_phone = '',
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
    const proto = req.headers.get('x-forwarded-proto') || 'http'
    const host = req.headers.get('host') || 'localhost:3000'
    const base_url = process.env.APP_BASE_URL || `${proto}://${host}`
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

    return NextResponse.json({
      success: true,
      session_id,
      upload_url,
      message: 'Upload link created. Send this URL to the caller via SMS.',
    })
  } catch (err) {
    console.error('[create_visual_session] Error:', err)
    return NextResponse.json(
      { success: false, error: 'Failed to create visual session.' },
      { status: 500 }
    )
  }
}
