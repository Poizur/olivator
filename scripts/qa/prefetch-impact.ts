/**
 * Pondělní rutina: kolik kliků vyráběl prefetch /go/ přes next/link (oprava 2026-11-19).
 * Srovnává organické kliky 7 dní PŘED a 7 dní PO nasazení opravy, po obchodech a po místech,
 * kde byl <Link> na /go/: stránka oleje (specifikace + karta prodejce), výsledek kvízu, oblíbené, Olík.
 * Čtení jen (SELECT). Spuštění: npx tsx --env-file=.env.local scripts/qa/prefetch-impact.ts [ISO čas nasazení]
 */
import { createClient } from '@supabase/supabase-js'

const DEPLOY_AT = process.argv[2] ?? process.env.PREFETCH_FIX_DEPLOYED_AT ?? '2026-11-19T14:00:00Z'
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!, { auth: { persistSession: false } })

const PLACES: Array<{ key: string; where: (c: Click) => boolean }> = [
  { key: 'stránka oleje (product)', where: (c) => c.source_type === 'product' },
  { key: 'výsledek kvízu', where: (c) => c.source_type === 'quiz' || (c.source_page ?? '').includes('/quiz') },
  { key: 'oblíbené', where: (c) => c.source_type === 'oblibene' || (c.source_page ?? '').includes('/oblibene') },
  { key: 'Olík', where: (c) => c.source_type === 'olik' },
  { key: 'ostatní', where: () => true },
]

interface Click { clicked_at: string; source_type: string | null; source_page: string | null; retailer_id: string }

async function load(from: Date, to: Date): Promise<Click[]> {
  const { data, error } = await sb
    .from('affiliate_clicks')
    .select('clicked_at, source_type, source_page, retailer_id')
    .eq('is_test', false)
    .eq('unverified', false)
    .gte('clicked_at', from.toISOString())
    .lt('clicked_at', to.toISOString())
    .limit(1000)
  if (error) throw error
  if ((data ?? []).length === 1000) console.warn('[prefetch-impact] 1000 řádků = ořezáno, zúžit okno')
  return (data ?? []) as Click[]
}

async function main() {
  const deploy = new Date(DEPLOY_AT)
  const week = 7 * 86400_000
  const [before, after, retailers] = await Promise.all([
    load(new Date(deploy.getTime() - week), deploy),
    load(deploy, new Date(Math.min(Date.now(), deploy.getTime() + week))),
    sb.from('retailers').select('id, slug'),
  ])
  const rName = new Map((retailers.data ?? []).map((r) => [r.id as string, r.slug as string]))
  const afterDays = Math.max(1, Math.min(7, (Date.now() - deploy.getTime()) / 86400_000))
  console.log(`Oprava nasazena ${deploy.toISOString()} · před = 7 dní, po = ${afterDays.toFixed(1)} dne · organické kliky (is_test=false, unverified=false)\n`)

  const table = (rows: Click[]) => {
    const used = new Set<Click>()
    const out: Record<string, Record<string, number>> = {}
    for (const place of PLACES) {
      for (const c of rows) {
        if (used.has(c) || !place.where(c)) continue
        used.add(c)
        const r = rName.get(c.retailer_id) ?? '?'
        out[place.key] ??= {}
        out[place.key][r] = (out[place.key][r] ?? 0) + 1
      }
    }
    return out
  }
  const b = table(before)
  const a = table(after)
  const retailersSeen = [...new Set([...before, ...after].map((c) => rName.get(c.retailer_id) ?? '?'))].sort()
  console.log(['místo', ...retailersSeen.flatMap((r) => [`${r} před/den`, `${r} po/den`])].join(' | '))
  for (const place of PLACES) {
    const cells = retailersSeen.flatMap((r) => [((b[place.key]?.[r] ?? 0) / 7).toFixed(1), ((a[place.key]?.[r] ?? 0) / afterDays).toFixed(1)])
    console.log([place.key, ...cells].join(' | '))
  }
  const tb = before.length / 7
  const ta = after.length / afterDays
  console.log(`\nCelkem/den: před ${tb.toFixed(1)}, po ${ta.toFixed(1)} → odhad kliků z prefetche: ${Math.max(0, tb - ta).toFixed(1)}/den (${tb > 0 ? Math.round(Math.max(0, tb - ta) / tb * 100) : 0} %)`)
}
main().catch((e) => { console.error(e); process.exit(1) })
