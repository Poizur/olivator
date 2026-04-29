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

async function getTopProducts(): Promise<ProductContext[]> {
  const { data } = await supabaseAdmin
    .from('products')
    .select(`
      name, slug, olivator_score, origin_country,
      polyphenols, acidity, certifications, flavor_profile,
      product_offers (
        price,
        retailers ( name )
      )
    `)
    .eq('status', 'active')
    .gt('olivator_score', 0)
    .order('olivator_score', { ascending: false })
    .limit(60)

  return (data ?? []).map((p) => {
    const offer = (p.product_offers as unknown[])?.[0] as
      | { price: number; retailers: { name: string } }
      | undefined
    return {
      name: p.name,
      slug: p.slug,
      score: p.olivator_score,
      price: offer?.price ?? null,
      retailer: offer?.retailers?.name ?? null,
      origin: p.origin_country ?? '',
      polyphenols: p.polyphenols,
      acidity: p.acidity ? Number(p.acidity) : null,
      certifications: p.certifications ?? [],
      flavorProfile: (p.flavor_profile as Record<string, number>) ?? {},
    }
  })
}

function flavorSummary(fp: Record<string, number>): string {
  // Pojmenuj nejvýraznější chutě + lehkost. Bez dat → prázdný řetězec.
  const axes: Array<[keyof typeof labels, number]> = [
    ['spicy', fp.spicy ?? 0],
    ['bitter', fp.bitter ?? 0],
    ['herbal', fp.herbal ?? 0],
    ['fruity', fp.fruity ?? 0],
    ['mild', fp.mild ?? 0],
    ['nutty', fp.nutty ?? 0],
    ['buttery', fp.buttery ?? 0],
  ]
  const labels = {
    spicy: 'palčivost',
    bitter: 'hořkost',
    herbal: 'travnatost',
    fruity: 'ovocnost',
    mild: 'jemnost',
    nutty: 'oříšky',
    buttery: 'máslovost',
  } as const
  if (axes.every(([, v]) => v === 0)) return ''
  const parts = axes
    .filter(([, v]) => v >= 40)
    .map(([k, v]) => `${labels[k]} ${v}`)
  if (parts.length === 0) return ''
  return parts.join(', ')
}

function buildSystemPrompt(products: ProductContext[]): string {
  const catalog = products
    .map((p) => {
      const flavor = flavorSummary(p.flavorProfile)
      const parts = [
        `• ${p.name} (Score ${p.score}`,
        p.origin ? `, ${p.origin}` : '',
        p.polyphenols ? `, ${p.polyphenols} mg/kg polyfenolů` : '',
        p.acidity != null ? `, kyselost ${p.acidity}%` : '',
        p.certifications.length > 0 ? `, ${p.certifications.join('/')}` : '',
        p.price ? `, ${Math.round(p.price)} Kč` : '',
        flavor ? ` | chuť: ${flavor}` : '',
        `): /olej/${p.slug}`,
      ]
      return parts.join('')
    })
    .join('\n')

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

AKTUÁLNÍ KATALOG (top ${products.length} olejů dle Score):
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

    const products = await getTopProducts()
    const systemPrompt = buildSystemPrompt(products)

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
