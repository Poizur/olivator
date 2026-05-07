// Aplikace approved návrhů. Každý rule má svého applier-a co provede skutečnou
// opravu. Tichá fail → status='failed' + resolution_note.

import { supabaseAdmin } from './supabase'
import { searchUnsplash } from './unsplash'

interface ProposalRow {
  id: string
  rule_id: string
  target_type: string
  target_id: string | null
  target_slug: string | null
  target_label: string
  suggested_action: Record<string, unknown>
}

async function fetchProposal(id: string): Promise<ProposalRow | null> {
  const { data } = await supabaseAdmin
    .from('seo_proposals')
    .select('*')
    .eq('id', id)
    .maybeSingle()
  return data as ProposalRow | null
}

async function markStatus(id: string, status: 'applied' | 'failed' | 'dismissed', note: string) {
  await supabaseAdmin
    .from('seo_proposals')
    .update({
      status,
      resolved_at: new Date().toISOString(),
      resolution_note: note,
    })
    .eq('id', id)
}

// ── Applier per rule ─────────────────────────────────────────────────────────

async function applyFetchUnsplash(p: ProposalRow): Promise<{ ok: boolean; note: string }> {
  const action = p.suggested_action as { query?: string; fallback_query?: string }
  const queries = [action.query, action.fallback_query].filter(Boolean) as string[]
  if (queries.length === 0) return { ok: false, note: 'No queries' }
  if (!process.env.UNSPLASH_ACCESS_KEY) return { ok: false, note: 'UNSPLASH_ACCESS_KEY missing' }

  let url: string | null = null
  let alt: string | null = null
  for (const q of queries) {
    try {
      const photos = await searchUnsplash(q, 1)
      if (photos[0]?.url) { url = photos[0].url; alt = photos[0].altText; break }
    } catch {}
  }
  if (!url) return { ok: false, note: 'Unsplash returned 0 photos' }

  const targetTable = p.target_type === 'product' ? 'products' :
                       p.target_type === 'article' ? 'articles' :
                       p.target_type === 'recipe' ? 'recipes' : null
  if (!targetTable) return { ok: false, note: `Unknown target_type: ${p.target_type}` }

  if (targetTable === 'products') {
    // Insert into product_images + update products.image_url
    const { error: insErr } = await supabaseAdmin.from('product_images').insert({
      product_id: p.target_id,
      url,
      alt_text: alt ?? p.target_label,
      is_primary: true,
      source: 'unsplash',
      sort_order: 0,
    })
    if (insErr && !insErr.message.includes('duplicate')) {
      return { ok: false, note: insErr.message.slice(0, 100) }
    }
    await supabaseAdmin
      .from('products')
      .update({ image_url: url, image_source: 'unsplash', updated_at: new Date().toISOString() })
      .eq('id', p.target_id)
  } else {
    // articles / recipes have hero_image_url directly
    const { error } = await supabaseAdmin
      .from(targetTable)
      .update({ hero_image_url: url, updated_at: new Date().toISOString() })
      .eq('id', p.target_id)
    if (error) return { ok: false, note: error.message.slice(0, 100) }
  }
  return { ok: true, note: `Unsplash: ${url.slice(0, 60)}` }
}

async function applySetBrandCountry(p: ProposalRow): Promise<{ ok: boolean; note: string }> {
  const action = p.suggested_action as { country_code?: string }
  if (!action.country_code) return { ok: false, note: 'No country_code in action' }
  const { error } = await supabaseAdmin
    .from('brands')
    .update({ country_code: action.country_code, updated_at: new Date().toISOString() })
    .eq('id', p.target_id)
  if (error) return { ok: false, note: error.message.slice(0, 100) }
  return { ok: true, note: `country_code = ${action.country_code}` }
}

async function applyDeactivateOffers(p: ProposalRow): Promise<{ ok: boolean; note: string }> {
  const { error, count } = await supabaseAdmin
    .from('product_offers')
    .update({ in_stock: false, last_checked: new Date().toISOString() }, { count: 'exact' })
    .eq('product_id', p.target_id)
    .eq('in_stock', true)
  if (error) return { ok: false, note: error.message.slice(0, 100) }
  return { ok: true, note: `${count ?? 0} offerů → in_stock=false` }
}

async function applyMergeBrands(p: ProposalRow): Promise<{ ok: boolean; note: string }> {
  const action = p.suggested_action as { primary_slug?: string; duplicate_slugs?: string[] }
  if (!action.primary_slug || !action.duplicate_slugs) return { ok: false, note: 'Missing slugs' }
  let moved = 0
  for (const dupSlug of action.duplicate_slugs) {
    const { count } = await supabaseAdmin
      .from('products')
      .update({ brand_slug: action.primary_slug }, { count: 'exact' })
      .eq('brand_slug', dupSlug)
    moved += count ?? 0
    await supabaseAdmin.from('brands').delete().eq('slug', dupSlug)
  }
  return { ok: true, note: `${moved} produktů → ${action.primary_slug}, ${action.duplicate_slugs.length} dupes deleted` }
}

async function applyGenerateProductDescription(p: ProposalRow): Promise<{ ok: boolean; note: string }> {
  if (!process.env.ANTHROPIC_API_KEY) return { ok: false, note: 'ANTHROPIC_API_KEY missing' }
  const { generateProductDescriptions } = await import('./content-agent')

  const { data: prod } = await supabaseAdmin
    .from('products')
    .select('id, name, type, origin_country, origin_region, acidity, polyphenols, certifications, olivator_score, raw_description')
    .eq('id', p.target_id)
    .maybeSingle()
  if (!prod) return { ok: false, note: 'Product not found' }

  try {
    const result = await generateProductDescriptions({
      name: (prod as Record<string, unknown>).name as string,
      type: (prod as Record<string, unknown>).type as string,
      originCountry: (prod as Record<string, unknown>).origin_country as string | null,
      originRegion: (prod as Record<string, unknown>).origin_region as string | null,
      acidity: (prod as Record<string, unknown>).acidity != null ? Number((prod as Record<string, unknown>).acidity) : null,
      polyphenols: (prod as Record<string, unknown>).polyphenols as number | null,
      certifications: ((prod as Record<string, unknown>).certifications as string[] | null) ?? [],
      olivatorScore: (prod as Record<string, unknown>).olivator_score as number | null,
      rawDescription: ((prod as Record<string, unknown>).raw_description as string | null) ?? null,
    })
    if (!result.short || result.short.length < 50) return { ok: false, note: 'short too short' }
    await supabaseAdmin
      .from('products')
      .update({ description_short: result.short, description_long: result.long, updated_at: new Date().toISOString() })
      .eq('id', p.target_id)
    return { ok: true, note: `short=${result.short.length}ch, long=${result.long.length}ch` }
  } catch (err) {
    return { ok: false, note: err instanceof Error ? err.message.slice(0, 100) : 'unknown' }
  }
}

async function applyGenerateBrandContent(p: ProposalRow): Promise<{ ok: boolean; note: string }> {
  // Tato akce vyžaduje plně async generate-entity-content.ts s ANTHROPIC_API_KEY +
  // existující content-generator. Spustí celý flow pro 1 brand.
  if (!process.env.ANTHROPIC_API_KEY) return { ok: false, note: 'ANTHROPIC_API_KEY missing' }
  return { ok: false, note: 'Run scripts/generate-entity-content.ts --slug=' + (p.target_slug ?? '') }
}

// ── Dispatcher ──────────────────────────────────────────────────────────────
export async function applyProposalById(id: string): Promise<{ ok: boolean; note: string }> {
  const p = await fetchProposal(id)
  if (!p) return { ok: false, note: 'Proposal not found' }

  const action = (p.suggested_action as { action?: string }).action ?? ''

  let result: { ok: boolean; note: string }
  switch (action) {
    case 'fetch_unsplash':
      result = await applyFetchUnsplash(p)
      break
    case 'set_brand_country':
      result = await applySetBrandCountry(p)
      break
    case 'deactivate_offers':
      result = await applyDeactivateOffers(p)
      break
    case 'merge_brands':
      result = await applyMergeBrands(p)
      break
    case 'generate_product_description':
      result = await applyGenerateProductDescription(p)
      break
    case 'generate_brand_content':
      result = await applyGenerateBrandContent(p)
      break
    default:
      result = { ok: false, note: `No applier for action "${action}"` }
  }

  await markStatus(p.id, result.ok ? 'applied' : 'failed', result.note)
  return result
}

export async function dismissProposalById(id: string, note?: string): Promise<void> {
  await markStatus(id, 'dismissed', note ?? 'Admin dismissed')
}
