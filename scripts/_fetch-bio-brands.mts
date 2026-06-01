import { createClient } from '@supabase/supabase-js'
const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://dyaloliwynmfnpjemzrh.supabase.co',
  process.env.SUPABASE_SERVICE_KEY!
)

const { data } = await sb
  .from('products')
  .select('slug, name, polyphenols, certifications, volume_ml, olivator_score, product_offers(price)')
  .eq('status', 'active')
  .contains('certifications', ['bio'])
  .gte('polyphenols', 400)
  .order('polyphenols', { ascending: false })
  .limit(60)

if (!data) { console.error('no data'); process.exit(1) }

// Exclude already-selected brands/families
const exclude = ['mitira', 'stamatakos', 'liophos', 'sitia']

const others = data.filter(p => !exclude.some(x => p.slug.includes(x)))
const selected = data.filter(p => exclude.some(x => p.slug.includes(x)))

console.log('=== BRANDS ALREADY IN LIST (for reference) ===')
selected.forEach(p => {
  const offers = p.product_offers as any[]
  const min = offers?.length ? Math.min(...offers.map((o: any) => o.price).filter(Boolean)) : null
  const p100 = (min && p.volume_ml) ? (min / p.volume_ml * 100).toFixed(0) : '?'
  console.log(`${p.slug.padEnd(80)} poly:${p.polyphenols} ${p100}Kč/100ml`)
})

console.log('\n=== OTHER BRANDS (BIO, poly >400, different brand) ===')
if (others.length === 0) {
  console.log('ŽÁDNÉ — v DB nejsou BIO oleje s poly >400 mimo vybrané brandy.')
  console.log('\n=== FALLBACK: BIO poly 200-400, other brands ===')
  const { data: fallback } = await sb
    .from('products')
    .select('slug, name, polyphenols, certifications, volume_ml, olivator_score, product_offers(price)')
    .eq('status', 'active')
    .contains('certifications', ['bio'])
    .gte('polyphenols', 200)
    .lt('polyphenols', 400)
    .order('polyphenols', { ascending: false })
    .limit(20)
  fallback?.filter(p => !exclude.some(x => p.slug.includes(x))).forEach(p => {
    const offers = p.product_offers as any[]
    const min = offers?.length ? Math.min(...offers.map((o: any) => o.price).filter(Boolean)) : null
    const p100 = (min && p.volume_ml) ? (min / p.volume_ml * 100).toFixed(0) : '?'
    console.log(`${p.slug.padEnd(80)} poly:${p.polyphenols} cert:[${(p.certifications||[]).join(',')}] ${p100}Kč/100ml score:${p.olivator_score}`)
  })
} else {
  others.forEach(p => {
    const offers = p.product_offers as any[]
    const min = offers?.length ? Math.min(...offers.map((o: any) => o.price).filter(Boolean)) : null
    const p100 = (min && p.volume_ml) ? (min / p.volume_ml * 100).toFixed(0) : '?'
    console.log(`${p.slug.padEnd(80)} poly:${p.polyphenols} cert:[${(p.certifications||[]).join(',')}] ${p100}Kč/100ml score:${p.olivator_score}`)
  })
}
