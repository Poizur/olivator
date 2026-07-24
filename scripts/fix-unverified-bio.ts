/**
 * T-27: Odstraní nedoložené BIO certifikace ze 3 produktů.
 * Bartolini lanýž, Nikolos Kalamata 1L, Plakias 5L.
 */
import { createClient } from '@supabase/supabase-js'
import { calculateScore } from '../lib/score'

const s = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!,
  { auth: { persistSession: false } }
)

const TARGET_SLUGS = [
  'bartolini-olivovy-olej-extra-virgin-s-cernym-lanyzem-100ml',
  'nikolos-kalamata-extra-panensky-olivovy-olej-0-3-1-l-sklo',
  'plakias-extra-panensky-olivovy-olej-5-l',
]

async function main() {
  const { data: products, error } = await s
    .from('products')
    .select('id, slug, name, olivator_score, certifications, acidity, polyphenols, peroxide_value, volume_ml')
    .in('slug', TARGET_SLUGS)

  if (error) { console.error(error); process.exit(1) }

  for (const p of products!) {
    const certs = p.certifications as string[]
    if (!certs.includes('bio')) { console.log(`SKIP ${p.slug} — BIO není`); continue }

    const newCerts = certs.filter((c: string) => c !== 'bio')

    const { data: offers } = await s
      .from('product_offers')
      .select('price')
      .eq('product_id', p.id)
      .eq('in_stock', true)
      .order('price')
      .limit(1)

    const volMl = (p.volume_ml as number) ?? 500
    const pricePer100ml = offers?.[0]?.price ? (offers[0].price / volMl) * 100 : null

    const newScore = calculateScore({
      acidity: p.acidity,
      certifications: newCerts,
      polyphenols: p.polyphenols,
      peroxideValue: p.peroxide_value,
      pricePer100ml,
    })

    console.log(`\n${p.name}`)
    console.log(`  Certs: ${JSON.stringify(certs)} → ${JSON.stringify(newCerts)}`)
    console.log(`  Score: ${p.olivator_score} → ${newScore.total}`)
    console.log(`  Breakdown: ${JSON.stringify(newScore.breakdown)}`)

    const { error: e } = await s
      .from('products')
      .update({
        certifications: newCerts,
        olivator_score: newScore.total,
        score_breakdown: newScore.breakdown,
        updated_at: new Date().toISOString(),
      })
      .eq('id', p.id)

    if (e) console.error(`  CHYBA:`, e.message)
    else console.log(`  ✅ Uloženo`)
  }

  console.log('\nHotovo.')
}
main().catch(console.error)
