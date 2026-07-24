import { NextResponse } from 'next/server'
import { getSetting, setSetting } from '@/lib/settings'

export const dynamic = 'force-dynamic'

export async function GET() {
  const [maintenance, emailsPaused] = await Promise.all([
    getSetting<boolean>('maintenance_mode'),
    getSetting<boolean>('emails_paused'),
  ])
  return NextResponse.json({ maintenance: !!maintenance, emailsPaused: !!emailsPaused })
}

export async function POST(req: Request) {
  const { enabled } = (await req.json()) as { enabled: boolean }
  await Promise.all([
    setSetting('maintenance_mode', enabled),
    setSetting('emails_paused', enabled),
  ])
  return NextResponse.json({ ok: true, maintenance: enabled, emailsPaused: enabled })
}
