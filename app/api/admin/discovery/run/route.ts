import { NextResponse } from 'next/server'
import { isAdminAuthenticated } from '@/lib/admin-auth'
import { runDiscoveryAgent } from '@/lib/discovery-agent'

// Long timeout — full agent run can take 2-5 min depending on # of new candidates
export const maxDuration = 300

/** Manual trigger from admin UI. */
export async function POST() {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const result = await runDiscoveryAgent()
    return NextResponse.json({ ok: true, ...result })
  } catch (err) {
    console.error('[discovery/run]', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Server error' },
      { status: 500 }
    )
  }
}
