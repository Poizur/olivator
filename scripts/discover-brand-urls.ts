// One-shot script — pro každou značku bez website_url zkusí Claude
// s web search tool najít oficiální web výrobce. Pokud najde a URL
// vrátí HTTP 200, uloží do brands.website_url.
//
// Spuštění:
//   npx tsx scripts/discover-brand-urls.ts            # live mode
//   npx tsx scripts/discover-brand-urls.ts --dry-run  # jen vypíše
//
// Cost: ~$0.01 per brand (Claude Sonnet + 1-2 web searches).
// 27 brands = ~$0.30.

import { supabaseAdmin } from '@/lib/supabase'
import { callClaude, extractText } from '@/lib/anthropic'

const DRY_RUN = process.argv.includes('--dry-run')
const MODEL = 'claude-sonnet-4-20250514'

interface BrandRow {
  slug: string
  name: string
  country_code: string | null
  website_url: string | null
}

const SYSTEM_PROMPT = `Jsi expert na olivový olej. Dostaneš název značky olivového oleje a zemi původu. Najdi její OFICIÁLNÍ web výrobce přes web search.

PRAVIDLA:
- Hledej web VÝROBCE, ne distributora/eshopu (ne "alza.cz/bartolini", ale "bartolini.it")
- Pokud nenajdeš oficiální web s jistotou, vrať null (lepší než guess)
- URL musí být validní (https://... bez chyb)
- Vrať POUZE JSON: {"url": "https://example.com", "confidence": "high|medium|low", "reasoning": "stručně proč"}

PŘÍKLADY:
- "Bartolini" + "IT" → {"url": "https://www.oliobartolini.com", "confidence": "high", "reasoning": "Oficiální web rodinné olejárny v Umbrii"}
- "Picual" + "XX" → {"url": null, "confidence": "low", "reasoning": "Picual je odrůda olivy, ne značka — nemá web"}
- "Vilgain" + "XX" → {"url": "https://www.vilgain.cz", "confidence": "high", "reasoning": "Český e-shop, ne výrobce — nemá vlastní výrobu"}`

interface DiscoveryResult {
  url: string | null
  confidence: 'high' | 'medium' | 'low'
  reasoning: string
}

async function discoverBrandUrl(brand: BrandRow): Promise<DiscoveryResult | null> {
  const country = brand.country_code && brand.country_code !== 'XX'
    ? brand.country_code
    : 'neznámá'

  try {
    const res = await callClaude({
      model: MODEL,
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      tools: [
        {
          type: 'web_search_20250305',
          name: 'web_search',
          max_uses: 3,
        },
      ],
      messages: [
        {
          role: 'user',
          content: `Značka: "${brand.name}"\nZemě původu: ${country}\n\nNajdi oficiální web výrobce.`,
        },
      ],
    })

    // Claude může vrátit text + tool_use blocks. Najdi text block s JSON.
    const text = extractText(res)
    const cleaned = text
      .replace(/^```(?:json)?\s*/, '')
      .replace(/\s*```\s*$/, '')
      .trim()
    // Najdi JSON objekt v textu
    const jsonMatch = cleaned.match(/\{[\s\S]*?\}/)
    if (!jsonMatch) return null

    const parsed = JSON.parse(jsonMatch[0]) as Partial<DiscoveryResult>
    return {
      url: typeof parsed.url === 'string' ? parsed.url : null,
      confidence: (parsed.confidence === 'high' || parsed.confidence === 'low') ? parsed.confidence : 'medium',
      reasoning: typeof parsed.reasoning === 'string' ? parsed.reasoning : '',
    }
  } catch (err) {
    console.warn(`  ⚠️  Claude error for ${brand.name}:`, err instanceof Error ? err.message : err)
    return null
  }
}

async function validateUrl(url: string): Promise<boolean> {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'OlivatorBot/1.0 (+https://olivator.cz)' },
      signal: AbortSignal.timeout(8000),
      redirect: 'follow',
    })
    return res.ok
  } catch {
    return false
  }
}

async function main() {
  console.log(DRY_RUN ? '🧪 DRY RUN' : '✏️  LIVE')

  // Brands bez URL, seřazené podle počtu produktů (priority na ty s nejvíc oleji)
  const { data: brands } = await supabaseAdmin
    .from('brands')
    .select('slug, name, country_code, website_url')
    .is('website_url', null)
    .order('name')
    .returns<BrandRow[]>()

  if (!brands || brands.length === 0) {
    console.log('Žádné brands bez URL.')
    return
  }

  // Spočítat produkty per brand
  const { data: products } = await supabaseAdmin
    .from('products')
    .select('brand_slug')
    .eq('status', 'active')
    .not('brand_slug', 'is', null)
  const countByBrand: Record<string, number> = {}
  ;(products ?? []).forEach((p) => {
    const slug = p.brand_slug as string
    countByBrand[slug] = (countByBrand[slug] ?? 0) + 1
  })

  // Filtruj brands se ≥1 produktem, sort by count desc
  const eligible = brands
    .filter((b) => (countByBrand[b.slug] ?? 0) > 0)
    .sort((a, b) => (countByBrand[b.slug] ?? 0) - (countByBrand[a.slug] ?? 0))

  console.log(`Zpracovávám ${eligible.length} značek (mají alespoň 1 produkt)\n`)

  let found = 0
  let invalid = 0
  let skipped = 0

  for (const brand of eligible) {
    const productCount = countByBrand[brand.slug] ?? 0
    process.stdout.write(`[${brand.name}] (${productCount} produktů, ${brand.country_code ?? '?'}) → `)

    const result = await discoverBrandUrl(brand)
    if (!result || !result.url) {
      console.log(`❌ ${result?.reasoning ?? 'no result'}`)
      skipped++
      continue
    }

    // Validate URL responds
    const valid = await validateUrl(result.url)
    if (!valid) {
      console.log(`❌ ${result.url} (HTTP error)`)
      invalid++
      continue
    }

    console.log(`✅ ${result.url} [${result.confidence}]`)
    found++

    if (!DRY_RUN) {
      await supabaseAdmin
        .from('brands')
        .update({ website_url: result.url, updated_at: new Date().toISOString() })
        .eq('slug', brand.slug)
    }

    // Throttle — neasaltujeme web search rate limit
    await new Promise((r) => setTimeout(r, 1500))
  }

  console.log()
  console.log('═══ Souhrn ═══')
  console.log(`Nalezeno + validováno: ${found}`)
  console.log(`Nalezeno ale invalid:  ${invalid}`)
  console.log(`Neznámá / nelze najít: ${skipped}`)
  if (DRY_RUN) console.log('\n(DRY RUN — nic neuloženo)')
}

main().catch((err) => {
  console.error('FATAL:', err)
  process.exit(1)
})
