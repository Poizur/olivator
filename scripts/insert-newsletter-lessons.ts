import { supabaseAdmin } from '@/lib/supabase'

const lessons = [
  {
    category: 'content_quality',
    title: 'name_short generické slovo v emailu → použij plný název',
    description: 'Pokud name_short je generické slovo ("Extra", "Premium", "Bio"), v emailech zobrazuj plný name nebo "BRAND — krátký název". Generický name_short bez kontextu značky působí kostrbatě a matoucně.',
    source: 'newsletter_test_review_2026-05-12',
    impact: 'low',
  },
  {
    category: 'content_quality',
    title: 'brand_name subset product.name → nezobrazovat obojí',
    description: 'Pokud brand_name je substring product.name (např. brand="SITIA", name="SITIA Kréta Extra"), v emailu zobraz buď "SITIA — Kréta Extra" nebo jen plný název bez brand prefixu. Duplicita brand+name vypadá jako chyba.',
    source: 'newsletter_test_review_2026-05-12',
    impact: 'low',
  },
  {
    category: 'content_quality',
    title: 'Newsletter tón = redakce "my", ne 1. os. sg.',
    description: 'Newsletter je z perspektivy redakce ("my", "nás"). Vyhněte se 1. osobě sg.: "co bych si objednal", "objednal jsem si". Správně: "co bychom si objednali", "doporučujeme", "tento týden máme rádi".',
    source: 'newsletter_test_review_2026-05-12',
    impact: 'low',
  },
  {
    category: 'content_quality',
    title: 'Subject čísla = aktuální fakta, ne marketing',
    description: 'Čísla v subjectu musí být přesná. "377 nových olejů" je zavádějící — jsou to celkový počet v katalogu, ne nové přírůstky. Správně: "V katalogu 377 olejů" nebo "Katalog má 377 položek". Nepsat "nových" pokud to tak není.',
    source: 'newsletter_test_review_2026-05-12',
    impact: 'low',
  },
]

async function main() {
  const { error } = await supabaseAdmin.from('project_learnings').insert(lessons)
  if (error) { console.error('ERR:', error.message ?? JSON.stringify(error)); process.exit(1) }
  console.log(`✓ Vloženo ${lessons.length} lekcí`)
}

main().catch(err => { console.error(err); process.exit(1) })
