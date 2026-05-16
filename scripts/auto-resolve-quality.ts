/**
 * Bulk auto-resolver pro quality_issues. Vyřeší všechno, co je deterministické,
 * tak aby /admin/quality ukazoval jen issues vyžadující skutečný human judgment.
 *
 * Resolved automaticky:
 * - inactive_with_offers — když je produkt inactive, deaktivuj jeho offers (in_stock=false)
 * - image_missing — fetch z source_url + Unsplash fallback per typ
 * - description_missing / description_too_short — Claude regenerate (Haiku)
 * - no_offers — produkt bez offers → archive (status='inactive')
 *
 * Nechá v adminu jen:
 * - bio_claim_without_cert (legal risk, vyžaduje rozhodnutí)
 * - další human-review rules
 *
 * Run: unset ANTHROPIC_API_KEY UNSPLASH_ACCESS_KEY
 *      npx tsx --env-file=.env.local scripts/auto-resolve-quality.ts
 */
import { supabaseAdmin } from '@/lib/supabase'
import { generateProductDescriptions } from '@/lib/content-agent'
import { searchUnsplash } from '@/lib/unsplash'

interface Issue {
  id: string
  rule_id: string
  product_id: string
  status: string
  message: string
  auto_fix_attempted: boolean
}

async function loadOpenIssuesByRule(ruleId: string): Promise<Issue[]> {
  const { data } = await supabaseAdmin
    .from('quality_issues')
    .select('id, rule_id, product_id, status, message, auto_fix_attempted')
    .eq('rule_id', ruleId)
    .eq('status', 'open')
  return (data ?? []) as Issue[]
}

async function markResolved(issueId: string, success: boolean, note?: string) {
  await supabaseAdmin
    .from('quality_issues')
    .update({
      status: success ? 'resolved' : 'open',
      auto_fix_attempted: true,
      auto_fix_succeeded: success,
      resolved_at: success ? new Date().toISOString() : null,
      resolution_note: note ?? null,
    })
    .eq('id', issueId)
}

// ── 1. inactive_with_offers ─────────────────────────────────────────────────
async function fixInactiveWithOffers() {
  console.log('\n═══ inactive_with_offers ═══')
  const issues = await loadOpenIssuesByRule('inactive_with_offers')
  console.log(`  ${issues.length} issues`)
  let ok = 0
  for (const i of issues) {
    // Set product's offers to in_stock=false
    const { error } = await supabaseAdmin
      .from('product_offers')
      .update({ in_stock: false, last_checked: new Date().toISOString() })
      .eq('product_id', i.product_id)
    if (error) {
      await markResolved(i.id, false, error.message.slice(0, 100))
      continue
    }
    await markResolved(i.id, true, 'Offers in_stock=false (product inactive)')
    ok++
  }
  console.log(`  ✓ ${ok}/${issues.length} resolved`)
}

// ── Unsplash sanity checks ────────────────────────────────────────────────────

// Keywords that indicate the image is NOT an olive oil product photo.
// Any match in alt text or Unsplash URL → image rejected.
const UNSPLASH_BLOCKED = [
  'shampoo', 'shower', 'cosmetic', 'lotion', 'soap',
  'cream', 'toothpaste', 'perfume', 'skincare', 'hair',
  'beauty', 'makeup', 'fragrance', 'deodorant', 'body',
]

function isUnsplashImageSafe(altText: string | null, url: string): { ok: boolean; reason: string } {
  const text = (altText ?? '').toLowerCase()
  const urlLower = url.toLowerCase()
  for (const kw of UNSPLASH_BLOCKED) {
    if (text.includes(kw)) return { ok: false, reason: `alt text: "${kw}"` }
    if (urlLower.includes(kw)) return { ok: false, reason: `url path: "${kw}"` }
  }
  return { ok: true, reason: '' }
}

/** Returns number of OTHER products already using this URL as primary image.
 *  If >= 3, the image is too generic to be useful. */
async function countPrimaryDuplicates(url: string): Promise<number> {
  const { count } = await supabaseAdmin
    .from('product_images')
    .select('*', { count: 'exact', head: true })
    .eq('url', url)
    .eq('is_primary', true)
  return count ?? 0
}

// ── 2. image_missing ─────────────────────────────────────────────────────────
async function fixImageMissing() {
  console.log('\n═══ image_missing ═══')
  const issues = await loadOpenIssuesByRule('image_missing')
  console.log(`  ${issues.length} issues`)
  if (!process.env.UNSPLASH_ACCESS_KEY) {
    console.log('  ⚠ UNSPLASH_ACCESS_KEY missing — skipping')
    return
  }
  let ok = 0
  let rejectedAlt = 0
  let rejectedDup = 0
  for (const i of issues) {
    const { data: p } = await supabaseAdmin
      .from('products')
      .select('id, slug, name, type, origin_country, origin_region')
      .eq('id', i.product_id)
      .maybeSingle()
    if (!p) {
      await markResolved(i.id, false, 'product gone')
      continue
    }
    const prod = p as { id: string; slug: string; name: string; type: string; origin_country: string | null; origin_region: string | null }

    // ── Priorita 1: scraper_candidate — skutečná fotka od retailera. ──────────
    // Unsplash je poslední záchrana, NIKDY ne první volba.
    const { data: existingImgs } = await supabaseAdmin
      .from('product_images')
      .select('id, url, source, alt_text')
      .eq('product_id', prod.id)
      .in('source', ['scraper', 'scraper_candidate'])
      .order('sort_order', { ascending: true })
      .limit(1)

    if (existingImgs && existingImgs.length > 0) {
      const img = existingImgs[0]
      await supabaseAdmin
        .from('product_images')
        .update({ is_primary: true, source: 'scraper' })
        .eq('id', img.id as string)
      await supabaseAdmin
        .from('products')
        .update({ image_url: img.url as string, image_source: 'scraper', updated_at: new Date().toISOString() })
        .eq('id', prod.id)
      await markResolved(i.id, true, 'Promoted scraper_candidate — no Unsplash needed')
      ok++
      continue
    }

    // ── Priorita 2: Unsplash fallback ─────────────────────────────────────────
    // Query musí být product-specific — generické "olive oil bottle GR"
    // vrátí stejnou fotku pro desítky produktů.
    const brandWords = prod.name.split(/\s+/).slice(0, 3).join(' ')
    const queries = [
      `${brandWords} olive oil bottle`,
      `olive oil ${prod.origin_region ?? prod.origin_country ?? 'mediterranean'} bottle`,
    ]
    let chosenUrl: string | null = null
    let chosenAlt: string | null = null

    for (const q of queries) {
      try {
        const photos = await searchUnsplash(q, 5)
        for (const ph of photos) {
          if (!ph.url) continue

          // CHECK 1 — Alt text + URL keyword validation
          const safety = isUnsplashImageSafe(ph.altText ?? null, ph.url)
          if (!safety.ok) {
            console.log(`  ⚠ [${prod.slug}] Rejected by keyword (${safety.reason}): ${ph.altText?.slice(0, 60)}`)
            rejectedAlt++
            continue
          }

          // CHECK 2 — Duplicate image detection
          // An Unsplash photo used as primary for 3+ products is a generic stock image.
          const dupCount = await countPrimaryDuplicates(ph.url)
          if (dupCount >= 3) {
            console.log(`  ⚠ [${prod.slug}] Rejected: URL already primary for ${dupCount} products`)
            rejectedDup++
            continue
          }

          chosenUrl = ph.url
          chosenAlt = ph.altText ?? null
          break
        }
      } catch {}
      if (chosenUrl) break
    }

    if (!chosenUrl) {
      await markResolved(i.id, false, 'No safe Unsplash result (all rejected or no results)')
      continue
    }

    const { error: insErr } = await supabaseAdmin.from('product_images').insert({
      product_id: prod.id,
      url: chosenUrl,
      alt_text: chosenAlt ?? prod.name,
      is_primary: true,
      source: 'unsplash',
      sort_order: 0,
    })
    if (insErr && !insErr.message.includes('duplicate')) {
      await markResolved(i.id, false, insErr.message.slice(0, 100))
      continue
    }
    await supabaseAdmin
      .from('products')
      .update({ image_url: chosenUrl, image_source: 'unsplash', updated_at: new Date().toISOString() })
      .eq('id', prod.id)
    await markResolved(i.id, true, `Unsplash fallback fetched (passed ${rejectedAlt + rejectedDup} safety checks)`)
    ok++
  }
  console.log(`  ✓ ${ok}/${issues.length} resolved`)
  if (rejectedAlt + rejectedDup > 0) {
    console.log(`  ✗ Rejected: ${rejectedAlt} by keyword, ${rejectedDup} by duplicate threshold`)
  }
}

// ── 3. description_missing + description_too_short ───────────────────────────
async function fixDescriptions() {
  console.log('\n═══ description_missing + description_too_short ═══')
  const a = await loadOpenIssuesByRule('description_missing')
  const b = await loadOpenIssuesByRule('description_too_short')
  const all = [...a, ...b]
  console.log(`  ${all.length} issues (${a.length} missing + ${b.length} too short)`)
  if (!process.env.ANTHROPIC_API_KEY) {
    console.log('  ⚠ ANTHROPIC_API_KEY missing — skipping')
    return
  }
  let ok = 0
  for (const i of all) {
    const { data: p } = await supabaseAdmin
      .from('products')
      .select('id, name, type, origin_country, origin_region, acidity, polyphenols, certifications, olivator_score, raw_description, description_short, description_long')
      .eq('id', i.product_id)
      .maybeSingle()
    if (!p) {
      await markResolved(i.id, false, 'product gone')
      continue
    }
    const prod = p as Record<string, unknown>
    try {
      const result = await generateProductDescriptions({
        name: prod.name as string,
        type: prod.type as string,
        origin: prod.origin_country as string | null,
        region: prod.origin_region as string | null,
        acidity: prod.acidity != null ? Number(prod.acidity) : null,
        polyphenols: prod.polyphenols as number | null,
        certifications: (prod.certifications as string[] | null) ?? [],
        olivatorScore: prod.olivator_score as number | null,
        rawDescription: (prod.raw_description as string | null) ?? null,
      })
      if (!result.shortDescription || result.shortDescription.length < 50) {
        await markResolved(i.id, false, 'short too short')
        continue
      }
      await supabaseAdmin
        .from('products')
        .update({
          description_short: result.shortDescription,
          description_long: result.longDescription,
          updated_at: new Date().toISOString(),
        })
        .eq('id', i.product_id)
      await markResolved(i.id, true, `Regenerated short=${result.shortDescription.length}ch long=${result.longDescription.length}ch`)
      ok++
    } catch (err) {
      const msg = err instanceof Error ? err.message.slice(0, 80) : 'unknown'
      await markResolved(i.id, false, msg)
    }
  }
  console.log(`  ✓ ${ok}/${all.length} resolved`)
}

// ── 4. no_offers ─────────────────────────────────────────────────────────────
async function fixNoOffers() {
  console.log('\n═══ no_offers ═══')
  const issues = await loadOpenIssuesByRule('no_offers')
  console.log(`  ${issues.length} issues`)
  let ok = 0
  for (const i of issues) {
    // Set product status to inactive
    const { error } = await supabaseAdmin
      .from('products')
      .update({
        status: 'inactive',
        status_reason_code: 'no_offers',
        status_reason_note: 'Auto-deaktivováno — žádné nabídky',
        status_changed_by: 'auto',
        status_changed_at: new Date().toISOString(),
      })
      .eq('id', i.product_id)
    if (error) {
      await markResolved(i.id, false, error.message.slice(0, 100))
      continue
    }
    await markResolved(i.id, true, 'Product set to inactive (no offers)')
    ok++
  }
  console.log(`  ✓ ${ok}/${issues.length} resolved`)
}

async function main() {
  console.log('═══ Bulk auto-resolve quality issues ═══')
  const start = Date.now()

  await fixInactiveWithOffers()
  await fixNoOffers()
  await fixDescriptions()
  await fixImageMissing()

  const elapsed = ((Date.now() - start) / 1000).toFixed(1)
  console.log(`\n✅ Done in ${elapsed}s`)

  // Final stats
  const { count: openAfter } = await supabaseAdmin
    .from('quality_issues')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'open')
  console.log(`Open issues remaining: ${openAfter}`)
}

main().catch(err => {
  console.error('FATAL:', err)
  process.exit(1)
})
