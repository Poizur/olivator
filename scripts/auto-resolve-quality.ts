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
    const queries = [
      `${prod.name.split(' ').slice(0, 4).join(' ')} olive oil`,
      `olive oil bottle ${prod.origin_country ?? 'mediterranean'}`,
      'olive oil bottle premium',
    ]
    let url: string | null = null
    let alt: string | null = null
    for (const q of queries) {
      try {
        const photos = await searchUnsplash(q, 1)
        if (photos[0]?.url) {
          url = photos[0].url
          alt = photos[0].altText
          break
        }
      } catch {}
    }
    if (!url) {
      await markResolved(i.id, false, 'No Unsplash result')
      continue
    }
    // Insert into product_images as primary
    const { error: insErr } = await supabaseAdmin.from('product_images').insert({
      product_id: prod.id,
      url,
      alt_text: alt ?? prod.name,
      is_primary: true,
      source: 'unsplash',
      sort_order: 0,
    })
    if (insErr && !insErr.message.includes('duplicate')) {
      await markResolved(i.id, false, insErr.message.slice(0, 100))
      continue
    }
    // Update product.image_url
    await supabaseAdmin
      .from('products')
      .update({ image_url: url, image_source: 'unsplash', updated_at: new Date().toISOString() })
      .eq('id', prod.id)
    await markResolved(i.id, true, 'Unsplash fallback fetched')
    ok++
  }
  console.log(`  ✓ ${ok}/${issues.length} resolved`)
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
