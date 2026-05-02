import { NextResponse } from 'next/server'
import { isAdminAuthenticated } from '@/lib/admin-auth'
import { generateWeeklyDraft } from '@/lib/newsletter-composer'

export const dynamic = 'force-dynamic'
export const maxDuration = 120

export async function POST() {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const result = await generateWeeklyDraft()
    return NextResponse.json({ ok: true, draftId: result.id, subject: result.subject })
  } catch (err) {
    console.error('[admin/newsletter/generate]', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Server error' },
      { status: 500 }
    )
  }
}
