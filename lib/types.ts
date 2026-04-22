export interface Product {
  id: string
  ean: string
  name: string
  slug: string
  nameShort: string
  originCountry: string
  originRegion: string
  type: 'evoo' | 'virgin' | 'refined' | 'olive_oil' | 'pomace'
  acidity: number
  polyphenols: number
  peroxideValue: number
  oleicAcidPct: number
  harvestYear: number
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
  status: 'draft' | 'active' | 'inactive'
  imageUrl?: string | null
  imageSource?: string | null
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
