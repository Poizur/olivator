/**
 * Opraví stale meta_title a description_short pro produkty bez Score/acidity,
 * kde metadata stále obsahují zastaralé hodnoty ("Score X/100", "kyselost 0,8 %").
 *
 * Pravidlo: odstraňuje číselné Score a kyselost z textu; zachovává zbytek.
 * Spuštění: npx tsx --env-file=.env.local scripts/fix-stale-meta.ts
 */

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

// Regex pro odstranění "Score X/100" a "kyselost X,X %" z libovolného kontextu
const SCORE_RE = /,?\s*Score\s+\d+\/100/gi
const KYSELOST_RE = /,?\s*kyselost\s+[\d,]+\s*%/gi
// "— " před Score nebo kyselostí na konci hlavní části
const DASH_TRAILING_RE = /\s*—\s*[,\s]*(?:,\s*)?(\s*\|\s*Olivator)?$/

function cleanMetaTitle(raw: string): string {
  let s = raw
  s = s.replace(SCORE_RE, '')
  s = s.replace(KYSELOST_RE, '')
  // Vyčisti osamocené " —" na konci před "|"
  s = s.replace(/\s*—\s*(\|\s*Olivator)?$/i, (_, suffix) => suffix ?? '')
  s = s.replace(/\s*,\s*(\|\s*Olivator)/i, ' $1')
  // Přidej "| Olivator" pokud chybí
  if (!/\|\s*Olivator/i.test(s)) s = s.trimEnd() + ' | Olivator'
  // Smaž duplicitní mezery
  s = s.replace(/\s{2,}/g, ' ').trim()
  // Zkrátit na 70 znaků pokud překračuje
  if (s.length > 70) {
    const suffix = ' | Olivator'
    s = s.slice(0, 70 - suffix.length).trimEnd() + suffix
  }
  return s
}

function cleanDescriptionShort(raw: string): string {
  let s = raw
  // Odstraň "s kyselostí 0,8 %" nebo "kyselostí 0,8 %," uprostřed věty
  s = s.replace(/\s*s kyselostí [\d,]+\s*%\s*/gi, ' ')
  s = s.replace(/kyselostí [\d,]+\s*%[,\s]*/gi, '')
  // Odstraň "a kyselostí X,X %"
  s = s.replace(/\s+a kyselostí [\d,]+\s*%/gi, '')
  // Smaž "Score X/100" výskyty (nestandardní v description, ale pro jistotu)
  s = s.replace(SCORE_RE, '')
  // Vyčisti dvojité mezery a tečky
  s = s.replace(/\s{2,}/g, ' ').trim()
  // Oprav ". ." nebo ".. "
  s = s.replace(/\.\s*\./g, '.')
  return s
}

async function main() {
  const { data: products, error } = await supabase
    .from('products')
    .select('id, slug, name, meta_title, description_short')
    .is('acidity', null)
    .is('olivator_score', null)
    .eq('status', 'active')
    .ilike('meta_title', '%Score%')
    .order('name')

  if (error) { console.error('Fetch error:', error); process.exit(1) }
  if (!products?.length) { console.log('Žádné produkty k opravě.'); return }

  console.log(`\nOpravuji ${products.length} produktů...\n`)

  const updates: Array<{ id: string; meta_title: string; description_short: string | null }> = []

  for (const p of products) {
    const newMeta = cleanMetaTitle(p.meta_title ?? '')
    const newDesc = p.description_short ? cleanDescriptionShort(p.description_short) : null

    console.log(`\n[${p.slug}]`)
    console.log(`  meta PŘED:  ${p.meta_title}`)
    console.log(`  meta PO:    ${newMeta}`)
    if (p.description_short !== newDesc) {
      console.log(`  desc PŘED:  ${p.description_short?.slice(0, 120)}`)
      console.log(`  desc PO:    ${newDesc?.slice(0, 120)}`)
    }

    updates.push({ id: p.id, meta_title: newMeta, description_short: newDesc })
  }

  console.log('\n--- Aplikuji...')

  for (const u of updates) {
    const { error: upErr } = await supabase
      .from('products')
      .update({ meta_title: u.meta_title, description_short: u.description_short, updated_at: new Date().toISOString() })
      .eq('id', u.id)

    if (upErr) console.error(`  CHYBA ${u.id}:`, upErr)
    else console.log(`  ✓ ${u.id}`)
  }

  console.log(`\nHotovo — ${updates.length} produktů aktualizováno.`)
}

main()
