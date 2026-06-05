export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getAllUsers, createUser, deleteUser, type AppUser } from '@/lib/db'

export async function GET() {
  try {
    const users = await getAllUsers()
    // Never return password hashes to the client
    return NextResponse.json({
      success: true,
      users: users.map(u => ({ user_id: u.user_id, email: u.email, name: u.name, role: u.role, created_at: u.created_at })),
    })
  } catch (err) {
    console.error('[GET /api/users]', err)
    return NextResponse.json({ success: false, error: 'Failed to load users.' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const { email, name, password, role = 'agent' } = await req.json() as {
      email: string; name: string; password: string; role?: 'admin' | 'agent'
    }

    if (!email || !name || !password) {
      return NextResponse.json({ success: false, error: 'email, name, and password are required.' }, { status: 400 })
    }

    const now = new Date().toISOString()
    const user: AppUser = {
      user_id:       `user-${Date.now().toString(36)}`,
      email:         email.trim().toLowerCase(),
      name:          name.trim(),
      role,
      // Passwords stored as-is — swap for bcrypt before sharing access widely
      password_hash: password,
      created_at:    now,
    }

    await createUser(user)
    return NextResponse.json({ success: true, user: { user_id: user.user_id, email: user.email, name: user.name, role: user.role } })
  } catch (err) {
    console.error('[POST /api/users]', err)
    return NextResponse.json({ success: false, error: 'Failed to create user.' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { email } = await req.json() as { email: string }
    if (!email) return NextResponse.json({ success: false, error: 'email is required.' }, { status: 400 })
    const deleted = await deleteUser(email)
    if (!deleted) return NextResponse.json({ success: false, error: 'User not found.' }, { status: 404 })
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[DELETE /api/users]', err)
    return NextResponse.json({ success: false, error: 'Failed to delete user.' }, { status: 500 })
  }
}
