// Seed script — inserts mock products + offers into Supabase
// Run: node scripts/seed.mjs

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const envPath = join(__dirname, '..', '.env.local')
const env = Object.fromEntries(
  readFileSync(envPath, 'utf8')
    .split('\n')
    .filter(l => l && !l.startsWith('#') && l.includes('='))
    .map(l => { const [k, ...v] = l.split('='); return [k.trim(), v.join('=').trim()] })
)

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_KEY)

const PRODUCTS = [
  { ean: '5201671802009', name: 'Gaea Fresh Extra Virgin', slug: 'gaea-fresh-extra-virgin', name_short: 'Gaea Fresh', origin_country: 'GR', origin_region: 'Kréta', type: 'evoo', acidity: 0.2, polyphenols: 312, peroxide_value: 6.2, oleic_acid_pct: 78.5, harvest_year: 2024, processing: 'cold_pressed', flavor_profile: { fruity: 85, herbal: 90, bitter: 65, spicy: 70, mild: 45, nutty: 30, buttery: 20 }, certifications: ['dop', 'bio'], use_cases: ['salad', 'dipping'], volume_ml: 500, packaging: 'dark_glass', olivator_score: 87, score_breakdown: { acidity: 33, certifications: 25, quality: 18, value: 11 }, description_short: 'Výjimečně nízká kyselost 0,2 % a 312 mg/kg polyfenolů. Intenzivní bylinkový profil s pepřovým dozněním — typický pro krétské odrůdy ranné sklizně.', status: 'active' },
  { ean: '8001300100205', name: 'Escelsior Bio Siciliano', slug: 'escelsior-bio-siciliano', name_short: 'Escelsior Bio', origin_country: 'IT', origin_region: 'Sicílie', type: 'evoo', acidity: 0.25, polyphenols: 290, peroxide_value: 7.1, oleic_acid_pct: 76.2, harvest_year: 2024, processing: 'cold_pressed', flavor_profile: { fruity: 80, herbal: 75, bitter: 60, spicy: 55, mild: 50, nutty: 40, buttery: 35 }, certifications: ['bio', 'dop'], use_cases: ['salad', 'fish'], volume_ml: 750, packaging: 'dark_glass', olivator_score: 83, score_breakdown: { acidity: 31, certifications: 25, quality: 16, value: 11 }, description_short: 'Sicilský bio olej s jemným artyčokovým tónem a vyváženou hořkostí. DOP certifikace zaručuje původ z oblasti Val di Mazara.', status: 'active' },
  { ean: '5201671803006', name: 'Aglandau Premium EVOO', slug: 'aglandau-premium-evoo', name_short: 'Aglandau Premium', origin_country: 'GR', origin_region: 'Lesbos', type: 'evoo', acidity: 0.3, polyphenols: 265, peroxide_value: 8.0, oleic_acid_pct: 75.8, harvest_year: 2024, processing: 'cold_pressed', flavor_profile: { fruity: 75, herbal: 70, bitter: 55, spicy: 60, mild: 55, nutty: 45, buttery: 30 }, certifications: ['nyiooc'], use_cases: ['salad', 'cooking'], volume_ml: 750, packaging: 'dark_glass', olivator_score: 81, score_breakdown: { acidity: 29, certifications: 18, quality: 20, value: 14 }, description_short: 'Zlatý medailista NYIOOC 2024. Střední intenzita s tóny čerstvé trávy a zeleného rajčete. Lesbos terroir.', status: 'active' },
  { ean: '8410200200406', name: 'Ybarra Premium EVOO', slug: 'ybarra-premium-evoo', name_short: 'Ybarra Premium', origin_country: 'ES', origin_region: 'Andalusie', type: 'evoo', acidity: 0.3, polyphenols: 240, peroxide_value: 8.5, oleic_acid_pct: 74.0, harvest_year: 2023, processing: 'cold_pressed', flavor_profile: { fruity: 70, herbal: 55, bitter: 40, spicy: 45, mild: 65, nutty: 50, buttery: 45 }, certifications: [], use_cases: ['cooking', 'meat'], volume_ml: 750, packaging: 'tin', olivator_score: 79, score_breakdown: { acidity: 29, certifications: 0, quality: 15, value: 35 }, description_short: 'Cenově dostupný andaluský olej s ovocným, lehkým profilem. Skvělý na marinády a každodenní vaření.', status: 'active' },
  { ean: '8005150002102', name: 'Frantoio Franci IGP', slug: 'frantoio-franci-igp', name_short: 'Frantoio Franci', origin_country: 'IT', origin_region: 'Toskánsko', type: 'evoo', acidity: 0.35, polyphenols: 220, peroxide_value: 9.0, oleic_acid_pct: 73.5, harvest_year: 2024, processing: 'cold_pressed', flavor_profile: { fruity: 65, herbal: 60, bitter: 70, spicy: 75, mild: 35, nutty: 55, buttery: 40 }, certifications: ['pgp'], use_cases: ['dipping', 'salad', 'gift'], volume_ml: 500, packaging: 'dark_glass', olivator_score: 76, score_breakdown: { acidity: 26, certifications: 15, quality: 17, value: 18 }, description_short: 'Toskánský charakter — výrazná hořkost a pepřivost typická pro odrůdu Frantoio. Prémiový dárkový olej.', status: 'active' },
  { ean: '5201671804003', name: 'Terra Creta Estate EVOO', slug: 'terra-creta-estate-evoo', name_short: 'Terra Creta', origin_country: 'GR', origin_region: 'Kréta', type: 'evoo', acidity: 0.28, polyphenols: 285, peroxide_value: 7.5, oleic_acid_pct: 77.0, harvest_year: 2024, processing: 'cold_pressed', flavor_profile: { fruity: 82, herbal: 85, bitter: 58, spicy: 62, mild: 48, nutty: 35, buttery: 25 }, certifications: ['dop', 'bio', 'nyiooc'], use_cases: ['salad', 'dipping', 'fish'], volume_ml: 500, packaging: 'dark_glass', olivator_score: 85, score_breakdown: { acidity: 32, certifications: 25, quality: 17, value: 11 }, description_short: 'Trojnásobně certifikovaný krétský olej. DOP Kolymvari, BIO a NYIOOC Silver. Bylinkový profil s citrusovými tóny.', status: 'active' },
  { ean: '3800100710502', name: 'Olival Selection Premium', slug: 'olival-selection-premium', name_short: 'Olival Selection', origin_country: 'HR', origin_region: 'Istrie', type: 'evoo', acidity: 0.22, polyphenols: 340, peroxide_value: 5.8, oleic_acid_pct: 79.2, harvest_year: 2024, processing: 'cold_pressed', flavor_profile: { fruity: 88, herbal: 82, bitter: 72, spicy: 78, mild: 38, nutty: 28, buttery: 18 }, certifications: ['bio', 'nyiooc'], use_cases: ['dipping', 'salad', 'gift'], volume_ml: 500, packaging: 'dark_glass', olivator_score: 89, score_breakdown: { acidity: 34, certifications: 22, quality: 20, value: 13 }, description_short: 'Istrijský skvost s nejvyššími polyfenoly v naší databázi (340 mg/kg). NYIOOC Gold 2024. Intenzivní, komplexní.', status: 'active' },
  { ean: '8410200300407', name: 'Carbonell Extra Virgin', slug: 'carbonell-extra-virgin', name_short: 'Carbonell', origin_country: 'ES', origin_region: 'Córdoba', type: 'evoo', acidity: 0.4, polyphenols: 180, peroxide_value: 10.0, oleic_acid_pct: 72.0, harvest_year: 2023, processing: 'cold_pressed', flavor_profile: { fruity: 60, herbal: 45, bitter: 35, spicy: 30, mild: 75, nutty: 55, buttery: 50 }, certifications: [], use_cases: ['cooking', 'frying'], volume_ml: 1000, packaging: 'pet', olivator_score: 68, score_breakdown: { acidity: 22, certifications: 0, quality: 12, value: 34 }, description_short: 'Nejprodávanější španělský olej v ČR. Jemný, univerzální — ideální na vaření a smažení. Výborná cena za litr.', status: 'active' },
]

// Offers keyed by product slug + retailer slug
const OFFERS = [
  { productSlug: 'gaea-fresh-extra-virgin', retailerSlug: 'rohlik', price: 189, commission_pct: 4 },
  { productSlug: 'gaea-fresh-extra-virgin', retailerSlug: 'kosik', price: 199, commission_pct: 3.5 },
  { productSlug: 'gaea-fresh-extra-virgin', retailerSlug: 'olivio', price: 215, commission_pct: 12 },
  { productSlug: 'escelsior-bio-siciliano', retailerSlug: 'mall', price: 269, commission_pct: 5 },
  { productSlug: 'escelsior-bio-siciliano', retailerSlug: 'olivio', price: 289, commission_pct: 12 },
  { productSlug: 'aglandau-premium-evoo', retailerSlug: 'olivio', price: 229, commission_pct: 12 },
  { productSlug: 'aglandau-premium-evoo', retailerSlug: 'zdravasila', price: 249, commission_pct: 8 },
  { productSlug: 'ybarra-premium-evoo', retailerSlug: 'kosik', price: 189, commission_pct: 3.5 },
  { productSlug: 'ybarra-premium-evoo', retailerSlug: 'rohlik', price: 199, commission_pct: 4 },
  { productSlug: 'frantoio-franci-igp', retailerSlug: 'zdravasila', price: 349, commission_pct: 8 },
  { productSlug: 'frantoio-franci-igp', retailerSlug: 'olivio', price: 365, commission_pct: 12 },
  { productSlug: 'terra-creta-estate-evoo', retailerSlug: 'rohlik', price: 209, commission_pct: 4 },
  { productSlug: 'terra-creta-estate-evoo', retailerSlug: 'olivio', price: 225, commission_pct: 12 },
  { productSlug: 'olival-selection-premium', retailerSlug: 'olivio', price: 389, commission_pct: 12 },
  { productSlug: 'olival-selection-premium', retailerSlug: 'zdravasila', price: 399, commission_pct: 8 },
  { productSlug: 'carbonell-extra-virgin', retailerSlug: 'rohlik', price: 179, commission_pct: 4 },
  { productSlug: 'carbonell-extra-virgin', retailerSlug: 'kosik', price: 169, commission_pct: 3.5 },
  { productSlug: 'carbonell-extra-virgin', retailerSlug: 'mall', price: 185, commission_pct: 5 },
]

async function main() {
  console.log('Upserting products...')
  const { data: productData, error: pErr } = await supabase
    .from('products')
    .upsert(PRODUCTS, { onConflict: 'ean' })
    .select('id, slug')
  if (pErr) { console.error('Products error:', pErr); process.exit(1) }
  console.log(`✓ ${productData.length} products`)

  const { data: retailers } = await supabase.from('retailers').select('id, slug')
  const productsBySlug = Object.fromEntries(productData.map(p => [p.slug, p.id]))
  const retailersBySlug = Object.fromEntries(retailers.map(r => [r.slug, r.id]))

  const offersToInsert = OFFERS.map(o => ({
    product_id: productsBySlug[o.productSlug],
    retailer_id: retailersBySlug[o.retailerSlug],
    price: o.price,
    commission_pct: o.commission_pct,
    in_stock: true,
    affiliate_url: `https://${o.retailerSlug}.cz/olivovy-olej`,
  }))

  console.log('Upserting offers...')
  const { data: offerData, error: oErr } = await supabase
    .from('product_offers')
    .upsert(offersToInsert, { onConflict: 'product_id,retailer_id' })
    .select('id')
  if (oErr) { console.error('Offers error:', oErr); process.exit(1) }
  console.log(`✓ ${offerData.length} offers`)

  console.log('\n✅ Seed complete')
}

main().catch(e => { console.error(e); process.exit(1) })
