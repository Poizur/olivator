export interface ExtractedFact {
  key: string
  label: string
  value: string
  importance: 'high' | 'medium' | 'low'
  source: 'scraped' | 'manual' | 'ai'
}

export interface Product {
  id: string
  ean: string | null               // null for farm-direct / boutique products
  name: string
  slug: string
  nameShort: string
  originCountry: string
  originRegion: string
  type: 'evoo' | 'virgin' | 'refined' | 'olive_oil' | 'pomace'
  acidity: number | null           // null when not tested / not published
  polyphenols: number | null       // null is common — lab analysis is expensive
  oleocanthal: number | null       // mg/kg — protizánětlivý fenol, pálivý vjem v hrdle
  peroxideValue: number | null
  oleicAcidPct: number | null
  harvestYear: number | null
  processing: string
  flavorProfile: FlavorProfile
  certifications: string[]
  useCases: string[]
  volumeMl: number
  packaging: string
  olivatorScore: number
  scoreBreakdown: ScoreBreakdown
  descriptionShort: string
  descriptionLong: string
  metaTitle: string | null         // SEO <title>; null falls back to generated
  metaDescription: string | null   // SEO meta description (130-160 chars); null falls back
  status: 'draft' | 'active' | 'inactive' | 'excluded'
  imageUrl?: string | null
  imageSource?: string | null
  extractedFacts?: ExtractedFact[]
}

export interface FlavorProfile {
  fruity: number
  herbal: number
  bitter: number
  spicy: number
  mild: number
  nutty: number
  buttery: number
}

export interface ScoreBreakdown {
  acidity: number
  certifications: number
  quality: number
  value: number
}

export interface Retailer {
  id: string
  name: string
  slug: string
  domain: string
  affiliateNetwork: string
  defaultCommissionPct: number
  isActive: boolean
  market: string
  rating?: number | null
  ratingCount?: number | null
  ratingSource?: string | null
  // Presentation fields — short story for public product page
  tagline?: string | null
  story?: string | null
  foundedYear?: number | null
  founders?: string | null
  headquarters?: string | null
  specialization?: string | null
  logoUrl?: string | null
  // XML feed (volitelné) — Heureka XML, Google Shopping. Když retailer feed má,
  // syncujeme z něj produkty + ceny dávkově. Když nemá, fallback na Playwright.
  xmlFeedUrl?: string | null
  xmlFeedFormat?: string | null
  xmlFeedLastSynced?: string | null
}

export interface ProductOffer {
  id: string
  productId: string
  retailerId: string
  retailer: Retailer
  price: number
  currency: string
  inStock: boolean
  productUrl: string
  affiliateUrl: string
  commissionPct: number
}

export interface AffiliateClick {
  id: string
  clickId: string
  productId: string
  retailerId: string
  sessionId: string
  clickedAt: string
}

export interface Article {
  slug: string
  title: string
  category: 'pruvodce' | 'zebricek' | 'recept' | 'srovnani' | 'vzdelavani'
  excerpt: string
  readTime: string
  emoji: string
  imageUrl?: string
  /** Multi-paragraph body — odděleny `\n\n`. Heading sekce začínají `## ` (H2)
   *  nebo `### ` (H3). Žádný markdown bold/italic — sec 16 zákazuje vatu. */
  body?: string
}

export interface Ranking {
  slug: string
  title: string
  description: string
  productIds: string[]
  emoji: string
}

export type SortOption = 'score' | 'price_asc' | 'price_desc' | 'acidity' | 'polyphenols'

export interface FilterState {
  types: string[]
  origins: string[]
  certifications: string[]
  maxPrice: number
  minScore: number
}
