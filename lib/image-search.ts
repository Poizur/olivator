// Unified image search: Pexels (primary) → Unsplash (fallback).
// Vrací první N výsledků; volající zodpovídá za deduplikaci photo ID.
// Pixabay: přidat až bude PIXABAY_API_KEY v env.

import { searchPexels, type PexelsPhoto } from '@/lib/pexels'
import { searchUnsplash, type UnsplashPhoto } from '@/lib/unsplash'

export type ImageSource = 'pexels' | 'unsplash'

export interface StockPhoto {
  sourceId: string
  source: ImageSource
  url: string         // large (≥1280px)
  urlSmall: string    // thumbnail (~400px)
  altText: string
  attribution: string
  sourceUrl: string
  width: number
  height: number
}

function fromPexels(p: PexelsPhoto): StockPhoto {
  return {
    sourceId: p.sourceId,
    source: 'pexels',
    url: p.url,
    urlSmall: p.urlSmall,
    altText: p.altText,
    attribution: p.attribution,
    sourceUrl: p.sourceUrl,
    width: p.width,
    height: p.height,
  }
}

function fromUnsplash(p: UnsplashPhoto): StockPhoto {
  return {
    sourceId: p.sourceId,
    source: 'unsplash',
    url: p.url,
    urlSmall: p.urlSmall,
    altText: p.altText,
    attribution: p.attribution,
    sourceUrl: p.sourceUrl,
    width: p.width,
    height: p.height,
  }
}

/**
 * Hledá fotku pro daný query.
 * Pexels first; pokud vrátí méně než `minResults`, doplní z Unsplash.
 */
export async function searchImages(
  query: string,
  options: {
    count?: number       // kolik výsledků vrátit (default 5)
    minWidth?: number    // minimum px šířka (default 1200)
    preferSource?: ImageSource  // force konkrétní zdroj
  } = {}
): Promise<StockPhoto[]> {
  const { count = 5, minWidth = 1200, preferSource } = options

  const results: StockPhoto[] = []

  if (preferSource === 'unsplash') {
    const photos = await searchUnsplash(query, count).catch(() => [])
    return photos.map(fromUnsplash).filter(p => p.width >= minWidth).slice(0, count)
  }

  // Primary: Pexels
  try {
    const pexels = await searchPexels(query, count * 2)
    const filtered = pexels.filter(p => p.width >= minWidth)
    results.push(...filtered.map(fromPexels))
  } catch {
    // Pexels failed — fall through to Unsplash
  }

  // Fallback: Unsplash (pokud Pexels nestačí)
  if (results.length < count) {
    try {
      const needed = count - results.length
      const unsplash = await searchUnsplash(query, needed * 2)
      const filtered = unsplash.filter(p => p.width >= minWidth)
      results.push(...filtered.map(fromUnsplash))
    } catch {
      // Unsplash taky failnul — vrátíme co máme
    }
  }

  return results.slice(0, count)
}
