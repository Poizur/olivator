// Truth-check cron — spouštět 1. den každého měsíce v 8:00
// Ověřuje faktická tvrzení v obsahu oproti živé DB.
// Výstup: agent_decisions + konzola.
// npx tsx --env-file=.env.local scripts/cron/truth-check.ts
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!,
  { auth: { persistSession: false } }
)

interface Finding {
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'
  id: string
  desc: string
  expected: string
  found: string
  where: string
}

const findings: Finding[] = []

function flag(f: Finding) {
  findings.push(f)
  const prefix = f.severity === 'CRITICAL' ? '🔴' : f.severity === 'HIGH' ? '🟠' : f.severity === 'MEDIUM' ? '🟡' : '🟢'
  console.log(`${prefix} ${f.id}: ${f.desc}`)
  console.log(`   Kde: ${f.where}`)
  console.log(`   Očekáváno: ${f.expected}`)
  console.log(`   Nalezeno: ${f.found}`)
}

async function main() {
  console.log('[truth-check] Spouštím...\n')

  // ── 1. LIVE DB COUNTS ──────────────────────────────────────────────────
  const [
    { count: activeProducts },
    { count: activeRetailers },
  ] = await Promise.all([
    supabase.from('products').select('*', { count: 'exact', head: true }).eq('status', 'active'),
    supabase.from('retailers').select('*', { count: 'exact', head: true }).eq('is_active', true),
  ])

  console.log(`[truth-check] DB: ${activeProducts} aktivních produktů, ${activeRetailers} aktivních prodejců\n`)

  // ── 2. ARTICLE BODIES — NUMERIC CLAIMS ─────────────────────────────────
  const { data: articles } = await supabase
    .from('articles')
    .select('slug, body_markdown, status')
    .eq('status', 'active')

  const RETAILER_PATTERNS = [/(\d+)\s*prodejc/gi]
  const PRODUCT_PATTERNS = [/hodnotíme\s+(\d+)\s+olejů/gi, /(\d+)\s+produktů\s+dostupných/gi, /agreguje\s+(\d+)\s+olejů/gi]
  const PLACEHOLDER_PATTERNS = ['(Poznámka:', 'vložit z reálné DB', '[DOPLNIT]', 'ilustrativní příklady', 'illustrativní příklady']

  for (const a of articles ?? []) {
    const body = a.body_markdown ?? ''

    // Check for placeholder text in active articles
    for (const pattern of PLACEHOLDER_PATTERNS) {
      if (body.includes(pattern)) {
        flag({
          severity: 'CRITICAL',
          id: 'PLACEHOLDER',
          desc: `Aktivní článek obsahuje placeholder text`,
          expected: 'Žádný placeholder v aktivním článku',
          found: `Pattern: "${pattern}"`,
          where: `articles.slug = '${a.slug}'`,
        })
      }
    }

    // Check retailer count claims
    for (const pat of RETAILER_PATTERNS) {
      const matches = [...body.matchAll(pat)]
      for (const m of matches) {
        const claimed = parseInt(m[1])
        if (Math.abs(claimed - (activeRetailers ?? 0)) > 3) {
          flag({
            severity: 'HIGH',
            id: 'RETAILER_COUNT',
            desc: `Článek uvádí ${claimed} prodejců`,
            expected: `${activeRetailers}`,
            found: `${claimed}`,
            where: `articles.slug = '${a.slug}'`,
          })
        }
      }
    }

    // Check product count claims
    for (const pat of PRODUCT_PATTERNS) {
      const matches = [...body.matchAll(pat)]
      for (const m of matches) {
        const claimed = parseInt(m[1])
        if (activeProducts && claimed < activeProducts * 0.85) {
          flag({
            severity: 'HIGH',
            id: 'PRODUCT_COUNT',
            desc: `Článek uvádí ${claimed} olejů/produktů`,
            expected: `≥ ${Math.floor((activeProducts ?? 0) * 0.85)} (85 % z ${activeProducts})`,
            found: `${claimed}`,
            where: `articles.slug = '${a.slug}'`,
          })
        }
      }
    }
  }

  // ── 3. PHANTOM PRODUCT CHECK — všechny /olej/SLUG v article bodies ─────
  const slugPattern = /\/olej\/([a-z0-9\-]+)/g
  const allLinkedSlugs = new Set<string>()
  for (const a of articles ?? []) {
    const matches = [...(a.body_markdown ?? '').matchAll(slugPattern)]
    for (const m of matches) allLinkedSlugs.add(m[1])
  }

  // Batch check slugs in DB
  const slugArray = [...allLinkedSlugs]
  for (let i = 0; i < slugArray.length; i += 50) {
    const batch = slugArray.slice(i, i + 50)
    const { data: found } = await supabase
      .from('products')
      .select('slug, status')
      .in('slug', batch)

    const foundSlugs = new Set((found ?? []).map((p: { slug: string }) => p.slug))
    for (const s of batch) {
      if (!foundSlugs.has(s)) {
        // Find which articles reference this slug
        const refs = (articles ?? []).filter(a => (a.body_markdown ?? '').includes(`/olej/${s}`)).map(a => a.slug)
        flag({
          severity: 'CRITICAL',
          id: 'PHANTOM_PRODUCT',
          desc: `Odkaz /olej/${s} nevede na žádný produkt v DB`,
          expected: `Produkt s slug='${s}' existuje v DB`,
          found: `NULL — slug nenalezen`,
          where: `articles: ${refs.join(', ')}`,
        })
      }
    }
  }

  // ── 4. INLINE SCORE CLAIMS vs DB ───────────────────────────────────────
  const scorePattern = /\(Score\s+(\d+)\)[^\)]{0,200}\/olej\/([a-z0-9\-]+)/g
  const reversePattern = /\/olej\/([a-z0-9\-]+)[^\(]{0,200}\(Score\s+(\d+)\)/g

  for (const a of articles ?? []) {
    const body = a.body_markdown ?? ''
    const allMatches = [
      ...[...body.matchAll(scorePattern)].map(m => ({ slug: m[2], claimed: parseInt(m[1]) })),
      ...[...body.matchAll(reversePattern)].map(m => ({ slug: m[1], claimed: parseInt(m[2]) })),
    ]

    for (const { slug, claimed } of allMatches) {
      const { data: p } = await supabase.from('products').select('olivator_score').eq('slug', slug).maybeSingle()
      if (p && p.olivator_score !== null && p.olivator_score !== claimed) {
        flag({
          severity: Math.abs((p.olivator_score ?? 0) - claimed) > 5 ? 'HIGH' : 'MEDIUM',
          id: 'SCORE_MISMATCH',
          desc: `Inline Score ${claimed} pro ${slug} nesouhlasí s DB`,
          expected: `Score ${p.olivator_score}`,
          found: `Score ${claimed} v textu`,
          where: `articles.slug = '${a.slug}'`,
        })
      }
    }
  }

  // ── 5. DEAD INTERNAL LINKS — článek → inactive/missing produkt ────────
  // Kontrola /olej/SLUG odkazů na inactive produkty (ne jen chybějící)
  const inactiveLinkedSlugs: Array<{ articleSlug: string; linkedSlug: string; productStatus: string }> = []
  for (let i = 0; i < slugArray.length; i += 50) {
    const batch = slugArray.slice(i, i + 50)
    const { data: batchProducts } = await supabase
      .from('products')
      .select('slug, status')
      .in('slug', batch)
    for (const p of batchProducts ?? []) {
      if ((p as { slug: string; status: string }).status !== 'active') {
        const refs = (articles ?? []).filter(a => (a.body_markdown ?? '').includes(`/olej/${(p as { slug: string }).slug}`)).map(a => a.slug)
        for (const articleSlug of refs) {
          inactiveLinkedSlugs.push({ articleSlug, linkedSlug: (p as { slug: string }).slug, productStatus: (p as { slug: string; status: string }).status })
          flag({
            severity: 'HIGH',
            id: 'DEAD_INTERNAL_LINK',
            desc: `Odkaz /olej/${(p as { slug: string }).slug} vede na ${(p as { slug: string; status: string }).status} produkt`,
            expected: `Produkt active`,
            found: `status=${(p as { slug: string; status: string }).status}`,
            where: `articles.slug = '${articleSlug}'`,
          })
        }
      }
    }
  }

  // ── 6. AFFILIATE CORRELATION — Score avg: affiliate vs non-affiliate ───
  // Kontrola nezávislosti: Score produktů s eHUB affiliate vs bez
  const { data: withAffiliate } = await supabase
    .from('products')
    .select('olivator_score')
    .eq('status', 'active')
    .not('olivator_score', 'is', null)
    .in('id', supabase.from('product_offers').select('product_id').not('retailers.base_tracking_url', 'is', null) as any)
    .limit(200)

  const { data: allActive } = await supabase
    .from('products')
    .select('olivator_score, id')
    .eq('status', 'active')
    .not('olivator_score', 'is', null)
    .limit(200)

  if (allActive && allActive.length > 0) {
    // Affiliate retailer IDs (eHUB — mají base_tracking_url)
    const { data: ehubRetailers } = await supabase
      .from('retailers')
      .select('id')
      .not('base_tracking_url', 'is', null)
      .eq('is_active', true)

    const ehubIds = new Set((ehubRetailers ?? []).map((r: { id: string }) => r.id))

    const { data: ehubOffers } = await supabase
      .from('product_offers')
      .select('product_id, retailer_id')
      .in('retailer_id', [...ehubIds])

    const affiliateProductIds = new Set((ehubOffers ?? []).map((o: { product_id: string }) => o.product_id))

    const affScores = (allActive ?? []).filter(p => affiliateProductIds.has((p as { id: string }).id) && (p as { olivator_score: number }).olivator_score != null).map(p => (p as { olivator_score: number }).olivator_score)
    const nonAffScores = (allActive ?? []).filter(p => !affiliateProductIds.has((p as { id: string }).id) && (p as { olivator_score: number }).olivator_score != null).map(p => (p as { olivator_score: number }).olivator_score)

    if (affScores.length > 0 && nonAffScores.length > 0) {
      const avgAff = affScores.reduce((a, b) => a + b, 0) / affScores.length
      const avgNonAff = nonAffScores.reduce((a, b) => a + b, 0) / nonAffScores.length
      const diff = Math.abs(avgAff - avgNonAff)

      console.log(`\n[truth-check] Korelační check: affiliate avg Score=${avgAff.toFixed(1)} (n=${affScores.length}), non-affiliate avg Score=${avgNonAff.toFixed(1)} (n=${nonAffScores.length}), diff=${diff.toFixed(1)}`)

      await supabase.from('agent_decisions').insert({
        agent: 'truth-check',
        decision_type: 'affiliate_correlation',
        input: { affiliateCount: affScores.length, nonAffiliateCount: nonAffScores.length },
        output: { avgAffiliateScore: +avgAff.toFixed(1), avgNonAffiliateScore: +avgNonAff.toFixed(1), diff: +diff.toFixed(1), independent: diff < 5 },
        reasoning: `Korelační check nezávislosti: diff=${diff.toFixed(1)} bodů (< 5 = OK)`,
        confidence: 1.0,
      }).catch(() => {/* non-fatal */})

      if (diff > 10) {
        flag({
          severity: 'HIGH',
          id: 'SCORE_BIAS',
          desc: `Score affiliate produktů je o ${diff.toFixed(1)} bodů vyšší než non-affiliate`,
          expected: `Rozdíl < 5 bodů`,
          found: `affiliate avg=${avgAff.toFixed(1)}, non-affiliate avg=${avgNonAff.toFixed(1)}`,
          where: `products.olivator_score global`,
        })
      }
    }
  }

  // ── 7. REPORT ─────────────────────────────────────────────────────────
  console.log(`\n[truth-check] Celkem nálezů: ${findings.length} (dead links: ${inactiveLinkedSlugs.length})`)
  const critical = findings.filter(f => f.severity === 'CRITICAL').length
  const high = findings.filter(f => f.severity === 'HIGH').length
  console.log(`  🔴 Kritické: ${critical} | 🟠 Vysoké: ${high} | Ostatní: ${findings.length - critical - high}`)

  if (findings.length > 0) {
    await supabase.from('agent_decisions').insert({
      agent: 'truth-check',
      decision_type: 'monthly_content_audit',
      input: { activeProducts, activeRetailers, audited: articles?.length ?? 0 },
      output: { findings, summary: { critical, high, total: findings.length } },
      reasoning: `Měsíční truth-check: ${findings.length} nálezů`,
      confidence: 1.0,
    })
    console.log('[truth-check] Nálezy uloženy do agent_decisions')
  } else {
    console.log('[truth-check] Vše OK — žádné nálezy')
  }

  if (critical > 0) {
    console.error(`\n⚠️  ${critical} KRITICKÉ nálezy — opravit ihned!`)
    process.exit(1)
  }
}

main().catch(e => { console.error('[truth-check] Selhalo:', e.message); process.exit(1) })
