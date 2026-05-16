import { NextRequest, NextResponse } from 'next/server'
import { callClaude, extractText } from '@/lib/anthropic'
import { supabaseAdmin } from '@/lib/supabase'

const MODEL = 'claude-haiku-4-5-20251001'

interface ProductContext {
  name: string
  slug: string
  score: number
  price: number | null
  retailer: string | null
  origin: string
  polyphenols: number | null
  acidity: number | null
  certifications: string[]
  flavorProfile: Record<string, number>
}

// Slova typická pro olivoolejové produkty nebo česká funkční slova — přeskočit při name-search
const SKIP_TOKENS = new Set([
  'extra', 'panenský', 'panenského', 'panenské', 'olivový', 'olivového', 'olivové',
  'olej', 'oleji', 'olejem', 'chceš', 'hledám', 'máte', 'koupit', 'levný', 'dobrý',
  'španělský', 'řecký', 'italský', 'chorvatský', 'tento', 'takový', 'který', 'jaký',
  'nějaký', 'dobrý', 'doporuč', 'chutná', 'zkusil', 'hledat', 'najdi', 'řecké',
  'třeba', 'něco', 'prosím', 'díky', 'máme', 'mají', 'mám', 'máš',
])

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapToProductContext(p: any): ProductContext {
  const offers = (p.product_offers ?? []) as Array<{ price: number; retailers: { name: string } }>
  const offer = offers[0]
  return {
    name: p.name as string,
    slug: p.slug as string,
    score: p.olivator_score as number,
    price: offer?.price ?? null,
    retailer: offer?.retailers?.name ?? null,
    origin: (p.origin_country as string | null) ?? '',
    polyphenols: p.polyphenols as number | null,
    acidity: p.acidity ? Number(p.acidity) : null,
    certifications: (p.certifications as string[]) ?? [],
    flavorProfile: ((p.flavor_profile as Record<string, number>) ?? {}),
  }
}

const PRODUCT_SELECT = `
  name, slug, olivator_score, origin_country,
  polyphenols, acidity, certifications, flavor_profile,
  product_offers ( price, retailers ( name ) )
`

/** Top N produktů dle Score — základ kontextu */
async function getTopProducts(limit = 80): Promise<ProductContext[]> {
  const { data } = await supabaseAdmin
    .from('products')
    .select(PRODUCT_SELECT)
    .eq('status', 'active')
    .gt('olivator_score', 0)
    .order('olivator_score', { ascending: false })
    .limit(limit)

  return (data ?? []).map(mapToProductContext)
}

/**
 * Vyhledá produkty podle slov z uživatelovy zprávy (ILIKE na name + name_short).
 * Zabrání situaci, kdy je produkt v DB ale není v top N dle Score.
 */
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

  return (data ?? []).map(mapToProductContext)
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
        p.price ? `, ${Math.round(p.price)} Kč` : '',
        flavor ? ` | chuť: ${flavor}` : '',
        `): /olej/${p.slug}`,
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
- Vždy doporuč MAX 3 produkty s cenami a odkazem
- Pokud žádný olej v katalogu nesplňuje uživatelův požadavek (např. "lehký do 200 Kč"), řekni to upřímně + nabídni nejbližší
- Odpověz stručně (max 5–6 vět + seznam doporučení)
- Odkazuj na /olej/[slug], nikdy /go/

VYHLEDÁVÁNÍ KONKRÉTNÍ ZNAČKY/PRODUKTU:
Pokud uživatel napíše název značky nebo produktu (např. "Corinto", "Lozano", "Arbequina", "Manaki"):
- Prohledej CELÝ katalog níže — je sestavený pro TENTO dotaz
- Pokud najdeš shodu v názvu → ukaž je (max 3 dle Score), i kdyby měly nižší Score
- NIKDY neříkej "nemám v katalogu" nebo "tuto značku nemám" pokud jsi v katalogu neprošel všechny položky
- Správná odpověď při nalezení: "Corinto máme! Tady jsou jejich oleje: ..."
- Správná odpověď při nenalezení: "Corinto jsem v katalogu nenašel. Podobné značky: ..."

FORMÁT ODPOVĚDI (POVINNÉ):
- Krátký úvod 1–2 věty (proč právě tyhle 3).
- Číslovaný seznam přesně 3 olejů (nebo méně pokud jich tolik nenajdeš). Pro každý:
  "1. **NÁZEV** – CENA Kč" první řádek
  "- první důvod (kyselost / polyfenoly / chuť)" druhý řádek (s pomlčkou)
  "- druhý důvod" třetí řádek (volitelně)
  "/olej/SLUG" čtvrtý řádek (link sám na sobě, žádné []())
- ZAKÁZÁNO: outro typu "**Moje tip:**", "Doporučuji především...", emoji 🥗
- ZAKÁZÁNO: prázdné markdown linky [](link) nebo [zde](url)
- ZAKÁZÁNO: text "(link)" v textu
- Žádné nadpisy, žádné horizontální čáry — jen úvod + seznam.

AKTUÁLNÍ KATALOG (${products.length} produktů):${nameSearchNote}
${catalog}`
}

export async function POST(req: NextRequest) {
  try {
    const { messages } = (await req.json()) as {
      messages: Array<{ role: 'user' | 'assistant'; content: string }>
    }

    if (!messages || messages.length === 0) {
      return NextResponse.json({ error: 'No messages' }, { status: 400 })
    }

    // Cap conversation history to last 10 messages (cost control)
    const history = messages.slice(-10)

    // Poslední uživatelova zpráva — základ pro name-search
    const lastUserMsg = history.filter((m) => m.role === 'user').at(-1)?.content ?? ''

    // Paralelně: top produkty dle Score + name-search pro konkrétní dotaz
    const [topProducts, nameMatches] = await Promise.all([
      getTopProducts(80),
      searchByName(lastUserMsg),
    ])

    // Merge: name matches vpředu (viditelné Claudovi), pak top dle Score, dedup
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
    return NextResponse.json({ reply: text })
  } catch (err) {
    console.error('[chat] error', err)
    return NextResponse.json(
      { error: 'Sommelier je momentálně nedostupný, zkus to za chvíli.' },
      { status: 500 }
    )
  }
}
