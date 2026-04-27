import { NextRequest, NextResponse } from 'next/server'
import { isAdminAuthenticated } from '@/lib/admin-auth'
import { createProduct, updateProductFacts } from '@/lib/data'
import { supabaseAdmin } from '@/lib/supabase'
import { extractFactsFromText } from '@/lib/fact-extractor'

export const maxDuration = 45 // fact extraction adds ~5s

/** Derive a friendly retailer name from a domain (heuristic).
 *  e.g. "shop.reckonasbavi.cz" → "Řecko nás baví" (special case),
 *       "rohlik.cz" → "Rohlík.cz" (capitalized).
 *  Falls back to capitalizing the second-level domain. */
function retailerNameFromDomain(domain: string): string {
  const map: Record<string, string> = {
    'shop.reckonasbavi.cz': 'Řecko nás baví',
    'reckonasbavi.cz': 'Řecko nás baví',
    'rohlik.cz': 'Rohlík.cz',
    'kosik.cz': 'Košík.cz',
    'mall.cz': 'Mall.cz',
    'olivio.cz': 'Olivio.cz',
    'gaea.cz': 'Gaea.cz',
    'olivovyolej.cz': 'Olivovyolej.cz',
    'iherb.com': 'iHerb.com',
    'itesco.cz': 'iTesco.cz',
    'albert.cz': 'Albert.cz',
    'kaufland.cz': 'Kaufland.cz',
    'globus.cz': 'Globus.cz',
    'mujbio.cz': 'MujBio.cz',
    'zdravasila.cz': 'Zdravasila.cz',
  }
  if (map[domain.toLowerCase()]) return map[domain.toLowerCase()]
  // Strip subdomain prefixes (shop., m., www.) and capitalize SLD
  const stripped = domain.replace(/^(shop\.|m\.|www\.)/, '')
  const sld = stripped.split('.')[0] ?? stripped
  return sld.charAt(0).toUpperCase() + sld.slice(1)
}

function slugFromDomain(domain: string): string {
  return domain
    .replace(/^(shop\.|m\.|www\.)/, '')
    .split('.')[0]
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
}

/** Ensure a retailer exists for the given domain. Returns retailer id. */
async function ensureRetailer(domain: string): Promise<string | null> {
  if (!domain) return null
  const slug = slugFromDomain(domain)
  if (!slug) return null

  const { data: existing } = await supabaseAdmin
    .from('retailers')
    .select('id')
    .eq('slug', slug)
    .maybeSingle()
  if (existing?.id) return existing.id as string

  const { data: created, error } = await supabaseAdmin
    .from('retailers')
    .insert({
      name: retailerNameFromDomain(domain),
      slug,
      domain: domain.replace(/^(shop\.|m\.|www\.)/, ''),
      affiliate_network: 'direct',
      default_commission_pct: 0,
      is_active: true,
      market: 'CZ',
    })
    .select('id')
    .single()
  if (error || !created) return null
  return created.id as string
}

export async function POST(request: NextRequest) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const body = await request.json()
    if (!body.name || !body.slug) {
      return NextResponse.json({ error: 'Název a slug jsou povinné' }, { status: 400 })
    }

    const result = await createProduct({ ...body, status: body.status ?? 'draft' })

    // Auto-create offer from scraped source — admin doesn't need affiliate yet,
    // but visitors get a working "Buy" button linking directly to the retailer.
    if (body.scrapedDomain && body.scrapedPrice && body.sourceUrl) {
      try {
        const retailerId = await ensureRetailer(body.scrapedDomain as string)
        if (retailerId) {
          await supabaseAdmin.from('product_offers').upsert(
            {
              product_id: result.id,
              retailer_id: retailerId,
              price: Number(body.scrapedPrice),
              currency: (body.scrapedCurrency as string) ?? 'CZK',
              in_stock: true,
              product_url: body.sourceUrl as string,
            },
            { onConflict: 'product_id,retailer_id' }
          )
        }
      } catch (err) {
        console.warn('[auto-create offer] non-fatal:', err)
      }
    }

    // Fact extraction (fire-and-await): when creating from import with
    // raw description, extract specific technical facts for later use
    // by AI rewrite. Uses Claude Haiku (~$0.005/call).
    // Prefer rawDescription (untouched scrape) over AI-generated text.
    const rawText = body.rawDescription || body.descriptionLong || body.descriptionShort || ''
    if (rawText && rawText.length > 30) {
      try {
        const facts = await extractFactsFromText(rawText)
        if (facts.length > 0) {
          await updateProductFacts(result.id, facts)
        }
      } catch (err) {
        console.warn('[fact extraction at import] non-fatal:', err)
      }
    }

    return NextResponse.json({ ok: true, id: result.id })
  } catch (err) {
    console.error('[products POST]', err)
    const message = err instanceof Error ? err.message : 'Server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
