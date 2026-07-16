// One-shot import script: vloží 15 lekcí z project_learnings.md do DB tabulky `learnings`.
// Spuštění: env -u ANTHROPIC_API_KEY npx tsx --env-file=.env.local scripts/import-learnings.ts

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!,
  { auth: { persistSession: false } }
)

const LEARNINGS = [
  {
    code: 'L-001',
    title: 'Kód do produkce VŽDY před daty',
    category: 'architecture',
    impact: 'high',
    context: 'Token systém {{product:slug}} — DB article byl PATCH-ován s tokeny v 06:30 UTC, ale feature branch ještě nebyl na main ani na Railway.',
    observation: 'Live web zobrazoval raw token text {{product:picual-5-l-...}} jako odstavec textu.',
    rule: 'Při změnách kombinujících kód + data (nová syntaxe, nový formát, nové DB sloupce) MUSÍ jít kód do produkce DŘÍVE než data. Pořadí: git merge → ověřit Railway deploy → TEPRVE PAK patch DB.',
    keywords: ['deployment', 'tokens', 'prod-before-data', 'kód-před-daty'],
    related_tickets: [],
  },
  {
    code: 'L-002',
    title: 'Context injection musí být tematicky relevantní, ne obecná',
    category: 'editorial',
    impact: 'high',
    context: 'Articles o polyfenolech dostávaly catalog sorted by Olivator Score. Evolia Platinum 2777 mg/kg nebyla v katalogu vůbec.',
    observation: 'Claude doporučoval oleje s 456–724 mg/kg v článku o polyfenolech jako top picks.',
    rule: 'Article o dimenzi X dostává katalog seřazený podle X, ne podle obecného Score. Implementace: focus_dimension field v ArticleBrief. NIKDY auto-detect z body_markdown.',
    keywords: ['context-injection', 'focus-dimension', 'catalog', 'article-brief'],
    related_tickets: [],
  },
  {
    code: 'L-003',
    title: 'Truncated body_markdown — tichá chyba bez detekce',
    category: 'editorial',
    impact: 'medium',
    context: 'Článek recky-vs-italsky měl body_markdown ukončený uprostřed věty na 10 419 znacích. Chyběla celá sekce a FAQ.',
    observation: 'Validátor produktových tokenů to nezachytil — kontroloval jen přítomnost tokenů, ne strukturální celistvost.',
    rule: 'Validátor MUSÍ zahrnovat heuristiku: poslední znak musí být . ! ? nebo \\n, min délka = 12 000 znaků pro full article, absence H2 "Závěr" nebo "FAQ" = warning.',
    keywords: ['truncation', 'validation', 'body-length', 'article-completeness'],
    related_tickets: [],
  },
  {
    code: 'L-004',
    title: 'Dávka 2 tokenizace — latentní, ne akutní',
    category: 'editorial',
    impact: 'medium',
    context: '9 aktivních článků s non-null focus_dimension má plain /olej/ markdown linky místo {{product:...}} tokenů.',
    observation: 'Articles na live webu nevznikají rozbité karty — linky fungují normálně, jen nejsou produktové karty.',
    rule: 'Články s focus_dimension a plain /olej/ linky nejsou akutní, dokud neaktivujeme Dávku 2. Akutní je až při rozhodnutí tokenizovat. Postup stejný jako Dávka 1 (B).',
    keywords: ['tokenization', 'batch', 'plaintext-links', 'davka-2'],
    related_tickets: [],
  },
  {
    code: 'L-005',
    title: 'Context injection dá správnou kategorii, ale ne správnou cenu/balení',
    category: 'editorial',
    impact: 'medium',
    context: 'Článek olivovy-olej-na-plet-a-vlasy (focus:polyphenols). Model zvolil produkty s poly >700, ale ceny 92–160 Kč/100ml a balení 3L/5L.',
    observation: 'focus_dimension=polyphenols seřadí katalog sestupně dle poly, ale nefiltruje podle ceny ani balení.',
    rule: 'Pokud má článek specifický cenový nebo balení limit, MUSÍ být v briefPoints explicitně: cenové okno, filtr balení, případně negative constraint.',
    keywords: ['context-injection', 'price-filter', 'cosmetics', 'brief-points'],
    related_tickets: [],
  },
  {
    code: 'L-006',
    title: 'Kanibalizace titulů: dva aktivní články na stejný keyword',
    category: 'seo',
    impact: 'high',
    context: 'Dva aktivní články začínaly "Je olivový olej zdravý?" — Google rozdělil pozice, žádná nedostala silnou pozici.',
    observation: 'Odhaleno při WEAK keyword auditu. Google nerozliší canonical záměr při shodném primary keyword.',
    rule: 'Před publikací nového článku MUSÍ proběhnout kanibalizační check. Rozhodnutí: A) konsolidovat (merge + 301) nebo B) jasně diferencovat intent. Nikdy nespouštět dva aktivní články se stejným primary keyword.',
    keywords: ['cannibalization', 'title', 'duplicate-keyword', 'seo-audit'],
    related_tickets: [],
  },
  {
    code: 'L-007',
    title: 'Identický title prefix kanibalizuje i při odlišném intentu',
    category: 'seo',
    impact: 'medium',
    context: 'polyfenoly-kolik-je-dost a polyfenoly-proc-na-nich-zalezi — oba začínali "Polyfenoly v olivovém oleji:" přestože jiný intent.',
    observation: 'Google nedokáže rozlišit canonical záměr při stejném prefixu → dělí Page Authority.',
    rule: 'Každý článek MUSÍ mít unikátní úvodní 3–4 slova v meta_title i H1. Nestačí odlišný záměr — stejný prefix = Google je zpracuje jako konkurenční.',
    keywords: ['title-prefix', 'cannibalization', 'h1', 'page-authority'],
    related_tickets: [],
  },
  {
    code: 'L-008',
    title: 'Homepage title/H1 změna je strategická, ne jen SEO',
    category: 'seo',
    impact: 'medium',
    context: 'Homepage měla H1 "Olík — najde tvůj olej za 5 sekund" — nulový keyword overlap, ale 100% brand identity.',
    observation: 'Čistě SEO řešení by degradovalo brand differenciátor.',
    rule: 'Keyword integrace do brandu, ne brand redukce kvůli keywordu. Při SEO úpravách homepage vždy nabídnout variantu s brand preservací. Nikdy nedegraduj brand hero element na H2 bez souhlasu Architekta.',
    keywords: ['homepage', 'h1', 'brand', 'seo-vs-brand'],
    related_tickets: [],
  },
  {
    code: 'L-009',
    title: 'Inline parametry produktu vedle tokenu = drift risk',
    category: 'editorial',
    impact: 'medium',
    context: 'Generace článku olivovy-olej-ve-spreji — Claude zapsal inline text s konkrétními čísly (0,14 %, 293 mg/kg, 349 Kč) vedle {{product:SLUG}} tokenů.',
    observation: 'Čísla pocházejí z katalogu v čase generace — v DB se cena a dostupnost mění denně.',
    rule: 'Při použití {{product:slug}} tokenu NEPSAT inline parametry v okolním textu. Token sám zobrazuje aktuální data z DB. Kontextový text = popis POUŽITÍ / CHARAKTERU, ne parametrů.',
    keywords: ['token', 'inline-params', 'drift', 'product-card'],
    related_tickets: [],
  },
  {
    code: 'L-010',
    title: 'Affiliate metriky musí rozlišovat 3 stavy offers, ne 2',
    category: 'affiliate',
    impact: 'high',
    context: 'Týdenní manager report hlásil "100 % offers bez affiliate URL" jako kritický problém. Audit odhalil, že /go/ route funguje správně pro eHUB template retailery.',
    observation: 'lib/manager-agent.ts počítal !affiliate_url jako "chybí", bez ohledu na retailer.base_tracking_url template.',
    rule: '3 stavy: 1) affiliate_url IS NOT NULL → OK. 2) affiliate_url IS NULL + retailer.base_tracking_url EXISTS → template fallback, OK. 3) obojí NULL → skutečný problém.',
    keywords: ['affiliate-url', 'template', 'metrics', 'manager-report', 'ehub'],
    related_commit: '698ff05',
    related_tickets: [],
  },
  {
    code: 'L-011',
    title: 'macOS Finder/iCloud duplikuje soubory jako "name 2.ext" — lokální build selže',
    category: 'architecture',
    impact: 'medium',
    context: 'npm run build selhával s "duplicate route exports". Railway build SUCCESS — commit 6835580 v produkci bez problémů.',
    observation: 'macOS Finder/iCloud tiše vytváří kopie s příponou " 2": page.tsx → page 2.tsx. Soubory nejsou v git — Railway je nevidí, lokální Next.js je čte.',
    rule: 'Pokud lokální build selže s "duplicate route" a Railway je SUCCESS → hledat " 2" duplikáty. Fix: find . -name "* [0-9]*" -not -path "./node_modules/*" -delete (po ověření git ls-files | grep \' [0-9]\').',
    keywords: ['macos', 'finder', 'duplicate-files', 'local-build', 'icloud'],
    related_tickets: [],
  },
  {
    code: 'L-012',
    title: 'Railway cron service bez Start Command spouští npm start (Next.js web server)',
    category: 'architecture',
    impact: 'high',
    context: 'cron-manager a cron-token-validator správně nakonfigurovány jako Cron Job v Railway, ale žádný výstup do DB. Deploy log: "> next start".',
    observation: 'Railway fallbackuje na npm start pokud není nastaven Start Command. V tomto projektu npm start = next start (web server).',
    rule: 'Každá Railway cron service MUSÍ mít explicitně nastavený Start Command v dashboardu (Settings → Deploy → Start Command). Detekce: log začíná "▲ Next.js" → špatný Start Command.',
    keywords: ['railway', 'cron', 'start-command', 'npm-start', 'next-start'],
    related_tickets: [],
  },
  {
    code: 'L-013',
    title: 'Token auto-heal: bezpečnostní pravidla zabraňují náhradě v editoriálním kontextu',
    category: 'automation',
    impact: 'medium',
    context: 'olivovy-olej-z-pokrutin měl broken token. Auto-heal správně selhal: kontext za tokenem obsahoval brand jméno Liofyto explicitně v textu.',
    observation: 'Auto-heal by tokenem nahradil jiný brand, ale věta by zůstala referovat Liofyto = faktická chyba.',
    rule: '4 bezpečnostní filtry v tryAutoHeal(): A) min 2 kandidáti, stejný type, score≥60. B) 150 znaků kontext nesmí obsahovat čísla/superlativy/brand. C) category≠zdravi/kosmetika. D) kandidáti ±30% ceny.',
    keywords: ['auto-heal', 'token-validator', 'safety', 'editorial-context'],
    related_commit: 'cccec45',
    related_tickets: ['T-16'],
  },
  {
    code: 'L-014',
    title: 'AI Reviewer pattern pro pipeline agenty',
    category: 'automation',
    impact: 'high',
    context: 'Newsletter generace opakovala Picual jako Olej týdne 4/5× — žádná automatická detekce.',
    observation: 'Fail-open reviewer sedící jako Místo B (po uložení do DB, před admin notifikací) detekoval problém správně.',
    rule: 'Pattern: pipeline step → save to DB → AI Reviewer → admin notification. Reviewer fail-open (nikdy nezablokuje), flag-only v Fázi 1, vždy loguje do agent_decisions. Model: claude-haiku-4-5-20251001.',
    keywords: ['ai-reviewer', 'pipeline', 'newsletter', 'fail-open', 'agent-decisions'],
    related_commit: 'b732c82',
    related_tickets: [],
  },
  {
    code: 'L-015',
    title: 'Newsletter LRU exclusion musí filtrovat na CULTIVAR + BRAND úrovni',
    category: 'automation',
    impact: 'high',
    context: 'Picual se opakoval jako Olej týdne 4/5 vydání i přes LRU exclusion posledních 8 productId.',
    observation: 'Picual má 10+ aktivních produktů s různými ID. LRU vylučuje konkrétní productId — ale každý Picual produkt má jiné ID.',
    rule: 'LRU musí pracovat s identitou jak ji vnímá čtenář: 3 úrovně — recentProductIds (8 posledních), recentBrandSlugs (poslední 2 vydání), recentCultivarSlugs (poslední 3 vydání přes product_cultivars JOIN).',
    keywords: ['newsletter', 'lru', 'cultivar', 'diversity', 'brand-exclusion'],
    related_tickets: ['T-18'],
  },
]

async function main() {
  console.log(`Importuji ${LEARNINGS.length} lekcí do DB...\n`)

  const results = await supabase
    .from('learnings')
    .upsert(LEARNINGS, { onConflict: 'code' })
    .select('code, title')

  if (results.error) {
    console.error('❌ Import selhal:', results.error.message)
    process.exit(1)
  }

  console.log(`✅ Importováno ${results.data?.length ?? 0} lekcí:\n`)
  for (const r of results.data ?? []) {
    console.log(`  ${r.code} — ${r.title}`)
  }

  // Ověření počtu
  const { count } = await supabase
    .from('learnings')
    .select('*', { count: 'exact', head: true })
  console.log(`\nCelkem v DB: ${count} lekcí`)
}

main().catch(console.error)
