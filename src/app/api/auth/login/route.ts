import { NextRequest, NextResponse } from 'next/server'
import { getAdminCredentials, createSessionToken, COOKIE_NAME } from '@/lib/auth'

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json() as { email: string; password: string }

    const creds = getAdminCredentials()

    if (
      email?.trim().toLowerCase() !== creds.email.toLowerCase() ||
      password !== creds.password
    ) {
      return NextResponse.json(
        { success: false, error: 'Invalid email or password.' },
        { status: 401 }
      )
    }

    const token = await createSessionToken(email.trim().toLowerCase())
    const res   = NextResponse.json({ success: true })

    res.cookies.set(COOKIE_NAME, token, {
      httpOnly: true,
      secure:   process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge:   7 * 24 * 60 * 60, // 7 days
      path:     '/',
    })

    return res
  } catch (err) {
    console.error('[POST /api/auth/login]', err)
    return NextResponse.json({ success: false, error: 'Login failed.' }, { status: 500 })
  }
}
