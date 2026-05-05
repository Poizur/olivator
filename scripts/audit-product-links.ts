/**
 * Audit všech product offer URLs:
 *   - kolik retailerů má affiliate template (base_tracking_url)
 *   - kolik produktů jde přes affiliate
 *   - kolik URL vede na homepage místo na konkrétní produkt
 *
 * Run: node --env-file=.env.local --import tsx scripts/audit-product-links.ts
 */

interface RetailerRow {
  id: string
  slug: string
  name: string
  domain: string | null
  base_tracking_url: string | null
  default_commission_pct: number | null
  affiliate_network: string | null
  is_active: boolean
}

interface OfferRow {
  product_id: string
  retailer_id: string
  product_url: string | null
  affiliate_url: string | null
  in_stock: boolean
}

function classifyUrl(url: string | null, domain: string | null): {
  isHomepage: boolean
  hasPath: boolean
  pathDepth: number
  reason: string
} {
  if (!url) return { isHomepage: true, hasPath: false, pathDepth: 0, reason: 'NULL url' }
  try {
    const u = new URL(url)
    const path = u.pathname.replace(/\/$/, '') // strip trailing /
    const segments = path.split('/').filter(Boolean)
    const isHomepage = segments.length === 0 || (segments.length === 1 && /^(en|cs|cz|sk)$/i.test(segments[0]))
    return {
      isHomepage,
      hasPath: !isHomepage,
      pathDepth: segments.length,
      reason: isHomepage ? `homepage (path="${u.pathname}")` : `OK (${segments.length} segments)`,
    }
  } catch {
    return { isHomepage: true, hasPath: false, pathDepth: 0, reason: `Invalid URL: ${url.slice(0, 60)}` }
  }
}

async function auditProductLinksMain() {
  const { supabaseAdmin } = await import('@/lib/supabase')

  console.log('═══════════════════════════════════════════════════════════════')
  console.log(' PRODUCT LINK AUDIT')
  console.log('═══════════════════════════════════════════════════════════════\n')

  // 1. Retailers — kdo má affiliate
  const { data: retailers } = await supabaseAdmin
    .from('retailers')
    .select('id, slug, name, domain, base_tracking_url, default_commission_pct, affiliate_network, is_active')
    .eq('is_active', true)
    .order('name')

  console.log('📋 RETAILERS (active):\n')
  console.log('  Slug                    Net      Comm  AffilTpl  Domain')
  console.log('  ' + '─'.repeat(80))
  let withAffil = 0
  for (const r of (retailers ?? []) as RetailerRow[]) {
    const hasTpl = Boolean(r.base_tracking_url && r.base_tracking_url.trim().length > 10)
    if (hasTpl) withAffil++
    const network = (r.affiliate_network ?? '-').padEnd(7)
    const comm = r.default_commission_pct ? `${r.default_commission_pct}%`.padEnd(5) : '-'.padEnd(5)
    const tpl = hasTpl ? '✓ YES   ' : '✗ no    '
    console.log(`  ${r.slug.padEnd(24)} ${network} ${comm} ${tpl} ${r.domain ?? '-'}`)
  }
  console.log(`\n  ${withAffil}/${retailers?.length ?? 0} retailerů má affiliate template.\n`)

  // 2. Per-retailer offer URL kvalita
  const { data: offers } = await supabaseAdmin
    .from('product_offers')
    .select('product_id, retailer_id, product_url, affiliate_url, in_stock')

  console.log('🔗 OFFERS — analyze URL kvality (kolik vede přímo na produkt):\n')
  const retailerById = new Map(((retailers ?? []) as RetailerRow[]).map((r) => [r.id, r]))

  const stats: Record<
    string,
    {
      slug: string
      total: number
      directProduct: number
      homepage: number
      noUrl: number
      hasAffil: number
      noAffilButTpl: number
    }
  > = {}

  for (const o of (offers ?? []) as OfferRow[]) {
    const r = retailerById.get(o.retailer_id)
    if (!r) continue
    const s = stats[r.slug] ?? {
      slug: r.slug,
      total: 0,
      directProduct: 0,
      homepage: 0,
      noUrl: 0,
      hasAffil: 0,
      noAffilButTpl: 0,
    }
    s.total++
    const cls = classifyUrl(o.product_url, r.domain)
    if (!o.product_url) s.noUrl++
    else if (cls.isHomepage) s.homepage++
    else s.directProduct++

    if (o.affiliate_url) s.hasAffil++
    if (!o.affiliate_url && r.base_tracking_url) s.noAffilButTpl++

    stats[r.slug] = s
  }

  console.log('  Retailer                Total  Direct  Home  Null  Affil  TplOnly')
  console.log('  ' + '─'.repeat(80))
  for (const s of Object.values(stats).sort((a, b) => b.total - a.total)) {
    const directPct = s.total > 0 ? Math.round((s.directProduct / s.total) * 100) : 0
    const directStr = `${s.directProduct} (${directPct}%)`.padEnd(11)
    console.log(
      `  ${s.slug.padEnd(24)} ${String(s.total).padEnd(5)} ${directStr} ${String(s.homepage).padEnd(5)} ${String(s.noUrl).padEnd(5)} ${String(s.hasAffil).padEnd(6)} ${String(s.noAffilButTpl)}`
    )
  }

  const totals = Object.values(stats).reduce(
    (acc, s) => ({
      total: acc.total + s.total,
      direct: acc.direct + s.directProduct,
      home: acc.home + s.homepage,
      noUrl: acc.noUrl + s.noUrl,
      affil: acc.affil + s.hasAffil,
      noAffilTpl: acc.noAffilTpl + s.noAffilButTpl,
    }),
    { total: 0, direct: 0, home: 0, noUrl: 0, affil: 0, noAffilTpl: 0 }
  )

  console.log('\n─'.repeat(80))
  console.log(`  TOTAL:                  ${totals.total}     ${totals.direct} (${Math.round((totals.direct / totals.total) * 100)}%)  ${totals.home}     ${totals.noUrl}    ${totals.affil}     ${totals.noAffilTpl}`)
  console.log()
  console.log('  Sloupce:')
  console.log('    Direct  = product_url vede na konkrétní produkt (ne homepage)')
  console.log('    Home    = product_url vede na homepage retaileru ❌')
  console.log('    Null    = chybí product_url ❌')
  console.log('    Affil   = má vlastní affiliate_url v DB')
  console.log('    TplOnly = retailer má base_tracking_url ale offer ne affiliate_url (ok — generuje se on-demand)')
  console.log()

  // 3. Per-slug breakdown s problémovými URL pro fix
  if (totals.home > 0) {
    console.log(`\n⚠️  ${totals.home} HOMEPAGE URL — vzorek prvních 10:\n`)
    let count = 0
    for (const o of (offers ?? []) as OfferRow[]) {
      const r = retailerById.get(o.retailer_id)
      if (!r) continue
      if (!o.product_url) continue
      const cls = classifyUrl(o.product_url, r.domain)
      if (!cls.isHomepage) continue
      if (count >= 10) break
      const { data: prod } = await supabaseAdmin.from('products').select('slug, name').eq('id', o.product_id).maybeSingle()
      console.log(`  [${r.slug}] ${prod?.slug ?? o.product_id}`)
      console.log(`    ${o.product_url.slice(0, 100)}`)
      count++
    }
  }
}

auditProductLinksMain().catch((e) => {
  console.error(e)
  process.exit(1)
})
