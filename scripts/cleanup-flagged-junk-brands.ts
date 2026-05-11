// Den 1 Úkol 1 — Cleanup 30 [JUNK]-flagged brandů.
//
// 3 kategorie:
//   A) Slug je reálný brand, name je špatně → přejmenuj, smaž [JUNK]
//   B) Name i slug jsou OK → jen smaž [JUNK] marker
//   C) Ani name ani slug nejsou brand → produktům brand_slug=null, brand smaž

import { supabaseAdmin } from '@/lib/supabase'

// Brandy kde SLUG je reálný olivový brand, jen name je špatně
// Klíč = slug, hodnota = správné zobrazované jméno
const SLUG_TO_CORRECT_NAME: Record<string, string> = {
  'liophos':      'Liophos',
  'gangalupo':    'Ganga Lupo',
  'echinac':      'Echinac',
  'divella':      'Divella',
  'aristeon':     'Aristeon',
  'callejas':     'Callejas',
  'querciamatta': 'Querciamatta',
  'brigaldara':   'Brigaldara',
  'marmaro':      'Marmaro',
  'petrousa':     'Petrousa',
}

// Brandy kde name i slug jsou OK, stačí smazat [JUNK]
const CLEAR_JUNK_ONLY = new Set(['efzin', 'myrtoo', 'ena', 'pons'])

// Slugy junk brandů — ani name ani slug nejsou brand
// Produkty dostanou brand_slug=null, brand se smaže
const TRULY_JUNK_SLUGS = new Set([
  'extrapanenskeho', 'darkovy',       'dressing',    'extrapanensky',
  'health',          'hypoalergicke', 'lahev',        'limitovana',
  'plech',           'plechovka',     'pet',          'sada',
  'uzeny',           'ev',            'pure',         'nejvyssi',
])

function clearJunkMarker(tldr: string | null): string | null {
  if (!tldr) return null
  const cleaned = tldr.replace(/^\[JUNK\][^\n]*\n*/m, '').trim()
  return cleaned || null
}

async function main() {
  console.log('═══ Cleanup [JUNK] brandů ═══\n')

  const { data: junkBrands, error } = await supabaseAdmin
    .from('brands')
    .select('id, name, slug, tldr, status')
    .like('tldr', '[JUNK]%')
    .order('slug')

  if (error) throw error
  if (!junkBrands?.length) { console.log('Žádné [JUNK] brandy nalezeny.'); return }

  console.log(`Nalezeno ${junkBrands.length} [JUNK] brandů\n`)

  let cleared = 0, renamed = 0, deleted = 0, manual = 0

  for (const brand of junkBrands) {
    const slug = brand.slug as string
    const name = brand.name as string

    // Kategorie B — jen smazat [JUNK]
    if (CLEAR_JUNK_ONLY.has(slug)) {
      const { error: e } = await supabaseAdmin
        .from('brands')
        .update({ tldr: clearJunkMarker(brand.tldr as string) })
        .eq('id', brand.id)
      if (e) { console.log(`  ✗ CLEAR ${name} (${slug}): ${e.message}`); continue }
      console.log(`  ✓ CLEARED [JUNK]  ${name.padEnd(20)} (${slug})`)
      cleared++
      continue
    }

    // Kategorie A — přejmenuj + smazat [JUNK]
    if (SLUG_TO_CORRECT_NAME[slug]) {
      const newName = SLUG_TO_CORRECT_NAME[slug]
      const { error: e } = await supabaseAdmin
        .from('brands')
        .update({ name: newName, tldr: clearJunkMarker(brand.tldr as string) })
        .eq('id', brand.id)
      if (e) { console.log(`  ✗ RENAME ${name}→${newName}: ${e.message}`); continue }
      console.log(`  ✓ RENAMED         "${name}" → "${newName}" (${slug})`)
      renamed++
      continue
    }

    // Kategorie C — opravdu junk → produktům brand_slug=null, brand smazat
    if (TRULY_JUNK_SLUGS.has(slug)) {
      // Počet produktů
      const { count: prodCount } = await supabaseAdmin
        .from('products')
        .select('*', { count: 'exact', head: true })
        .eq('brand_slug', slug)

      // Nullify brand_slug na produktech
      if ((prodCount ?? 0) > 0) {
        const { error: ne } = await supabaseAdmin
          .from('products')
          .update({ brand_slug: null })
          .eq('brand_slug', slug)
        if (ne) { console.log(`  ✗ NULL brand_slug ${slug}: ${ne.message}`); continue }
      }

      // Smazat brand
      const { error: de } = await supabaseAdmin.from('brands').delete().eq('id', brand.id)
      if (de) { console.log(`  ✗ DELETE ${name} (${slug}): ${de.message}`); continue }
      console.log(`  ✗ DELETED         "${name}" (${slug})  — ${prodCount ?? 0} produktů odpojeno`)
      deleted++
      continue
    }

    // Nespadl do žádné kategorie
    console.log(`  ? MANUAL_REVIEW   "${name}" (${slug})`)
    manual++
  }

  console.log(`
═══ Shrnutí ═══
  ✓ Cleared [JUNK] (B):   ${cleared}
  ✓ Renamed (A):           ${renamed}
  ✗ Deleted (C):           ${deleted}
  ? Manual review:         ${manual}
  Cena:                    $0.00 (bez Claude volání)
`)
}

main().catch(err => {
  console.error('FATAL:', err)
  process.exit(1)
})
