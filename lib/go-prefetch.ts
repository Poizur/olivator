import type { NextRequest } from 'next/server'

/** Prefetch routeru/prohlížeče (next/link, Speculation Rules) není klik: /go/ nic neloguje a nepřesměruje (204). */
export function isPrefetchRequest(request: NextRequest): boolean {
  const h = request.headers
  return (
    h.has('next-router-prefetch') ||
    h.get('purpose') === 'prefetch' ||
    (h.get('sec-purpose') ?? '').includes('prefetch') ||
    h.get('x-middleware-prefetch') === '1' ||
    request.nextUrl.searchParams.has('_rsc')
  )
}
