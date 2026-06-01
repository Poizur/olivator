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
const DETECT_ONLY = process.argv.includes('--detect-only')

type FocusDimension =
  | 'polyphenols'
  | 'price_per_100ml'
  | 'acidity'
  | 'certification_bio'
  | 'certification_dop'
  | 'origin:GR'
  | 'origin:IT'
  | 'origin:ES'
  | 'size:large'
  | 'size:small'
  | 'usage:frying'
  | 'mixed:GR,IT'
  | 'mixed:GR,IT,ES'
  | null

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
  focus_dimension?: FocusDimension  // explicit override; undefined = auto-detect from slug+keyword
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
    focus_dimension: null,
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
    focus_dimension: 'polyphenols',
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
    focus_dimension: null,
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
    focus_dimension: 'usage:frying',
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
    focus_dimension: 'polyphenols',
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
    focus_dimension: 'certification_dop',
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
    focus_dimension: null,
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
    focus_dimension: null,
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
    focus_dimension: 'polyphenols',
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
    focus_dimension: 'certification_bio',
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
    focus_dimension: 'polyphenols',
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
    focus_dimension: 'polyphenols',
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
    focus_dimension: 'price_per_100ml',
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
    focus_dimension: 'size:small',
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
    focus_dimension: null,
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
    focus_dimension: null,
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
    focus_dimension: null,
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
    focus_dimension: null,
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
    focus_dimension: null,
  },

  // ── SEO Vlna 2 — kosmetický cluster ─────────────────────────────────────────
  {
    slug: 'olivovy-olej-na-plet-a-vlasy',
    title: 'Olivový olej na pleť a vlasy: co funguje a na co si dát pozor',
    category: 'pruvodce',
    emoji: '🫒',
    excerpt: 'Přírodní kosmetika s olivovým olejem — hydratace pleti, vlasová maska i letní opalování. Včetně jasného slova k SPF mýtu a fototoxicitě citronu.',
    readTime: '8 min čtení',
    targetKeyword: 'olivový olej na pleť',
    briefPoints: [
      '⚠️ YMYL/health-adjacent — POVINNÉ: Žádná léčebná tvrzení. Pro akné VŽDY: "komedogenní pro některé typy pleti, může zhoršit akné" — NE "léčí" ani "vyléčí". Pro vlasy: "tradičně se používá", "anekdotálně pomáhá". Na začátek textu: _Autor: Olík — [Jak hodnotíme](/metodika)_',
      'Pleť — mechanismus: kyselina olejová = okluzní vrstva bránící ztrátě vlhkosti. Squalene v EVOO (přirozená složka i lidského mazu) = dobrá biokompatibilita a antioxidační efekt. OCM (oil cleansing method): olej rozpouští kožní maz a make-up lépe než mýdlo — populární u suchých typů. Formulace "studie naznačují" pro antioxidační efekt na kůži.',
      '⚠️ KOMEDOGENITA (říct PŘÍMO, nezaretušovat): Olivový olej má komedogenní index 2/5. Pro akné, mastnou nebo smíšenou pleť s aktivními výskyty NEVHODNÝ — může ucpat póry a zhoršit výskyt. Doporučit pouze: suchá, normální pleť a suché lokality (lokty, kolena, paty). OCM jen pro suché typy. Citlivá pleť: test na malé ploše za uchem 48h před plošným použitím.',
      '⚠️ GENERAČNÍ POJISTKA — ABSOLUTNÍ PRAVIDLO: V kosmetických receptech (peeling, maska, OCM, jakákoli příprava pro kůži) NIKDY NEPOUŽIJ citronovou šťávu ani lemon juice. Žádný recept v článku nesmí citronovou šťávu obsahovat jako ingredienci kosmetiky. Citron se v celém článku zmiňuje VÝHRADNĚ jako varování v sekci fototoxicity — nikde jinde.',
      'Konkrétní kosmetické recepty (přesné poměry, BEZ citronu): 1) Cukrový peeling: 1 lžíce EVOO + 1 lžíce třtinového cukru, aplikovat na vlhkou kůži kruhovými pohyby, opláchnout. 2) Noční hydratační vrstva: 3–4 kapky EVOO na čistou suchou pleť, lehce zmasírovat. 3) Odličovač (OCM): vatový tampon napuštěný EVOO, kruhovými pohyby, opláchnout jemným čisticím gelem — pouze pro suché typy pleti. 4) Vlasová maska: 2–3 lžíce EVOO prohřát v dlaních, nanést na délky a konečky (ne kořeny!), zabalit ručníkem nebo fólií, 30–60 min nebo přes noc.',
      'Vlasy — aplikace a limity: Maska na suché konečky (ne kořeny!) pomáhá s lámáním a elektrostatickým nábojem. Masáž pokožky hlavy — zlepšuje prokrvení, ale evidence pro stimulaci růstu vlasů je slabá ("tradičně se uvádí"). ⚠️ Mastné nebo jemné vlasy: olej přetíží a zploští — aplikovat výhradně na délky od půlky dolů. Jak odmytí efektivně: šampon nanést na suché vlasy PŘED sprchováním, pak spláchni — funguje lépe než šamponovat mokré vlasy napuštěné olejem.',
      '🔴 OPALOVÁNÍ — KRITICKÁ SEKCE, NEZMĚKČOVAT: Olivový olej NENÍ sunscreen. SPF olivového oleje je cca 2–8 (různé studie) — dermatologicky doporučený minimální SPF pro každodenní použití je 30. Rozdíl: 15–20×. Olej může vizuálně zintenzivnit opálení (urychluje tanning), ale NECHRANÍ před UV-B poškozením DNA ani spálením. "Olivový olej na opalování" = rychlejší opálení + nechráněná kůže = vyšší riziko fotostárnutí a spálení, ne výhoda. After-sun použití OK: hydratace po slunci. Nikdy jako náhrada SPF.',
      '🔴 FOTOTOXICITA CITRONU + SLUNCE (jasné varování, ne jen zmínka): Furokumariny obsažené v citronové šťávě jsou fototoxické — po kontaktu s kůží a UV zářením způsobují chemické reakce vedoucí k popáleninám a trvalým pigmentačním skvrnám (berloque dermatitis, phytophotodermatitis). KLÍČOVÝ DETAIL: reakce není okamžitá — typicky vzniká 24–72 hodin po expozici, takže si lidé spojení s olejem a citronem na kůži často vůbec neuvědomí. Trend "olivový olej s citronem na opalování" šířený na TikToku a Instagramu je zdravotně nebezpečný. Odkaz: viz také [Olivový olej s citronem po ránu](/pruvodce/olivovy-olej-s-citronem-po-rano).',
      'Jak vybrat olej pro kosmetické použití: EVOO (extra panenský) = nerafinovaný = zachovány polyfenoly a squalene. BIO certifikace = žádné pesticidy kontaktně na pokožce. Filtrace pro kosmetiku nehraje roli. Cenové okno 40–65 Kč/100ml — kosmetika je spotřeba, není to gastro investice. Sekce "Oleje vhodné pro kosmetické použití" — použij {{product:SLUG}} tokeny pro 5 olejů z CATALOG_CONTEXT (BIO preferovaně, polyfenoly min. 450+, cena pod 70 Kč/100ml), jeden token na řádek, seřadit dle polyfenolů sestupně.',
      'Interní linky: [zdravotní benefity olivového oleje](/pruvodce/je-olivovy-olej-zdravy), [olivový olej s citronem a fototoxicita](/pruvodce/olivovy-olej-s-citronem-po-rano), [proč polyfenoly záleží](/pruvodce/polyfenoly-proc-na-nich-zalezi), [BIO olivové oleje](/srovnavac?certifications=bio).',
      'FAQ (5 otázek): "Můžu si dát olivový olej místo krému?", "Pomáhá olivový olej proti akné?", "Olivový olej na opalování — funguje jako SPF?", "Jak dlouho nechat olivový olej ve vlasech?", "Co se stane, když dám citron s olejem na kůži na slunci?"',
    ],
    unsplashQuery: 'olive oil glass bottle natural beauty skin care wooden',
    focus_dimension: 'polyphenols',
  },

  // ── SEO Vlna 2 — zdravotní cluster ──────────────────────────────────────────
  {
    slug: 'olivovy-olej-s-citronem-po-rano',
    title: 'Olivový olej s citronem po ránu: co funguje a co je mýtus',
    category: 'pruvodce',
    emoji: '🍋',
    excerpt: 'Olivový olej s citronem nalačno — populární ranní rituál. Co na to říká věda, kdy pomáhá a kdy naopak dráždí žaludek.',
    readTime: '7 min čtení',
    targetKeyword: 'olivový olej s citronem',
    briefPoints: [
      '⚠️ YMYL/ZDRAVÍ — POVINNÉ: Žádné léčebné nároky. Formulace: "studie naznačují", "tradičně se uvádí ale věda zatím nepotvrdila", "anekdotické důkazy". Žádné "vyplaví toxiny", "odbouráte tuky", "zaručeně zhubnete" — tohle je influencer detox rétorika bez vědeckého základu. Pokud tvrzení nemá oporu v datech, řekni to explicitně. Na začátek textu: _Autor: Olík — [Jak hodnotíme](/metodika)_',
      'Lead hook: Rituál se šíří na TikToku milionům sledovatelů. Otázka je jednoduchá: pomáhá, škodí, nebo je to prostě dobrý zvyk obalený přehnanými sliby? Přímá odpověď hned v úvodu — bez diplomatické mlhy.',
      'Co citron dělá s olejem (biochemie): citronová kyselina emulguje olej → menší kapičky → mírně rychlejší trávení. Vitamin C v citronové šťávě je reálný přínos (antioxidant). Polyfenoly z EVOO se uvolňují stejně jako bez citronu — kombinace je chuťově a prakticky dobrá, ale nepřidává "zázračný efekt".',
      'Ranní konzumace nalačno — argumenty PRO a PROTI: PRO: prázdný žaludek = max vstřebání tuku a polyfenolů (jednoduché lipidy se absorbují bez kompetice s jídlem), citron stimuluje produkci žaludeční kyseliny a žluče. PROTI: U citlivých lidí citron nalačno dráždí sliznici → pálení žáhy, reflux, zvýšená kyselost. Kdo má GERD, gastritidu nebo citlivý žaludek, experiment nedoporučit. To je reálné riziko — nezhazovat ho.',
      'Věda za "detoxem": neexistuje. Játra a ledviny fungují nepřetržitě bez ohledu na ranní ritual. Žádná klinická studie neprokázala, že kombinace olej+citron "detoxikuje" organismus lépe než normální strava. Říct to jasně a nezakotvit mýtus opakováním.',
      'Co skutečně může fungovat: ranní ritual = konzistentní příjem zdravých tuků (MUFAs, polyfenoly), vitamin C, hydratace s teplou vodou. To jsou reálné benefity, ne magic. Pravidelnost > suplement.',
      'Jak na to prakticky (recept a dávky): 1 lžíce (10–15 ml) EVOO + šťáva z 1/4 citronu + 200 ml teplé vody. Nebo jednoduše na chleba + citronový dresink. EVOO s polyfenoly > 300 mg/kg pro maximální efekt polyfenolů. Dávka 20 g/den = EFSA oxidativní claim.',
      'Jaké oleje se hodí nejlépe: pro čistou konzumaci nalačno = EVOO s vysokými polyfenoly (hořkost = přítomnost oleocanthalu a hydroxytyrosolů). Filtrovaný > nefiltrovaný (čistší chuť v kombinaci s citronem). Sekce "Oleje vhodné pro ranní ritual": použij {{product:SLUG}} tokeny pro 4-5 produktů s nejvyššími polyfenoly z CATALOG_CONTEXT, seřazené sestupně. Žádný jiný text na řádku s tokenem.',
      'Interní linky: [zdravotní účinky olivového oleje](/pruvodce/je-olivovy-olej-zdravy), [proč polyfenoly záleží](/pruvodce/polyfenoly-proc-na-nich-zalezi), [srovnávač olejů s vysokými polyfenoly](/srovnavac?quality=high_polyphenols).',
      'FAQ (4-5 otázek): "Je olivový olej s citronem na hubnutí?", "Můžu pít olivový olej s citronem každý den?", "Co dělá citron s olejem?", "Pomáhá olivový olej s citronem na žaludek?", "Jaký olivový olej je nejlepší nalačno?"',
    ],
    unsplashQuery: 'lemon olive oil morning ritual glass wooden table',
    focus_dimension: 'polyphenols',
  },

  {
    slug: 'je-olivovy-olej-zdravy',
    title: 'Je olivový olej zdravý? Co říká věda',
    category: 'pruvodce',
    emoji: '❤️',
    excerpt: 'Přímá odpověď: záleží na kvalitě a množství. PREDIMED, EFSA a reálná čísla polyfenolů — bez marketingového šumu.',
    readTime: '8 min čtení',
    targetKeyword: 'je olivový olej zdravý',
    briefPoints: [
      '⚠️ YMYL/ZDRAVÍ — POVINNÉ PRO KAŽDOU ZDRAVOTNÍ TVRZENÍ: Žádné léčebné nároky ("léčí", "vyléčí", "zaručeně"). Formulace vždy: "studie naznačují", "spojuje se s nižším rizikem", "podle EFSA". Každé zdravotní tvrzení = zdroj v textu (autor + rok nebo "podle EFSA"). Na začátek textu přidej řádek: _Autor: Olík — [Jak hodnotíme](/metodika)_',
      'Přímá odpověď na otázku v úvodu: EVOO s polyfenoly = ano dle dostupného výzkumu; rafinovaný nebo žluklý olej = jiná kategorie. Bez diplomatického vyhýbání.',
      'PREDIMED studie (Estruch et al., NEJM 2013, n=7 447): tři větve — středomořská dieta + 50 ml EVOO vs kontrola (nízkotučná). Výsledek: -30 % kardiovaskulárních příhod ve EVOO skupině. Kontext: celkový dietní vzorec, ne izolovaný olej.',
      'Mononenasycené tuky: oleická kyselina tvoří 70-80 % EVOO. EFSA 2004 — claim schválen: nahrazení nasycených tuků nenasycenými "přispívá k normálním hladinám LDL cholesterolu".',
      'Oleocanthal: přírodní COX-1 a COX-2 inhibitor (Beauchamp et al., Nature 2005). Pálivost v hrdle = přítomnost oleocanthalu. Analogie s ibuprufenem (oba COX inhibitory, jiná dávka a mechanismus).',
      'EFSA health claim 432/2012: "polyfenoly olivového oleje chrání krevní lipidy před oxidativním stresem" — podmínka: 5 mg hydroxytyrosolů na 20 g oleje (≈ 250 mg/kg polyfenolů v oleji).',
      'Kdy olivový olej zdravotně NEVYNIKÁ: žluklý olej (přesáhlá trvanlivost, špatné skladování), rafinovaný (polyfenoly odstraněny rafinací), přepálený nad 190 °C.',
      'Doporučená dávka: 20 g/den (cca 2 lžíce) pro EFSA oxidativní claim; PREDIMED protokol 50 ml. Praktické okno: 2-4 lžíce denně raw (dressingy, finishing, chleba).',
      'Sekce "Které olivové oleje v ČR mají nejvyšší polyfenoly" — použij {{product:SLUG}} tokeny (jeden per řádek, nic jiného na řádku) pro 4-5 produktů s nejvyššími polyfenoly z CATALOG_CONTEXT, seřazené sestupně. Pod sekci přidej: [Proč polyfenoly záleží →](/pruvodce/polyfenoly-proc-na-nich-zalezi)',
      'Interní linky v textu: [středomořská strava](/pruvodce/stredomorska-strava-olivovy-olej), [porovnávač olejů](/srovnavac?quality=high_polyphenols).',
      'FAQ (3-5 otázek): "Je olivový olej zdravý pro srdce?", "Kolik olivového oleje denně?", "Jaký olivový olej je nejzdravější?", "Ztratí olivový olej zdravotní benefity při smažení?"',
    ],
    unsplashQuery: 'olive oil pouring glass health mediterranean diet',
    focus_dimension: 'polyphenols',
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
3. Formát odkazu závisí na kontextu:
   • Inline text (zmínka v odstavci): [Název produktu](/olej/SLUG)
   • Dedikovaná produktová sekce (top picks, doporučení): {{product:SLUG}}
     — jeden token per řádek, žádný jiný text na témže řádku
     — seřadit sestupně dle hodnoty relevantní pro článek (polyfenoly, cena apod.)
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

/** Načte top-N aktivních produktů z DB seřazených podle focus dimenze.
 *  Pro 'srovnani'/'zebricek' kategorie — záchrana proti halucinacím. */
async function fetchProductCatalog(focus: FocusDimension = null, limit = 35): Promise<CatalogProduct[]> {
  // Price focus: invertovaný dotaz — začínáme od nabídek seřazených cenou
  if (focus === 'price_per_100ml') return fetchProductsByPrice(limit)

  // Mixed-origin focus: 'mixed:GR,IT' nebo 'mixed:GR,IT,ES'
  if (focus !== null && focus.startsWith('mixed:')) {
    const origins = focus.slice(6).split(',')
    return fetchProductsByOriginMix(origins, limit)
  }

  type RawProduct = {
    id: string; slug: string; name: string; olivator_score: number | null;
    acidity: number | null; polyphenols: number | null; origin_country: string | null;
    certifications: string[] | null; volume_ml: number | null; use_cases: string[] | null
  }

  let query = supabaseAdmin
    .from('products')
    .select('id, slug, name, olivator_score, acidity, polyphenols, origin_country, certifications, volume_ml, use_cases')
    .eq('status', 'active')
    .not('olivator_score', 'is', null)

  switch (focus) {
    case 'polyphenols':
      query = query.not('polyphenols', 'is', null).order('polyphenols', { ascending: false })
      break
    case 'acidity':
      query = query.not('acidity', 'is', null).order('acidity', { ascending: true })
      break
    case 'certification_bio':
      query = query.contains('certifications', ['bio']).order('olivator_score', { ascending: false })
      break
    case 'certification_dop':
      query = query.contains('certifications', ['dop']).order('olivator_score', { ascending: false })
      break
    case 'origin:GR':
      query = query.eq('origin_country', 'GR').order('olivator_score', { ascending: false })
      break
    case 'origin:IT':
      query = query.eq('origin_country', 'IT').order('olivator_score', { ascending: false })
      break
    case 'origin:ES':
      query = query.eq('origin_country', 'ES').order('olivator_score', { ascending: false })
      break
    case 'usage:frying':
      query = query.contains('use_cases', ['frying']).order('olivator_score', { ascending: false })
      break
    case 'size:large':
      query = query.gte('volume_ml', 500).order('olivator_score', { ascending: false })
      break
    case 'size:small':
      query = query.lte('volume_ml', 250).order('olivator_score', { ascending: false })
      break
    default:
      query = query.order('olivator_score', { ascending: false })
  }

  const { data: products, error: pe } = await query.limit(limit)
  if (pe || !products) return []

  // Načti nejlevnější offer pro každý produkt (single query)
  const ids = (products as RawProduct[]).map(p => p.id)
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

  return (products as RawProduct[]).map(p => ({
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

/** Price-focused fetch: řadí produkty od nejlevnějšího.
 *  Invertovaný dotaz — začínáme od product_offers. */
async function fetchProductsByPrice(limit = 35): Promise<CatalogProduct[]> {
  const { data: offers } = await supabaseAdmin
    .from('product_offers')
    .select('product_id, price')
    .eq('in_stock', true)
    .order('price', { ascending: true })

  if (!offers || offers.length === 0) return []

  const cheapest = new Map<string, number>()
  const orderedIds: string[] = []
  for (const o of offers as Array<{ product_id: string; price: number }>) {
    if (!cheapest.has(o.product_id)) {
      cheapest.set(o.product_id, o.price)
      orderedIds.push(o.product_id)
      if (orderedIds.length >= limit) break
    }
  }

  const { data: products } = await supabaseAdmin
    .from('products')
    .select('id, slug, name, olivator_score, acidity, polyphenols, origin_country, certifications, volume_ml')
    .eq('status', 'active')
    .in('id', orderedIds)

  if (!products) return []

  type RawProduct = {
    id: string; slug: string; name: string; olivator_score: number | null;
    acidity: number | null; polyphenols: number | null; origin_country: string | null;
    certifications: string[] | null; volume_ml: number | null
  }

  // Zachovej pořadí podle ceny (orderedIds)
  const productMap = new Map((products as RawProduct[]).map(p => [p.id, p]))
  return orderedIds
    .map(id => productMap.get(id))
    .filter((p): p is RawProduct => p != null && p !== undefined)
    .map(p => ({
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

/** Mixed-origin fetch: vrací top-N/k produktů z každé zadané země.
 *  Používá se pro VS články (recky-vs-italsky, recky-italsky-spanelsky). */
async function fetchProductsByOriginMix(origins: string[], limit = 35): Promise<CatalogProduct[]> {
  const perOrigin = Math.floor(limit / origins.length)

  type RawProduct = {
    id: string; slug: string; name: string; olivator_score: number | null;
    acidity: number | null; polyphenols: number | null; origin_country: string | null;
    certifications: string[] | null; volume_ml: number | null
  }

  // Parallel fetch per origin
  const batches = await Promise.all(origins.map(async origin => {
    const { data } = await supabaseAdmin
      .from('products')
      .select('id, slug, name, olivator_score, acidity, polyphenols, origin_country, certifications, volume_ml')
      .eq('status', 'active')
      .eq('origin_country', origin)
      .not('olivator_score', 'is', null)
      .order('olivator_score', { ascending: false })
      .limit(perOrigin)
    return (data ?? []) as RawProduct[]
  }))

  const allProducts = batches.flat()
  if (allProducts.length === 0) return []

  // Single price query for all products
  const ids = allProducts.map(p => p.id)
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

  return allProducts.map(p => ({
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

/** Detekuje relevantní focus dimenzi ze slug + targetKeyword.
 *  NIKDY nečte body_markdown — jen slug a keyword (prevence false positives). */
function detectFocusDimension(slug: string, targetKeyword: string): FocusDimension {
  const s = slug.toLowerCase()
  const k = targetKeyword.toLowerCase()

  if (s.includes('polyfenol') || k.includes('polyfenol')) return 'polyphenols'

  // Cenové články — budget (ascending price)
  if (s.includes('do-200') || k.includes('do 200') || k.includes('nejlevněj')) return 'price_per_100ml'

  // Smažení / fritování
  if (s.includes('smazeni') || k.includes('smažení') || k.includes('fritov')) return 'usage:frying'

  // Certifikace — BIO před DOP (BIO je catch-all pro dop-pgi-bio slug)
  if (s.includes('certifikac') || k.includes('certifikac')) {
    if (s.includes('bio') || k.includes('bio')) return 'certification_bio'
    return 'certification_dop'
  }

  // Původ — VS články (recky-vs-italsky) nemají single origin, vrátíme null
  if (s.includes('-vs-') && (s.includes('recky') || s.includes('italsky') || s.includes('spanelsky'))) return null

  if (s.startsWith('recky') || s.includes('-recky-') || k.includes('řecký')) return 'origin:GR'
  if (s.startsWith('italsky') || s.includes('-italsky') || k.includes('italský')) return 'origin:IT'
  if (s.includes('spanelsky') || k.includes('španělský')) return 'origin:ES'

  if (s.includes('kyselost') || k.includes('kyselost')) return 'acidity'
  if (k.includes('velké balení') || s.includes('velke-baleni')) return 'size:large'
  if (k.includes('malé balení') || s.includes('male-baleni')) return 'size:small'

  return null
}

/** Zaloguje detekci focus dimenze do agent_decisions pro analytics.
 *  Non-critical — chyba nezastaví generování článku. */
async function logFocusDimension(
  slug: string,
  detectedFocus: FocusDimension,
  source: 'explicit' | 'auto' | 'fallback',
  catalogTop3Slugs: string[],
): Promise<void> {
  try {
    await supabaseAdmin.from('agent_decisions').insert({
      agent_name: 'article_generator',
      decision_type: 'focus_dimension',
      context: slug,
      data: { detected_focus: detectedFocus, source, catalog_top_3_slugs: catalogTop3Slugs },
      created_at: new Date().toISOString(),
    })
  } catch {
    // Non-critical — nevypisuj varování aby neznečišťoval výstup
  }
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
    // Detekce focus dimenze: explicit override v briefu > auto z slug+keyword
    const focus: FocusDimension = brief.focus_dimension !== undefined
      ? brief.focus_dimension
      : detectFocusDimension(brief.slug, brief.targetKeyword)
    const source = brief.focus_dimension !== undefined ? 'explicit' : (focus !== null ? 'auto' : 'fallback')

    const products = await fetchProductCatalog(focus, 35)
    catalogBlock = formatCatalogForPrompt(products)
    systemPrompt += CATALOG_RULES

    // Zaloguj detekci do agent_decisions (non-critical)
    await logFocusDimension(brief.slug, focus, source, products.slice(0, 3).map(p => p.slug))

    if (process.env.VERBOSE) {
      console.log(`    🎯 focus=${focus ?? 'null'} (${source}), catalog[0]=${products[0]?.slug ?? '—'}`)
    }
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

// Statické články — existují v DB ale nemají brief v ARTICLE_BRIEFS
const STATIC_ARTICLES: Array<{ slug: string; targetKeyword: string; focus_dimension: FocusDimension }> = [
  { slug: 'jak-vybrat-olivovy-olej',             targetKeyword: 'jak vybrat olivový olej',            focus_dimension: null },
  { slug: 'polyfenoly-proc-na-nich-zalezi',       targetKeyword: 'polyfenoly olivový olej',            focus_dimension: 'polyphenols' },
  { slug: 'nejlepsi-olivovy-olej-2026',           targetKeyword: 'nejlepší olivový olej 2026',         focus_dimension: null },
  { slug: 'recky-vs-italsky',                     targetKeyword: 'řecký vs italský olivový olej',      focus_dimension: 'mixed:GR,IT' },
  { slug: 'recky-italsky-spanelsky-olej',         targetKeyword: 'řecký italský španělský olivový olej', focus_dimension: 'mixed:GR,IT,ES' },
]

async function main() {
  // --detect-only: vypiš tabulku detekce pro všechny slug, bez generování
  if (DETECT_ONLY) {
    const allEntries = [
      ...ARTICLE_BRIEFS.map(b => ({
        slug: b.slug,
        targetKeyword: b.targetKeyword,
        focus_dimension: b.focus_dimension,
      })),
      ...STATIC_ARTICLES.map(s => ({
        slug: s.slug,
        targetKeyword: s.targetKeyword,
        focus_dimension: s.focus_dimension,
      })),
    ]

    console.log('\nFocus dimension detection — všechny články:\n')
    console.log('Slug'.padEnd(52) + 'Focus dimension'.padEnd(22) + 'Source')
    console.log('─'.repeat(85))
    for (const a of allEntries) {
      // focus_dimension is now always explicit in all entries
      const focus = a.focus_dimension !== undefined ? a.focus_dimension : detectFocusDimension(a.slug, a.targetKeyword)
      const source = a.focus_dimension !== undefined ? 'explicit' : (focus !== null ? 'auto' : 'fallback(null)')
      console.log(`${a.slug.padEnd(52)}${String(focus).padEnd(22)}${source}`)
    }
    const withFocus = allEntries.filter(a => (a.focus_dimension !== undefined ? a.focus_dimension : detectFocusDimension(a.slug, a.targetKeyword)) !== null).length
    console.log(`\nCelkem: ${allEntries.length} článků | s focus: ${withFocus} | null: ${allEntries.length - withFocus}`)
    process.exit(0)
  }

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
