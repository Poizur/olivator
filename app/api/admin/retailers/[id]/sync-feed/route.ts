import { NextRequest, NextResponse } from 'next/server'
import { isAdminAuthenticated } from '@/lib/admin-auth'
import { syncRetailerFeed } from '@/lib/feed-sync'

// 700+ produktů × DB roundtripy → potřebujeme více než default Vercel/Railway
// timeout 60s. Railway default je 300s pro POST, Next.js bere maxDuration.
export const maxDuration = 300
export const dynamic = 'force-dynamic'

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const { id } = await params
    const result = await syncRetailerFeed(id)
    return NextResponse.json({ ok: true, result })
  } catch (err) {
    console.error('[admin/retailers/sync-feed]', err)
    const message = err instanceof Error ? err.message : 'Server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
