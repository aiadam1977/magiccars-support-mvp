import { NextRequest, NextResponse } from 'next/server'
import { COOKIE_NAME, verifySessionToken } from '@/lib/auth'

/**
 * Paths that do NOT require authentication.
 *
 * - /login                    — login page itself
 * - /api/auth/*               — login / logout endpoints
 * - /api/retell/*             — Retell webhooks and tool calls (called by Retell, not the browser)
 * - /upload/*                 — caller-facing upload page (sent via SMS link)
 * - /api/upload/*             — file upload endpoint (used by the upload page)
 * - /api/media/*              — serve uploaded media files
 */
function isPublicPath(pathname: string): boolean {
  return (
    pathname === '/login' ||
    pathname.startsWith('/api/auth/') ||
    pathname.startsWith('/api/retell/') ||
    pathname.startsWith('/upload/') ||
    pathname.startsWith('/api/upload/') ||
    pathname.startsWith('/api/media/')
  )
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Skip auth for public paths and Next.js internals
  if (isPublicPath(pathname)) return NextResponse.next()

  const token = req.cookies.get(COOKIE_NAME)?.value

  if (!token) {
    const loginUrl = new URL('/login', req.url)
    loginUrl.searchParams.set('next', pathname)
    return NextResponse.redirect(loginUrl)
  }

  const email = await verifySessionToken(token)
  if (!email) {
    // Token invalid or expired — clear the stale cookie and redirect
    const loginUrl = new URL('/login', req.url)
    const res = NextResponse.redirect(loginUrl)
    res.cookies.delete(COOKIE_NAME)
    return res
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    // Run on everything except static assets and Next.js internals
    '/((?!_next/static|_next/image|favicon.ico|.*\\.png$|.*\\.jpg$|.*\\.svg$).*)',
  ],
}
