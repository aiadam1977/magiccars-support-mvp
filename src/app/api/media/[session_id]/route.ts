export const dynamic = 'force-dynamic'

/**
 * GET /api/media/:session_id
 *
 * Proxy endpoint for serving private Vercel Blob media.
 * Fetches the file using the server-side BLOB_READ_WRITE_TOKEN
 * and streams it to the browser, so the case detail page can
 * display uploaded images/videos without exposing the blob token.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/db'

export const runtime = 'nodejs'

export async function GET(
  req: NextRequest,
  { params }: { params: { session_id: string } }
) {
  const { session_id } = params

  const session = await getSession(session_id)
  if (!session || !session.file_path) {
    return NextResponse.json({ error: 'Not found.' }, { status: 404 })
  }

  const token = process.env.BLOB_READ_WRITE_TOKEN
  if (!token) {
    return NextResponse.json({ error: 'Blob token not configured.' }, { status: 500 })
  }

  try {
    const upstream = await fetch(session.file_path, {
      headers: { Authorization: `Bearer ${token}` },
    })

    if (!upstream.ok) {
      return NextResponse.json(
        { error: `Blob fetch failed: ${upstream.status}` },
        { status: upstream.status }
      )
    }

    const contentType = upstream.headers.get('content-type') || session.file_type || 'application/octet-stream'
    const body = await upstream.arrayBuffer()

    return new NextResponse(body, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'private, max-age=3600',
      },
    })
  } catch (err) {
    console.error(`[media] Proxy failed for session ${session_id}:`, err)
    return NextResponse.json({ error: 'Failed to serve media.' }, { status: 500 })
  }
}
