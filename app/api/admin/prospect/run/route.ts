import { NextResponse } from 'next/server'
import { isAdminAuthenticated } from '@/lib/admin-auth'
import { runProspector } from '@/lib/prospector'

// Claude API (~5s) + až 40 kandidátů × ~3s test + 1.2s polite delay = ~3 min worst case.
// Railway nemá limit, ale Next.js default je 30s — explicitně zvedáme.
export const maxDuration = 300

/** Manual prospector trigger — Claude AI + curated kandidáty + crawler test. */
export async function POST() {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const result = await runProspector()
    return NextResponse.json({ ok: true, ...result })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Server error' },
      { status: 500 }
    )
  }
}
