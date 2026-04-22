import { NextRequest, NextResponse } from 'next/server'
import { isAdminAuthenticated } from '@/lib/admin-auth'
import { scrapeProductPage } from '@/lib/product-scraper'

export const maxDuration = 30

export async function POST(request: NextRequest) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const { url } = await request.json()
    if (typeof url !== 'string' || !url.startsWith('http')) {
      return NextResponse.json({ error: 'URL je povinná' }, { status: 400 })
    }
    const data = await scrapeProductPage(url)
    return NextResponse.json({ ok: true, data })
  } catch (err) {
    console.error('[import]', err)
    const message = err instanceof Error ? err.message : 'Server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
