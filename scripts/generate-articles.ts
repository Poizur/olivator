/**
 * Bulk AI generování pro Fáze 4 — articles do /pruvodce.
 * 18 nových článků (5 už existuje v DB / static), každý 1500-2500 slov,
 * status='draft' pro admin review před publish.
 *
 * Run:
 *   npx tsx --env-file=.env.local scripts/generate-articles.ts            # all
 *   npx tsx --env-file=.env.local scripts/generate-articles.ts --slug=jak-cist-etiketu
 *   npx tsx --env-file=.env.local scripts/generate-articles.ts --skip-existing
 *
 * Idempotentní — slug UNIQUE constraint + skip pokud existuje.
 */
import { supabaseAdmin } from '@/lib/supabase'
import { callClaude, extractText } from '@/lib/anthropic'
import { searchUnsplash } from '@/lib/unsplash'
import { getInjectionBlock } from '@/lib/learning-injector'

const TARGET_SLUG = process.argv.find(a => a.startsWith('--slug='))?.split('=')[1]
const SKIP_EXISTING = !process.argv.includes('--force')
const DRY = process.argv.includes('--dry-run')

interface ArticleBrief {
  slug: string
  title: string
  category: 'pruvodce' | 'vzdelavani' | 'srovnani' | 'zebricek'
  emoji: string
  excerpt: string  // ~150 chars hook pro listing
  readTime: string
  targetKeyword: string  // primary keyword pro SEO
  briefPoints: string[]  // 5-8 klíčových témat článku
  unsplashQuery: string  // topic-specific (BUG-014 z CLAUDE.md)
}

const ARTICLE_BRIEFS: ArticleBrief[] = [
  // ── Vzdělávací (10) ────────────────────────────────────────────────────────
  {
    slug: 'jak-cist-etiketu-olivoveho-oleje',
    title: 'Jak číst etiketu olivového oleje',
    category: 'vzdelavani',
    emoji: '🏷️',
    excerpt: 'Co znamenají čísla na etiketě? Kyselost, polyfenoly, sklizeň, certifikace — vysvětlujeme krok za krokem.',
    readTime: '7 min čtení',
    targetKeyword: 'etiketa olivového oleje',
    briefPoints: [
      'Co najdeš na přední vs zadní etiketě',
      'Kyselost (acidity) — co to je a co je dobré číslo',
      'Polyfenoly (mg/kg) — kdy se uvádí a co znamenají',
      'Datum sklizně vs datum spotřeby — který je důležitější',
      'Země původu (origin) — chyby a marketingové triky',
      'Certifikace (DOP, PGI, BIO, NYIOOC) — který je která',
      'Co NENÍ na etiketě (peroxidové číslo, oleic acid %) — proč',
    ],
    unsplashQuery: 'olive oil bottle label closeup ingredients',
  },
  {
    slug: 'polyfenoly-kolik-je-dost',
    title: 'Polyfenoly v olivovém oleji: kolik je dost?',
    category: 'vzdelavani',
    emoji: '⚗️',
    excerpt: 'EU norma povoluje "high in polyphenols" od 250 mg/kg. Co to ale znamená v praxi — a kolik jich potřebuje tvoje tělo?',
    readTime: '6 min čtení',
    targetKeyword: 'polyfenoly olivový olej',
    briefPoints: [
      'Co jsou polyfenoly (oleocanthal, oleuropein, hydroxytyrosol)',
      'EU norma EFSA — claim "ochrana lipidů" od 250 mg/kg / 5 mg per 20g',
      'Rozsah v EVOO: 100-1000 mg/kg, exception 2000+ mg/kg (early harvest)',
      'Co ovlivňuje obsah: cultivar, sklizeň, lisování, skladování',
      'Test: pálivost v hrdle = oleocanthal',
      'Dávka: 2-3 polévkové lžíce kvalitního EVOO denně',
      'Proč se polyfenoly snižují v čase a teple',
    ],
    unsplashQuery: 'olive oil pouring health antioxidants',
  },
  {
    slug: 'extra-panensky-vs-panensky-vs-rafinovany',
    title: 'Extra panenský vs panenský vs rafinovaný olivový olej',
    category: 'vzdelavani',
    emoji: '🔬',
    excerpt: 'EU má čtyři kategorie olivového oleje. Říká si "olivový olej" a stojí 89 Kč? Tady je, co skutečně dostaneš.',
    readTime: '8 min čtení',
    targetKeyword: 'extra panenský olivový olej',
    briefPoints: [
      'EU regulation 1308/2013 — 4 oficiální kategorie',
      'Extra panenský (EVOO): kyselost ≤0,8%, žádná chemie, organoleptické testování',
      'Panenský (Virgin): kyselost ≤2%, mírná závada možná',
      '"Olivový olej" (bez přívlastku): směs rafinovaného + virgin, kyselost ≤1%',
      'Olivový olej z výlisků (pomace): chemická extrakce z odpadu',
      'Cenový rozsah a kde se s nimi setkáš (supermarket vs delikatesy)',
      'Co když vidíš "Light" nebo "Pure"? — marketingové fráze',
    ],
    unsplashQuery: 'olive oil bottles different qualities comparison',
  },
  {
    slug: 'olivovy-olej-na-smazeni-bod-zakoureni',
    title: 'Olivový olej na smažení: bod zakouření a co s ním',
    category: 'vzdelavani',
    emoji: '🍳',
    excerpt: 'Kvalitní EVOO má bod zakouření 190-210°C — víc než většina pánví zvládne. Tak proč se říká, že na něm nelze smažit?',
    readTime: '7 min čtení',
    targetKeyword: 'olivový olej na smažení',
    briefPoints: [
      'Co je bod zakouření a co se děje při překročení',
      'EVOO smoke point: 190-210°C (kvalitní, čerstvý), 160-190°C (starší)',
      'Studie: stabilita EVOO při fritování je vyšší než u rostlinných olejů (díky polyfenolům)',
      'Mýtus 1: "EVOO ztrácí výživové hodnoty při ohřátí"',
      'Mýtus 2: "Polyfenoly se rozpadnou hned" — ve skutečnosti vznikají i nové sloučeniny',
      'Praktické tipy: pánev na střední, ne přepalovat',
      'Pro hluboké fritování (>200°C dlouhodobě): EVOO není ideální, lépe panenský nebo i normální olivový olej',
    ],
    unsplashQuery: 'olive oil cooking pan kitchen mediterranean',
  },
  {
    slug: 'olivovy-olej-a-zdravi-veda-2026',
    title: 'Olivový olej a zdraví: co tvrdí věda v roce 2026',
    category: 'vzdelavani',
    emoji: '❤️',
    excerpt: 'PREDIMED, Mediterranean Diet, oleocanthal a srdce. Aktuální shrnutí výzkumu o olivovém oleji a zdraví v roce 2026.',
    readTime: '10 min čtení',
    targetKeyword: 'olivový olej zdraví',
    briefPoints: [
      'PREDIMED studie (Spain, 2013-2018): 30% snížení kardiovaskulárních příhod při 50ml EVOO/den',
      'Oleocanthal a anti-inflammatory effect (Beauchamp et al.)',
      'EFSA health claims: srdce, lipidy, antioxidanty',
      'Středomořská strava — zápis na UNESCO seznam, doporučení WHO',
      'Olivový olej a Alzheimer (BMJ 2024)',
      'Co výzkum NEpotvrdil: léčba rakoviny, magic bullet',
      'Doporučení EFSA: 20g denně (~2 lžíce) pro health claim',
    ],
    unsplashQuery: 'olive oil bread mediterranean diet healthy',
  },
  {
    slug: 'dop-pgi-bio-certifikace',
    title: 'DOP, PGI, BIO: které certifikace skutečně něco znamenají',
    category: 'vzdelavani',
    emoji: '✓',
    excerpt: 'Etikety jsou plné značek. Která stojí za to? Vysvětlujeme rozdíly DOP vs PGI, BIO vs Demeter, a co znamená NYIOOC.',
    readTime: '8 min čtení',
    targetKeyword: 'olivový olej certifikace',
    briefPoints: [
      'DOP/PDO (Chráněné označení původu) — geograficky vázáno, traditional method',
      'PGI/IGP (Chráněné zeměpisné označení) — slabší vazba na region',
      'BIO/Organic — pesticidy zakázané, certifikace EU/USDA',
      'Demeter — biodynamic, ještě přísnější než BIO',
      'NYIOOC — nezávislý mezinárodní soutěž, zlato/silver/bronze',
      'NYIOOC vs Mario Solinas vs Olio Officina — srovnání soutěží',
      'Které certifikace jsou na CZ trhu reálně viditelné',
    ],
    unsplashQuery: 'olive oil certification quality bottle europe',
  },
  {
    slug: 'sklizen-oliv-early-vs-late-harvest',
    title: 'Sklizeň oliv: early harvest vs late harvest',
    category: 'vzdelavani',
    emoji: '🫒',
    excerpt: 'Stejný olivový strom, dva různé oleje. Říjen vs prosinec — proč rozdíl 6 týdnů změní cenu i chuť na polovinu.',
    readTime: '6 min čtení',
    targetKeyword: 'sklizeň olivového oleje',
    briefPoints: [
      'Cyklus zrání oliv: zelené → fialové → černé',
      'Early harvest (Octobre-November): zelené olivy, vysoké polyfenoly, zlatá chuť',
      'Late harvest (December-February): zralé olivy, jemnější profil, vyšší výnos',
      'Ekonomika: early harvest = 50-60% výnos, late = 90-100% — proto cena',
      'Chuťové rozdíly: hořkost, štiplavost, ovocnost',
      'Stabilita: early harvest oleje vydrží déle díky polyfenolům',
      'Jak poznat na etiketě: "Early Harvest", "Olio Nuovo", konkrétní datum',
    ],
    unsplashQuery: 'olive harvest tree picking october autumn',
  },
  {
    slug: 'filtrovany-vs-nefiltrovany-olivovy-olej',
    title: 'Filtrovaný vs nefiltrovaný olivový olej',
    category: 'vzdelavani',
    emoji: '🌫️',
    excerpt: 'Nefiltrovaný olej (velado, fresco) vypadá zákalný. Je to vada, nebo prémiová kvalita?',
    readTime: '5 min čtení',
    targetKeyword: 'nefiltrovaný olivový olej',
    briefPoints: [
      'Co je nefiltrovaný olej a jak vzniká',
      'Vizuálně: opálová tekutina vs křišťálově čistá',
      'Pros nefiltrovaného: vyšší chuťová intenzita, plnější profil',
      'Cons nefiltrovaného: kratší shelf life (3-6 měsíců vs 12-18 u filtrovaného)',
      'Sediment na dně — co s ním? (skladování upright)',
      'Italské termíny: velato, torbido, non filtrato',
      'Kdy si vybrat co — saláty + dipping (nefiltrovaný), vaření (filtrovaný)',
    ],
    unsplashQuery: 'unfiltered olive oil bottle italian cloudy',
  },
  {
    slug: 'stredomorska-strava-olivovy-olej',
    title: 'Středomořská strava a olivový olej',
    category: 'vzdelavani',
    emoji: '🥗',
    excerpt: 'UNESCO ji zapsala na seznam dědictví, WHO ji doporučuje. Co vlastně středomořská strava je — a jak v ní funguje olivový olej?',
    readTime: '8 min čtení',
    targetKeyword: 'středomořská strava',
    briefPoints: [
      'Definice: UNESCO 2010, kořeny v Krétě/Itálii/Španělsku',
      'Mediterranean Diet Pyramid (Oldways 2009)',
      'Co se jí: olivový olej, ryby, luštěniny, zelenina, ovoce, ořechy, celozrnné',
      'Olivový olej jako primární zdroj tuků (35-40% kalorií)',
      'PREDIMED a navazující studie',
      'Praktická aplikace v ČR — co lokalizovat, co dovážet',
      'Tipy: ranní pečivo s olejem, salát s olejem, místo másla',
    ],
    unsplashQuery: 'mediterranean diet table food bread olive oil',
  },
  {
    slug: 'olivovy-olej-pro-deti',
    title: 'Olivový olej pro děti: od kdy, kolik, který',
    category: 'vzdelavani',
    emoji: '👶',
    excerpt: 'Pediatři doporučují olivový olej v dětské stravě od 6 měsíců. Tady jsou konkrétní množství a doporučení podle věku.',
    readTime: '6 min čtení',
    targetKeyword: 'olivový olej pro děti',
    briefPoints: [
      'Olivový olej v dětské stravě od 6 měsíců (start solids)',
      'Doporučená dávka: 0,5 lžičky (kojenec) → 1-2 lžíce (předškolák)',
      'Proč: kyselina olejová, polyfenoly, vitamin E',
      'Který typ vybrat: jen EVOO, ideálně mírnější profil (Manaki, Arbequina)',
      'Bezpečnost: alergie minimální, varování pro novorozence',
      'Tipy na použití: do kaše, na zeleninu, do dětské pizzy',
      'Studie: Mediterranean Diet u dětí a obesity prevention',
    ],
    unsplashQuery: 'baby food family healthy olive oil mediterranean',
  },

  // ── Srovnání (4 — bez "italský vs řecký" který už máme) ───────────────────
  {
    slug: 'olivovy-olej-do-salatu-vs-na-vareni',
    title: 'Olivový olej do salátu vs na vaření — který kdy vybrat',
    category: 'srovnani',
    emoji: '🍽️',
    excerpt: 'Saláty si zaslouží intenzivní EVOO, vaření zase olej s vyšší stabilitou. Konkrétní doporučení a top picks.',
    readTime: '6 min čtení',
    targetKeyword: 'olivový olej do salátu',
    briefPoints: [
      'Salát: chceš chutí + vůně intenzivní → vysoké polyfenoly, ovocnost',
      'Vaření: stabilita za tepla = nízká kyselost, čerstvost',
      'Profil pro saláty: Coratina, Koroneiki early harvest, Manaki',
      'Profil pro vaření: vyvážené EVOO, méně intenzivní',
      'Cenový rozsah: salát 250-500 Kč/0,5L, vaření 150-300 Kč/0,5L',
      'Konkrétní doporučení s přibližnými cenami',
      'Mýty: "EVOO se nehodí na vaření"',
    ],
    unsplashQuery: 'olive oil salad fresh tomatoes mediterranean',
  },
  {
    slug: 'premium-olivovy-olej-ma-smysl',
    title: 'Premium olivový olej (>500 Kč/L) — má smysl?',
    category: 'srovnani',
    emoji: '💎',
    excerpt: '500 Kč nebo 1500 Kč za litr? Co reálně dostaneš za prémium cenu — a kdy to za to stojí.',
    readTime: '7 min čtení',
    targetKeyword: 'prémiový olivový olej',
    briefPoints: [
      'Cenové úrovně: budget <200 Kč/L, mid 200-500, premium 500-1000, luxury 1000+',
      'Co dělá olej drahý: cultivar (rare), early harvest, single estate, BIO+DOP',
      'Reálné rozdíly v parametrech: kyselost <0,2%, polyfenoly 600+',
      'Marketing vs realita: ne každý drahý olej je lepší',
      'Kdy si premium oprávněně koupit: dárek, gourmet pokrmy, oslava',
      'Cenový/kvalitní benchmark: kolik by měl ideální 500 Kč/L olej obsahovat',
      'Top 3 premium picks z Olivator katalogu (Score 85+)',
    ],
    unsplashQuery: 'premium olive oil bottle gold luxury gourmet',
  },
  {
    slug: 'olivovy-olej-do-200-kc',
    title: 'Olivový olej do 200 Kč: nejlepší poměr cena/výkon',
    category: 'srovnani',
    emoji: '💰',
    excerpt: 'Pod 200 Kč za půllitr? Kompromis je nutný, ale ne vždy. Tady jsou kvalitní oleje pro běžnou kuchyni.',
    readTime: '6 min čtení',
    targetKeyword: 'olivový olej do 200 Kč',
    briefPoints: [
      'Co očekávat: kvalitní EVOO ano, premium NE',
      'Reálná kyselost: 0,3-0,6% standard',
      'Polyfenoly: spíš nižší (200-400 mg/kg)',
      'Kde nakupovat: supermarket Tier 1 (Rohlík, Košík, Tesco) — vlastní značka může překvapit',
      'Mark-up trick: 250ml za 130 Kč (= 520 Kč/L) je horší než 1L za 320 Kč',
      'Top 5 picks z Olivator katalogu pod 200 Kč/0,5L',
      'Co se opravdu vyplatí — proč investovat 50 Kč navíc',
    ],
    unsplashQuery: 'olive oil supermarket budget bottle shelf',
  },
  {
    slug: 'darkove-baleni-olivovy-olej',
    title: 'Dárkové balení olivového oleje: co a komu',
    category: 'srovnani',
    emoji: '🎁',
    excerpt: 'Olivový olej jako dárek funguje. Nadšenci do gastronomie ho ocení víc než víno. Konkrétní tipy podle příjemce.',
    readTime: '5 min čtení',
    targetKeyword: 'olivový olej dárek',
    briefPoints: [
      'Proč olivový olej je dobrý dárek: praktický, dlouhodobý, premium pocit',
      'Profily příjemců: kuchař-amatér, sommelier, fitness fan, italo-fil',
      'Vizuální balení: dark glass, designové ceramiky, gift boxes',
      'Cenovka: 350-1500 Kč podle vztahu',
      'Co k oleji přidat: balzamico, ručník, recept book',
      'Pozor na: shelf life, doprava (pak v lednici není nutné, ale vodu na vaření)',
      'Top 3 dárkové sady z Olivator katalogu',
    ],
    unsplashQuery: 'olive oil gift box wrapped premium present',
  },

  // ── Praktické (5) ──────────────────────────────────────────────────────────
  {
    slug: 'jak-skladovat-olivovy-olej-doma',
    title: 'Jak skladovat olivový olej doma',
    category: 'pruvodce',
    emoji: '🌡️',
    excerpt: 'Tma, chlad, těsně uzavřené. Tři pravidla, která prodlouží životnost tvého oleje o 6 měsíců.',
    readTime: '4 min čtení',
    targetKeyword: 'skladování olivového oleje',
    briefPoints: [
      'Tři nepřátelé: světlo, teplo, kyslík',
      'Optimální: 12-18°C, tmavá lahev nebo skříň',
      'Lednice ano/ne: ne nutné, ale OK (zakalí se, po vyhřátí čisté)',
      'Originální obal vs přelití: světlá lahev = horší',
      'Doba spotřeby: nezavřená 2 roky, otevřená 3-6 měsíců',
      'Signály zkažení: rancid (žluklý), bez chuti, vosková konzistence',
      'Praktický tip: malé lahve do kuchyně, hlavní zásoba ve sklepě',
    ],
    unsplashQuery: 'olive oil dark glass bottle storage kitchen pantry',
  },
  {
    slug: 'otevrena-lahev-jak-rychle-spotrebovat',
    title: 'Otevřená lahev olivového oleje — jak rychle spotřebovat',
    category: 'pruvodce',
    emoji: '⏱️',
    excerpt: 'Polyfenoly začnou klesat, jakmile lahev otevřeš. Jak rychle musíš olej spotřebovat — a kdy začíná být znát?',
    readTime: '4 min čtení',
    targetKeyword: 'spotřeba olivového oleje',
    briefPoints: [
      'Co se děje při kontaktu se vzduchem (oxidace)',
      'Časová mapa: 3 měsíce = mírný pokles, 6 měsíců = znatelný, 12+ = rancid',
      'Kvalitní EVOO bohatý na polyfenoly vydrží déle',
      'Velikost lahve vs spotřeba: 250ml za 2 týdny, 500ml za měsíc, 1L za 2-3 měsíce',
      'Co dělat se "starým" olejem: vaření za vyšších teplot OK, ne salát',
      'Doporučená velikost pro single domácnost: 250-500 ml',
      'Praktický tip: dvě lahve — denní + zásobní',
    ],
    unsplashQuery: 'olive oil bottle kitchen counter open',
  },
  {
    slug: 'kde-koupit-olivovy-olej-cr',
    title: 'Kde koupit kvalitní olivový olej v ČR',
    category: 'pruvodce',
    emoji: '🛒',
    excerpt: 'Supermarket, eshop, delikatesy nebo přímo od výrobce? Průvodce všemi nákupními kanály v ČR pro 2026.',
    readTime: '7 min čtení',
    targetKeyword: 'kde koupit olivový olej',
    briefPoints: [
      'Tier 1 supermarkety (Rohlík, Košík, Tesco): široký výběr, nehledej premium',
      'Specializované eshopy (olivio.cz, gaea.cz, olivovyolej.cz): kurátovaný výběr, vyšší kvalita',
      'Delikatesy (Sklizeno, Frooty, etc.): premium tier, fyzická návštěva',
      'iHerb, Amazon: importy, ale platit za dovoz a riziko padělků',
      'Přímo od výrobce: nejvyšší kvalita, ale logistika (Itálie, Řecko)',
      'CZ farmer markets: méně časté pro olivový olej',
      'Olivátor jako cenový aggregator — ukáže nejlevnější cenu napříč prodejci',
    ],
    unsplashQuery: 'olive oil specialty store delicatessen shopping',
  },
  {
    slug: 'falesny-olivovy-olej-jak-rozeznat',
    title: 'Falešný olivový olej: jak rozeznat',
    category: 'pruvodce',
    emoji: '🚨',
    excerpt: 'Bertolli skandál 2016, italské dovozy z Tunisie. Jak poznáš, že kupuješ to, co je na etiketě napsané?',
    readTime: '8 min čtení',
    targetKeyword: 'falešný olivový olej',
    briefPoints: [
      'Bertolli/Carapelli skandál (USA 2016): směsi z Tunisie etiketované jako Italian',
      'Common frauds: virgin oil sold as EVOO, mixing with cheaper oils',
      'Lab tests: kyselost, peroxid, sterol composition',
      'Domácí test: chuť (peppery + bitter = good EVOO), refrigerator test (zakalí se)',
      'Etiketa red flags: "produced in Italy" vs "product of Italy", no harvest date',
      'Cenové pásmo: pod 80 Kč/0,5L = velmi pravděpodobně směs',
      'Jak se chránit: certified DOP/PGI, NYIOOC vítězové, transparentní výrobci',
    ],
    unsplashQuery: 'olive oil fraud authenticity check lab',
  },
  {
    slug: 'degustace-olivoveho-oleje-doma',
    title: 'Degustace olivového oleje doma — návod krok za krokem',
    category: 'pruvodce',
    emoji: '👃',
    excerpt: 'Profesionální panelisté používají modré sklenice a 5-step protokol. Tady je domácí verze, kterou zvládneš s kamarády.',
    readTime: '8 min čtení',
    targetKeyword: 'degustace olivového oleje',
    briefPoints: [
      'Profesionální setup: blue glass, 28°C, slepá degustace',
      'Domácí setup: malá sklenice, ruka jako poklička, neutral background',
      '5 kroků: zahřátí → odkryt → vůně → sip → swallow',
      'Co hledáš: ovocnost (zelená/zralá), hořkost, štiplavost = pungency',
      'Defekty: rancid, fusty, musty, vinegary',
      'Slovník popisu: artičokový, mandlový, banán, řezaná tráva',
      'Setup pro skupinu: 3-5 olejů, 30 min, papír na poznámky',
    ],
    unsplashQuery: 'olive oil tasting glass tasting professional',
  },
]

// ── Generation prompts ────────────────────────────────────────────────────────

const SYSTEM_PROMPT_BASE = `Jsi hlavní editor Olivator.cz, největšího srovnávače olivových olejů v ČR.
Píšeš editorial articles pro /pruvodce sekci.

══ STYLISTIKA ══
- Aktivní hlas, přítomný čas, přirozená čeština
- Tón: chytrý kamarád sommelier (Wirecutter + Wine Folly + Apple)
- Konkrétní data + čísla, ne marketingová vata
- ŽÁDNÉ fráze: "skvělý", "nejlepší", "prémiový", "výjimečný", "kvalitní"
- ŽÁDNÉ AI patterny: "v dnešní době", "stojí za zmínku", "je důležité poznamenat"

══ STRUKTURA MARKDOWN ══
- 1500-2500 slov (delší articles dostávají horší engagement)
- ## H2 sekce (4-6 sekcí), ### H3 podsekce kde dává smysl
- Krátké odstavce (max 4 věty), občas zalomený řádek pro vizuální ritmus
- Lists kde dává smysl (kategorie, kroky, tipy)
- ŽÁDNÉ úvodní bloky typu "V tomto článku se podíváme..."
- Lead = první 2-3 věty, hook = konkrétní fakt nebo paradoxní tvrzení
- Konec: praktický takeaway, ne shrnutí

══ KONKRÉTNOST ══
- Pokud cituješ studii, uveď author + rok
- Konkrétní čísla raději než vágní rozsahy
- Olivator Score se uvádí jen pokud máš konkrétní příklad

══ SEO ══
- Target keyword použij 3-5× přirozeně, ne stuffing
- H2 nadpisy mohou obsahovat keyword variace
- Cross-link na další články nebo stránky: [text](/pruvodce/slug) nebo [text](/srovnavac)

══ OUTPUT ══
Vrať POUZE markdown body článku. Žádný YAML frontmatter, žádný JSON wrapper.
Začni první H2 nadpisem nebo lead odstavcem (NE titlem — ten je v DB).`

// Rozšíření systémového promptu pro články s produktovými doporučeními.
// Přidává se POUZE pro kategorie 'zebricek' a 'srovnani', kde hrozí halucinace
// konkrétních produktů, cen a parametrů.
const CATALOG_RULES = `
══ CATALOG_CONTEXT — PRODUKTOVÁ INTEGRITA (ABSOLUTNÍ PRAVIDLO) ══

V tomto článku jsou konkrétní doporučení produktů. Platí bez výjimky:

1. SMÍŠ odkazovat POUZE na produkty z CATALOG_CONTEXT níže — nikdy jiné.
2. Score, kyselost, polyfenoly, cena: POUZE hodnoty z CATALOG_CONTEXT — nikdy
   nevymýšlej ani neodhaduj čísla. Pokud pro produkt chybí hodnota (prázdné),
   neuvádí se.
3. Odkaz vždy ve formátu [Název produktu](/olej/SLUG) — slug je v katalogu.
4. Pokud pro daný kontext nenajdeš vhodný reálný produkt, piš obecně bez
   konkrétního názvu/čísla. Prázdná doporučení > vymyšlená doporučení.
`

// ── Catalog fetcher ────────────────────────────────────────────────────────

interface CatalogProduct {
  slug: string
  name: string
  score: number | null
  acidity: number | null
  polyphenols: number | null
  originCountry: string | null
  certifications: string[]
  priceKc: number | null
  volumeMl: number | null
}

/** Načte top-N aktivních produktů z DB pro injekci do promptu.
 *  Pro 'srovnani'/'zebricek' kategorie — záchrana proti halucinacím. */
async function fetchProductCatalog(limit = 35): Promise<CatalogProduct[]> {
  const { data: products, error: pe } = await supabaseAdmin
    .from('products')
    .select('id, slug, name, olivator_score, acidity, polyphenols, origin_country, certifications, volume_ml')
    .eq('status', 'active')
    .not('olivator_score', 'is', null)
    .order('olivator_score', { ascending: false })
    .limit(limit)

  if (pe || !products) return []

  // Načti nejlevnější offer pro každý produkt (single query)
  const ids = products.map((p: { id: string }) => p.id)
  const { data: offers } = await supabaseAdmin
    .from('product_offers')
    .select('product_id, price')
    .in('product_id', ids)
    .eq('in_stock', true)
    .order('price', { ascending: true })

  const cheapest = new Map<string, number>()
  for (const o of (offers ?? []) as Array<{ product_id: string; price: number }>) {
    if (!cheapest.has(o.product_id)) cheapest.set(o.product_id, o.price)
  }

  return products.map((p: {
    id: string; slug: string; name: string; olivator_score: number | null;
    acidity: number | null; polyphenols: number | null; origin_country: string | null;
    certifications: string[] | null; volume_ml: number | null
  }) => ({
    slug: p.slug,
    name: p.name,
    score: p.olivator_score,
    acidity: p.acidity,
    polyphenols: p.polyphenols,
    originCountry: p.origin_country,
    certifications: p.certifications ?? [],
    priceKc: cheapest.get(p.id) ?? null,
    volumeMl: p.volume_ml,
  }))
}

function formatCatalogForPrompt(products: CatalogProduct[]): string {
  if (products.length === 0) return ''

  const rows = products.map((p, i) => {
    const acid = p.acidity != null ? `${p.acidity} %` : '—'
    const poly = p.polyphenols != null ? `${p.polyphenols} mg/kg` : '—'
    const price = p.priceKc != null ? `${p.priceKc} Kč` : '—'
    const vol = p.volumeMl != null ? `${p.volumeMl} ml` : '—'
    const cert = p.certifications.length > 0 ? p.certifications.join(', ') : '—'
    return `${i + 1}. slug: ${p.slug}
   název: ${p.name}
   score: ${p.score ?? '—'} | kyselost: ${acid} | polyfenoly: ${poly} | certifikace: ${cert}
   cena: ${price} / ${vol} | origin: ${p.originCountry ?? '—'}`
  }).join('\n\n')

  return `\n\n══ CATALOG_CONTEXT — Aktuální produkty z Olivator DB ══\n\n${rows}\n\n══ KONEC KATALOGU ══`
}

/** True pokud brief potřebuje katalogový kontext (produktové žebříčky/srovnání). */
function needsCatalogContext(brief: ArticleBrief): boolean {
  if (brief.category === 'zebricek' || brief.category === 'srovnani') return true
  // Vzdělávací/průvodce articles s konkrétními "top picks" v brief points
  const pickKeywords = ['top ', 'pick', 'doporučen', 'konkrétní doporučen', 'z olivator katalogu']
  const lowerPoints = brief.briefPoints.join(' ').toLowerCase()
  return pickKeywords.some(k => lowerPoints.includes(k))
}

async function generateArticleBody(brief: ArticleBrief): Promise<string> {
  const withCatalog = needsCatalogContext(brief)

  // Lekce z project_learnings — prevence opakování chyb
  const learningsBlock = await getInjectionBlock('article_agent', 8)

  let systemPrompt = `${learningsBlock}${SYSTEM_PROMPT_BASE}`
  let catalogBlock = ''

  if (withCatalog) {
    const products = await fetchProductCatalog(35)
    catalogBlock = formatCatalogForPrompt(products)
    systemPrompt += CATALOG_RULES
  }

  const userPrompt = `Napiš článek na téma: "${brief.title}"

Kategorie: ${brief.category}
Target keyword: ${brief.targetKeyword}
Excerpt (lead pro listing): ${brief.excerpt}

Klíčové body, které musí článek pokrýt (v rozumném pořadí, ne nutně 1:1):
${brief.briefPoints.map((p, i) => `${i + 1}. ${p}`).join('\n')}${catalogBlock}

Délka: 1500-2500 slov. Markdown s ## H2 sekcemi.
NEPŘIDÁVEJ titulek (## ${brief.title}) — to je v DB. Začni rovnou lead/H2 první sekce.`

  const res = await callClaude({
    model: 'claude-sonnet-4-5',
    max_tokens: 6000,
    system: systemPrompt,
    messages: [{ role: 'user', content: userPrompt }],
  })
  return extractText(res).trim()
}

async function generateMeta(brief: ArticleBrief, body: string): Promise<{ title: string; description: string }> {
  const res = await callClaude({
    model: 'claude-haiku-4-5',
    max_tokens: 300,
    system: 'Jsi SEO copywriter. Vrať POUZE JSON {"title":"...","description":"..."}. Žádný komentář, žádné backticks.',
    messages: [{
      role: 'user',
      content: `Pro článek "${brief.title}" (target keyword: ${brief.targetKeyword}) vygeneruj:
- "title": 50-60 znaků, includes target keyword, NIKDY nepřidávej " | Olivátor" (přidá se v layoutu)
- "description": 130-160 znaků, includes target keyword, lead from article, CTA "čti dál"

Excerpt: ${brief.excerpt}
Article preview (first 300 chars): ${body.slice(0, 300)}`
    }],
  })
  const raw = extractText(res).trim().replace(/^```(?:json)?\s*|\s*```$/g, '')
  return JSON.parse(raw)
}

async function fetchHero(brief: ArticleBrief): Promise<{ url: string; alt: string } | null> {
  try {
    const photos = await searchUnsplash(brief.unsplashQuery, 1)
    const p = photos[0]
    if (!p) return null
    return { url: p.url, alt: p.altText || brief.title }
  } catch (err) {
    console.warn(`  ⚠ Unsplash failed for ${brief.slug}: ${err instanceof Error ? err.message : 'unknown'}`)
    return null
  }
}

async function processOne(brief: ArticleBrief): Promise<{ ok: boolean; reason?: string; bodyChars?: number }> {
  if (SKIP_EXISTING) {
    const { data: existing } = await supabaseAdmin
      .from('articles')
      .select('id, status, body_markdown')
      .eq('slug', brief.slug)
      .maybeSingle()
    if (existing && (existing as { body_markdown: string | null }).body_markdown) {
      return { ok: false, reason: 'already exists with body' }
    }
  }

  const body = await generateArticleBody(brief)
  if (!body || body.length < 1500) {
    return { ok: false, reason: `body too short (${body?.length ?? 0} chars)` }
  }

  const meta = await generateMeta(brief, body)
  const hero = await fetchHero(brief)

  if (DRY) {
    console.log(`    📋 ${meta.title} (${meta.title.length}ch)`)
    console.log(`    📝 ${meta.description.slice(0, 100)}... (${meta.description.length}ch)`)
    console.log(`    🖼️  ${hero?.url ? hero.url.slice(0, 60) : '— no hero'}`)
    console.log(`    📄 body: ${body.length} chars, ${body.match(/^## /gm)?.length ?? 0} H2 sections`)
    return { ok: true, bodyChars: body.length }
  }

  // DB má meta_title VARCHAR(70), meta_description VARCHAR(160) — Claude občas
  // překročí. Hard truncate s … (ellipsis) zachová čitelnost v SERP.
  const metaTitle = meta.title.length > 70 ? meta.title.slice(0, 67) + '…' : meta.title
  const metaDesc = meta.description.length > 160 ? meta.description.slice(0, 157) + '…' : meta.description

  const { error } = await supabaseAdmin.from('articles').upsert({
    slug: brief.slug,
    title: brief.title,
    excerpt: brief.excerpt,
    emoji: brief.emoji,
    read_time: brief.readTime,
    category: brief.category,
    body_markdown: body,
    meta_title: metaTitle,
    meta_description: metaDesc,
    hero_image_url: hero?.url ?? null,
    status: 'draft', // admin musí publish manually po review
    source: 'ai_generated',
    ai_generated_at: new Date().toISOString(),
  }, { onConflict: 'slug' })

  if (error) return { ok: false, reason: error.message }
  return { ok: true, bodyChars: body.length }
}

async function main() {
  const briefs = TARGET_SLUG
    ? ARTICLE_BRIEFS.filter(b => b.slug === TARGET_SLUG)
    : ARTICLE_BRIEFS

  if (briefs.length === 0) {
    console.error(`No briefs match ${TARGET_SLUG ?? '(all)'}`)
    process.exit(1)
  }

  console.log(`${DRY ? '🧪 DRY RUN' : '✏️  LIVE'} — generuju ${briefs.length} článků${SKIP_EXISTING ? ' (skip-existing)' : ' (force)'}\n`)

  let ok = 0
  let failed = 0
  let skipped = 0

  for (const brief of briefs) {
    process.stdout.write(`  → ${brief.slug.padEnd(45)}`)
    try {
      const result = await processOne(brief)
      if (result.ok) {
        ok++
        console.log(` ✓ ${result.bodyChars ?? 0}ch`)
      } else if (result.reason?.includes('already exists')) {
        skipped++
        console.log(` ⏭️  ${result.reason}`)
      } else {
        failed++
        console.log(` ❌ ${result.reason}`)
      }
    } catch (err) {
      failed++
      console.log(` ❌ ${err instanceof Error ? err.message.slice(0, 60) : 'unknown'}`)
    }
  }

  console.log(`\n📊 ${ok} ok / ${skipped} skipped / ${failed} failed`)
}

main().catch(err => {
  console.error('FATAL:', err)
  process.exit(1)
})
