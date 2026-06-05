export const dynamic = 'force-dynamic'

/**
 * GET  /api/cases/:case_id  — Fetch a single case with call-meta enrichment.
 * PATCH /api/cases/:case_id  — Update editable fields (caller info, vehicle, issue, status).
 */

import { NextRequest, NextResponse } from 'next/server'
import { getCase, getCallMeta, updateCase, deleteCase, addCaseActivity, type CaseEditableFields } from '@/lib/db'

export async function GET(
  req: NextRequest,
  { params }: { params: { case_id: string } }
) {
  try {
    const { case_id } = params
    const serviceCase = await getCase(case_id)

    if (!serviceCase) {
      return NextResponse.json({ success: false, error: 'Case not found.' }, { status: 404 })
    }

    // Always fetch the freshest call-meta from KV rather than relying on the
    // snapshot stored on the case.  The case's call_metadata can be stale if
    // it was written by call_analyzed before call_ended had a chance to store
    // the recording URL and transcript.
    let enriched = serviceCase
    if (serviceCase.call_id) {
      const meta = await getCallMeta(serviceCase.call_id)
      if (meta) {
        enriched = { ...serviceCase, call_metadata: meta }
      }
    }

    // Surface custom_analysis_data at the top level for the detail page
    const callMeta = enriched.call_metadata as (typeof enriched.call_metadata & { custom_analysis_data?: Record<string, string> }) | undefined
    return NextResponse.json({
      success: true,
      case: {
        ...enriched,
        from_number: callMeta?.from_number,
        custom_analysis_data: callMeta?.custom_analysis_data,
      },
    })
  } catch (err) {
    console.error('[GET /api/cases/:case_id] Error:', err)
    return NextResponse.json(
      { success: false, error: 'Failed to retrieve case.' },
      { status: 500 }
    )
  }
}

const VALID_STATUSES = ['open', 'assigned', 'resolved'] as const
const EDITABLE_KEYS: (keyof CaseEditableFields)[] = [
  'caller_name',
  'caller_phone',
  'caller_email',
  'vehicle',
  'issue_description',
  'escalation_reason',
  'status',
]

export async function PATCH(
  req: NextRequest,
  { params }: { params: { case_id: string } }
) {
  try {
    const { case_id } = params
    const body: Record<string, unknown> = await req.json()

    // Only allow whitelisted fields
    const updates: Partial<CaseEditableFields> = {}
    for (const key of EDITABLE_KEYS) {
      if (key in body && body[key] !== undefined) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (updates as any)[key] = body[key]
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ success: false, error: 'No valid fields to update.' }, { status: 400 })
    }

    if (updates.status && !(VALID_STATUSES as readonly string[]).includes(updates.status)) {
      return NextResponse.json({ success: false, error: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}` }, { status: 400 })
    }

    // Capture old status before update (for activity log)
    const existing = await getCase(case_id)
    const oldStatus = existing?.status

    const updated = await updateCase(case_id, updates)
    if (!updated) {
      return NextResponse.json({ success: false, error: 'Case not found.' }, { status: 404 })
    }

    // Log status changes to the activity timeline
    if (updates.status && updates.status !== oldStatus) {
      const STATUS_LABEL: Record<string, string> = {
        open: 'Open', assigned: 'Assigned', resolved: 'Resolved',
      }
      await addCaseActivity(case_id, {
        type: 'status_changed',
        timestamp: new Date().toISOString(),
        label: `Status changed to ${STATUS_LABEL[updates.status] ?? updates.status}`,
        detail: oldStatus ? `was ${STATUS_LABEL[oldStatus] ?? oldStatus}` : undefined,
      })
    }

    // Re-fetch so the response includes the new activity entry
    const fresh = await getCase(case_id)
    return NextResponse.json({ success: true, case: fresh ?? updated })
  } catch (err) {
    console.error('[PATCH /api/cases/:case_id] Error:', err)
    return NextResponse.json(
      { success: false, error: 'Failed to update case.' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { case_id: string } }
) {
  try {
    const { case_id } = params
    const deleted = await deleteCase(case_id)
    if (!deleted) {
      return NextResponse.json({ success: false, error: 'Case not found.' }, { status: 404 })
    }
    return NextResponse.json({ success: true, case_id })
  } catch (err) {
    console.error('[DELETE /api/cases/:case_id] Error:', err)
    return NextResponse.json({ success: false, error: 'Failed to delete case.' }, { status: 500 })
  }
}
