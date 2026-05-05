// Brand vision — popíše fotku přes Claude Haiku Vision API.
//
// Vstup: URL obrázku z webu výrobce (typicky CDN PNG/JPG).
// Výstup: 1-věta CZ caption + subject klasifikace (person/product/landscape/...)
//         + suggested_role (logo/hero/editorial/gallery).
//
// Strategie: stáhneme obrázek lokálně a pošleme jako base64. URL source
// někdy selže (hotlink protection, Cloudflare bot filter, slow CDN) a
// Anthropic z toho vrací neexplicitní chyby.
//
// Cena: ~$0.001 za fotku přes Haiku 4.5.
// Concurrency: orchestrátor volá max 4 paralelně (Anthropic rate limit).

import { callClaude } from './anthropic'

export type PhotoSubject =
  | 'person'
  | 'product'
  | 'landscape'
  | 'process'
  | 'logo'
  | 'building'
  | 'ingredient'
  | 'other'

export type SuggestedRole = 'logo' | 'hero' | 'editorial' | 'gallery'

export interface PhotoDescription {
  caption: string
  subject: PhotoSubject
  suggestedRole: SuggestedRole
}

const SYSTEM_PROMPT = `Jsi visual asistent pro Olivator.cz. Dostáváš fotku z webu
výrobce olivového oleje. Popiš co vidíš v 1 stručné CZ větě (max 100 znaků).

Subject klasifikace — vyber JEDNU:
- person: portrét člověka, zakladatel, rodina, sklízeči
- product: lahev olivového oleje, etiketa, balení
- landscape: háj olivovníků, krajina, zemědělství, vyhled
- process: lis, výroba, sklizeň, technologie
- logo: značkové logo, brand mark
- building: pension, statek, mlýn (budova)
- ingredient: olivy, plody, listy
- other: cokoli jiného

Suggested role pro Olivator brand stránku:
- logo: pokud subject=logo
- hero: action shot — landscape s životem, person v háji, sklizeň (vizuálně silné)
- editorial: portrét, building, process, ingredient detail (do textu článku)
- gallery: produkt, statické snímky (do galerie atmosféry)

Vrať JSON přes tool call.`

const TOOL_SCHEMA = {
  name: 'describe_brand_photo',
  description: 'Popiš fotku z webu výrobce olivového oleje a zařaď ji.',
  input_schema: {
    type: 'object' as const,
    properties: {
      caption: { type: 'string', description: 'CZ popis, max 100 znaků' },
      subject: {
        type: 'string',
        enum: ['person', 'product', 'landscape', 'process', 'logo', 'building', 'ingredient', 'other'],
      },
      suggestedRole: { type: 'string', enum: ['logo', 'hero', 'editorial', 'gallery'] },
    },
    required: ['caption', 'subject', 'suggestedRole'],
  },
}

const SUPPORTED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/gif', 'image/webp'])

function detectMediaType(url: string): 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp' | null {
  const lower = url.toLowerCase().split('?')[0]
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg'
  if (lower.endsWith('.png')) return 'image/png'
  if (lower.endsWith('.gif')) return 'image/gif'
  if (lower.endsWith('.webp')) return 'image/webp'
  return null
}

// Limit pro download — Anthropic má 5MB max per image. Naše fotky bývají 0.1-2MB.
const MAX_IMAGE_BYTES = 5 * 1024 * 1024
const FETCH_TIMEOUT_MS = 10_000

async function fetchImageAsBase64(
  url: string
): Promise<{ data: string; mediaType: 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp' } | null> {
  const detected = detectMediaType(url)
  if (!detected) return null
  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
    const res = await fetch(url, {
      headers: { 'User-Agent': 'OlivatorBot/1.0 (+https://olivator.cz)' },
      signal: controller.signal,
      redirect: 'follow',
    })
    clearTimeout(timer)
    if (!res.ok) return null
    const contentType = (res.headers.get('content-type') ?? '').split(';')[0].trim().toLowerCase()
    let mediaType: 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp' = detected
    if (
      contentType === 'image/jpeg' ||
      contentType === 'image/png' ||
      contentType === 'image/gif' ||
      contentType === 'image/webp'
    ) {
      mediaType = contentType
    }
    const buf = Buffer.from(await res.arrayBuffer())
    if (buf.byteLength === 0 || buf.byteLength > MAX_IMAGE_BYTES) return null
    return { data: buf.toString('base64'), mediaType }
  } catch {
    return null
  }
}

/**
 * Popíše jednu fotku. Vrátí null pokud Claude selže, fetch selže nebo URL
 * není podporovaný formát. Caller má sám zajistit dedup a concurrency.
 */
export async function describePhoto(url: string): Promise<PhotoDescription | null> {
  const image = await fetchImageAsBase64(url)
  if (!image) {
    console.warn('[brand-vision] fetchImage failed:', url.slice(0, 80))
    return null
  }

  try {
    const response = await callClaude({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 300,
      system: SYSTEM_PROMPT,
      tools: [TOOL_SCHEMA],
      tool_choice: { type: 'tool', name: 'describe_brand_photo' },
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: { type: 'base64', media_type: image.mediaType, data: image.data },
            },
            { type: 'text', text: 'Popiš tuto fotku.' },
          ],
        },
      ],
    })

    const toolUse = response.content.find((b) => b.type === 'tool_use')
    if (!toolUse || toolUse.type !== 'tool_use') {
      console.warn('[brand-vision] no tool_use block, stop_reason=', response.stop_reason)
      return null
    }
    const input = toolUse.input as Record<string, unknown>
    const caption = typeof input.caption === 'string' ? input.caption.trim().slice(0, 200) : null
    const subject = (typeof input.subject === 'string' ? input.subject : 'other') as PhotoSubject
    const suggestedRole = (typeof input.suggestedRole === 'string' ? input.suggestedRole : 'gallery') as SuggestedRole
    if (!caption) return null
    return { caption, subject, suggestedRole }
  } catch (err) {
    const status = (err as { status?: number }).status
    const apiError = (err as { error?: { error?: { message?: string } } }).error?.error?.message
    console.warn(
      '[brand-vision] describePhoto failed:',
      `HTTP ${status ?? '?'}`,
      apiError ?? (err instanceof Error ? err.message : 'unknown'),
      url.slice(0, 80)
    )
    return null
  }
}

/**
 * Popíše více fotek paralelně s concurrency limitem.
 */
export async function describePhotos(
  urls: string[],
  concurrency = 4
): Promise<Map<string, PhotoDescription>> {
  const results = new Map<string, PhotoDescription>()
  let i = 0
  async function worker() {
    while (i < urls.length) {
      const idx = i++
      const url = urls[idx]
      const desc = await describePhoto(url)
      if (desc) results.set(url, desc)
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, urls.length) }, worker))
  return results
}
