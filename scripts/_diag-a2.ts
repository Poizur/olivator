import { createClient } from '@supabase/supabase-js'
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!, { auth: { persistSession: false } })

async function main() {
  // 1. Načti body_markdown článku olivovy-olej-do-200-kc kolem tokenu picual-250-ml
  const { data: article } = await sb.from('articles')
    .select('id, slug, body_markdown, status')
    .eq('slug', 'olivovy-olej-do-200-kc')
    .single()

  if (!article) { console.log('Článek nenalezen'); return }

  const body = article.body_markdown as string ?? ''
  const tokenIdx = body.indexOf('picual-250-ml')
  if (tokenIdx < 0) {
    console.log('Token picual-250-ml NENALEZEN v body_markdown')
    // Hledáme všechny tokeny v článku
    const tokens = [...body.matchAll(/\{\{product:([^}]+)\}\}/g)].map(m => m[1])
    console.log('Tokeny v článku:', tokens)
    return
  }

  const ctx_start = Math.max(0, tokenIdx - 250)
  const ctx_end = Math.min(body.length, tokenIdx + 200)
  const context = body.slice(ctx_start, ctx_end)
  console.log('=== KONTEXT TOKENU picual-250-ml ===')
  console.log(context)

  // 2. Proč je picual-250-ml inactive?
  const { data: broken } = await sb.from('products')
    .select('id, slug, name, status, status_reason, olivator_score')
    .eq('slug', 'picual-250-ml')
    .single()
  console.log('\n=== PRODUKT picual-250-ml ===')
  console.log(broken)

  // 3. Kandidáti náhrady: active EVOO, cena do ~220 Kč, seřazeno dle score
  console.log('\n=== KANDIDÁTI NÁHRADY (active, ≤220 Kč, EVOO/virgin) ===')
  // Nejdřív zjisti nejlevnější ceny
  const { data: cheapOffers } = await sb.from('product_offers')
    .select('product_id, price')
    .not('price', 'is', null)
    .lte('price', 220)
    .eq('in_stock', true)
    .order('price', { ascending: true })

  const cheapIds = [...new Set((cheapOffers ?? []).map(o => o.product_id as string))].slice(0, 50)
  if (cheapIds.length === 0) { console.log('Žádné nabídky ≤220 Kč'); return }

  const { data: candidates } = await sb.from('products')
    .select('id, slug, name, type, olivator_score, status')
    .in('id', cheapIds)
    .eq('status', 'active')
    .in('type', ['evoo', 'virgin'])
    .not('olivator_score', 'is', null)
    .order('olivator_score', { ascending: false })
    .limit(6)

  for (const c of candidates ?? []) {
    const price = (cheapOffers ?? []).filter(o => o.product_id === c.id).map(o => o.price).sort()[0]
    console.log(`  [score ${c.olivator_score}] ${c.slug} | ${c.name} | ${price} Kč`)
  }

  // 4. Cultivar kandidátů
  const cIds = (candidates ?? []).map(c => c.id as string)
  if (cIds.length > 0) {
    const { data: cultivarRows } = await sb.from('product_cultivars')
      .select('product_id, cultivar_slug')
      .in('product_id', cIds)
    for (const cv of cultivarRows ?? []) {
      console.log(`    cultivar: ${cv.product_id} → ${cv.cultivar_slug}`)
    }
  }
}
main().catch(console.error)
