import { NextRequest, NextResponse } from 'next/server'
import { isAdminAuthenticated } from '@/lib/admin-auth'
import { runRescrape } from '@/lib/product-rescrape'

export const maxDuration = 120

/** Full-pipeline rescrape: scrape source → fakta → flavor → AI rewrite →
 *  Score → galerie → auto lab scan. Tenký HTTP wrapper nad lib helperem. */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const { id } = await params
    const body = await request.json().catch(() => ({}))
    const result = await runRescrape(id, { url: body?.url })
    return NextResponse.json(result)
  } catch (err) {
    console.error('[rescrape]', err)
    const message = err instanceof Error ? err.message : 'Server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
