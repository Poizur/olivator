// Obnova stránek s cenami po feed-syncu, complete-syncu, discovery a po nasazení — první návštěvník
// nesmí dostat včerejší ceny. revalidatePath v route handleru stránku jen označí (přegeneruje se až při
// další návštěvě), proto ji hned načteme i sami (warm-up přes localhost = stejná instance a stejná cache).
// Volat jen z Next request kontextu (route handler); cron skripty volají /api/cron/revalidate-prices.

import { revalidatePath } from 'next/cache'
import { supabaseAdmin } from './supabase'
import { warnIfCapped } from './price'

const FIXED_PATHS = ['/', '/slevy', '/zebricek', '/olivovy-olej-5l', '/nejprodavanejsi']
const IN_BATCH = 60
const WARM_CONCURRENCY = 4

export interface PriceRevalidationResult {
  reason: string
  since: string
  paths: number
  productPages: number
  warmed: number
  warmFailed: string[]
  ms: number
}

async function changedProductSlugs(since: string): Promise<string[]> {
  const [historyRes, offersRes] = await Promise.all([
    supabaseAdmin.from('price_history').select('product_id').gte('recorded_at', since),
    supabaseAdmin.from('product_offers').select('product_id').gte('last_price_change', since),
  ])
  const ids = [...new Set([
    ...warnIfCapped(historyRes.data, 'price-revalidation price_history').map((r) => r.product_id as string),
    ...warnIfCapped(offersRes.data, 'price-revalidation product_offers').map((r) => r.product_id as string),
  ])]
  const slugs: string[] = []
  for (let i = 0; i < ids.length; i += IN_BATCH) {
    const { data } = await supabaseAdmin.from('products').select('slug').in('id', ids.slice(i, i + IN_BATCH)).eq('status', 'active')
    for (const p of data ?? []) slugs.push(p.slug as string)
  }
  return slugs
}

async function rankingPaths(): Promise<string[]> {
  const { data } = await supabaseAdmin.from('rankings').select('slug').eq('status', 'active')
  return (data ?? []).map((r) => `/zebricek/${r.slug as string}`)
}

async function warm(origin: string, path: string): Promise<boolean> {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(`${origin}${path}`, {
        headers: { 'user-agent': 'OlivatorCacheWarm/1.0', 'x-olivator-warm': '1' },
        redirect: 'manual',
        signal: AbortSignal.timeout(30_000),
      })
      await res.arrayBuffer()
      // STALE = podána stará kopie a přegenerování běží na pozadí → zkus znovu, ať je čerstvá v cache
      if (res.ok && res.headers.get('x-nextjs-cache') !== 'STALE') return true
      if (!res.ok && res.status !== 404) return false
    } catch {
      // další pokus
    }
    await new Promise((r) => setTimeout(r, 1500))
  }
  return false
}

export async function revalidatePricePages(opts: { since: string; reason: string; origin?: string }): Promise<PriceRevalidationResult> {
  const t0 = Date.now()
  const origin = opts.origin ?? `http://127.0.0.1:${process.env.PORT ?? 3000}`
  const [products, rankings] = await Promise.all([changedProductSlugs(opts.since), rankingPaths()])
  const paths = [...FIXED_PATHS, ...rankings, ...products.map((s) => `/olej/${s}`)]

  for (const p of paths) {
    try {
      revalidatePath(p)
    } catch (err) {
      console.error('[price-revalidation] revalidatePath', p, (err as Error).message)
    }
  }

  const warmFailed: string[] = []
  let warmed = 0
  for (let i = 0; i < paths.length; i += WARM_CONCURRENCY) {
    const chunk = paths.slice(i, i + WARM_CONCURRENCY)
    const results = await Promise.all(chunk.map((p) => warm(origin, p)))
    results.forEach((ok, j) => (ok ? warmed++ : warmFailed.push(chunk[j])))
  }

  const result = {
    reason: opts.reason,
    since: opts.since,
    paths: paths.length,
    productPages: products.length,
    warmed,
    warmFailed: warmFailed.slice(0, 20),
    ms: Date.now() - t0,
  }
  console.log('[price-revalidation]', JSON.stringify(result))
  return result
}
