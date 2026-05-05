/**
 * Diagnostika brand auto-fill pro Intini.
 * Run: node --env-file=.env.local --import tsx scripts/diag-intini.ts
 */

async function diagIntiniMain() {
  const { supabaseAdmin } = await import('@/lib/supabase')

  console.log('═══════════════════════════════════════════════════════════════')
  console.log(' INTINI BRAND DIAGNOSTIKA')
  console.log('═══════════════════════════════════════════════════════════════\n')

  // 1. Brand row
  const { data: brand, error: brandErr } = await supabaseAdmin
    .from('brands')
    .select('*')
    .eq('slug', 'intini')
    .maybeSingle()
  if (brandErr) console.log('❌ Brand load error:', brandErr.message)
  if (!brand) {
    console.log('❌ Brand "intini" nenalezen v DB')
    return
  }
  console.log('📋 BRAND ROW:')
  console.log(`  name: ${brand.name}`)
  console.log(`  slug: ${brand.slug}`)
  console.log(`  status: ${brand.status}`)
  console.log(`  description_long: ${brand.description_long ? `${brand.description_long.length} chars` : '<null>'}`)
  console.log(`  description_short: ${brand.description_short ?? '<null>'}`)
  console.log(`  story: ${brand.story ? `${brand.story.length} chars` : '<null>'}`)
  console.log(`  philosophy: ${brand.philosophy ? `${brand.philosophy.length} chars` : '<null>'}`)
  console.log(`  founded_year: ${brand.founded_year ?? '<null>'}`)
  console.log(`  headquarters: ${brand.headquarters ?? '<null>'}`)
  console.log(`  website_url: ${brand.website_url ?? '<null>'}`)
  console.log(`  tldr: ${brand.tldr ? `${brand.tldr.length} chars` : '<null>'}`)
  console.log(`  meta_title: ${brand.meta_title ?? '<null>'}`)
  console.log(`  meta_description: ${brand.meta_description ?? '<null>'}`)
  console.log(`  timeline: ${Array.isArray(brand.timeline) ? `${brand.timeline.length} milníků` : '<null>'}`)
  console.log()

  // 2. Entity images
  const { data: images } = await supabaseAdmin
    .from('entity_images')
    .select('id, url, image_role, is_primary, sort_order, source, alt_text, status')
    .eq('entity_id', brand.id)
    .eq('entity_type', 'brand')
    .order('sort_order')
  console.log(`🖼️  ENTITY IMAGES (${images?.length ?? 0} celkem):`)
  for (const img of images ?? []) {
    console.log(`  [${img.sort_order}] role=${img.image_role ?? 'NULL'} primary=${img.is_primary} status=${img.status}`)
    console.log(`      ${img.url.slice(0, 90)}${img.url.length > 90 ? '…' : ''}`)
    console.log(`      source=${img.source} alt=${img.alt_text}`)
  }
  console.log()

  // 3. Brand research drafts
  const { data: draft, error: draftErr } = await supabaseAdmin
    .from('brand_research_drafts')
    .select('*')
    .eq('brand_id', brand.id)
    .maybeSingle()
  if (draftErr) {
    console.log('⚠️ brand_research_drafts table error:', draftErr.message)
    console.log('   (možná není migrace 20260505_brand_research_drafts.sql aplikovaná)')
  } else if (!draft) {
    console.log('⚠️ Žádný draft v brand_research_drafts pro Intini')
    console.log('   (auto-fill ještě neběhl, nebo se nezapsal)')
  } else {
    console.log('🔍 BRAND_RESEARCH_DRAFT:')
    console.log(`  status: ${draft.status}`)
    console.log(`  candidate_url: ${draft.candidate_url ?? '<null>'}`)
    console.log(`  url_confidence: ${draft.url_confidence ?? '<null>'}`)
    console.log(`  url_source: ${draft.url_source ?? '<null>'}`)
    console.log(`  verify_confidence: ${draft.verify_confidence ?? '<null>'}`)
    console.log(`  verify_reason: ${draft.verify_reason ?? '<null>'}`)
    console.log(`  message: ${draft.message ?? '<null>'}`)
    console.log(`  draft: ${draft.draft ? 'JSON saved' : '<null>'}`)
    if (draft.draft) {
      const d = draft.draft as Record<string, unknown>
      console.log(`    tldr: ${d.tldr ?? '<null>'}`)
      console.log(`    descriptionShort: ${(d.descriptionShort as string)?.slice(0, 100) ?? '<null>'}…`)
      console.log(`    foundedYear: ${d.foundedYear ?? '<null>'}`)
      console.log(`    headquarters: ${d.headquarters ?? '<null>'}`)
    }
    console.log(`  updated_at: ${draft.updated_at}`)
  }
  console.log()

  // 4. Check image_role column exists
  const { data: anyImg, error: roleErr } = await supabaseAdmin
    .from('entity_images')
    .select('image_role')
    .limit(1)
  if (roleErr) {
    console.log('❌ image_role column NEEXISTUJE — migrace 20260505_entity_images_role.sql nebyla spuštěná!')
    console.log('   Error:', roleErr.message)
  } else {
    console.log(`✅ image_role column existuje (${anyImg?.length ?? 0} sample row)`)
  }
}

diagIntiniMain().catch((err) => {
  console.error('Fatal:', err)
  process.exit(1)
})
