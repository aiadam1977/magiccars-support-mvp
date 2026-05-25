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
  /** Boolean flag from Retell — true if the call was completed successfully */
  call_successful?: boolean
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

    // ─── call_ended ────────────────────────────────────────────────────────────
    // Retell fires this when the call hangs up.  Carries recording URL,
    // transcript, duration, timestamps, and from_number.  The call_analysis
    // block is typically absent or minimal here — full analysis arrives later
    // on call_analyzed.
    if (payload.event === 'call_ended') {
      console.info(`[webhook] call_ended — call_id: ${call.call_id}`)
      console.info(`[webhook] call_ended full payload: ${JSON.stringify(payload)}`)

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
        ...(call.retell_llm_dynamic_variables && {
          dynamic_variables: call.retell_llm_dynamic_variables,
        }),
        // call_analysis fields may arrive early on call_ended — capture if present
        ...(call.call_analysis?.user_sentiment && { user_sentiment: call.call_analysis.user_sentiment }),
        ...(call.call_analysis?.call_summary && { call_summary: call.call_analysis.call_summary }),
        ...(call.call_analysis?.call_completion_rating && {
          call_completion_rating: call.call_analysis.call_completion_rating,
        }),
        ...(call.call_analysis?.call_successful !== undefined && {
          call_successful: Boolean(call.call_analysis.call_successful),
        }),
      }

      const meta = await upsertCallMeta(call.call_id, metaUpdate)
      console.info(`[webhook] call_ended stored fields: ${Object.keys(meta).join(', ')}`)

      // Also push the fresh meta onto any matching case so recording + transcript
      // are immediately visible without waiting for call_analyzed.
      let matched = false
      const allCases = await getAllCases()
      const matchedCase = allCases.find(c => c.call_id === call.call_id)
      if (matchedCase) {
        const existing = await getCase(matchedCase.case_id)
        if (existing) {
          await kv.set(`mc:case:${matchedCase.case_id}`, {
            ...existing,
            call_metadata: meta,
            updated_at: new Date().toISOString(),
          })
          matched = true
        }
      }

      return NextResponse.json({
        success: true,
        event: 'call_ended',
        call_id: call.call_id,
        matched_case: matched ? matchedCase?.case_id : null,
        fields_stored: Object.keys(meta).filter(k => k !== 'call_id' && k !== 'stored_at'),
      })
    }

    // ─── call_analyzed ──────────────────────────────────────────────────────────
    // Retell fires this 10–60 s after call_ended once its AI analysis completes.
    // This is the authoritative source for call_summary, user_sentiment,
    // call_successful, and all custom_analysis_data (post_call_analysis_data).
    if (payload.event === 'call_analyzed') {
      console.info(`[webhook] call_analyzed — call_id: ${call.call_id}`)
      console.info(`[webhook] call_analyzed full payload: ${JSON.stringify(payload)}`)

      // Normalise custom_analysis_data to Record<string,string>.
      // Only include if at least one field has a non-empty value.
      const rawCustom = call.call_analysis?.custom_analysis_data
      let custom_analysis_data: Record<string, string> | undefined

      if (rawCustom && typeof rawCustom === 'object' && !Array.isArray(rawCustom)) {
        const normalised = Object.fromEntries(
          Object.entries(rawCustom)
            .filter(([, v]) => v !== null && v !== undefined && String(v).trim() !== '')
            .map(([k, v]) => [k, String(v)])
        )
        if (Object.keys(normalised).length > 0) {
          custom_analysis_data = normalised
        }
      }

      console.info(`[webhook] call_analyzed — custom_analysis_data keys: ${
        custom_analysis_data ? Object.keys(custom_analysis_data).join(', ') : 'NONE'
      }`)

      const metaUpdate: Partial<CallMetadata> = {
        stored_at: new Date().toISOString(),
        // call_analyzed also re-sends call fields — capture anything useful
        ...(call.from_number && { from_number: call.from_number }),
        ...(call.recording_url && { recording_url: call.recording_url }),
        ...(call.transcript && { transcript: call.transcript }),
        ...(call.duration_ms !== undefined && { duration_ms: call.duration_ms }),
        ...(call.start_timestamp !== undefined && { start_timestamp: call.start_timestamp }),
        ...(call.end_timestamp !== undefined && { end_timestamp: call.end_timestamp }),
        // Analysis fields
        ...(call.call_analysis?.user_sentiment && { user_sentiment: call.call_analysis.user_sentiment }),
        ...(call.call_analysis?.call_summary && { call_summary: call.call_analysis.call_summary }),
        ...(call.call_analysis?.call_completion_rating && {
          call_completion_rating: call.call_analysis.call_completion_rating,
        }),
        ...(call.call_analysis?.call_successful !== undefined && {
          call_successful: Boolean(call.call_analysis.call_successful),
        }),
        ...(custom_analysis_data && { custom_analysis_data }),
      }

      const meta = await upsertCallMeta(call.call_id, metaUpdate)
      console.info(`[webhook] call_analyzed stored fields: ${Object.keys(meta).join(', ')}`)
      if (meta.custom_analysis_data) {
        console.info(`[webhook] call_analyzed custom_analysis_data: ${JSON.stringify(meta.custom_analysis_data)}`)
      }

      // Attach updated meta to any matching case record
      let matched = false
      const cases = await getAllCases()
      const matchedCase = cases.find(c => c.call_id === call.call_id)

      if (matchedCase) {
        const existing = await getCase(matchedCase.case_id)
        if (existing) {
          await kv.set(`mc:case:${matchedCase.case_id}`, {
            ...existing,
            call_metadata: meta,
            updated_at: new Date().toISOString(),
          })
          matched = true
        }
      }

      return NextResponse.json({
        success: true,
        event: 'call_analyzed',
        call_id: call.call_id,
        matched_case: matched ? matchedCase?.case_id : null,
        custom_analysis_keys: custom_analysis_data ? Object.keys(custom_analysis_data) : [],
        fields_stored: Object.keys(meta).filter(k => k !== 'call_id' && k !== 'stored_at'),
      })
    }

    // Unknown event — skip
    return NextResponse.json({ success: true, skipped: true, reason: `Ignored event: ${payload.event}` })
  } catch (err) {
    console.error('[POST /api/retell/webhook]', err)
    return NextResponse.json({ success: false, error: 'Webhook processing failed.' }, { status: 500 })
  }
}
