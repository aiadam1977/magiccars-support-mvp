/**
 * POST /api/upload/:session_id
 *
 * Receives photo or video upload from the caller.
 * Stores file locally and triggers background analysis.
 */

import { NextRequest, NextResponse } from 'next/server'
import path from 'path'
import fs from 'fs'
import { getSession, updateSession } from '@/lib/db'
import { runAnalysis } from '@/lib/analysis'

export const runtime = 'nodejs'

const ALLOWED_IMAGE_TYPES = [
  'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/heic',
]
const ALLOWED_VIDEO_TYPES = [
  'video/mp4', 'video/quicktime', 'video/mov', 'video/avi', 'video/webm', 'video/3gpp',
]
const MAX_FILE_SIZE = 100 * 1024 * 1024 // 100MB

export async function POST(
  req: NextRequest,
  { params }: { params: { session_id: string } }
) {
  try {
    const { session_id } = params

    const session = getSession(session_id)
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
    const file = formData.get('file') as File | null
    const note = formData.get('note') as string | null

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No file uploaded. Please include a file field.' },
        { status: 400 }
      )
    }

    const fileType = file.type || 'application/octet-stream'
    const isImage = ALLOWED_IMAGE_TYPES.includes(fileType)
    const isVideo = ALLOWED_VIDEO_TYPES.includes(fileType)

    if (!isImage && !isVideo) {
      return NextResponse.json(
        {
          success: false,
          error: `File type "${fileType}" is not supported. Please upload an image or short video.`,
        },
        { status: 415 }
      )
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { success: false, error: 'File exceeds 100MB limit.' },
        { status: 413 }
      )
    }

    // Save file to local storage
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', session_id)
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true })
    }

    const ext = file.name.split('.').pop() || (isImage ? 'jpg' : 'mp4')
    const fileName = `upload.${ext}`
    const filePath = path.join(uploadDir, fileName)

    const arrayBuffer = await file.arrayBuffer()
    fs.writeFileSync(filePath, Buffer.from(arrayBuffer))

    // Update session to uploaded status
    updateSession(session_id, {
      status: 'uploaded',
      file_path: filePath,
      file_name: fileName,
      file_type: fileType,
      note: note || undefined,
    })

    // Trigger analysis asynchronously (fire and forget for demo)
    triggerAnalysis(
      session_id,
      filePath,
      fileType,
      session.issue_type,
      session.issue_description,
      note || undefined
    )

    return NextResponse.json({
      success: true,
      session_id,
      message: 'Upload received. MagicCars Support is reviewing your media now.',
    })
  } catch (err) {
    console.error('[upload] Error:', err)
    return NextResponse.json(
      { success: false, error: 'Upload failed. Please try again.' },
      { status: 500 }
    )
  }
}

async function triggerAnalysis(
  session_id: string,
  filePath: string,
  fileType: string,
  issueType: string,
  issueDescription: string,
  note?: string
) {
  try {
    updateSession(session_id, { status: 'analyzing' })

    const analysis = await runAnalysis({ filePath, fileType, issueType, issueDescription, note })

    updateSession(session_id, { status: 'complete', analysis })
  } catch (err) {
    console.error(`[upload] Analysis failed for session ${session_id}:`, err)
    updateSession(session_id, { status: 'error' })
  }
}
