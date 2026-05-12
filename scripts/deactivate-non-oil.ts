import { supabaseAdmin } from '@/lib/supabase'
import { getInjectionBlock } from '@/lib/learning-injector'

const IREL_IDS = [
  '9070dd4c-3d28-46e3-aaa6-5c3fbc4bf0da',
  '1e562933-fe02-406b-83e2-438cac2c9461',
  'd721c384-50ce-4708-af1d-22ebeed3c15c',
  '9e800c5e-d679-4768-b799-7a606a0e8e7c',
]

async function main() {
  // 1) Deaktivuj 4 Irel ostropestřec produkty
  console.log('=== Deaktivace Irel produktů ===')
  const { error: deactivateErr } = await supabaseAdmin
    .from('products')
    .update({
      status: 'inactive',
      updated_at: new Date().toISOString(),
    })
    .in('id', IREL_IDS)
  if (deactivateErr) {
    console.error('Deaktivace selhala:', deactivateErr.message ?? JSON.stringify(deactivateErr))
  } else {
    console.log(`✓ Deaktivováno ${IREL_IDS.length} Irel produktů`)
  }

  // 2) Full catalog audit na non-oil keywords
  console.log('\n=== Full non-oil audit ===')
  const { data: nonOil, error: auditErr } = await supabaseAdmin
    .from('products')
    .select('id, name, slug, origin_country, status')
    .eq('status', 'active')
    .or([
      "name.ilike.%ostropestř%",
      "name.ilike.%milk thistle%",
      "name.ilike.%silymarin%",
      "name.ilike.%lněn%",
      "name.ilike.%kokos%",
      "name.ilike.%konopn%",
      "name.ilike.%dýňov%",
      "name.ilike.%slunečnic%",
      "name.ilike.%řepkov%",
      "name.ilike.%kondicionér%",
      "name.ilike.%šampon%",
      "name.ilike.%vlasov%",
    ].join(','))
  if (auditErr) console.error('Audit error:', auditErr.message ?? JSON.stringify(auditErr))
  console.log(`Nalezeno podezřelých produktů: ${nonOil?.length ?? 0}`)
  console.log(JSON.stringify(nonOil, null, 2))

  // 3) Vlož lekci do project_learnings
  console.log('\n=== Insert lekce do project_learnings ===')
  const { error: lessonErr } = await supabaseAdmin
    .from('project_learnings')
    .insert({
      category: 'scraper',
      title: 'Non-olivový produkt v katalogu — validateOliveOilProduct() před upsert',
      description: 'Scraper nascrapeoval 4 "Irel olej z Ostropestřce mariánského" (milk thistle) z nestonej.cz. Příčina: scraper procházel obecnou kategorii "oleje" bez keyword filtru na produktové jméno. Fix: validateOliveOilProduct() check před upsert — rejectne produkt pokud název matchuje: ostropestř|milk thistle|silymarin|lněn|konopn|dýňov|slunečnic|řepkov|kondicionér|šampon|vlasov. Funkce přidána do lib/product-scraper.ts + volána v discovery-agent.ts:publishCandidate().',
      source: 'manual_audit_2026-05-12',
      impact: 'high',
      commit_hash: null,
    })
  if (lessonErr) {
    console.error('Lesson insert selhal:', lessonErr.message ?? JSON.stringify(lessonErr))
  } else {
    console.log('✓ Lekce vložena')
  }

  // 4) Ověř injekci přes getInjectionBlock('scraper_agent')
  console.log('\n=== Verify getInjectionBlock(scraper_agent) ===')
  const block = await getInjectionBlock('scraper_agent')
  const hasLesson = block.includes('validateOliveOilProduct') || block.includes('Non-olivový')
  console.log(`Block délka: ${block.length} znaků`)
  console.log(`Nová lekce přítomna: ${hasLesson ? '✓ ANO' : '✗ NE — může být cache (5 min TTL)'}`)
  if (block.length > 0) {
    console.log('\nPrvních 500 znaků bloku:')
    console.log(block.slice(0, 500))
  }
}

main().catch(err => { console.error('FATAL:', err); process.exit(1) })
