/**
 * POST /api/retell/webhook
 *
 * Receives post-call events from Retell AI and stores call metadata
 * (recording URL, transcript, duration, sentiment, etc.) on the matching case.
 *
 * Configure in Retell dashboard:
 *   Agent → Webhook URL → https://YOUR-DOMAIN.vercel.app/api/retell/webhook
 *
 * Retell sends this on "call_ended" and "call_analyzed" events.
 * We process both and merge whichever fields are present.
 *
 * Security: Set RETELL_WEBHOOK_SECRET in Vercel env vars.
 * Retell signs requests with X-Retell-Signature (HMAC-SHA256).
 * Enable signature verification by uncommenting the block below.
 */

import { NextRequest, NextResponse } from 'next/server'
import {
  getAllCases,
  getCase,
  saveCallPhone,
  initCallMeta,
  upsertCallMeta,
  type CallMetadata,
} from '@/lib/db'
import { createClient } from '@vercel/kv'

// Direct KV client for case updates that aren't yet abstracted in db.ts.
const kv = createClient({
  url: process.env.KV_REST_API_URL!,
  token: process.env.KV_REST_API_TOKEN!,
  cache: 'no-store',
  readYourWrites: true,
  enableAutoPipelining: false,
})

// ─── Retell Webhook Payload Types ─────────────────────────────────────────────

interface RetellTranscriptWord {
  word: string
  start: number
  end: number
}

interface RetellTranscriptUtterance {
  role: 'agent' | 'user'
  content: string
  words: RetellTranscriptWord[]
}

interface RetellCallAnalysis {
  call_summary?: string
  user_sentiment?: 'Positive' | 'Negative' | 'Neutral' | 'Unknown'
  agent_sentiment?: string
  call_completion_rating?: string
  custom_analysis_data?: Record<string, unknown>
}

interface RetellCallObject {
  call_id: string
  call_type?: string
  agent_id?: string
  call_status?: string
  from_number?: string
  to_number?: string
  start_timestamp?: number
  end_timestamp?: number
  duration_ms?: number
  recording_url?: string
  public_log_url?: string
  transcript?: string
  transcript_object?: RetellTranscriptUtterance[]
  call_analysis?: RetellCallAnalysis
  retell_llm_dynamic_variables?: Record<string, unknown>
  metadata?: Record<string, unknown>
}

interface RetellWebhookPayload {
  event: string
  call: RetellCallObject
}

// ─── Signature verification (optional but recommended) ────────────────────────

// async function verifySignature(req: NextRequest, rawBody: string): Promise<boolean> {
//   const secret = process.env.RETELL_WEBHOOK_SECRET
//   if (!secret) return true // skip verification if not configured
//   const signature = req.headers.get('x-retell-signature') ?? ''
//   const encoder = new TextEncoder()
//   const key = await crypto.subtle.importKey(
//     'raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
//   )
//   const sigBuffer = await crypto.subtle.sign('HMAC', key, encoder.encode(rawBody))
//   const expected = Buffer.from(sigBuffer).toString('hex')
//   return signature === expected
// }

export async function POST(req: NextRequest) {
  let rawBody = ''
  try {
    rawBody = await req.text()
    const payload = JSON.parse(rawBody) as RetellWebhookPayload

    const call = payload.call
    if (!call?.call_id) {
      return NextResponse.json({ success: false, error: 'No call_id in payload.' }, { status: 400 })
    }

    // On call_started: cache the caller's phone number and initialise the call record.
    if (payload.event === 'call_started') {
      console.info(`[webhook] call_started full payload: ${JSON.stringify(payload)}`)
      const phone = call.from_number ?? ''
      if (phone) {
        await saveCallPhone(call.call_id, phone)
        console.info(`[webhook] call_started — cached phone ${phone} for call ${call.call_id}`)
      } else {
        console.warn(`[webhook] call_started — no from_number in payload for call ${call.call_id}`)
      }
      // Create the initial call-meta record so every call appears in the All Calls view,
      // even if the post-call webhook never fires.
      await initCallMeta(call.call_id, phone)
      return NextResponse.json({ success: true, event: 'call_started', call_id: call.call_id, phone_cached: !!phone })
    }

    // Only process post-call events beyond this point
    if (payload.event !== 'call_ended' && payload.event !== 'call_analyzed') {
      return NextResponse.json({ success: true, skipped: true, reason: `Ignored event: ${payload.event}` })
    }

    // Extract custom_analysis_data (post_call_analysis_data fields from Harold LLM config)
    const rawCustom = call.call_analysis?.custom_analysis_data
    const custom_analysis_data: Record<string, string> | undefined =
      rawCustom && typeof rawCustom === 'object' && !Array.isArray(rawCustom)
        ? Object.fromEntries(
            Object.entries(rawCustom).map(([k, v]) => [k, String(v ?? '')])
          )
        : undefined

    // Build the metadata update — upsertCallMeta deep-merges with the existing record
    // so from_number set during call_started is preserved.
    const metaUpdate: Partial<CallMetadata> = {
      stored_at: new Date().toISOString(),
      ...(call.from_number && { from_number: call.from_number }),
      ...(call.recording_url && { recording_url: call.recording_url }),
      ...(call.public_log_url && { public_log_url: call.public_log_url }),
      ...(call.transcript && { transcript: call.transcript }),
      ...(call.transcript_object && { transcript_object: call.transcript_object }),
      ...(call.duration_ms !== undefined && { duration_ms: call.duration_ms }),
      ...(call.start_timestamp !== undefined && { start_timestamp: call.start_timestamp }),
      ...(call.end_timestamp !== undefined && { end_timestamp: call.end_timestamp }),
      ...(call.call_analysis?.user_sentiment && { user_sentiment: call.call_analysis.user_sentiment }),
      ...(call.call_analysis?.call_summary && { call_summary: call.call_analysis.call_summary }),
      ...(call.call_analysis?.call_completion_rating && {
        call_completion_rating: call.call_analysis.call_completion_rating,
      }),
      ...(call.retell_llm_dynamic_variables && {
        dynamic_variables: call.retell_llm_dynamic_variables,
      }),
      ...(custom_analysis_data && { custom_analysis_data }),
    }

    const meta = await upsertCallMeta(call.call_id, metaUpdate)

    // Attempt to match this call to a case by call_id and attach the metadata
    let matched = false
    const cases = await getAllCases()
    const matchedCase = cases.find(c => c.call_id === call.call_id)

    if (matchedCase) {
      // Merge metadata onto the case record
      const existing = await getCase(matchedCase.case_id)
      if (existing) {
        const updated = {
          ...existing,
          call_metadata: meta,
          updated_at: new Date().toISOString(),
        }
        await kv.set(`mc:case:${matchedCase.case_id}`, updated)
        matched = true
      }
    }

    return NextResponse.json({
      success: true,
      event: payload.event,
      call_id: call.call_id,
      matched_case: matched ? matchedCase?.case_id : null,
      fields_stored: Object.keys(meta).filter(k => k !== 'call_id' && k !== 'stored_at'),
    })
  } catch (err) {
    console.error('[POST /api/retell/webhook]', err)
    return NextResponse.json({ success: false, error: 'Webhook processing failed.' }, { status: 500 })
  }
}
