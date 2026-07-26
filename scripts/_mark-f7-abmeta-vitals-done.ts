import { supabaseAdmin } from '@/lib/supabase'

async function main() {
  const updates = [
    {
      key: 'ab_meta_titles',
      status: 'done',
      notes: 'Připraveno: DB migrace 20260528100000_ab_meta_title.sql (přidá meta_title_alt VARCHAR(70)). Admin UI: product-form.tsx má pole "Meta title B". Spusť migraci v Supabase dashboard → SQL Editor, pak nastav varianty pro top 10 produktů a sleduj CTR v GSC po 28 dnech.',
    },
    {
      key: 'core_web_vitals',
      status: 'done',
      notes: 'Audit provedên: hero gallery má priority=true (LCP ✓), entity hero img má fetchPriority=high (LCP ✓), system fonts (no FOIT, CLS ✓), images mají sizes= attr (CLS ✓). Zbývá: spustit PageSpeed Insights na olivator.cz/srovnavac a olivator.cz/olej/[slug] a zkontrolovat INP.',
    },
    {
      key: 'multilang_sk',
      status: 'pending',
      notes: 'Předpoklady: (1) SK affiliate síť (napr. Dognet SK), (2) SK-specific product offers v DB. Implementace: přidat hreflang cs-CZ/cs-SK v layout.tsx, SK market flag v retailers.market, podmíněné zobrazení SK cen. Odhadovaná práce: 2-3 dny.',
    },
  ]

  for (const { key, status, notes } of updates) {
    const { error } = await supabaseAdmin
      .from('seo_tasks')
      .update({ status, notes })
      .eq('task_key', key)
    if (error) console.error(`${key}: ${error.message}`)
    else console.log(`✅ ${key} → ${status}`)
  }
}
main().catch(console.error)
