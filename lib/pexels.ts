// Pexels photo search — primární zdroj obrázků pro články.
// Pexels: bez rate limitu pro registered apps, free commercial use.
// BUG-vzor 6: query MUSÍ být topic-specific, nikdy generický "olive oil".

export interface PexelsPhoto {
  sourceId: string
  source: 'pexels'
  url: string        // large2x (~1920px)
  urlMedium: string  // medium (~1280px)
  urlSmall: string   // small (~640px)
  altText: string
  attribution: string
  sourceUrl: string
  width: number
  height: number
}

export async function searchPexels(query: string, count = 8): Promise<PexelsPhoto[]> {
  const key = process.env.PEXELS_API_KEY
  if (!key) throw new Error('PEXELS_API_KEY missing')

  const url = `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=${count}&orientation=landscape`
  const res = await fetch(url, {
    headers: {
      Authorization: key,
      'User-Agent': 'Olivator/1.0 (olivator.cz)',
    },
    next: { revalidate: 86400 },
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Pexels ${res.status}: ${text.slice(0, 200)}`)
  }

  const data = await res.json()
  return (data.photos ?? []).map((p: {
    id: number
    width: number
    height: number
    url: string
    photographer: string
    src: { large2x: string; large: string; medium: string; small: string }
    alt: string | null
  }) => ({
    sourceId: String(p.id),
    source: 'pexels' as const,
    url: p.src.large2x || p.src.large,
    urlMedium: p.src.medium,
    urlSmall: p.src.small,
    altText: p.alt ?? query,
    attribution: p.photographer,
    sourceUrl: p.url,
    width: p.width,
    height: p.height,
  }))
}
