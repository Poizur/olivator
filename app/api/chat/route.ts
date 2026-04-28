import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { supabaseAdmin } from '@/lib/supabase'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
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

function buildSystemPrompt(products: ProductContext[]): string {
  const catalog = products
    .map((p) => {
      const parts = [
        `• ${p.name} (Score ${p.score}`,
        p.origin ? `, ${p.origin}` : '',
        p.polyphenols ? `, ${p.polyphenols} mg/kg polyfenolů` : '',
        p.acidity != null ? `, kyselost ${p.acidity}%` : '',
        p.certifications.length > 0 ? `, ${p.certifications.join('/')}` : '',
        p.price ? `, ${Math.round(p.price)} Kč` : '',
        p.retailer ? ` u ${p.retailer}` : '',
        `): /olej/${p.slug}`,
      ]
      return parts.join('')
    })
    .join('\n')

  return `Jsi AI Sommelier Olivatoru — největšího srovnávače olivových olejů v ČR.
Odpovídáš přirozenou češtinou, tón je přátelský ale odborný (jako znalý kamarád, ne obchodník).

PRAVIDLA:
- Nikdy nevymýšlej produkty — používej POUZE níže uvedený katalog
- Vždy doporuč MAX 3 produkty s cenami a odkazem
- Uváděj Olivator Score (číslo 0–100)
- Pokud se ptají na polyfenoly, kyselost nebo certifikace — odpověz odborně ale srozumitelně
- Odpověz stručně (max 5–6 vět + seznam doporučení)
- Affiliate link: /go/[retailer-slug]/[product-slug] — NEpoužívej, odkazuj na /olej/[slug]
- Pokud otázka není o olivových olejích, přesměruj na katalog: olivator.cz/srovnavac

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

    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 600,
      system: systemPrompt,
      messages: history,
    })

    const text =
      response.content[0]?.type === 'text' ? response.content[0].text : ''

    return NextResponse.json({ reply: text })
  } catch (err) {
    console.error('[chat] error', err)
    return NextResponse.json(
      { error: 'Sommelier je momentálně nedostupný, zkus to za chvíli.' },
      { status: 500 }
    )
  }
}
