import { NextRequest, NextResponse } from 'next/server'
import { callClaude, extractText } from '@/lib/anthropic'
import { supabaseAdmin } from '@/lib/supabase'

const MODEL = 'claude-haiku-4-5-20251001'

interface OfferContext {
  price: number
  in_stock: boolean
  affiliate_url: string | null
  commission_pct: number | null
  retailer_name: string | null
  retailer_slug: string | null
}

interface ProductContext {
  name: string
  slug: string
  score: number
  price: number | null
  retailer_name: string | null
  retailer_slug: string | null
  origin: string
  polyphenols: number | null
  acidity: number | null
  certifications: string[]
  flavorProfile: Record<string, number>
  goLink: string
}

const SKIP_TOKENS = new Set([
  'extra', 'panenský', 'panenského', 'panenské', 'olivový', 'olivového', 'olivové',
  'olej', 'oleji', 'olejem', 'chceš', 'hledám', 'máte', 'koupit', 'levný', 'dobrý',
  'španělský', 'řecký', 'italský', 'chorvatský', 'tento', 'takový', 'který', 'jaký',
  'nějaký', 'dobrý', 'doporuč', 'chutná', 'zkusil', 'hledat', 'najdi', 'řecké',
  'třeba', 'něco', 'prosím', 'díky', 'máme', 'mají', 'mám', 'máš',
])

/** Vybere nejlepší in-stock offer: nejlevnější affiliate v pásmu ±5%, jinak nejlevnější in-stock. */
function pickBestOffer(offers: OfferContext[]): OfferContext | null {
  const inStock = offers.filter((o) => o.in_stock)
  if (inStock.length === 0) return null

  const cheapestPrice = Math.min(...inStock.map((o) => o.price))
  const threshold = cheapestPrice * 1.05

  const affiliateOffers = inStock.filter(
    (o) => o.price <= threshold && (o.affiliate_url != null || (o.commission_pct ?? 0) > 0)
  )

  if (affiliateOffers.length > 0) {
    return affiliateOffers.reduce((best, o) =>
      (o.commission_pct ?? 0) > (best.commission_pct ?? 0) ? o : best
    )
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
    retailers: { name: string; slug: string } | null
  }>

  const offers: OfferContext[] = rawOffers.map((o) => ({
    price: Number(o.price) || 0,
    in_stock: Boolean(o.in_stock),
    affiliate_url: o.affiliate_url ?? null,
    commission_pct: o.commission_pct != null ? Number(o.commission_pct) : null,
    retailer_name: o.retailers?.name ?? null,
    retailer_slug: o.retailers?.slug ?? null,
  }))

  const best = pickBestOffer(offers)
  if (!best) return null // produkt bez in-stock nabídky → vynechat z kontextu

  const goLink =
    best.retailer_slug
      ? `/go/${best.retailer_slug}/${p.slug as string}?st=olik`
      : `/olej/${p.slug as string}`

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
    flavorProfile: ((p.flavor_profile as Record<string, number>) ?? {}),
    goLink,
  }
}

const PRODUCT_SELECT = `
  name, slug, olivator_score, origin_country,
  polyphenols, acidity, certifications, flavor_profile,
  product_offers ( price, in_stock, affiliate_url, commission_pct, retailers ( name, slug ) )
`

async function getTopProducts(limit = 80): Promise<ProductContext[]> {
  const { data } = await supabaseAdmin
    .from('products')
    .select(PRODUCT_SELECT)
    .eq('status', 'active')
    .gt('olivator_score', 0)
    .order('olivator_score', { ascending: false })
    .limit(limit)

  return (data ?? []).map(mapToProductContext).filter(Boolean) as ProductContext[]
}

async function searchByName(userQuery: string): Promise<ProductContext[]> {
  const tokens = (userQuery.match(/\p{L}{5,}/gu) ?? [])
    .map((w) => w.toLowerCase())
    .filter((w) => !SKIP_TOKENS.has(w))

  if (tokens.length === 0) return []

  const orParts = tokens.flatMap((t) => [
    `name.ilike.%${t}%`,
    `name_short.ilike.%${t}%`,
    `brand_slug.ilike.%${t}%`,
  ])

  const { data } = await supabaseAdmin
    .from('products')
    .select(PRODUCT_SELECT)
    .eq('status', 'active')
    .or(orParts.join(','))
    .order('olivator_score', { ascending: false })
    .limit(15)

  return (data ?? []).map(mapToProductContext).filter(Boolean) as ProductContext[]
}

function flavorSummary(fp: Record<string, number>): string {
  const labels = {
    spicy: 'palčivost',
    bitter: 'hořkost',
    herbal: 'travnatost',
    fruity: 'ovocnost',
    mild: 'jemnost',
    nutty: 'oříšky',
    buttery: 'máslovost',
  } as const
  const axes = Object.entries(labels) as Array<[keyof typeof labels, string]>
  if (axes.every(([k]) => !fp[k])) return ''
  const parts = axes.filter(([k]) => (fp[k] ?? 0) >= 40).map(([k, v]) => `${v} ${fp[k]}`)
  return parts.join(', ')
}

function buildSystemPrompt(products: ProductContext[], hasNameMatches: boolean): string {
  const catalog = products
    .map((p) => {
      const flavor = flavorSummary(p.flavorProfile)
      return [
        `• ${p.name} (Score ${p.score}`,
        p.origin ? `, ${p.origin}` : '',
        p.polyphenols ? `, ${p.polyphenols} mg/kg polyfenolů` : '',
        p.acidity != null ? `, kyselost ${p.acidity}%` : '',
        p.certifications.length > 0 ? `, ${p.certifications.join('/')}` : '',
        p.price ? `, ${Math.round(p.price)} Kč u ${p.retailer_name ?? '?'}` : '',
        flavor ? ` | chuť: ${flavor}` : '',
        `): ${p.goLink}`,
      ].join('')
    })
    .join('\n')

  const nameSearchNote = hasNameMatches
    ? '\n[Poznámka: katalog začíná produkty odpovídajícími jménem aktuálnímu dotazu, pak top dle Score]'
    : ''

  return `Jsi AI Sommelier Olivatoru — největšího srovnávače olivových olejů v ČR.
Odpovídáš přirozenou češtinou, tón je přátelský ale odborný (jako znalý kamarád, ne obchodník).

JAK INTERPRETOVAT CHUŤOVÝ PROFIL (každá osa 0-100):
- "palčivost" = pálivost v krku (oleocanthal). VYSOKÁ palčivost = výrazný, ostrý olej. NÍZKÁ = hladký.
- "hořkost" = hořkost (early harvest, polyfenoly). VYSOKÁ = intenzivní. NÍZKÁ = jemný.
- "jemnost" = lehkost a hladkost. VYSOKÁ jemnost = lehký, mírný. NÍZKÁ = výrazný.
- "travnatost", "ovocnost" = aromatika. Vysoká = výrazná vůně.
- "máslovost", "oříšky" = krémovost a zralost.

KLÍČOVÉ MAPOVÁNÍ uživatelských požadavků:
- "lehký" → hledej VYSOKOU jemnost (mild ≥ 60) + nízkou palčivost a hořkost
- "výrazný/intenzivní" → vysoká palčivost a hořkost (≥ 60)
- "ovocný/svěží" → vysoká ovocnost a travnatost
- "do salátu" → spíš jemnější (mild 50+), fruity OK, low spicy
- "na vaření/smažení" → low polyfenoly OK, jemnější profil
- "polyfenoly/zdravý" → > 400 mg/kg polyfenoly + tolerance hořkosti

PRAVIDLA:
- Nikdy nevymýšlej produkty — používej POUZE níže uvedený katalog
- Olivator Score je kvalita CELKEM (kyselost+polyfenoly+certifikace+cena). NENÍ to indikátor lehkosti chuti!
- Vysoké Score ≠ "lehký olej". Lehkost = jemnost + nízká palčivost.
- Všechny produkty v katalogu jsou skladem — doporučuj je bez obav
- Vždy doporuč MAX 3 produkty s cenami a odkazem
- Pokud žádný olej v katalogu nesplňuje uživatelův požadavek, řekni to upřímně + nabídni nejbližší
- Odpověz stručně (max 5–6 vět + seznam doporučení)
- Odkazuj PŘESNĚ odkazem z katalogu (začíná /go/ nebo /olej/) — NEKOMBINUJ vlastní URL

VYHLEDÁVÁNÍ KONKRÉTNÍ ZNAČKY/PRODUKTU:
Pokud uživatel napíše název značky nebo produktu:
- Prohledej CELÝ katalog níže — je sestavený pro TENTO dotaz
- Pokud najdeš shodu v názvu → ukaž je (max 3 dle Score), i kdyby měly nižší Score
- NIKDY neříkej "nemám v katalogu" pokud jsi v katalogu neprošel všechny položky
- Správná odpověď při nalezení: "Corinto máme! Tady jsou jejich oleje: ..."
- Správná odpověď při nenalezení: "Corinto jsem v katalogu nenašel. Podobné značky: ..."

FORMÁT ODPOVĚDI (POVINNÉ):
- Krátký úvod 1–2 věty (proč právě tyhle 3).
- Číslovaný seznam přesně 3 olejů (nebo méně pokud jich tolik nenajdeš). Pro každý:
  "1. **NÁZEV** – CENA Kč" první řádek
  "- první důvod (kyselost / polyfenoly / chuť)" druhý řádek (s pomlčkou)
  "- druhý důvod" třetí řádek (volitelně)
  ODKAZ_Z_KATALOGU čtvrtý řádek (link sám na sobě, žádné []())
- ZAKÁZÁNO: outro typu "**Moje tip:**", "Doporučuji především...", emoji 🥗
- ZAKÁZÁNO: prázdné markdown linky [](link) nebo [zde](url)
- ZAKÁZÁNO: text "(link)" v textu
- Žádné nadpisy, žádné horizontální čáry — jen úvod + seznam.

AKTUÁLNÍ KATALOG (${products.length} produktů, všechny skladem):${nameSearchNote}
${catalog}`
}

/** Maskuje emaily a telefonní čísla v textu před uložením do DB. */
function maskPii(text: string): string {
  return text
    .replace(/\S+@\S+\.\S+/g, '[email]')
    .replace(/(\+420\s?)?[0-9]{3}\s?[0-9]{3}\s?[0-9]{3}/g, '[telefon]')
}

/** Extrahuje doporučené slugy z Olíkovy odpovědi (z /go/ i /olej/ linků). */
function extractRecommendedSlugs(text: string): string[] {
  const goMatches = [...text.matchAll(/\/go\/[\w-]+\/([\w-]+)(?:\?[^\s\n]*)?/g)].map((m) => m[1])
  const olejMatches = [...text.matchAll(/\/olej\/([\w-]+)/g)].map((m) => m[1])
  return [...new Set([...goMatches, ...olejMatches])]
}

export async function POST(req: NextRequest) {
  try {
    const { messages, session_id, source_page } = (await req.json()) as {
      messages: Array<{ role: 'user' | 'assistant'; content: string }>
      session_id?: string
      source_page?: string
    }

    if (!messages || messages.length === 0) {
      return NextResponse.json({ error: 'No messages' }, { status: 400 })
    }

    const history = messages.slice(-10)
    const lastUserMsg = history.filter((m) => m.role === 'user').at(-1)?.content ?? ''

    const [topProducts, nameMatches] = await Promise.all([
      getTopProducts(80),
      searchByName(lastUserMsg),
    ])

    const seenSlugs = new Set<string>()
    const merged: ProductContext[] = []
    for (const p of [...nameMatches, ...topProducts]) {
      if (!seenSlugs.has(p.slug)) {
        seenSlugs.add(p.slug)
        merged.push(p)
      }
    }

    const systemPrompt = buildSystemPrompt(merged, nameMatches.length > 0)

    const response = await callClaude({
      model: MODEL,
      max_tokens: 600,
      system: systemPrompt,
      messages: history,
    })

    const text = extractText(response)

    // Log do olik_conversations — fire-and-forget, neblokuje odpověď
    const recommendedSlugs = extractRecommendedSlugs(text)
    supabaseAdmin
      .from('olik_conversations')
      .insert({
        session_id: session_id ?? null,
        query: maskPii(lastUserMsg),
        response_summary: text.slice(0, 300),
        recommended_slugs: recommendedSlugs,
        no_recommendation: recommendedSlugs.length === 0,
        source_page: source_page?.slice(0, 200) ?? null,
        tokens_used: (response.usage?.input_tokens ?? 0) + (response.usage?.output_tokens ?? 0),
      })
      .then(({ error }) => {
        if (error) console.error('[chat] log failed:', error.message)
      })

    return NextResponse.json({ reply: text })
  } catch (err) {
    console.error('[chat] error', err)
    return NextResponse.json(
      { error: 'Sommelier je momentálně nedostupný, zkus to za chvíli.' },
      { status: 500 }
    )
  }
}
