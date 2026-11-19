import { NextResponse } from 'next/server'
import { getSetting, setSetting } from '@/lib/settings'
import { isAdminAuthenticated } from '@/lib/admin-auth'

export const dynamic = 'force-dynamic'

export async function GET() {
  if (!(await isAdminAuthenticated())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const [maintenance, emailsPaused] = await Promise.all([
    getSetting<boolean>('maintenance_mode'),
    getSetting<boolean>('emails_paused'),
  ])
  return NextResponse.json({ maintenance: !!maintenance, emailsPaused: !!emailsPaused })
}

export async function POST(req: Request) {
  if (!(await isAdminAuthenticated())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { enabled } = (await req.json()) as { enabled: boolean }
  if (typeof enabled !== 'boolean') return NextResponse.json({ error: 'enabled must be boolean' }, { status: 400 })
  await Promise.all([
    setSetting('maintenance_mode', enabled),
    setSetting('emails_paused', enabled),
  ])
  return NextResponse.json({ ok: true, maintenance: enabled, emailsPaused: enabled })
}
