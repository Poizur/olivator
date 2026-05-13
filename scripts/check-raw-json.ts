/**
 * check-raw-json.ts
 * Raw HTTP fetch — bez Supabase JS klienta — hledá control chars v response.
 * Run: env -u ANTHROPIC_API_KEY npx tsx --env-file=.env.local scripts/check-raw-json.ts
 */

const PRODUCT_PUBLIC_COLUMNS =
  'id,ean,name,slug,name_short,origin_country,origin_region,type,' +
  'acidity,polyphenols,oleocanthal,peroxide_value,oleic_acid_pct,' +
  'harvest_year,processing,flavor_profile,certifications,use_cases,' +
  'volume_ml,packaging,olivator_score,score_breakdown,' +
  'description_short,description_long,meta_title,meta_description,' +
  'status,image_url,image_source,source_url'

const RETAILER_PUBLIC_COLUMNS =
  'id,name,slug,domain,affiliate_network,default_commission_pct,' +
  'is_active,market,rating,rating_count,rating_source,' +
  'tagline,founders,headquarters,founded_year,specialization,logo_url,' +
  'shipping_rate_czk,free_shipping_threshold_czk,delivery_days_min,delivery_days_max,return_days'

const CTRL = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g

function inspect(label: string, text: string) {
  console.log(`\n=== ${label} ===`)
  console.log('Length:', text.length)
  const matches = [...text.matchAll(CTRL)]
  if (matches.length > 0) {
    console.log('CONTROL CHARS FOUND:', matches.length)
    for (const m of matches.slice(0, 5)) {
      const pos = m.index!
      const ctx = text.slice(Math.max(0, pos - 60), pos + 60)
      console.log(`  pos=${pos} code=0x${text.charCodeAt(pos).toString(16).padStart(2, '0')} ctx=${JSON.stringify(ctx)}`)
    }
  } else {
    console.log('No control chars')
  }
  try {
    JSON.parse(text)
    console.log('JSON.parse: OK')
  } catch (e: unknown) {
    console.log('JSON.parse FAILED:', (e as Error).message)
  }
}

async function rawGet(path: string, params: Record<string, string> = {}): Promise<string> {
  const url = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL! + path)
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v)
  const res = await fetch(url.toString(), {
    headers: {
      apikey: process.env.SUPABASE_SERVICE_KEY!,
      Authorization: `Bearer ${process.env.SUPABASE_SERVICE_KEY!}`,
      Accept: 'application/json',
    },
  })
  return res.text()
}

async function main() {
  // 1. Products (same query as getProducts())
  const productsTxt = await rawGet('/rest/v1/products', {
    select: PRODUCT_PUBLIC_COLUMNS,
    status: 'eq.active',
    order: 'olivator_score.desc.nullslast',
  })
  inspect('products', productsTxt)

  // 2. product_offers + retailers join (same as getProductsWithOffers())
  const offersTxt = await rawGet('/rest/v1/product_offers', {
    select: `id,product_id,retailer_id,price,currency,in_stock,product_url,affiliate_url,commission_pct,retailer:retailers(${RETAILER_PUBLIC_COLUMNS})`,
    order: 'price.asc',
  })
  inspect('product_offers+retailers', offersTxt)

  // 3. product_images
  const imgTxt = await rawGet('/rest/v1/product_images', {
    select: 'product_id,url',
    is_primary: 'eq.true',
  })
  inspect('product_images', imgTxt)
}

main().catch(e => {
  console.error(e)
  process.exit(1)
})
