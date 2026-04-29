// Unsplash photo fetcher. BUG-vzor 6: query MUSÍ být topic-specific per entita,
// nikdy generický "olive oil" — jinak vrátí stejné fotky pro všechny stránky.

export interface UnsplashPhoto {
  sourceId: string
  url: string           // regular size (~1080px)
  urlSmall: string      // small size (~400px)
  altText: string
  attribution: string   // photographer name
  sourceUrl: string     // unsplash photo page (pro attribution)
  width: number
  height: number
}

export async function searchUnsplash(query: string, count = 3): Promise<UnsplashPhoto[]> {
  const key = process.env.UNSPLASH_ACCESS_KEY
  if (!key) throw new Error('UNSPLASH_ACCESS_KEY missing')

  const url = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=${count}&orientation=landscape&content_filter=high`
  const res = await fetch(url, {
    headers: { Authorization: `Client-ID ${key}` },
    next: { revalidate: 86400 }, // cache 24h per query
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Unsplash ${res.status}: ${text.slice(0, 200)}`)
  }

  const data = await res.json()
  return (data.results ?? []).map((p: {
    id: string
    urls: { regular: string; small: string }
    alt_description: string | null
    description: string | null
    user: { name: string; links: { html: string } }
    width: number
    height: number
  }) => ({
    sourceId: p.id,
    url: p.urls.regular,
    urlSmall: p.urls.small,
    altText: p.alt_description ?? p.description ?? query,
    attribution: p.user.name,
    sourceUrl: `${p.user.links.html}?utm_source=olivator&utm_medium=referral`,
    width: p.width,
    height: p.height,
  }))
}
