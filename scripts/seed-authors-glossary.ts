// Naseeduje default editora + 15 glossary termínů.
// Idempotentní (ON CONFLICT DO NOTHING ekvivalent přes upsert).

import { supabaseAdmin } from '@/lib/supabase'

async function main() {
  // ── Authors seed ──────────────────────────────────────────────────────────
  const { error: authorErr } = await supabaseAdmin
    .from('authors')
    .upsert({
      slug: 'olivator-redakce',
      name: 'Redakce Olivátor',
      title: 'Editorial team',
      bio_short: 'Tým editorů olivator.cz se specializací na olivový olej, středomořskou stravu a spotřebitelskou ochranu. Všechny články prochází redakční kontrolou a jsou založeny na konkrétních datech ze 176+ produktů v katalogu.',
      bio_long: '## O nás\n\nOlivátor je nezávislý srovnávač olivových olejů v ČR. Sledujeme ceny, parametry a kvalitu napříč 18+ prodejci a hodnotíme každý olej proprietárním Olivator Score (kyselost 35 %, certifikace 25 %, kvalita 25 %, cena 15 %).\n\n## Editorial standardy\n\nPíšeme aktivně, přítomným časem, konkrétně. Žádné fráze "skvělý", "prémiový", "výjimečný" bez podpory daty. Každé tvrzení má číslo nebo zdroj.\n\n## Konflikty zájmů\n\nProvozujeme affiliate program s prodejci olivového oleje. Pořadí v žebříčcích NEzávisí na výši provize — řídí se Olivator Score. Affiliate odkazy označujeme transparentně.',
      expertise: ['olivový olej', 'středomořská strava', 'spotřebitelská kvalita', 'EVOO', 'cultivary'],
      credentials: 'Tým redaktorů Olivátor.cz s 2026+ zkušeností v olivovém oleji a foodjournalism.',
      years_experience: 1,
      status: 'active',
    }, { onConflict: 'slug' })

  if (authorErr) console.error('authors seed error:', authorErr.message)
  else console.log('✅ Author "olivator-redakce" seedovaný')

  // ── Glossary terms seed ───────────────────────────────────────────────────
  const terms = [
    { slug: 'evoo', term: 'EVOO', term_alt: 'Extra virgin olive oil, extra panenský olivový olej', definition_short: 'Nejvyšší kategorie olivového oleje dle EU normy. Lisován za studena, kyselost ≤ 0,8 %, žádná chemická úprava, organoleptická kvalita ověřená panelem.', category: 'general' },
    { slug: 'kyselost-olivoveho-oleje', term: 'Kyselost', term_alt: 'Volné mastné kyseliny, oleic acid percentage', definition_short: 'Procentuální obsah volných mastných kyselin. Indikuje čerstvost oliv a kvalitu zpracování. EVOO ≤ 0,8 %, panenský ≤ 2 %, prémiový ≤ 0,3 %.', category: 'chemistry' },
    { slug: 'polyfenoly', term: 'Polyfenoly', term_alt: 'Polyphenols, fenolové sloučeniny', definition_short: 'Antioxidační sloučeniny v olivovém oleji. EU norma povoluje claim "ochrana lipidů" od 250 mg/kg. Rozsah v EVOO: 100-1000 mg/kg.', category: 'chemistry' },
    { slug: 'oleocanthal', term: 'Oleocanthal', term_alt: 'Pikantní polyfenol', definition_short: 'Polyfenol zodpovědný za "pálivý" pocit v hrdle. Beauchamp et al. (2005) prokázali protizánětlivý efekt podobný ibuprofenu.', category: 'chemistry' },
    { slug: 'oleuropein', term: 'Oleuropein', term_alt: 'Hořký polyfenol', definition_short: 'Hlavní polyfenol mladých oliv, zodpovědný za hořkou chuť olivového oleje. Vysoké koncentrace v early harvest olejích.', category: 'chemistry' },
    { slug: 'hydroxytyrosol', term: 'Hydroxytyrosol', term_alt: 'Antioxidant olivového oleje', definition_short: 'Silný antioxidant odvozený od oleuropeinu. EU EFSA potvrdilo health claim pro ochranu LDL cholesterolu.', category: 'chemistry' },
    { slug: 'peroxidove-cislo', term: 'Peroxidové číslo', term_alt: 'Peroxide value, PV', definition_short: 'Měří stupeň oxidace olejů. Norma EVOO: ≤ 20 mEq O2/kg. Vysoká hodnota = stárnutí, nesprávné skladování.', category: 'chemistry' },
    { slug: 'dop', term: 'DOP', term_alt: 'Denominazione di Origine Protetta, Chráněné označení původu', definition_short: 'EU certifikace garantující, že produkt pochází z konkrétní zeměpisné oblasti a používá tradiční metodu výroby. Příklady: Terra di Bari DOP, Kalamata DOP.', category: 'certification' },
    { slug: 'pgi-igp', term: 'PGI / IGP', term_alt: 'Protected Geographical Indication, Chráněné zeměpisné označení', definition_short: 'Slabší geografická vazba než DOP — alespoň jedna fáze výroby (pěstování, lisování, balení) musí být v dané oblasti.', category: 'certification' },
    { slug: 'bio-certifikace', term: 'BIO', term_alt: 'Organic, Ekologické zemědělství', definition_short: 'EU certifikace zaručující, že olej pochází z oliv pěstovaných bez syntetických pesticidů a hnojiv. Cyklus přechodu: 3 roky.', category: 'certification' },
    { slug: 'nyiooc', term: 'NYIOOC', term_alt: 'New York International Olive Oil Competition', definition_short: 'Největší a nejprestižnější mezinárodní soutěž olivových olejů. Tři úrovně: Gold, Silver, Bronze. Vítězové se prezentují na etiketě.', category: 'certification' },
    { slug: 'early-harvest', term: 'Early Harvest', term_alt: 'Předčasná sklizeň, raně lisovaný olej', definition_short: 'Sklizeň oliv ještě nezralých (zelené, říjen-listopad). Vyšší obsah polyfenolů, intenzivnější chuť, ale nižší výnos = vyšší cena.', category: 'process' },
    { slug: 'cold-pressed', term: 'Lisování za studena', term_alt: 'Cold pressed, prima spremitura a freddo', definition_short: 'Mechanická extrakce oleje při teplotě pod 27°C. Zachovává polyfenoly a vitamín E. Povinné pro EVOO.', category: 'process' },
    { slug: 'koroneiki', term: 'Koroneiki', term_alt: 'Řecká odrůda olivovníku', definition_short: 'Nejrozšířenější řecká cultivar, dominantní na Krétě a Peloponésu. Profil: intenzivní ovocnost, hořkost, vysoké polyfenoly.', category: 'cultivar' },
    { slug: 'coratina', term: 'Coratina', term_alt: 'Italská odrůda olivovníku', definition_short: 'Hlavní cultivar Apulie. Velmi intenzivní profil — vysoká hořkost, štiplavost, artičokové tóny. Polyfenoly často 500-1000 mg/kg.', category: 'cultivar' },
  ]

  for (const t of terms) {
    const { error } = await supabaseAdmin.from('glossary_terms').upsert({ ...t, status: 'active' }, { onConflict: 'slug' })
    if (error) console.warn(`  ✗ ${t.slug}: ${error.message}`)
  }

  const { count } = await supabaseAdmin.from('glossary_terms').select('*', { count: 'exact', head: true })
  console.log(`✅ Glossary: ${count} termínů v DB`)
}

main().catch(console.error)
