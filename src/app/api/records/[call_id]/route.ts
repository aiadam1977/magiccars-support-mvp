export const dynamic = 'force-dynamic'

/**
 * DELETE /api/records/:call_id
 *
 * Deletes a call-meta record and its linked service case (if any).
 * Accepts an optional ?case_id= query param so the caller doesn't have to
 * look the case up separately — but will also find it from the case index
 * if not provided.
 */

import { NextRequest, NextResponse } from 'next/server'
import { deleteCallMeta, deleteCase, getAllCases } from '@/lib/db'

export async function DELETE(
  req: NextRequest,
  { params }: { params: { call_id: string } }
) {
  try {
    const { call_id } = params
    const { searchParams } = new URL(req.url)
    const hintCaseId = searchParams.get('case_id') || undefined

    // Delete the call-meta record
    const callDeleted = await deleteCallMeta(call_id)

    // Delete the linked case — use hint first, then scan case index
    let caseDeleted = false
    if (hintCaseId) {
      caseDeleted = await deleteCase(hintCaseId)
    } else if (call_id) {
      const cases = await getAllCases()
      const linked = cases.find(c => c.call_id === call_id)
      if (linked) caseDeleted = await deleteCase(linked.case_id)
    }

    if (!callDeleted && !caseDeleted) {
      return NextResponse.json(
        { success: false, error: 'Record not found.' },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true, call_id, case_deleted: caseDeleted })
  } catch (err) {
    console.error('[DELETE /api/records/:call_id] Error:', err)
    return NextResponse.json(
      { success: false, error: 'Failed to delete record.' },
      { status: 500 }
    )
  }
}
