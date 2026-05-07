// Audit rules — daily scan vrátí návrhy oprav. Admin schvaluje v UI.
// Princip: NIC se neaplikuje samo. Tady jen detekujeme + navrhujeme.

import { supabaseAdmin } from './supabase'

export interface ProposalDraft {
  rule_id: string
  severity: 'low' | 'medium' | 'high'
  target_type: 'product' | 'brand' | 'article' | 'recipe' | 'offer' | 'region' | 'cultivar'
  target_id?: string | null
  target_slug?: string | null
  target_label: string
  title: string
  reason: string
  suggested_action: Record<string, unknown>
  preview?: Record<string, unknown>
}

// ── Rule 1: Produkty bez primary image ──────────────────────────────────────
async function ruleProductNoImage(): Promise<ProposalDraft[]> {
  const { data: products } = await supabaseAdmin
    .from('products')
    .select('id, slug, name, type, origin_country, origin_region')
    .eq('status', 'active')
    .is('image_url', null)

  return ((products ?? []) as Array<{ id: string; slug: string; name: string; type: string; origin_country: string | null; origin_region: string | null }>).map(p => ({
    rule_id: 'product_no_image',
    severity: 'medium',
    target_type: 'product',
    target_id: p.id,
    target_slug: p.slug,
    target_label: p.name,
    title: `${p.name.slice(0, 60)}${p.name.length > 60 ? '…' : ''} nemá obrázek`,
    reason: 'Primary product image chybí. OG sharing + Product schema rich snippet nepůjdou.',
    suggested_action: {
      action: 'fetch_unsplash',
      query: `${p.name.split(' ').slice(0, 4).join(' ')} olive oil`,
      fallback_query: `olive oil bottle ${p.origin_country ?? 'mediterranean'}`,
    },
  }))
}

// ── Rule 2: Retaileři bez tracking template ─────────────────────────────────
// Pozor: nesletujeme jednotlivé offers (té nemusí mít cached affiliate_url —
// /go/ redirect generuje URL z retailer.base_tracking_url on-the-fly), ale
// agregovaně retailery, kteří template VŮBEC nemají = ztracená provize.
async function ruleRetailerNoTemplate(): Promise<ProposalDraft[]> {
  const { data: retailers } = await supabaseAdmin
    .from('retailers')
    .select('id, slug, name, base_tracking_url, is_active, affiliate_network')
    .eq('is_active', true)

  const drafts: ProposalDraft[] = []
  for (const r of (retailers ?? []) as Array<{ id: string; slug: string; name: string; base_tracking_url: string | null; affiliate_network: string | null }>) {
    if (r.base_tracking_url && r.base_tracking_url.length > 0) continue
    // Kolik offers má tento retailer in_stock?
    const { count } = await supabaseAdmin
      .from('product_offers')
      .select('*', { count: 'exact', head: true })
      .eq('retailer_id', r.id)
      .eq('in_stock', true)

    if ((count ?? 0) === 0) continue  // nejsou-li nabídky, žádný problém

    drafts.push({
      rule_id: 'retailer_no_template',
      severity: 'high',
      target_type: 'brand',  // používá se brand_slug typu pro UI link, ale je to retailer
      target_id: r.id,
      target_slug: r.slug,
      target_label: r.name,
      title: `${r.name}: chybí affiliate template (${count} aktivních offerů)`,
      reason: `Retailer ${r.affiliate_network ? `je v síti "${r.affiliate_network}" ale ` : ''}nemá nastavenou base_tracking_url. Všech ${count} klikání na "Koupit" jdou bez provize.`,
      suggested_action: {
        action: 'configure_retailer_template',
        retailer_slug: r.slug,
        affected_offers: count,
        admin_url: `/admin/retailers`,
      },
    })
  }
  return drafts
}

// ── Rule 3: Articles bez hero image ─────────────────────────────────────────
async function ruleArticleNoHero(): Promise<ProposalDraft[]> {
  const { data } = await supabaseAdmin
    .from('articles')
    .select('id, slug, title, category')
    .eq('status', 'active')
    .is('hero_image_url', null)

  return ((data ?? []) as Array<{ id: string; slug: string; title: string; category: string }>).map(a => ({
    rule_id: 'article_no_hero',
    severity: 'medium',
    target_type: 'article',
    target_id: a.id,
    target_slug: a.slug,
    target_label: a.title,
    title: `Článek "${a.title.slice(0, 60)}" nemá hero image`,
    reason: 'Article schema bez `image` pole = bez Google rich result. OG image taky chybí.',
    suggested_action: {
      action: 'fetch_unsplash',
      query: `${a.title.split(' ').slice(0, 5).join(' ')} olive oil`,
    },
  }))
}

// ── Rule 4: Recipes bez hero image ──────────────────────────────────────────
async function ruleRecipeNoHero(): Promise<ProposalDraft[]> {
  const { data } = await supabaseAdmin
    .from('recipes')
    .select('id, slug, title, cuisine')
    .eq('status', 'active')
    .is('hero_image_url', null)

  return ((data ?? []) as Array<{ id: string; slug: string; title: string; cuisine: string | null }>).map(r => ({
    rule_id: 'recipe_no_hero',
    severity: 'medium',
    target_type: 'recipe',
    target_id: r.id,
    target_slug: r.slug,
    target_label: r.title,
    title: `Recept "${r.title}" nemá hero image`,
    reason: 'Recipe schema potřebuje image pro Google rich result.',
    suggested_action: {
      action: 'fetch_unsplash',
      query: `${r.title.split(' ').slice(0, 4).join(' ')} ${r.cuisine ?? 'mediterranean'}`,
    },
  }))
}

// ── Rule 5: Active brand bez photo nebo description ─────────────────────────
async function ruleBrandIncomplete(): Promise<ProposalDraft[]> {
  const { data: brands } = await supabaseAdmin
    .from('brands')
    .select('id, slug, name, description_long')
    .eq('status', 'active')

  const drafts: ProposalDraft[] = []
  for (const b of (brands ?? []) as Array<{ id: string; slug: string; name: string; description_long: string | null }>) {
    const { count: photoCount } = await supabaseAdmin
      .from('entity_images')
      .select('*', { count: 'exact', head: true })
      .eq('entity_id', b.id)
      .eq('entity_type', 'brand')
      .eq('status', 'active')

    const issues: string[] = []
    if (!b.description_long || b.description_long.length < 500) issues.push('description < 500ch')
    if ((photoCount ?? 0) === 0) issues.push('no photo')

    if (issues.length > 0) {
      drafts.push({
        rule_id: 'brand_incomplete',
        severity: 'low',
        target_type: 'brand',
        target_id: b.id,
        target_slug: b.slug,
        target_label: b.name,
        title: `Brand "${b.name}": ${issues.join(' + ')}`,
        reason: 'Aktivní brand by měl mít content i fotku pro plnohodnotnou /znacka/ stránku.',
        suggested_action: {
          action: 'generate_brand_content',
          missing: issues,
          slug: b.slug,
        },
      })
    }
  }
  return drafts
}

// ── Rule 6: Duplicate brands (same name, different slug) ────────────────────
async function ruleBrandDuplicate(): Promise<ProposalDraft[]> {
  const { data: brands } = await supabaseAdmin.from('brands').select('id, slug, name')
  const byNameLower = new Map<string, Array<{ id: string; slug: string; name: string }>>()
  for (const b of (brands ?? []) as Array<{ id: string; slug: string; name: string }>) {
    const k = b.name.toLowerCase().trim()
    if (!byNameLower.has(k)) byNameLower.set(k, [])
    byNameLower.get(k)!.push(b)
  }

  const drafts: ProposalDraft[] = []
  for (const [name, group] of byNameLower) {
    if (group.length < 2) continue
    const slugs = group.map(g => g.slug).join(', ')
    // Choose first as primary
    const primary = group[0]
    const dups = group.slice(1)
    drafts.push({
      rule_id: 'brand_duplicate',
      severity: 'high',
      target_type: 'brand',
      target_id: primary.id,
      target_slug: primary.slug,
      target_label: name,
      title: `Duplicitní brandy se stejným jménem "${name}" (${group.length}×)`,
      reason: `Slugy: ${slugs}. Měly by se sloučit do jednoho.`,
      suggested_action: {
        action: 'merge_brands',
        primary_slug: primary.slug,
        duplicate_slugs: dups.map(d => d.slug),
      },
    })
  }
  return drafts
}

// ── Rule 7: Active brand bez country_code ───────────────────────────────────
async function ruleBrandNoCountry(): Promise<ProposalDraft[]> {
  const { data: brands } = await supabaseAdmin
    .from('brands')
    .select('id, slug, name')
    .eq('status', 'active')
    .is('country_code', null)

  const drafts: ProposalDraft[] = []
  for (const b of (brands ?? []) as Array<{ id: string; slug: string; name: string }>) {
    // Heuristika — který country_code má majoritu produktů?
    const { data: ps } = await supabaseAdmin
      .from('products')
      .select('origin_country')
      .eq('brand_slug', b.slug)
      .not('origin_country', 'is', null)
    const countries = new Map<string, number>()
    for (const p of (ps ?? []) as Array<{ origin_country: string }>) {
      countries.set(p.origin_country, (countries.get(p.origin_country) ?? 0) + 1)
    }
    const sorted = [...countries.entries()].sort((a, b) => b[1] - a[1])
    const suggested = sorted[0]?.[0] ?? null

    drafts.push({
      rule_id: 'brand_no_country',
      severity: 'low',
      target_type: 'brand',
      target_id: b.id,
      target_slug: b.slug,
      target_label: b.name,
      title: `Brand "${b.name}": chybí country_code`,
      reason: suggested
        ? `Většina produktů má origin_country=${suggested} → pravděpodobně to platí i pro brand.`
        : 'Žádný produkt nemá origin_country — nelze auto-doporučit.',
      suggested_action: suggested
        ? { action: 'set_brand_country', country_code: suggested }
        : { action: 'manual_review' },
    })
  }
  return drafts
}

// ── Rule 8: Products without description_long ───────────────────────────────
async function ruleProductNoDescription(): Promise<ProposalDraft[]> {
  const { data } = await supabaseAdmin
    .from('products')
    .select('id, slug, name')
    .eq('status', 'active')
    .or('description_long.is.null,description_long.eq.')

  return ((data ?? []) as Array<{ id: string; slug: string; name: string }>).map(p => ({
    rule_id: 'product_no_description',
    severity: 'medium',
    target_type: 'product',
    target_id: p.id,
    target_slug: p.slug,
    target_label: p.name,
    title: `${p.name.slice(0, 60)}: chybí dlouhý popis`,
    reason: 'Bez description_long = slabý SEO content + Product schema má jen krátký fallback.',
    suggested_action: {
      action: 'generate_product_description',
      slug: p.slug,
    },
  }))
}

// ── Rule 9: Product status=inactive ale offers stále in_stock ───────────────
async function ruleInactiveWithStock(): Promise<ProposalDraft[]> {
  const { data: products } = await supabaseAdmin
    .from('products')
    .select('id, slug, name')
    .eq('status', 'inactive')

  const drafts: ProposalDraft[] = []
  for (const p of (products ?? []) as Array<{ id: string; slug: string; name: string }>) {
    const { count } = await supabaseAdmin
      .from('product_offers')
      .select('*', { count: 'exact', head: true })
      .eq('product_id', p.id)
      .eq('in_stock', true)

    if ((count ?? 0) > 0) {
      drafts.push({
        rule_id: 'inactive_with_stock',
        severity: 'high',
        target_type: 'product',
        target_id: p.id,
        target_slug: p.slug,
        target_label: p.name,
        title: `${p.name.slice(0, 50)}: inactive, ale ${count} offerů v sock`,
        reason: 'Inkonzistentní stav — produkt je inactive ale jeho offers ukazují in_stock=true. Cena vidět ve frontendu i když produkt skrytý.',
        suggested_action: {
          action: 'deactivate_offers',
          offer_count: count,
        },
      })
    }
  }
  return drafts
}

// ── Rule registry ────────────────────────────────────────────────────────────
export interface AuditResult {
  rule: string
  detected: number
  proposals: ProposalDraft[]
}

export async function runAllAuditRules(): Promise<AuditResult[]> {
  const rules: Array<{ name: string; fn: () => Promise<ProposalDraft[]> }> = [
    { name: 'product_no_image', fn: ruleProductNoImage },
    { name: 'retailer_no_template', fn: ruleRetailerNoTemplate },
    { name: 'article_no_hero', fn: ruleArticleNoHero },
    { name: 'recipe_no_hero', fn: ruleRecipeNoHero },
    { name: 'brand_incomplete', fn: ruleBrandIncomplete },
    { name: 'brand_duplicate', fn: ruleBrandDuplicate },
    { name: 'brand_no_country', fn: ruleBrandNoCountry },
    { name: 'product_no_description', fn: ruleProductNoDescription },
    { name: 'inactive_with_stock', fn: ruleInactiveWithStock },
  ]

  const results: AuditResult[] = []
  for (const r of rules) {
    try {
      const proposals = await r.fn()
      results.push({ rule: r.name, detected: proposals.length, proposals })
    } catch (err) {
      console.error(`Rule ${r.name} failed:`, err instanceof Error ? err.message : err)
      results.push({ rule: r.name, detected: 0, proposals: [] })
    }
  }
  return results
}

// ── Persist proposals to DB (idempotent — UNIQUE constraint) ─────────────────
export async function persistProposals(drafts: ProposalDraft[]): Promise<{ inserted: number; updated: number }> {
  let inserted = 0
  let updated = 0
  for (const d of drafts) {
    const { error, count } = await supabaseAdmin
      .from('seo_proposals')
      .upsert({
        rule_id: d.rule_id,
        severity: d.severity,
        target_type: d.target_type,
        target_id: d.target_id ?? null,
        target_slug: d.target_slug ?? null,
        target_label: d.target_label,
        title: d.title,
        reason: d.reason,
        suggested_action: d.suggested_action,
        preview: d.preview ?? {},
        status: 'pending',
        // Don't overwrite if already resolved
      }, { onConflict: 'rule_id,target_type,target_id', ignoreDuplicates: false, count: 'exact' })
    if (error) {
      console.warn(`persistProposals: ${error.message}`)
      continue
    }
    if (count === 1) inserted++
    else updated++
  }
  return { inserted, updated }
}
