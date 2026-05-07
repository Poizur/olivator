import { supabaseAdmin } from '@/lib/supabase'

const DOMAIN_BRANDS: Record<string, { slug: string; name: string; country: string }> = {
  'lozanocervenka.cz':  { slug: 'lozano-cervenka', name: 'Lozano Červenka', country: 'ES' },
  'milujemekretu.cz':   { slug: 'milujeme-kretu',  name: 'Milujeme Krétu', country: 'GR' },
}

async function main() {
  for (const [domain, b] of Object.entries(DOMAIN_BRANDS)) {
    // Check brand existuje?
    const { data: existing } = await supabaseAdmin.from('brands').select('id').eq('slug', b.slug).maybeSingle()
    if (!existing) {
      await supabaseAdmin.from('brands').insert({ slug: b.slug, name: b.name, country_code: b.country, status: 'draft' })
      console.log(`✓ Vytvořen brand "${b.name}" (${b.slug})`)
    }
    // Find products from that domain without brand_slug
    const { data: products } = await supabaseAdmin
      .from('products')
      .select('id, slug, source_url')
      .is('brand_slug', null)
      .eq('status', 'active')
    let linked = 0
    for (const p of (products ?? []) as Array<{ id: string; slug: string; source_url: string | null }>) {
      if (!p.source_url) continue
      try {
        const u = new URL(p.source_url)
        const d = u.hostname.replace(/^www\./, '')
        if (d !== domain) continue
        await supabaseAdmin.from('products').update({ brand_slug: b.slug, updated_at: new Date().toISOString() }).eq('id', p.id)
        linked++
      } catch {}
    }
    console.log(`  → ${linked} produktů linkováno`)
  }
  // Also check reckyeshop one — see what it is, maybe we have Reckyeshop brand?
  const { data: r } = await supabaseAdmin.from('products').select('slug, name, source_url').is('brand_slug', null).eq('status', 'active').like('source_url', '%reckyeshop%').limit(3)
  console.log('\nreckyeshop unbranded products:')
  ;(r ?? []).forEach((p: { slug: string; name: string }) => console.log(`  ${p.name.slice(0, 70)}`))
}
main().catch(console.error)
