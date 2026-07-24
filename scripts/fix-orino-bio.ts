/**
 * Odstraní nedoložený 'bio' flag z Orino Sitia produktů.
 * BIO není zmíněno ani v description_short ani description_long → nedoloženo.
 * agrocert = food-safety management cert, neovlivňuje score → ponecháme.
 */
import { createClient } from '@supabase/supabase-js'
import { calculateScore } from '../lib/score'

const s = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!,
  { auth: { persistSession: false } }
)

async function main() {
  const { data: products, error } = await s
    .from('products')
    .select('id, slug, name, olivator_score, certifications, acidity, polyphenols, peroxide_value')
    .ilike('name', '%orino%')
    .eq('status', 'active')

  if (error) { console.error(error); process.exit(1) }

  console.log(`Nalezeno ${products!.length} Orino produktů\n`)

  for (const p of products!) {
    const hasBio = (p.certifications as string[]).includes('bio')
    if (!hasBio) {
      console.log(`SKIP ${p.name} — BIO už není`)
      continue
    }

    const newCerts = (p.certifications as string[]).filter((c: string) => c !== 'bio')

    // Potřebujeme cenu pro score — načteme nejlevnější nabídku
    const { data: offers } = await s
      .from('product_offers')
      .select('price')
      .eq('product_id', p.id)
      .eq('in_stock', true)
      .order('price')
      .limit(1)

    const cheapestOffer = offers?.[0]
    const volume = await s.from('products').select('volume_ml').eq('id', p.id).single()
    const volMl = volume.data?.volume_ml ?? 1000
    const pricePer100ml = cheapestOffer ? (cheapestOffer.price / volMl) * 100 : null

    const newScore = calculateScore({
      acidity: p.acidity,
      certifications: newCerts,
      polyphenols: p.polyphenols,
      peroxideValue: p.peroxide_value,
      pricePer100ml,
    })

    console.log(`${p.name}`)
    console.log(`  Certs: ${JSON.stringify(p.certifications)} → ${JSON.stringify(newCerts)}`)
    console.log(`  Score: ${p.olivator_score} → ${newScore.total}`)
    console.log(`  Breakdown: ${JSON.stringify(newScore.breakdown)}`)

    const { error: updErr } = await s
      .from('products')
      .update({
        certifications: newCerts,
        olivator_score: newScore.total,
        score_breakdown: newScore.breakdown,
        updated_at: new Date().toISOString(),
      })
      .eq('id', p.id)

    if (updErr) {
      console.error(`  CHYBA při updatu ${p.slug}:`, updErr.message)
    } else {
      console.log(`  ✅ Uloženo`)
    }
    console.log()
  }

  console.log('Hotovo.')
}

main().catch(console.error)
