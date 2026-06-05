export const dynamic = 'force-dynamic'

/**
 * POST /api/upload/:session_id
 *
 * Receives one or more photos/videos from the caller (up to 5 files).
 * Files are uploaded to Vercel Blob and AI analysis runs across all images.
 *
 * FormData fields:
 *   file   — one File entry per upload (append multiple times for multi-upload)
 *   note   — optional text note from the caller
 */

import { NextRequest, NextResponse } from 'next/server'
import { put } from '@vercel/blob'
import { getSession, updateSession } from '@/lib/db'
import { runAnalysis } from '@/lib/analysis'

export const runtime = 'nodejs'

const ALLOWED_IMAGE_TYPES = [
  'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/heic',
]
const ALLOWED_VIDEO_TYPES = [
  'video/mp4', 'video/quicktime', 'video/mov', 'video/avi', 'video/webm', 'video/3gpp',
]
const MAX_FILE_SIZE   = 100 * 1024 * 1024 // 100 MB per file
const MAX_FILE_COUNT  = 5

export async function POST(
  req: NextRequest,
  { params }: { params: { session_id: string } }
) {
  try {
    const { session_id } = params

    const session = await getSession(session_id)
    if (!session) {
      return NextResponse.json({ success: false, error: 'Session not found.' }, { status: 404 })
    }
    if (session.status === 'complete') {
      return NextResponse.json(
        { success: false, error: 'This session already has an upload.' },
        { status: 409 }
      )
    }

    const formData = await req.formData()
    const rawFiles = formData.getAll('file') as File[]
    const note     = formData.get('note') as string | null

    if (rawFiles.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No files uploaded. Please include at least one file.' },
        { status: 400 }
      )
    }

    // Validate count
    const files = rawFiles.slice(0, MAX_FILE_COUNT)

    // Validate each file
    for (const file of files) {
      const ft = file.type || 'application/octet-stream'
      if (!ALLOWED_IMAGE_TYPES.includes(ft) && !ALLOWED_VIDEO_TYPES.includes(ft)) {
        return NextResponse.json(
          { success: false, error: `File type "${ft}" is not supported. Please upload images or short videos.` },
          { status: 415 }
        )
      }
      if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json(
          { success: false, error: `"${file.name}" exceeds the 100 MB limit.` },
          { status: 413 }
        )
      }
    }

    // ── Upload all files to Vercel Blob ──────────────────────────────────────
    const uploaded: Array<{ url: string; name: string; type: string }> = []

    await updateSession(session_id, { status: 'uploaded' })

    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      const ft   = file.type || 'application/octet-stream'
      const ext  = file.name.split('.').pop() || (ALLOWED_IMAGE_TYPES.includes(ft) ? 'jpg' : 'mp4')
      const fileName = files.length === 1 ? `upload.${ext}` : `upload_${i + 1}.${ext}`

      const arrayBuffer = await file.arrayBuffer()
      const blob = await put(
        `sessions/${session_id}/${fileName}`,
        Buffer.from(arrayBuffer),
        { access: 'private', token: process.env.BLOB_READ_WRITE_TOKEN }
      )

      uploaded.push({ url: blob.url, name: fileName, type: ft })
      console.info(`[upload] ${fileName} → ${blob.url}`)
    }

    // Persist primary file + all extras on the session
    const primary = uploaded[0]
    await updateSession(session_id, {
      file_path:  primary.url,
      file_name:  primary.name,
      file_type:  primary.type,
      note:       note || undefined,
    })

    // ── Run AI analysis on all images ────────────────────────────────────────
    await updateSession(session_id, { status: 'analyzing' })

    try {
      const analysis = await runAnalysis({
        fileUrl:              primary.url,
        fileType:             primary.type,
        issueType:            session.issue_type,
        issueDescription:     session.issue_description,
        note:                 note || undefined,
        additionalFileUrls:   uploaded.slice(1).map(u => ({ url: u.url, type: u.type })),
      })
      await updateSession(session_id, { status: 'complete', analysis })
    } catch (err) {
      console.error(`[upload] Analysis failed for session ${session_id}:`, err)
      await updateSession(session_id, { status: 'error' })
    }

    // Return caller info for the confirmation screen
    return NextResponse.json({
      success:      true,
      session_id,
      file_count:   uploaded.length,
      caller_name:  session.caller_name,
      vehicle:      [session.vehicle_year, session.vehicle_make, session.vehicle_model]
                      .filter(Boolean).join(' ') || undefined,
      message:      `${uploaded.length} file${uploaded.length !== 1 ? 's' : ''} received. MagicCars Support is reviewing your media now.`,
    })
  } catch (err) {
    const msg = err instanceof Error ? `${err.name}: ${err.message}` : String(err)
    console.error(`[upload] Error: ${msg}`)
    return NextResponse.json(
      { success: false, error: 'Upload failed. Please try again.' },
      { status: 500 }
    )
  }
}
