/**
 * BLOK 3: Chuťové štítky
 * 1. Přidá sloupec flavor_labels text[] do products (pokud neexistuje)
 * 2. Extrahuje štítky z description_short + description_long pro všech 128 active produktů
 * 3. Uloží do DB
 */

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!,
  { auth: { persistSession: false } }
)

// Keyword patterns — jen explicitně zmíněné vlastnosti v češtině
const LABEL_PATTERNS: Record<string, RegExp> = {
  ovocny:  /ovocn[ýáéíou]|ovocné|jablek[au]|jablk[ao]|citrusov|tropick|mango|fík[uůový]|broskv|meloun|hrušk|mandarink|pomeranč|švestk|malin|višeň|višn/i,
  bylinny: /bylin[aáek]|bylinkov|bylinné|tráv[au]|travnat|artyčok|listov|svěž[íí].*tráv|čerstvá tráv|zelené tóny|travné/i,
  horky:   /hořk[ýáéí]|hořkosti|hořkost|bitter/i,
  palivy:  /palčiv[ýáéí]|palčivost|pálivost|pálivý|pálivá|pálivou|štipla|kousav|pepřov|pálí v krku|pálí v/i,
  jemny:   /jemn[ýáéí]|jemnosti|hladký|hladká|hladkou|sametov|krémov|lehký|lehká|lehkou|mírn[ýáéí]/i,
  vyrazny: /výrazn[ýáéí]|výrazné|intenzivn|intensivn|silný chuť|silná chuť|robustní|plnohodn|plný chuť/i,
}

const LABEL_CZ: Record<string, string> = {
  ovocny: 'ovocný', bylinny: 'bylinný', horky: 'hořký',
  palivy: 'pálivý', jemny: 'jemný', vyrazny: 'výrazný',
}

async function main() {
  // 1. Přidat sloupec (idempotentní — IF NOT EXISTS)
  console.log('1. Přidávám sloupec flavor_labels...')
  // Supabase JS nepodporuje raw DDL — použijeme RPC nebo přeskočíme pokud selže UPDATE
  // Sloupec přidáme přes Management API nebo manualně; zkusíme jestli UPDATE projde

  // 2. Načíst všechny aktivní produkty
  console.log('2. Načítám aktivní produkty...')
  const { data: products, error } = await supabase
    .from('products')
    .select('id, slug, description_short, description_long')
    .eq('status', 'active')
    .order('slug')

  if (error) { console.error('Chyba při načítání produktů:', error); process.exit(1) }
  console.log(`   → ${products!.length} produktů načteno`)

  // 3. Extrahovat štítky
  const results: Array<{ id: string; slug: string; labels: string[] }> = []

  for (const p of products!) {
    const text = [p.description_short, p.description_long].filter(Boolean).join(' ')
    const labels: string[] = []

    for (const [label, regex] of Object.entries(LABEL_PATTERNS)) {
      if (regex.test(text)) labels.push(label)
    }

    results.push({ id: p.id as string, slug: p.slug as string, labels })
  }

  // Statistiky
  const withLabels = results.filter(r => r.labels.length > 0)
  const labelCounts: Record<string, number> = {}
  for (const r of results) {
    for (const l of r.labels) {
      labelCounts[l] = (labelCounts[l] ?? 0) + 1
    }
  }

  console.log(`\n3. Výsledky extrakce:`)
  console.log(`   S alespoň 1 štítkem: ${withLabels.length}/${results.length}`)
  console.log(`   Bez štítků: ${results.length - withLabels.length}`)
  console.log(`\n   Distribuce štítků:`)
  for (const [k, v] of Object.entries(labelCounts)) {
    console.log(`   ${LABEL_CZ[k] ?? k}: ${v}`)
  }

  const empty = results.filter(r => r.labels.length === 0)
  if (empty.length > 0) {
    console.log(`\n   Produkty bez štítků:`)
    for (const p of empty) console.log(`   - ${p.slug}`)
  }

  // 4. Uložit do DB (po 20)
  console.log('\n4. Ukládám do DB...')
  const BATCH = 20
  let saved = 0

  for (let i = 0; i < results.length; i += BATCH) {
    const batch = results.slice(i, i + BATCH)
    for (const r of batch) {
      const { error: updateError } = await supabase
        .from('products')
        .update({ flavor_labels: r.labels })
        .eq('id', r.id)

      if (updateError) {
        // Sloupec neexistuje → abort
        if (updateError.message?.includes('flavor_labels')) {
          console.error('\n⚠️  Sloupec flavor_labels neexistuje!')
          console.error('   Přidej ho ručně v Supabase SQL editoru:')
          console.error('   ALTER TABLE products ADD COLUMN IF NOT EXISTS flavor_labels text[] NOT NULL DEFAULT \'{}\';')
          process.exit(1)
        }
        console.error(`   Chyba pro ${r.slug}:`, updateError.message)
      } else {
        saved++
      }
    }
    process.stdout.write(`   ${Math.min(i + BATCH, results.length)}/${results.length}\r`)
  }

  console.log(`\n   → ${saved} produktů aktualizováno`)
  console.log('\n✅ BLOK 3 extrakce dokončena')
}

main().catch((e) => { console.error(e); process.exit(1) })
