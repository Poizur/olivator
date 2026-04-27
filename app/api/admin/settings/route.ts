import { NextRequest, NextResponse } from 'next/server'
import { isAdminAuthenticated } from '@/lib/admin-auth'
import { getAllSettings, setSetting, SETTINGS, type SettingKey } from '@/lib/settings'

export async function GET() {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const values = await getAllSettings()
    return NextResponse.json({ ok: true, values, defs: SETTINGS })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Server error' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const body = await request.json() as Record<string, unknown>
    const updates: Array<{ key: SettingKey; value: unknown }> = []

    for (const k of Object.keys(SETTINGS) as SettingKey[]) {
      if (k in body) {
        updates.push({ key: k, value: body[k] })
      }
    }
    if (updates.length === 0) {
      return NextResponse.json({ error: 'Žádné platné nastavení k uložení' }, { status: 400 })
    }
    for (const u of updates) {
      await setSetting(u.key, u.value)
    }
    return NextResponse.json({ ok: true, updated: updates.map(u => u.key) })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Server error' }, { status: 500 })
  }
}
