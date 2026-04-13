import { Product, Retailer, ProductOffer, Article, Ranking } from './types'

export const RETAILERS: Retailer[] = [
  { id: 'r1', name: 'Rohlík.cz', slug: 'rohlik', domain: 'rohlik.cz', affiliateNetwork: 'Dognet', defaultCommissionPct: 4, isActive: true, market: 'CZ' },
  { id: 'r2', name: 'Košík.cz', slug: 'kosik', domain: 'kosik.cz', affiliateNetwork: 'Dognet', defaultCommissionPct: 3.5, isActive: true, market: 'CZ' },
  { id: 'r3', name: 'Mall.cz', slug: 'mall', domain: 'mall.cz', affiliateNetwork: 'CJ', defaultCommissionPct: 5, isActive: true, market: 'CZ' },
  { id: 'r4', name: 'Olivio.cz', slug: 'olivio', domain: 'olivio.cz', affiliateNetwork: 'direct', defaultCommissionPct: 12, isActive: true, market: 'CZ' },
  { id: 'r5', name: 'Zdravasila.cz', slug: 'zdravasila', domain: 'zdravasila.cz', affiliateNetwork: 'Heureka', defaultCommissionPct: 8, isActive: true, market: 'CZ' },
]

export const PRODUCTS: Product[] = [
  {
    id: 'p1', ean: '5201671802009', name: 'Gaea Fresh Extra Virgin', slug: 'gaea-fresh-extra-virgin',
    nameShort: 'Gaea Fresh', originCountry: 'GR', originRegion: 'Kréta', type: 'evoo',
    acidity: 0.2, polyphenols: 312, peroxideValue: 6.2, oleicAcidPct: 78.5, harvestYear: 2024,
    processing: 'cold_pressed', flavorProfile: { fruity: 85, herbal: 90, bitter: 65, spicy: 70, mild: 45, nutty: 30, buttery: 20 },
    certifications: ['dop', 'bio'], useCases: ['salad', 'dipping'],
    volumeMl: 500, packaging: 'dark_glass', olivatorScore: 87,
    scoreBreakdown: { acidity: 33, certifications: 25, quality: 18, value: 11 },
    descriptionShort: 'Výjimečně nízká kyselost 0,2 % a 312 mg/kg polyfenolů. Intenzivní bylinkový profil s pepřovým dozněním — typický pro krétské odrůdy ranné sklizně.',
    descriptionLong: '', status: 'active',
  },
  {
    id: 'p2', ean: '8001300100205', name: 'Escelsior Bio Siciliano', slug: 'escelsior-bio-siciliano',
    nameShort: 'Escelsior Bio', originCountry: 'IT', originRegion: 'Sicílie', type: 'evoo',
    acidity: 0.25, polyphenols: 290, peroxideValue: 7.1, oleicAcidPct: 76.2, harvestYear: 2024,
    processing: 'cold_pressed', flavorProfile: { fruity: 80, herbal: 75, bitter: 60, spicy: 55, mild: 50, nutty: 40, buttery: 35 },
    certifications: ['bio', 'dop'], useCases: ['salad', 'fish'],
    volumeMl: 750, packaging: 'dark_glass', olivatorScore: 83,
    scoreBreakdown: { acidity: 31, certifications: 25, quality: 16, value: 11 },
    descriptionShort: 'Sicilský bio olej s jemným artyčokovým tónem a vyváženou hořkostí. DOP certifikace zaručuje původ z oblasti Val di Mazara.',
    descriptionLong: '', status: 'active',
  },
  {
    id: 'p3', ean: '5201671803006', name: 'Aglandau Premium EVOO', slug: 'aglandau-premium-evoo',
    nameShort: 'Aglandau Premium', originCountry: 'GR', originRegion: 'Lesbos', type: 'evoo',
    acidity: 0.3, polyphenols: 265, peroxideValue: 8.0, oleicAcidPct: 75.8, harvestYear: 2024,
    processing: 'cold_pressed', flavorProfile: { fruity: 75, herbal: 70, bitter: 55, spicy: 60, mild: 55, nutty: 45, buttery: 30 },
    certifications: ['nyiooc'], useCases: ['salad', 'cooking'],
    volumeMl: 750, packaging: 'dark_glass', olivatorScore: 81,
    scoreBreakdown: { acidity: 29, certifications: 18, quality: 20, value: 14 },
    descriptionShort: 'Zlatý medailista NYIOOC 2024. Střední intenzita s tóny čerstvé trávy a zeleného rajčete. Lesbos terroir.',
    descriptionLong: '', status: 'active',
  },
  {
    id: 'p4', ean: '8410200200406', name: 'Ybarra Premium EVOO', slug: 'ybarra-premium-evoo',
    nameShort: 'Ybarra Premium', originCountry: 'ES', originRegion: 'Andalusie', type: 'evoo',
    acidity: 0.3, polyphenols: 240, peroxideValue: 8.5, oleicAcidPct: 74.0, harvestYear: 2023,
    processing: 'cold_pressed', flavorProfile: { fruity: 70, herbal: 55, bitter: 40, spicy: 45, mild: 65, nutty: 50, buttery: 45 },
    certifications: [], useCases: ['cooking', 'meat'],
    volumeMl: 750, packaging: 'tin', olivatorScore: 79,
    scoreBreakdown: { acidity: 29, certifications: 0, quality: 15, value: 35 },
    descriptionShort: 'Cenově dostupný andaluský olej s ovocným, lehkým profilem. Skvělý na marinády a každodenní vaření.',
    descriptionLong: '', status: 'active',
  },
  {
    id: 'p5', ean: '8005150002102', name: 'Frantoio Franci IGP', slug: 'frantoio-franci-igp',
    nameShort: 'Frantoio Franci', originCountry: 'IT', originRegion: 'Toskánsko', type: 'evoo',
    acidity: 0.35, polyphenols: 220, peroxideValue: 9.0, oleicAcidPct: 73.5, harvestYear: 2024,
    processing: 'cold_pressed', flavorProfile: { fruity: 65, herbal: 60, bitter: 70, spicy: 75, mild: 35, nutty: 55, buttery: 40 },
    certifications: ['pgp'], useCases: ['dipping', 'salad', 'gift'],
    volumeMl: 500, packaging: 'dark_glass', olivatorScore: 76,
    scoreBreakdown: { acidity: 26, certifications: 15, quality: 17, value: 18 },
    descriptionShort: 'Toskánský charakter — výrazná hořkost a pepřivost typická pro odrůdu Frantoio. Prémiový dárkový olej.',
    descriptionLong: '', status: 'active',
  },
  {
    id: 'p6', ean: '5201671804003', name: 'Terra Creta Estate EVOO', slug: 'terra-creta-estate-evoo',
    nameShort: 'Terra Creta', originCountry: 'GR', originRegion: 'Kréta', type: 'evoo',
    acidity: 0.28, polyphenols: 285, peroxideValue: 7.5, oleicAcidPct: 77.0, harvestYear: 2024,
    processing: 'cold_pressed', flavorProfile: { fruity: 82, herbal: 85, bitter: 58, spicy: 62, mild: 48, nutty: 35, buttery: 25 },
    certifications: ['dop', 'bio', 'nyiooc'], useCases: ['salad', 'dipping', 'fish'],
    volumeMl: 500, packaging: 'dark_glass', olivatorScore: 85,
    scoreBreakdown: { acidity: 32, certifications: 25, quality: 17, value: 11 },
    descriptionShort: 'Trojnásobně certifikovaný krétský olej. DOP Kolymvari, BIO a NYIOOC Silver. Bylinkový profil s citrusovými tóny.',
    descriptionLong: '', status: 'active',
  },
  {
    id: 'p7', ean: '3800100710502', name: 'Olival Selection Premium', slug: 'olival-selection-premium',
    nameShort: 'Olival Selection', originCountry: 'HR', originRegion: 'Istrie', type: 'evoo',
    acidity: 0.22, polyphenols: 340, peroxideValue: 5.8, oleicAcidPct: 79.2, harvestYear: 2024,
    processing: 'cold_pressed', flavorProfile: { fruity: 88, herbal: 82, bitter: 72, spicy: 78, mild: 38, nutty: 28, buttery: 18 },
    certifications: ['bio', 'nyiooc'], useCases: ['dipping', 'salad', 'gift'],
    volumeMl: 500, packaging: 'dark_glass', olivatorScore: 89,
    scoreBreakdown: { acidity: 34, certifications: 22, quality: 20, value: 13 },
    descriptionShort: 'Istrijský skvost s nejvyššími polyfenoly v naší databázi (340 mg/kg). NYIOOC Gold 2024. Intenzivní, komplexní.',
    descriptionLong: '', status: 'active',
  },
  {
    id: 'p8', ean: '8410200300407', name: 'Carbonell Extra Virgin', slug: 'carbonell-extra-virgin',
    nameShort: 'Carbonell', originCountry: 'ES', originRegion: 'Córdoba', type: 'evoo',
    acidity: 0.4, polyphenols: 180, peroxideValue: 10.0, oleicAcidPct: 72.0, harvestYear: 2023,
    processing: 'cold_pressed', flavorProfile: { fruity: 60, herbal: 45, bitter: 35, spicy: 30, mild: 75, nutty: 55, buttery: 50 },
    certifications: [], useCases: ['cooking', 'frying'],
    volumeMl: 1000, packaging: 'pet', olivatorScore: 68,
    scoreBreakdown: { acidity: 22, certifications: 0, quality: 12, value: 34 },
    descriptionShort: 'Nejprodávanější španělský olej v ČR. Jemný, univerzální — ideální na vaření a smažení. Výborná cena za litr.',
    descriptionLong: '', status: 'active',
  },
]

export const OFFERS: ProductOffer[] = [
  // Gaea Fresh
  { id: 'o1', productId: 'p1', retailerId: 'r1', retailer: RETAILERS[0], price: 189, currency: 'CZK', inStock: true, productUrl: '', affiliateUrl: '', commissionPct: 4 },
  { id: 'o2', productId: 'p1', retailerId: 'r2', retailer: RETAILERS[1], price: 199, currency: 'CZK', inStock: true, productUrl: '', affiliateUrl: '', commissionPct: 3.5 },
  { id: 'o3', productId: 'p1', retailerId: 'r4', retailer: RETAILERS[3], price: 215, currency: 'CZK', inStock: true, productUrl: '', affiliateUrl: '', commissionPct: 12 },
  // Escelsior Bio
  { id: 'o4', productId: 'p2', retailerId: 'r3', retailer: RETAILERS[2], price: 269, currency: 'CZK', inStock: true, productUrl: '', affiliateUrl: '', commissionPct: 5 },
  { id: 'o5', productId: 'p2', retailerId: 'r4', retailer: RETAILERS[3], price: 289, currency: 'CZK', inStock: true, productUrl: '', affiliateUrl: '', commissionPct: 12 },
  // Aglandau
  { id: 'o6', productId: 'p3', retailerId: 'r4', retailer: RETAILERS[3], price: 229, currency: 'CZK', inStock: true, productUrl: '', affiliateUrl: '', commissionPct: 12 },
  { id: 'o7', productId: 'p3', retailerId: 'r5', retailer: RETAILERS[4], price: 249, currency: 'CZK', inStock: true, productUrl: '', affiliateUrl: '', commissionPct: 8 },
  // Ybarra
  { id: 'o8', productId: 'p4', retailerId: 'r2', retailer: RETAILERS[1], price: 189, currency: 'CZK', inStock: true, productUrl: '', affiliateUrl: '', commissionPct: 3.5 },
  { id: 'o9', productId: 'p4', retailerId: 'r1', retailer: RETAILERS[0], price: 199, currency: 'CZK', inStock: true, productUrl: '', affiliateUrl: '', commissionPct: 4 },
  // Frantoio Franci
  { id: 'o10', productId: 'p5', retailerId: 'r5', retailer: RETAILERS[4], price: 349, currency: 'CZK', inStock: true, productUrl: '', affiliateUrl: '', commissionPct: 8 },
  { id: 'o11', productId: 'p5', retailerId: 'r4', retailer: RETAILERS[3], price: 365, currency: 'CZK', inStock: true, productUrl: '', affiliateUrl: '', commissionPct: 12 },
  // Terra Creta
  { id: 'o12', productId: 'p6', retailerId: 'r1', retailer: RETAILERS[0], price: 209, currency: 'CZK', inStock: true, productUrl: '', affiliateUrl: '', commissionPct: 4 },
  { id: 'o13', productId: 'p6', retailerId: 'r4', retailer: RETAILERS[3], price: 225, currency: 'CZK', inStock: true, productUrl: '', affiliateUrl: '', commissionPct: 12 },
  // Olival Selection
  { id: 'o14', productId: 'p7', retailerId: 'r4', retailer: RETAILERS[3], price: 389, currency: 'CZK', inStock: true, productUrl: '', affiliateUrl: '', commissionPct: 12 },
  { id: 'o15', productId: 'p7', retailerId: 'r5', retailer: RETAILERS[4], price: 399, currency: 'CZK', inStock: true, productUrl: '', affiliateUrl: '', commissionPct: 8 },
  // Carbonell
  { id: 'o16', productId: 'p8', retailerId: 'r1', retailer: RETAILERS[0], price: 179, currency: 'CZK', inStock: true, productUrl: '', affiliateUrl: '', commissionPct: 4 },
  { id: 'o17', productId: 'p8', retailerId: 'r2', retailer: RETAILERS[1], price: 169, currency: 'CZK', inStock: true, productUrl: '', affiliateUrl: '', commissionPct: 3.5 },
  { id: 'o18', productId: 'p8', retailerId: 'r3', retailer: RETAILERS[2], price: 185, currency: 'CZK', inStock: true, productUrl: '', affiliateUrl: '', commissionPct: 5 },
]

export const ARTICLES: Article[] = [
  { slug: 'jak-vybrat-olivovy-olej', title: 'Jak vybrat olivový olej: na co opravdu záleží', category: 'pruvodce', excerpt: 'Kyselost, polyfenoly, certifikace — vysvětlujeme, co znamenají čísla na etiketě a proč na nich záleží.', readTime: '8 min čtení', emoji: '📖' },
  { slug: 'nejlepsi-olivovy-olej-2025', title: 'Nejlepší olivový olej 2025: testujeme 28 produktů', category: 'zebricek', excerpt: 'Nezávislý test 28 olejů dostupných v ČR. Hodnotíme kyselost, polyfenoly, certifikace a cenu za 100 ml.', readTime: '15 min čtení', emoji: '🏆' },
  { slug: 'recky-vs-italsky', title: 'Řecký vs italský olivový olej — který vybrat?', category: 'srovnani', excerpt: 'Dva největší hráči na trhu olivových olejů. Srovnáváme chuťové profily, certifikace a ceny.', readTime: '6 min čtení', emoji: '🇬🇷' },
  { slug: 'polyfenoly-proc-na-nich-zalezi', title: 'Polyfenoly v olivovém oleji: proč na nich záleží', category: 'vzdelavani', excerpt: 'Polyfenoly jsou klíčem ke zdravotním benefitům olivového oleje. Kolik jich potřebujete a kde je najdete?', readTime: '5 min čtení', emoji: '⚗️' },
  { slug: 'bruschetta-s-rajcaty', title: 'Bruschetta s rajčaty a bazalkou', category: 'recept', excerpt: 'Klasika italské kuchyně, kde kvalita olivového oleje dělá rozdíl. S doporučením konkrétního oleje.', readTime: '3 min čtení', emoji: '🍅' },
  { slug: 'domaci-pesto', title: 'Domácí pesto alla genovese', category: 'recept', excerpt: 'Autentické pesto vyžaduje kvalitní EVOO. Ukážeme recept a doporučíme olej, který mu sedne nejlíp.', readTime: '4 min čtení', emoji: '🌿' },
]

export const RANKINGS: Ranking[] = [
  { slug: 'nejlepsi-olivovy-olej-2025', title: 'Nejlepší olivový olej 2025', description: 'Top 10 olejů dle Olivator Score', productIds: ['p7', 'p1', 'p6', 'p2', 'p3', 'p4', 'p5', 'p8'], emoji: '🏆' },
  { slug: 'nejlepsi-recky-olej', title: 'Nejlepší řecký olivový olej', description: 'Top řecké oleje — Kréta, Lesbos, Peloponés', productIds: ['p1', 'p6', 'p3'], emoji: '🇬🇷' },
  { slug: 'nejlepsi-bio-olej', title: 'Nejlepší bio olivový olej', description: 'BIO certifikované oleje seřazené dle Score', productIds: ['p7', 'p1', 'p6', 'p2'], emoji: '🌿' },
  { slug: 'olivovy-olej-do-200-kc', title: 'Nejlepší olej do 200 Kč', description: 'Kvalitní oleje za rozumnou cenu', productIds: ['p1', 'p4', 'p8'], emoji: '💰' },
]

// Data access functions — same signatures as future Supabase queries
export function getProducts(): Product[] {
  return PRODUCTS.filter(p => p.status === 'active')
    .sort((a, b) => b.olivatorScore - a.olivatorScore)
}

export function getProductBySlug(slug: string): Product | undefined {
  return PRODUCTS.find(p => p.slug === slug)
}

export function getOffersForProduct(productId: string): ProductOffer[] {
  return OFFERS.filter(o => o.productId === productId)
    .sort((a, b) => a.price - b.price)
}

export function getCheapestOffer(productId: string): ProductOffer | undefined {
  return getOffersForProduct(productId)[0]
}

export function getArticles(category?: string): Article[] {
  if (category) return ARTICLES.filter(a => a.category === category)
  return ARTICLES
}

export function getArticleBySlug(slug: string): Article | undefined {
  return ARTICLES.find(a => a.slug === slug)
}

export function getRankings(): Ranking[] {
  return RANKINGS
}

export function getRankingBySlug(slug: string): Ranking | undefined {
  return RANKINGS.find(r => r.slug === slug)
}

export function getProductsByIds(ids: string[]): Product[] {
  return ids.map(id => PRODUCTS.find(p => p.id === id)).filter((p): p is Product => !!p)
}
