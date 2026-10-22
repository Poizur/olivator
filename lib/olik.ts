import { callClaude, extractText } from '@/lib/anthropic'
import { supabaseAdmin } from '@/lib/supabase'

// Sonnet: Haiku v regresním testu zkracoval názvy olejů a dělal jazykové chyby; objem je malý (jednotky dotazů týdně).
export const OLIK_MODEL = 'claude-sonnet-4-6'
export const OLIK_RETENTION_MONTHS = 12
// Jazyková kontrola je „měkká“ (jen vyvolá přegenerování) — stačí levný model.
const OLIK_LANGUAGE_MODEL = 'claude-haiku-4-5-20251001'
const POLYPHENOL_RANKING = '/zebricek/nejlepsi-vysokopolyfenolovy-olej'
/** Účinnost zásad s 12měsíčním uchováním. Starší konverzace byly sbírány pod slibem 30 dnů. */
export const OLIK_12M_POLICY_FROM = '2026-10-22T00:00:00+02:00'
const OLIK_LEGACY_RETENTION_DAYS = 30

export interface OlikMessage {
  role: 'user' | 'assistant'
  content: string
}

interface OfferContext {
  price: number
  in_stock: boolean
  affiliate_url: string | null
  commission_pct: number | null
  retailer_name: string | null
  retailer_slug: string | null
}

export interface ProductContext {
  name: string
  slug: string
  score: number
  price: number
  retailer_name: string | null
  retailer_slug: string | null
  origin: string
  polyphenols: number | null
  acidity: number | null
  certifications: string[]
  flavorLabels: string[]
  goLink: string
}

export interface OlikContext {
  products: ProductContext[]
  /** Nejlepší oleje podle Score — stálá (cachovaná) část promptu. */
  topProducts: ProductContext[]
  nameMatches: ProductContext[]
  /** Hledaný název je v DB, ale žádný jeho olej teď nemá nabídku u obchodu, se kterým spolupracujeme. */
  unavailableNameMatches: string[]
  searchTokens: string[]
  activeRetailers: Array<{ name: string; domain: string | null }>
  /** Počet olejů koupitelných u obchodů, se kterými spolupracujeme (celý katalog, ne jen výběr v promptu). */
  buyableCount: number
  inactiveRetailers: Array<{ name: string; slug: string; domain: string | null }>
}

export interface OlikResult {
  text: string
  attempts: number
  issues: string[]
  fallback: boolean
  recommendedSlugs: string[]
  tokens: number
}

const SKIP_TOKENS = new Set([
  'extra', 'panenský', 'panenského', 'panenské', 'olivový', 'olivového', 'olivové', 'olivovy',
  'olej', 'oleji', 'olejem', 'oleje', 'olejů', 'chceš', 'hledám', 'máte', 'koupit', 'levný', 'dobrý',
  'španělský', 'řecký', 'italský', 'chorvatský', 'tento', 'takový', 'který', 'jaký', 'jaké', 'jakou',
  'nějaký', 'doporuč', 'chutná', 'zkusil', 'hledat', 'najdi', 'řecké', 'třeba', 'něco', 'prosím',
  'díky', 'máme', 'mají', 'mám', 'máš', 'olivator', 'olivátor', 'nejlepší', 'nejzdravější', 'zdravý',
  'saláty', 'salát', 'vaření', 'pečení', 'smažení', 'restování', 'grilování', 'dárek', 'polyfenolů',
  'polyfenoly', 'kyselost', 'rozdíl', 'mezi', 'znamená', 'score', 'vybrat', 'proč', 'není', 'tady',
  'podívej', 'pravda', 'etiketu', 'číst', 'lehký', 'tradiční', 'léčivý', 'kolik', 'stojí', 'kde',
])

function pickBestOffer(offers: OfferContext[]): OfferContext | null {
  const inStock = offers.filter((o) => o.in_stock)
  if (inStock.length === 0) return null
  const threshold = Math.min(...inStock.map((o) => o.price)) * 1.05
  const affiliateOffers = inStock.filter(
    (o) => o.price <= threshold && (o.affiliate_url != null || (o.commission_pct ?? 0) > 0)
  )
  if (affiliateOffers.length > 0) {
    return affiliateOffers.reduce((best, o) => ((o.commission_pct ?? 0) > (best.commission_pct ?? 0) ? o : best))
  }
  return inStock.reduce((best, o) => (o.price < best.price ? o : best))
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapToProductContext(p: any): ProductContext | null {
  const rawOffers = (p.product_offers ?? []) as Array<{
    price: number
    in_stock: boolean
    affiliate_url: string | null
    commission_pct: number | null
    retailers: { name: string; slug: string; is_active: boolean } | null
  }>
  // Jen obchody, se kterými spolupracujeme — karanténní nabídky web nezobrazuje, Olík taky ne.
  const offers: OfferContext[] = rawOffers
    .filter((o) => o.retailers?.is_active === true)
    .map((o) => ({
      price: Number(o.price) || 0,
      in_stock: Boolean(o.in_stock),
      affiliate_url: o.affiliate_url ?? null,
      commission_pct: o.commission_pct != null ? Number(o.commission_pct) : null,
      retailer_name: o.retailers?.name ?? null,
      retailer_slug: o.retailers?.slug ?? null,
    }))
  const best = pickBestOffer(offers)
  if (!best) return null
  return {
    name: p.name as string,
    slug: p.slug as string,
    score: p.olivator_score as number,
    price: best.price,
    retailer_name: best.retailer_name,
    retailer_slug: best.retailer_slug,
    origin: (p.origin_country as string | null) ?? '',
    polyphenols: p.polyphenols as number | null,
    acidity: p.acidity ? Number(p.acidity) : null,
    certifications: (p.certifications as string[]) ?? [],
    flavorLabels: (p.flavor_labels as string[]) ?? [],
    goLink: best.retailer_slug ? `/go/${best.retailer_slug}/${p.slug as string}?st=olik` : `/olej/${p.slug as string}`,
  }
}

const PRODUCT_SELECT = `
  name, slug, olivator_score, origin_country,
  polyphenols, acidity, certifications, flavor_labels,
  product_offers ( price, in_stock, affiliate_url, commission_pct, retailers ( name, slug, is_active ) )
`

// Přezdívky, cizí a bezdiakritické varianty názvů → tvar, jak je v názvech olejů v katalogu.
const NAME_ALIASES: Record<string, string[]> = {
  corfu: ['korfu'], kerkyra: ['korfu'], korfu: ['korfu'],
  crete: ['kréta', 'krety', 'kréty'], kreta: ['kréta'], krety: ['kréty', 'kréta'], creta: ['kréta'],
  peloponnese: ['peloponés'], peloponnes: ['peloponés'], pelopones: ['peloponés'], peloponez: ['peloponés'],
  lesbos: ['lesvos'], lesvos: ['lesvos'], kalamon: ['kalamata'], calamata: ['kalamata'],
  sicily: ['sicil'], sicilia: ['sicil'], sicilie: ['sicil'], apulia: ['puglia', 'apulie'], puglia: ['puglia', 'apulie'],
  tuscany: ['toscana', 'toskán'], toscana: ['toscana', 'toskán'], andalusia: ['andalus'],
  koronaiki: ['koroneiki'], koroneiki: ['koroneiki'], arbequina: ['arbequina'],
  evolia: ['evolia'], evoilino: ['evoilino'], sitia: ['sitia'], famelian: ['famelian'],
}

export function searchTokensOf(query: string): string[] {
  const words = (query.match(/\p{L}{4,}/gu) ?? []).map((w) => w.toLowerCase()).filter((w) => !SKIP_TOKENS.has(w))
  const plain = (w: string) => w.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  return [...new Set(words.flatMap((w) => [w, ...(NAME_ALIASES[plain(w)] ?? [])]))]
}

async function getTopProducts(limit: number): Promise<ProductContext[]> {
  const { data } = await supabaseAdmin
    .from('products')
    .select(PRODUCT_SELECT)
    .eq('status', 'active')
    .gt('olivator_score', 0)
    .not('name', 'ilike', '%poškozený obal%')
    .not('name', 'ilike', '%outlet%')
    .order('olivator_score', { ascending: false })
    .limit(limit * 2)
  return ((data ?? []).map(mapToProductContext).filter(Boolean) as ProductContext[]).slice(0, limit)
}

async function searchByName(tokens: string[]): Promise<{ available: ProductContext[]; unavailable: string[] }> {
  if (tokens.length === 0) return { available: [], unavailable: [] }
  const orParts = tokens.flatMap((t) => [`name.ilike.%${t}%`, `name_short.ilike.%${t}%`, `brand_slug.ilike.%${t}%`])
  const { data } = await supabaseAdmin
    .from('products')
    .select(PRODUCT_SELECT)
    .in('status', ['active', 'inactive'])
    .not('name', 'ilike', '%poškozený obal%')
    .not('name', 'ilike', '%outlet%')
    .or(orParts.join(','))
    .order('olivator_score', { ascending: false })
    .limit(40)
  const rows = data ?? []
  const available = rows.map(mapToProductContext).filter(Boolean).slice(0, 15) as ProductContext[]
  const unavailable = available.length > 0 ? [] : rows.slice(0, 5).map((r) => r.name as string)
  return { available, unavailable }
}

export async function buildOlikContext(lastUserMsg: string): Promise<OlikContext> {
  const searchTokens = searchTokensOf(lastUserMsg)
  const [top, byName, { data: retailers }, { data: buyable }] = await Promise.all([
    getTopProducts(40),
    searchByName(searchTokens),
    supabaseAdmin.from('retailers').select('name, slug, domain, is_active'),
    supabaseAdmin
      .from('product_offers')
      .select('product_id, retailers!inner(is_active), products!inner(status)')
      .eq('in_stock', true)
      .eq('retailers.is_active', true)
      .eq('products.status', 'active')
      .limit(5000),
  ])
  const seen = new Set<string>()
  const products: ProductContext[] = []
  for (const p of [...byName.available, ...top]) {
    if (!seen.has(p.slug)) {
      seen.add(p.slug)
      products.push(p)
    }
  }
  const all = (retailers ?? []) as Array<{ name: string; slug: string; domain: string | null; is_active: boolean }>
  return {
    products,
    topProducts: top,
    nameMatches: byName.available,
    unavailableNameMatches: byName.unavailable,
    searchTokens,
    buyableCount: new Set((buyable ?? []).map((o) => o.product_id as string)).size,
    activeRetailers: all.filter((r) => r.is_active).map((r) => ({ name: r.name, domain: r.domain })),
    inactiveRetailers: all.filter((r) => !r.is_active).map((r) => ({ name: r.name, slug: r.slug, domain: r.domain })),
  }
}

const FLAVOR_CZ: Record<string, string> = {
  ovocny: 'ovocný', bylinny: 'bylinný', horky: 'hořký', palivy: 'pálivý', jemny: 'jemný', vyrazny: 'výrazný',
}

export function catalogLine(p: ProductContext): string {
  const flavor = p.flavorLabels.map((l) => FLAVOR_CZ[l] ?? l).join(', ')
  return [
    `• ${p.name} (Score ${p.score}`,
    p.origin ? `, ${p.origin}` : '',
    p.polyphenols ? `, ${p.polyphenols} mg/kg polyfenolů` : '',
    p.acidity != null ? `, kyselost ${p.acidity} %` : '',
    p.certifications.length > 0 ? `, ${p.certifications.join('/')}` : '',
    `, ${Math.round(p.price)} Kč u ${p.retailer_name ?? '?'}`,
    flavor ? ` | chuť dle výrobce: ${flavor}` : '',
    `): ${p.goLink}`,
  ].join('')
}

function searchNote(ctx: OlikContext): string {
  if (ctx.nameMatches.length > 0) {
    return `\nVYHLEDÁVÁNÍ PODLE NÁZVU: dotaz odpovídá ${ctx.nameMatches.length} olejům v katalogu — jsou na začátku seznamu. Ukaž z nich max 3 dle Score.`
  }
  if (ctx.unavailableNameMatches.length > 0) {
    return `\nVYHLEDÁVÁNÍ PODLE NÁZVU: tento olej/značku jsme v katalogu dříve měli (např. ${ctx.unavailableNameMatches.slice(0, 2).join('; ')}), ale teď není dostupný u žádného obchodu, se kterým spolupracujeme. Řekni přesně to — „dřív jsme ho v katalogu měli, teď ho žádný z obchodů, se kterými spolupracujeme, nenabízí“ — bez spekulací o důvodu, a nabídni podobné oleje z katalogu.`
  }
  if (ctx.searchTokens.length > 0) {
    return `\nVYHLEDÁVÁNÍ PODLE NÁZVU: pro slova „${ctx.searchTokens.join(', ')}“ v katalogu ŽÁDNÁ shoda názvu. Pokud jde o název oleje nebo značky, odpověz „Tenhle olej zatím v katalogu nemáme.“ a nabídni podobné z katalogu.`
  }
  return ''
}

/** Systémový prompt ve dvou blocích: stálý (pravidla + nejlepší oleje, cachovaný u Anthropicu — opakované čtení
 *  stojí desetinu ceny) a proměnný (poznámka k vyhledávání + shody s dotazem). */
export function buildOlikSystemPrompt(ctx: OlikContext): Array<{ type: 'text'; text: string; cache_control?: { type: 'ephemeral' } }> {
  const topSlugs = new Set(ctx.topProducts.map((p) => p.slug))
  const extra = ctx.products.filter((p) => !topSlugs.has(p.slug))
  const stable = `Jsi Olík — chatovací asistent webu Olivátor (olivator.cz). Ty JSI Olivátor: mluvíš za něj v 1. osobě množného čísla („v našem katalogu“, „naše Olivator Score“).
Když uživatel zmíní Olivátor, olivator.cz nebo překlep jako „olivatr“, mluví o NÁS — nikdy netvrď, že jde o jiný web nebo prodejce. Olivátor sám olej neprodává.
Uživateli tykáš (stejně jako uvítací zpráva chatu).

CO JE OLIVÁTOR
- Nezávislý srovnávač olivových olejů pro ČR. Sami nic neprodáváme — sledujeme ceny a dostupnost u obchodů, se kterými spolupracujeme, a odkazujeme na ně. Za nákup přes odkaz můžeme dostat provizi, cenu pro zákazníka to nemění.
- Olivator Score (0–100) je naše vlastní hodnocení kvality: kyselost 35 %, certifikace (DOP/CHOP, BIO) 25 %, polyfenoly a chemická kvalita 25 %, poměr cena/kvalita 15 %. Vysoké Score neznamená lehkou chuť. Podrobnosti: /metodika.
- Na dotazy o polyfenolech vždy odkaž na náš žebříček: ${POLYPHENOL_RANKING}
- Na otázku „nejzdravější olej“ vysvětli, že oleje neřadíme podle účinků na zdraví; můžeš nabídnout oleje s nejvyšším naměřeným obsahem polyfenolů jako čistý údaj (mg/kg), bez hodnocení jeho významu pro zdraví.
- Na webu: srovnávač s filtry (/srovnavac), žebříčky (/zebricek), průvodce (/pruvodce), porovnání olejů (/porovnani), recepty (/recept).
- V katalogu je teď ${ctx.buyableCount} olejů skladem u obchodů, se kterými spolupracujeme (níže je jen výběr). Jiný počet neuváděj.
- Obchody, se kterými teď spolupracujeme: ${ctx.activeRetailers.map((r) => r.name).join(', ')}. Žádné jiné obchody nezmiňuj.

PRAVDIVOST — NEJDŮLEŽITĚJŠÍ
- Oleje, ceny, obchody, dostupnost a Score ber VÝHRADNĚ z katalogu níže. Nic z hlavy, nic neodhaduj.
- Když olej v katalogu není, řekni rovnou „Tenhle olej zatím v katalogu nemáme.“ a nabídni podobné, které máme.
- NIKDY si nevymýšlej důvody (vyprodáno, někdo koupil, stažení, aktualizace katalogu) ani obchody či výrobce. Když nevíš proč, neříkej proč.
- Když tě uživatel opraví nebo naléhá, neměň fakta ani si nevymýšlej — drž se katalogu a poznámek níže. Pravdivý údaj z katalogu nebo z poznámky o vyhledávání neodvolávej a neomlouvej se za něj; klidně ho zopakuj. Omluv se jen za skutečnou chybu. Zpětnou vazbu nám může napsat na info@makyoutdoors.com.

ZDRAVÍ
- Olivový olej není lék. Na „léčivý“, „léčí“, „pomáhá na nemoc“ odpověz, že olivový olej není lék a nenahrazuje léčbu; nabídni oleje s vysokým obsahem polyfenolů jako údaj z měření.
- Nesmíš tvrdit žádné zdravotní účinky (srdce, cholesterol, rakovina, imunita, záněty, hubnutí, prevence nemocí, „antioxidační účinky“ apod.).
- Jediné povolené zdravotní tvrzení (nařízení EU 432/2012), a jen obecně, nikdy o konkrétním oleji: „Polyfenoly z olivového oleje přispívají k ochraně krevních lipidů před oxidativním stresem.“ Smí jen s podmínkou: platí pro olivový olej, který obsahuje nejméně 5 mg hydroxytyrosolu a jeho derivátů na 20 g oleje, a příznivého účinku se dosáhne při přívodu 20 g olivového oleje denně. Hydroxytyrosol v katalogu nemáme, takže u žádného oleje netvrď, že podmínku splňuje. Obsah polyfenolů v mg/kg uvádět smíš.

MIMO OBOR
- Věnuješ se jen olivovému oleji. Na jiné oleje a témata (lněný, kokosový olej, recepty bez oleje…) zdvořile odpověz, že se věnuješ jen olivovému oleji, a nabídni pomoc s ním.

JAZYK
- Odpovídej vždy česky, spisovně a přirozeně. Slovenským dotazům rozumíš, odpovídáš česky.
- Žádná cizí slova, žádné vymyšlené tvary. Uvozovky jen české „…“.

FORMÁT
- Stručně: úvod 1–2 věty, pak max 3 oleje (jen pokud jsou relevantní). Na vzdělávací otázky (co je, rozdíl, jak vybrat) odpověz věcně v 3–5 větách, doporučení olejů je volitelné.
- Každý olej (název VŽDY celý a přesně jako v katalogu, nezkracuj ho):
  "1. **PŘESNÝ NÁZEV Z KATALOGU** – CENA Kč u OBCHOD"
  "- důvod (kyselost / polyfenoly / chuť dle výrobce / certifikace)"
  ODKAZ_Z_KATALOGU na samostatném řádku (přesně jak je v katalogu, žádné []())
- Chuť popisuj jen štítky z katalogu a s „dle popisu výrobce“. Pokud štítky chybí, chuť neodhaduj a nic z ostatních údajů o chuti neusuzuj (kyselost ani polyfenoly chuť neurčují).
- Cenový limit uživatele („do 300 Kč“) dodrž přesně — nenabízej nic dražšího.
- Early harvest = „raná sklizeň“. Ranou sklizeň, odrůdu ani region neuváděj, pokud nejsou v názvu oleje nebo v katalogu.
- Kyselost a polyfenoly ber jen z údajů „kyselost X %“ a „X mg/kg“ v řádku katalogu, nikdy z čísla v názvu oleje.
- Údaje (chuť, kyselost, cena) ber vždy z řádku TOHO oleje, který doporučuješ — různá balení stejného oleje mají v katalogu různé údaje.
- Žádné nadpisy, emoji, horizontální čáry ani závěrečné „Můj tip“.

NEJLEPŠÍ OLEJE PODLE SCORE (${ctx.topProducts.length} z ${ctx.buyableCount} olejů skladem u obchodů, se kterými spolupracujeme):
${ctx.topProducts.map(catalogLine).join('\n')}`
  const variable = `${searchNote(ctx).trim() || 'Dotaz nehledá konkrétní název.'}${
    extra.length > 0 ? `\n\nDALŠÍ OLEJE ODPOVÍDAJÍCÍ DOTAZU:\n${extra.map(catalogLine).join('\n')}` : ''
  }`
  return [
    { type: 'text', text: stable, cache_control: { type: 'ephemeral' } },
    { type: 'text', text: variable },
  ]
}

const norm = (s: string) =>
  s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ' ').trim()

const FOREIGN_WORDS = new RegExp(`(?<!\\p{L})(gebied|het|een|und|oder|nicht|sehr|mit|der|die|das|the|and|with|very|for|you|your|is|are|this|that|olejury|velmi\\s+dobre|ďakujem|veľmi|ktorý|ktorá|tiež|lebo|som|sú|olivový\\s+olej\\s+je\\s+veľ)(?!\\p{L})`, 'iu')
const NON_CZECH_LETTERS = /[Ѐ-ӿͰ-Ͽ一-鿿ľĺŕäôẞß]/
const INVENTED_REASON = /(někdo\s+(ho|je|to)\s+koupil|vyprodal|vyprodan[ýáé]|stáhl[ia]?\s+z\s+prodeje|nahradil[ia]|aktualizoval\s+katalog|už\s+ho\s+nemáme\s+v\s+sortimentu|přestal[ia]?\s+prodávat)/i
const HEALTH = /(léč|\blék(?!ař)|vyléč|uzdrav|prevenc|předcház|chrání\s+před|snižuje\s+(riziko|cholesterol|tlak)|cholesterol|rakovin|nádor|srdc|srdeční|kardio|cukrovk|diabet|imunit|zánět|detox|antioxida|omlaz|hubnut|zdravotní\s+účin|posiluje|prospěšn|blahodárn)/i
const ALLOWED_HEALTH_SENTENCE = /((není|nemá|nejsou|nesmí\w*|netvrd\w*|nelze|neslibuj\w*)\s.{0,60}(léč|lék|účin)|není\s+lék|nenahrazuje\s+léčbu|ochran[ěy]\s+(krevních\s+lipidů|lipidů\s+v\s+krvi)\s+před\s+oxida\w*\s+stresem|432\/2012|hydroxytyrosol)/i

/** Kontrola odpovědi: jazyk, existence olejů a obchodů v katalogu, vymyšlené důvody, zdravotní tvrzení. */
export function validateOlikReply(text: string, ctx: OlikContext, userMsg = ''): string[] {
  const issues: string[] = []
  const allowedSlugs = new Map(ctx.products.map((p) => [p.slug, p]))

  // Názvy olejů a odkazy nejsou čeština ani zdravotní tvrzení — kontrolujeme jen vlastní text.
  const prose = text.replace(/\*\*[^*]+\*\*/g, ' ').replace(/\S*\/(go|olej)\/\S+/g, ' ')
  if (NON_CZECH_LETTERS.test(prose)) issues.push('jazyk: znaky mimo češtinu (cyrilice/řečtina/slovenština)')
  const foreign = prose.match(FOREIGN_WORDS)
  if (foreign) issues.push(`jazyk: cizí nebo nesmyslné slovo „${foreign[0]}“`)

  for (const m of text.matchAll(/\/go\/([\w-]+)\/([\w-]+)/g)) {
    const p = allowedSlugs.get(m[2])
    if (!p) issues.push(`olej: odkaz na olej mimo katalog (${m[2]})`)
    else if (p.retailer_slug !== m[1]) issues.push(`obchod: odkaz přes jiný obchod než v katalogu (${m[1]})`)
  }
  for (const m of text.matchAll(/\/olej\/([\w-]+)/g)) {
    if (!allowedSlugs.has(m[1])) issues.push(`olej: odkaz na olej mimo katalog (${m[1]})`)
  }

  const bySlug = (slug: string) => allowedSlugs.get(slug)
  const catalogNames = ctx.products.map((p) => ({ p, n: norm(p.name) }))
  const budgetMatch = userMsg.match(/do\s+(\d[\d\s]*)\s*(?:Kč|kc|korun)/i)
  const budget = budgetMatch ? Number(budgetMatch[1].replace(/\s/g, '')) : null
  const items = text.split(/\n(?=\s*\d+\.\s+\*\*)/).filter((b) => /^\s*\d+\.\s+\*\*/.test(b))
  for (const item of items) {
    const head = item.match(/^\s*\d+\.\s+\*\*(.+?)\*\*(.*)$/m)
    if (!head) continue
    const slug = item.match(/\/(?:go\/[\w-]+|olej)\/([\w-]+)/)?.[1]
    const n = norm(head[1])
    let hit = slug ? bySlug(slug) : undefined
    if (!hit) hit = catalogNames.find((c) => c.n === n || c.n.includes(n))?.p
    if (!hit) {
      issues.push(`olej: „${head[1]}“ není v katalogu`)
      continue
    }
    const nameTokens = n.split(' ').filter((t) => t.length > 2)
    const productNorm = ` ${norm(hit.name)} `
    const overlap = nameTokens.filter((t) => productNorm.includes(` ${t} `)).length / Math.max(1, nameTokens.length)
    if (overlap < 0.7) issues.push(`olej: název „${head[1]}“ neodpovídá odkazu (${hit.slug})`)
    const price = head[2].match(/(\d[\d\s]*)\s*Kč/)
    if (price && Math.abs(Number(price[1].replace(/\s/g, '')) - Math.round(hit.price)) > 1) {
      issues.push(`cena: u „${head[1]}“ ${price[1].trim()} Kč, v katalogu ${Math.round(hit.price)} Kč`)
    }
    if (budget != null && price && Number(price[1].replace(/\s/g, '')) > budget) {
      issues.push(`cena: „${head[1]}“ za ${price[1].trim()} Kč překračuje limit ${budget} Kč`)
    }
    const flavorWords = Object.values(FLAVOR_CZ).filter((w) => new RegExp(`(?<!\\p{L})${w}(?!\\p{L})`, 'iu').test(item))
    const labels = hit.flavorLabels.map((l) => FLAVOR_CZ[l] ?? l)
    const unknownFlavor = flavorWords.filter((w) => !labels.includes(w))
    if (unknownFlavor.length > 0) issues.push(`chuť: u „${head[1]}“ štítky ${unknownFlavor.join(', ')} nejsou v katalogu`)
    const shop = head[2].match(/Kč\s+u\s+([^\n–]+)/)
    if (shop && hit.retailer_name && !norm(shop[1]).startsWith(norm(hit.retailer_name))) {
      issues.push(`obchod: u „${head[1]}“ uveden „${shop[1].trim()}“, v katalogu ${hit.retailer_name}`)
    }
  }

  const textNorm = ` ${norm(text)} `
  for (const r of ctx.inactiveRetailers) {
    const names = [r.name, r.slug, r.domain ?? ''].filter((x) => x && norm(x).length >= 5)
    const userNorm = ` ${norm(userMsg)} `
    if (names.some((x) => textNorm.includes(` ${norm(x)} `) && !userNorm.includes(` ${norm(x).split(' ')[0]} `))) issues.push(`obchod: zmíněn obchod mimo spolupráci (${r.name})`)
  }
  const activeDomains = new Set(['olivator.cz', 'www.olivator.cz', 'makyoutdoors.com', ...ctx.activeRetailers.map((r) => r.domain ?? '')])
  for (const m of text.matchAll(/\b((?:[\w-]+\.)+(?:cz|sk|com|eu|gr|it|es|de))\b/gi)) {
    const d = m[1].toLowerCase()
    if (!activeDomains.has(d) && !activeDomains.has(d.replace(/^www\./, '')) && !d.endsWith('makyoutdoors.com') && !userMsg.toLowerCase().includes(d)) {
      issues.push(`obchod: doména mimo katalog (${d})`)
    }
  }

  if (INVENTED_REASON.test(text)) issues.push(`pravdivost: vymyšlený důvod („${text.match(INVENTED_REASON)![0]}“)`)

  for (const sentence of prose.split(/(?<=[.!?])\s+|\n+/)) {
    if (HEALTH.test(sentence) && !ALLOWED_HEALTH_SENTENCE.test(sentence)) {
      issues.push(`zdraví: „${sentence.trim().slice(0, 120)}“`)
    }
  }
  return [...new Set(issues)]
}

async function languageCheck(text: string, ctx: OlikContext): Promise<string[]> {
  const prose = text.replace(/\*\*[^*]+\*\*/g, ' ').replace(/\S*\/(go|olej|zebricek|srovnavac|metodika|pruvodce)\S*/g, ' ')
  try {
    const res = await callClaude({
      model: OLIK_LANGUAGE_MODEL,
      max_tokens: 200,
      messages: [{
        role: 'user',
        content: `Jsi korektor češtiny. Najdi v textu níže JEN slova, která nejsou česká (cizí jazyk, slovenština) nebo jsou to neexistující/zkomolené české tvary. Ignoruj vlastní jména: názvy olejů, značek, odrůd, regionů, certifikací a obchodů (např. ${ctx.activeRetailers.map((r) => r.name).join(', ')}, Olivátor, Olivator Score, EARLY HARVEST, BIO, DOP, PDO). Hlásit jen skutečné chyby češtiny, ne styl. Vrať POUZE JSON {"chyby": ["slovo", ...]} — prázdné pole, pokud je vše v pořádku.\n\nTEXT:\n${prose}`,
      }],
    }, 4, { source: 'olik-jazyk' })
    const raw = extractText(res)
    const j = JSON.parse(raw.slice(raw.indexOf('{'), raw.lastIndexOf('}') + 1)) as { chyby?: string[] }
    return (j.chyby ?? []).filter(Boolean).map((w) => `jazyk: „${w}“`)
  } catch {
    return []
  }
}

export function extractRecommendedSlugs(text: string): string[] {
  const go = [...text.matchAll(/\/go\/[\w-]+\/([\w-]+)/g)].map((m) => m[1])
  const olej = [...text.matchAll(/\/olej\/([\w-]+)/g)].map((m) => m[1])
  return [...new Set([...go, ...olej])]
}

function withPolyphenolLink(text: string, query: string): string {
  if (!/polyfen/i.test(query) || text.includes(POLYPHENOL_RANKING)) return text
  return `${text}\n\nVšechny oleje seřazené podle polyfenolů: ${POLYPHENOL_RANKING}`
}

function safeAnswer(ctx: OlikContext): string {
  if (ctx.nameMatches.length > 0) {
    const list = ctx.nameMatches.slice(0, 3).map((p, i) =>
      `${i + 1}. **${p.name}** – ${Math.round(p.price)} Kč u ${p.retailer_name}\n- Olivator Score ${p.score}${p.acidity != null ? `, kyselost ${p.acidity} %` : ''}${p.polyphenols ? `, ${p.polyphenols} mg/kg polyfenolů` : ''}\n${p.goLink}`
    )
    return `Tohle k tomu máme v katalogu:\n\n${list.join('\n\n')}`
  }
  if (ctx.unavailableNameMatches.length > 0 || ctx.searchTokens.length > 0) {
    return 'Tenhle olej zatím v katalogu nemáme. Podobné oleje najdete ve srovnávači: /srovnavac — nebo mi napište, k čemu olej chcete (saláty, vaření, dárek) a jakou máte představu o ceně.'
  }
  return 'Na tohle vám teď neumím spolehlivě odpovědět. Zkuste prosím otázku položit jinak, nebo se podívejte do srovnávače: /srovnavac'
}

/** Vygeneruje odpověď, zkontroluje ji; při chybě 1× přegeneruje, jinak vrátí bezpečnou odpověď. */
export async function answerOlik(messages: OlikMessage[]): Promise<OlikResult> {
  const history = messages.slice(-10)
  const lastUserMsg = history.filter((m) => m.role === 'user').at(-1)?.content ?? ''
  // Navazující otázky („to není pravda“) nesou název jen v předchozích dotazech.
  const recentUserText = history.filter((m) => m.role === 'user').slice(-3).map((m) => m.content).join(' ')
  const ctx = await buildOlikContext(recentUserText)
  const system = buildOlikSystemPrompt(ctx)

  let tokens = 0
  let issues: string[] = []
  let convo = history
  for (let attempt = 1; attempt <= 2; attempt++) {
    const res = await callClaude({ model: OLIK_MODEL, max_tokens: 700, system, messages: convo }, 4, { source: 'olik' })
    tokens += (res.usage?.input_tokens ?? 0) + (res.usage?.output_tokens ?? 0)
    const text = extractText(res).trim()
    issues = validateOlikReply(text, ctx, recentUserText)
    // Námitky jazykového modelu jsou „měkké“: vyvolají přegenerování, ale samy odpověď nezablokují
    // (v regresním testu dávaly falešné poplachy). Tvrdé kontroly (oleje, ceny, obchody, zdraví, cizí písmo) blokují.
    let softIssues: string[] = []
    if (issues.length === 0) softIssues = await languageCheck(text, ctx)
    if (issues.length === 0 && (softIssues.length === 0 || attempt === 2)) {
      if (softIssues.length > 0) issues = softIssues.map((i) => `${i} (měkká, odesláno)`)
      return { text: withPolyphenolLink(text, lastUserMsg), attempts: attempt, issues, fallback: false, recommendedSlugs: extractRecommendedSlugs(text), tokens }
    }
    if (issues.length === 0) issues = softIssues
    convo = [
      ...history,
      { role: 'assistant', content: text },
      {
        role: 'user',
        content: `[Interní kontrola, uživatel ji nevidí] Tvoje odpověď nevyhověla:\n${issues.map((i) => `- ${i}`).join('\n')}\nNapiš celou odpověď na můj předchozí dotaz znovu a správně — jen z katalogu, česky, bez zdravotních tvrzení a bez vymyšlených důvodů.${issues.some((i) => i.startsWith('chuť')) ? ' Chuť olejů tentokrát vůbec neuváděj.' : ''}${issues.some((i) => i.startsWith('jazyk')) ? ` Vyhni se slovům: ${issues.filter((i) => i.startsWith('jazyk')).map((i) => i.replace(/^jazyk:\s*/, '')).join(', ')}.` : ''} Kontrolu nezmiňuj.`,
      },
    ]
  }
  const text = withPolyphenolLink(safeAnswer(ctx), lastUserMsg)
  return { text, attempts: 2, issues, fallback: true, recommendedSlugs: extractRecommendedSlugs(text), tokens }
}

export function maskPii(text: string): string {
  return text
    .replace(/\S+@\S+\.\S+/g, '[email]')
    .replace(/(\+42[01]\s?)?[0-9]{3}\s?[0-9]{3}\s?[0-9]{3}/g, '[telefon]')
}

export async function purgeOldOlikConversations(): Promise<number> {
  const legacyCutoff = new Date(Date.now() - OLIK_LEGACY_RETENTION_DAYS * 86400000).toISOString()
  const cutoff = new Date()
  cutoff.setMonth(cutoff.getMonth() - OLIK_RETENTION_MONTHS)
  const [legacy, current] = await Promise.all([
    supabaseAdmin
      .from('olik_conversations')
      .delete({ count: 'exact' })
      .lt('created_at', OLIK_12M_POLICY_FROM)
      .lt('created_at', legacyCutoff),
    supabaseAdmin
      .from('olik_conversations')
      .delete({ count: 'exact' })
      .lt('created_at', cutoff.toISOString()),
  ])
  await supabaseAdmin.from('olik_rate_events').delete().lt('created_at', new Date(Date.now() - 86400000).toISOString())
  if (legacy.error) throw new Error(legacy.error.message)
  if (current.error) throw new Error(current.error.message)
  return (legacy.count ?? 0) + (current.count ?? 0)
}
