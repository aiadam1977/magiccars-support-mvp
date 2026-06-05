import { NextRequest, NextResponse } from 'next/server'
import { getAdminCredentials, createSessionToken, COOKIE_NAME } from '@/lib/auth'
import { getUserByEmail } from '@/lib/db'

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json() as { email: string; password: string }
    const normalizedEmail = email?.trim().toLowerCase() ?? ''

    // Check master admin first
    const admin = getAdminCredentials()
    if (normalizedEmail === admin.email.toLowerCase() && password === admin.password) {
      const token = await createSessionToken(normalizedEmail)
      const res   = NextResponse.json({ success: true, name: admin.name, role: admin.role })
      res.cookies.set(COOKIE_NAME, token, {
        httpOnly: true, secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax', maxAge: 7 * 24 * 60 * 60, path: '/',
      })
      return res
    }

    // Check users table
    const user = await getUserByEmail(normalizedEmail)
    if (user && user.password_hash === password) {
      const token = await createSessionToken(normalizedEmail)
      const res   = NextResponse.json({ success: true, name: user.name, role: user.role })
      res.cookies.set(COOKIE_NAME, token, {
        httpOnly: true, secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax', maxAge: 7 * 24 * 60 * 60, path: '/',
      })
      return res
    }

    return NextResponse.json(
      { success: false, error: 'Invalid email or password.' },
      { status: 401 }
    )
  } catch (err) {
    console.error('[POST /api/auth/login]', err)
    return NextResponse.json({ success: false, error: 'Login failed.' }, { status: 500 })
  }
}
