/**
 * Pro každý eHUB retailer otestuj jeho šablonu s parametrem 'url=' i 'desturl='
 * proti reálnému produkt URL z DB. Vyhodnoť který parameter deep-linkuje
 * (final URL obsahuje produktový path), který padá na homepage.
 *
 * Run: node --env-file=.env.local --import tsx scripts/test-all-ehub.ts
 */
async function testAllEhubMain() {
  const { supabaseAdmin } = await import('@/lib/supabase')

  const { data: retailers } = await supabaseAdmin
    .from('retailers')
    .select('id, slug, name, base_tracking_url, domain')
    .eq('affiliate_network', 'eHUB')
    .eq('is_active', true)

  for (const r of retailers ?? []) {
    console.log(`\n═══ ${r.slug} ═══`)
    // Najdi 1 vzorový produkt s offer od tohoto retailera
    const { data: offers } = await supabaseAdmin
      .from('product_offers')
      .select('product_url, product_id, products!inner(slug)')
      .eq('retailer_id', r.id as string)
      .not('product_url', 'is', null)
      .limit(1)

    const offer = offers?.[0]
    if (!offer || !offer.product_url) {
      console.log('  Žádné offer s product_url')
      continue
    }
    const prod = Array.isArray(offer.products) ? offer.products[0] : offer.products
    const productSlug = (prod as { slug: string }).slug
    const productUrl = offer.product_url as string
    console.log(`  Test produkt: ${productSlug}`)
    console.log(`  Original URL: ${productUrl}`)

    const tpl = r.base_tracking_url as string
    const aBidMatch = tpl.match(/a_bid=([^&]+)/)
    const aBid = aBidMatch?.[1] ?? ''

    // Try both url= and desturl=
    for (const param of ['url', 'desturl']) {
      const testUrl = `https://ehub.cz/system/scripts/click.php?a_aid=2f4d1556&a_bid=${aBid}&data1=${encodeURIComponent(productSlug)}&${param}=${encodeURIComponent(productUrl)}`
      const res = await fetch(testUrl, { redirect: 'follow' })
      const finalUrl = res.url
      // Check if final URL contains product slug or path (deep link works)
      const productPath = new URL(productUrl).pathname
      const isHomepage = finalUrl.split('?')[0].endsWith(`${(r.domain as string)}/`) || finalUrl.split('?')[0].endsWith(`${(r.domain as string)}`)
      const isDeepLink = finalUrl.includes(productPath.split('/').filter(Boolean).pop() ?? '__nope__')
      const verdict = isDeepLink ? '✓ DEEP LINK' : isHomepage ? '✗ homepage' : '? jiné'
      console.log(`  ${param.padEnd(8)} → ${verdict}`)
      console.log(`    final: ${finalUrl.slice(0, 110)}${finalUrl.length > 110 ? '…' : ''}`)
    }
  }
}

testAllEhubMain().catch((e) => {
  console.error(e)
  process.exit(1)
})
