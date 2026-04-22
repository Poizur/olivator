import { NextRequest, NextResponse } from 'next/server'
import { createAdminSession, verifyPassword } from '@/lib/admin-auth'

export async function POST(request: NextRequest) {
  try {
    const { password } = await request.json()
    if (typeof password !== 'string') {
      return NextResponse.json({ error: 'Missing password' }, { status: 400 })
    }
    if (!verifyPassword(password)) {
      // Throttle to make brute force impractical (adds ~200ms per attempt)
      await new Promise(r => setTimeout(r, 200))
      return NextResponse.json({ error: 'Nesprávné heslo' }, { status: 401 })
    }
    await createAdminSession()
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[admin/login]', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
