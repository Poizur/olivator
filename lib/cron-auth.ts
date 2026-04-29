// Sdílený auth check pro /api/cron/* endpointy.
// Přijímá secret POUZE z hlavičky x-cron-secret. Query string je zakázán
// (logoval by se v CDN/Railway access logs, browser history a Refereru).

import { NextRequest, NextResponse } from 'next/server'

export function checkCronAuth(request: NextRequest): NextResponse | null {
  const secret = process.env.CRON_SECRET
  if (!secret) {
    return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 500 })
  }
  const provided = request.headers.get('x-cron-secret')
  if (provided !== secret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  return null
}
