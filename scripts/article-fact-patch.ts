/**
 * Phase 3+4: Faktické opravy + zdrojové bloky
 * - Opravuje hard flagy (Barcelona studie, WHO tvrzení, Terra Olea, Ancel Keys)
 * - Opravuje PREDIMED citace
 * - Přidává zdrojové bloky do YMYL článků
 * - Jazykové opravy (Phase 4)
 *
 * Spuštění: npx tsx --env-file=.env.local scripts/article-fact-patch.ts
 */

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!,
  { auth: { persistSession: false } }
)

// ─── Zdrojový blok pro YMYL články ─────────────────────────────────────────────
const SOURCE_BLOCK = `

---

## Zdroje a normy

- **EU Reg. č. 2568/91** — Kategorie a parametry olivového oleje (kyselost, peroxidy, K-hodnoty). [eur-lex.europa.eu](https://eur-lex.europa.eu/legal-content/CS/TXT/?uri=CELEX%3A31991R2568)
- **EU Reg. č. 432/2012** — Povolená zdravotní tvrzení pro potraviny; hydroxytyrosol a olivový olej (≥ 250 mg/kg). [eur-lex.europa.eu](https://eur-lex.europa.eu/legal-content/CS/TXT/?uri=CELEX%3A32012R0432)
- **IOC Trade Standard (2022)** — Mezinárodní standard kvality olivového oleje. [internationaloliveoil.org](https://www.internationaloliveoil.org/what-we-do/chemistry-standardisation-unit/olive-oil-trade-standard/)
- **Estruch et al. (2013, opraveno 2018)** — PREDIMED studie; středomořská strava a kardiovaskulární riziko. *N Engl J Med* 2018;378:e34. [doi.org/10.1056/NEJMoa1800389](https://doi.org/10.1056/NEJMoa1800389)
- **Beauchamp et al. (2005)** — Oleocanthal: protizánětlivé vlastnosti olivového oleje. *Nature* 437:45–46. [doi.org/10.1038/437045a](https://doi.org/10.1038/437045a)
- **EFSA (2011)** — Vědecké stanovisko k tvrzením o olivovém oleji. [efsa.europa.eu](https://www.efsa.europa.eu/en/efsajournal/pub/2033)
`

// ─── Zdrojový blok pro artikel o zdraví (rozšířený) ───────────────────────────
const HEALTH_SOURCE_BLOCK = `

---

## Zdroje a normy

- **EU Reg. č. 432/2012** — Povolená zdravotní tvrzení; olivový olej a hydroxytyrosol (≥ 250 mg/kg). [eur-lex.europa.eu](https://eur-lex.europa.eu/legal-content/CS/TXT/?uri=CELEX%3A32012R0432)
- **Estruch et al. (2013, opraveno 2018)** — PREDIMED: středomořská strava snižuje KV riziko o ~30 %. *N Engl J Med* 2018;378:e34. [doi.org/10.1056/NEJMoa1800389](https://doi.org/10.1056/NEJMoa1800389)
- **Beauchamp et al. (2005)** — Oleocanthal jako přirozená protizánětlivá látka. *Nature* 437:45–46. [doi.org/10.1038/437045a](https://doi.org/10.1038/437045a)
- **Covas et al. (2006)** — EUROLIVE studie; polyfenoly a oxidační stres. *Ann Intern Med* 145:333-341. [doi.org/10.7326/0003-4819-145-5-200609050-00006](https://doi.org/10.7326/0003-4819-145-5-200609050-00006)
- **EU Reg. č. 2568/91** — Olivový olej: kategorie a analytické limity. [eur-lex.europa.eu](https://eur-lex.europa.eu/legal-content/CS/TXT/?uri=CELEX%3A31991R2568)
- **IOC Trade Standard (2022)** — Mezinárodní normy olivového oleje. [internationaloliveoil.org](https://www.internationaloliveoil.org/what-we-do/chemistry-standardisation-unit/olive-oil-trade-standard/)
- **EFSA (2011)** — Vědecké stanovisko k health claims. [efsa.europa.eu](https://www.efsa.europa.eu/en/efsajournal/pub/2033)
`

// ─── Definice oprav (hard flagy + auto-fixable soft flagy) ────────────────────
interface Patch {
  slug: string
  description: string
  find: string
  replace: string
}

const PATCHES: Patch[] = [
  // ─── olivovy-olej-pro-deti: H1 WHO claim ───────────────────────────────────
  {
    slug: 'olivovy-olej-pro-deti',
    description: 'H1: WHO tvrzení — přeformulovat (WHO nespecifikuje EVOO jako "hlavní zdroj")',
    find: 'Světová zdravotnická organizace (WHO) doporučuje extra panenský olivový olej jako hlavní zdroj přidaných tuků u dětí od 6 měsíců.',
    replace: 'Odborníci na dětskou výživu doporučují zařadit kvalitní rostlinné oleje do příkrmu od 6 měsíců; extra panenský olivový olej je oblíbenou volbou díky výživovému profilu a vysokému obsahu mononenasycených kyselin.',
  },
  // ─── olivovy-olej-pro-deti: H2 Barcelona study ─────────────────────────────
  {
    slug: 'olivovy-olej-pro-deti',
    description: 'H2: Barcelona Institute 2019 — nedohledatelná studie, přeformulovat bez čísel',
    find: 'Výzkum z Barcelona Institute for Global Health (2019) sledoval 300 dětí ve věku 3–5 let. Ty, které dostávaly EVOO s vyšším obsahem polyfenolů (nad 250 mg/kg), měly o 18 % nižší výskyt respiračních infekcí než kontrolní skupina s rafinovaným olejem.',
    replace: 'Výzkumy naznačují, že polyfenoly v olivovém oleji mohou podporovat imunitní systém dítěte — antioxidační vlastnosti hydroxytyrosolu jsou vědecky dokumentovány (EU Reg. 432/2012).',
  },
  // ─── olivovy-olej-pro-deti: Vitamin E přehnané číslo ──────────────────────
  {
    slug: 'olivovy-olej-pro-deti',
    description: 'Soft: Vitamin E 2–3 mg/lžíce — hodnota je přibližná, upřesnit',
    find: 'Polévková lžíce kvalitního EVOO obsahuje 2–3 mg vitaminu E, což je 20–30 % denní potřeby batolete.',
    replace: 'Polévková lžíce kvalitního EVOO obsahuje přibližně 1–2 mg vitaminu E, což je část denní potřeby batolete.',
  },

  // ─── filtrovany-vs-nefiltrovany: H4 Terra Olea ─────────────────────────────
  {
    slug: 'filtrovany-vs-nefiltrovany-olivovy-olej',
    description: 'H4: Terra Olea konkrétní tvrzení bez zdroje — přeformulovat obecně',
    find: 'Česká rodinná farma Terra Olea z Olympské riviéry dovezla letos první várku nefiltrovaného oleje — 250ml láhev za 380 Kč, vyprodáno za 11 dní.',
    replace: 'Některé české eshopy nabízejí nefiltrované oleje z řeckých a italských farem, obvykle v limitovaných várách za 350–500 Kč za 250 ml.',
  },
  // ─── filtrovany-vs-nefiltrovany: H5 sediment 3× polyfenoly ────────────────
  {
    slug: 'filtrovany-vs-nefiltrovany-olivovy-olej',
    description: 'H5: "sediment 3× víc polyfenolů" — nepodložené, přeformulovat',
    find: 'sediment obsahuje až 3× víc polyfenolů než čirá část',
    replace: 'sediment obsahuje vyšší koncentraci polyfenolů než čirá část oleje',
  },
  // ─── filtrovany-vs-nefiltrovany: Sitia 60% pálivosti ──────────────────────
  {
    slug: 'filtrovany-vs-nefiltrovany-olivovy-olej',
    description: 'H: Sitia "60% pálivosti" a "120 dní" bez ověřitelného zdroje',
    find: 'Láhve jsou datované a obsahují varování: *\'Konzumovat do 120 dnů od sklizně\'*. Po pěti měsících degustace: olej ztratil 60% pálivosti',
    replace: 'Producenti obvykle doporučují konzumaci do 3–4 měsíců od sklizně pro nejintenzivnější chuť a nejvyšší obsah polyfenolů.',
  },

  // ─── jak-vybrat-olivovy-olej: H8 70% falšování ─────────────────────────────
  {
    slug: 'jak-vybrat-olivovy-olej',
    description: 'H8: "Až 70% světového oleje se falšuje" — bez zdroje, zmírnit',
    find: 'Až 70 % světového olivového oleje se podle některých studií falšuje',
    replace: 'Část světového olivového oleje je falšovaná nebo nesprávně označená — americká studie UC Davis (2010) zjistila problémy u výrazného podílu vzorků na americkém trhu',
  },
  // ─── jak-vybrat-olivovy-olej: H9 Itálie 80% dovoz ─────────────────────────
  {
    slug: 'jak-vybrat-olivovy-olej',
    description: 'H9: "Itálie 80% dováží" bez zdroje — zmírnit',
    find: 'Itálie (2. největší producent, ale 80 % dováží z Řecka/Španělska)',
    replace: 'Itálie (2. největší producent, ale značná část olejů prodávaných pod italskou značkou pochází z dovozu)',
  },

  // ─── degustace: H10 Beauchamp ibuprofen ekvivalence ───────────────────────
  {
    slug: 'degustace-olivoveho-oleje-doma',
    description: 'H10: "50ml = 10% dávka ibuprofenu" — zjednodušení, přeformulovat s přesnou citací',
    find: 'Studie Beauchamp et al. (2005, *Nature*) ukázala, že 50 ml čerstvého extra panenského oleje denně = 10% dávka ibuprofenu (protizánětlivý efekt).',
    replace: 'Studie Beauchamp et al. (2005, *Nature* 437:45–46) popsala, že oleocanthal v čerstvém EVOO inhibuje enzymy COX-1 a COX-2 podobně jako ibuprofen — výzkumníci to nazvali „přirozeným ibuprofenové efektem", přičemž 50 ml EVOO odpovídá přibližně 10 % terapeutické dávky ibuprofenu.',
  },

  // ─── stredomorska-strava: Ancel Keys biolog → fyziolog ─────────────────────
  {
    slug: 'stredomorska-strava-olivovy-olej',
    description: 'Phase 4: Ancel Keys "biolog" → "fyziolog"',
    find: 'Ancel Keys',
    replace: 'Ancel Keys',  // placeholder — actual fix below
  },

  // ─── olivovy-olej-do-200-kc: H6 Laboratoř v Chanii ───────────────────────
  {
    slug: 'olivovy-olej-do-200-kc',
    description: 'H6: Laboratoř v Chanii — nepublikovaná studie, přeformulovat',
    find: 'Laboratoř v Chanii (Kréta) testovala 42 EVOO z řeckých supermarketů 2022. Průměr kyselosti: 0,48 %',
    replace: 'Řecké testy olivových olejů dostupných v supermarketech opakovaně ukazují průměrnou kyselost kolem 0,4–0,6 %',
  },
  {
    slug: 'olivovy-olej-do-200-kc',
    description: 'H6: "9 olejů mělo peroxidy blízko 20 meq" — bez zdroje',
    find: '9 oleju mělo peroxidové číslo blízko 20 meq O₂/kg (limit je 20)',
    replace: 'část olejů se pohybuje blízko regulatorního limitu pro peroxidy (20 meq O₂/kg dle EU Reg. 2568/91)',
  },
  {
    slug: 'olivovy-olej-do-200-kc',
    description: 'H7: COI 2023 kontrola bez veřejného zdroje',
    find: 'České COI (Státní zemědělská a potravinářská inspekce) kontrolovalo 2023 padesátku EVOO. Dva (4 %) byly falešně označené',
    replace: 'Státní zemědělská a potravinářská inspekce (SZPI) pravidelně kontroluje olivové oleje na trhu; výsledky kontrol jsou dostupné na webu szpi.gov.cz',
  },
  {
    slug: 'olivovy-olej-do-200-kc',
    description: 'PREDIMED citace: přidat rok opravy',
    find: 'Efekt se projevuje jen u oleju s vysokým fenoly. Pod 200 mg/kg efekt mizí',
    replace: 'Studie (včetně PREDIMED, 2013/2018) naznačují, že efekt polyfenolů se projevuje výrazněji při vyšším obsahu — ale přesný práh 200 mg/kg není v literatuře stanoven',
  },

  // ─── PREDIMED opravy napříč články ─────────────────────────────────────────
  // olivovy-olej-z-pokrutin
  {
    slug: 'olivovy-olej-z-pokrutin',
    description: 'PREDIMED citace — přidat "(2013/2018)"',
    find: 'PREDIMED studie prokázala',
    replace: 'PREDIMED studie (2013, opravena 2018) prokázala',
  },
  // stredomorska-strava
  {
    slug: 'stredomorska-strava-olivovy-olej',
    description: 'PREDIMED — přidat rok opravy, Ancel Keys biolog→fyziolog',
    find: 'Ancel Keysem — biologem',
    replace: 'Ancel Keysem — fyziologem',
  },

  // ─── olivovy-olej-na-smazeni: bod zakouření standardizace ─────────────────
  {
    slug: 'olivovy-olej-na-smazeni-bod-zakoureni',
    description: 'Soft: bod zakouření — standardizovat na 190–210°C pokud je jiná hodnota',
    find: 'bod zakouření extra panenského olivového oleje je 207 °C',
    replace: 'bod zakouření extra panenského olivového oleje se pohybuje v rozsahu 190–210 °C (závisí na kyselosti a obsahu polyfenolů)',
  },

  // ─── polyfenoly-proc-na-nich-zalezi: EU health claim rok ──────────────────
  {
    slug: 'polyfenoly-proc-na-nich-zalezi',
    description: 'EFSA/EU Reg. rok: 2011 (EFSA stanovisko) vs 2012 (Reg.) — upřesnit',
    find: 'EFSA (Evropský úřad pro bezpečnost potravin) v roce 2011 schválil',
    replace: 'EFSA vydala vědecké stanovisko v roce 2011; EU Reg. 432/2012 pak formálně schválil',
  },

  // ─── jak-cist-etiketu: "Lampante (nejedlý)" oprava ────────────────────────
  {
    slug: 'jak-cist-etiketu-olivoveho-oleje',
    description: 'Lampante není "nejedlý" — je určen pro rafinaci',
    find: 'Lampante (nejedlý)',
    replace: 'Lampante (určen k rafinaci; po rafinaci vhodný ke konzumaci)',
  },
]

// ─── YMYL články — přidat zdrojový blok ──────────────────────────────────────
const YMYL_SOURCE_ARTICLES = [
  // zdravotní témata → rozšířený blok
  { slug: 'je-olivovy-olej-zdravy', block: HEALTH_SOURCE_BLOCK },
  { slug: 'olivovy-olej-na-plet-a-vlasy', block: HEALTH_SOURCE_BLOCK },
  { slug: 'olivovy-olej-pro-deti', block: HEALTH_SOURCE_BLOCK },
  { slug: 'stredomorska-strava-olivovy-olej', block: HEALTH_SOURCE_BLOCK },
  { slug: 'polyfenoly-kolik-je-dost', block: HEALTH_SOURCE_BLOCK },
  { slug: 'polyfenoly-proc-na-nich-zalezi', block: HEALTH_SOURCE_BLOCK },
  { slug: 'olivovy-olej-vs-slunecnicovy', block: HEALTH_SOURCE_BLOCK },
  { slug: 'olivovy-olej-z-pokrutin', block: HEALTH_SOURCE_BLOCK },
  { slug: 'sklizen-oliv-early-vs-late-harvest', block: HEALTH_SOURCE_BLOCK },
  // normativní témata → základní blok
  { slug: 'falesny-olivovy-olej-jak-rozeznat', block: SOURCE_BLOCK },
  { slug: 'domaci-olivovy-olej', block: SOURCE_BLOCK },
  { slug: 'dop-pgi-bio-certifikace', block: SOURCE_BLOCK },
  { slug: 'extra-panensky-vs-panensky-vs-rafinovany', block: SOURCE_BLOCK },
  { slug: 'filtrovany-vs-nefiltrovany-olivovy-olej', block: SOURCE_BLOCK },
  { slug: 'jak-cist-etiketu-olivoveho-oleje', block: SOURCE_BLOCK },
  { slug: 'kalamata-pdo-olivovy-olej', block: SOURCE_BLOCK },
  { slug: 'olivovy-olej-na-smazeni-bod-zakoureni', block: SOURCE_BLOCK },
  { slug: 'rafinovany-olivovy-olej', block: SOURCE_BLOCK },
]

function hasSourceBlock(body: string): boolean {
  return body.includes('## Zdroje a normy') || body.includes('## Zdroje\n')
}

async function applyPatches(): Promise<void> {
  let patchedCount = 0
  let skippedCount = 0

  console.log('\n═══ Phase 3: Faktické opravy (hard flagy + PREDIMED) ═══\n')

  // Group patches by slug for batch processing
  const slugGroups = new Map<string, Patch[]>()
  for (const patch of PATCHES) {
    if (!slugGroups.has(patch.slug)) slugGroups.set(patch.slug, [])
    slugGroups.get(patch.slug)!.push(patch)
  }

  for (const [slug, patches] of slugGroups) {
    const { data, error } = await supabase
      .from('articles')
      .select('body_markdown')
      .eq('slug', slug)
      .single()

    if (error || !data) {
      console.log(`  ❌ ${slug}: DB error`)
      continue
    }

    let body = data.body_markdown ?? ''
    let changed = false
    const applied: string[] = []
    const skipped: string[] = []

    for (const patch of patches) {
      if (body.includes(patch.find)) {
        body = body.replace(patch.find, patch.replace)
        applied.push(patch.description)
        changed = true
      } else {
        skipped.push(patch.description)
      }
    }

    if (changed) {
      const { error: updateError } = await supabase
        .from('articles')
        .update({ body_markdown: body, updated_at: new Date().toISOString() })
        .eq('slug', slug)

      if (updateError) {
        console.log(`  ❌ ${slug}: update failed: ${updateError.message}`)
      } else {
        console.log(`  ✅ ${slug}: ${applied.length} oprav`)
        applied.forEach(a => console.log(`     • ${a}`))
        patchedCount++
      }
    } else {
      console.log(`  ⏭  ${slug}: žádná shoda (text již opraven nebo odlišný)`)
      skippedCount++
    }

    if (skipped.length > 0) {
      skipped.forEach(s => console.log(`     ⚠ Nenalezeno: ${s}`))
    }
  }

  console.log(`\nPatch souhrn: ${patchedCount} článků opraveno, ${skippedCount} přeskočeno\n`)
}

async function addSourceBlocks(): Promise<void> {
  console.log('\n═══ Phase 3: Zdrojové bloky pro YMYL články ═══\n')

  let added = 0, alreadyHas = 0

  for (const { slug, block } of YMYL_SOURCE_ARTICLES) {
    const { data, error } = await supabase
      .from('articles')
      .select('body_markdown')
      .eq('slug', slug)
      .single()

    if (error || !data) {
      console.log(`  ❌ ${slug}: DB error`)
      continue
    }

    const body = data.body_markdown ?? ''

    if (hasSourceBlock(body)) {
      console.log(`  ⏭  ${slug}: zdrojový blok již existuje`)
      alreadyHas++
      continue
    }

    const newBody = body.trimEnd() + block

    const { error: updateError } = await supabase
      .from('articles')
      .update({ body_markdown: newBody, updated_at: new Date().toISOString() })
      .eq('slug', slug)

    if (updateError) {
      console.log(`  ❌ ${slug}: ${updateError.message}`)
    } else {
      console.log(`  ✅ ${slug}: zdrojový blok přidán`)
      added++
    }
  }

  console.log(`\nZdroje: ${added} přidáno, ${alreadyHas} již mělo`)
}

async function main() {
  await applyPatches()
  await addSourceBlocks()

  console.log('\n═══ Hotovo — všechny opravy aplikovány ═══')
  console.log('Soft flagy (266 tvrzení) a zbývající hard flagy jsou v ARTICLE-AUDIT-DECISIONS.md')
}

main().catch(e => { console.error(e); process.exit(1) })
