import { NextResponse } from 'next/server'
import { isAdminAuthenticated } from '@/lib/admin-auth'
import { supabaseAdmin } from '@/lib/supabase'
import { generateMetaDescription } from '@/lib/content-agent'

export const maxDuration = 300 // ~57 products × ~1s each + backoff

interface ProductRow {
  id: string
  name: string
  slug: string
  description_short: string | null
  origin_country: string | null
  origin_region: string | null
  acidity: number | string | null
  polyphenols: number | null
  certifications: string[] | null
  olivator_score: number | null
}

/** Bulk SEO meta_description generator. Iterates active products with NULL
 *  or empty meta_description, calls Haiku, writes result. Idempotent — only
 *  touches rows that don't already have a meta_description. */
export async function POST() {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: 'ANTHROPIC_API_KEY not configured on server' },
      { status: 500 }
    )
  }

  const { data: products, error } = await supabaseAdmin
    .from('products')
    .select(
      'id, name, slug, description_short, origin_country, origin_region, acidity, polyphenols, certifications, olivator_score'
    )
    .eq('status', 'active')
    .or('meta_description.is.null,meta_description.eq.')
    .returns<ProductRow[]>()
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  if (!products || products.length === 0) {
    return NextResponse.json({ ok: true, processed: 0, message: 'Vše už má meta description.' })
  }

  let ok = 0
  let failed = 0
  const failures: string[] = []
  // Sequential — keeps Haiku rate budget calm + Vercel/Railway maxDuration friendly
  for (const p of products) {
    try {
      const meta = await generateMetaDescription({
        name: p.name,
        shortDescription: p.description_short,
        originCountry: p.origin_country,
        originRegion: p.origin_region,
        acidity: p.acidity != null ? Number(p.acidity) : null,
        polyphenols: p.polyphenols,
        certifications: p.certifications ?? [],
        olivatorScore: p.olivator_score,
      })
      if (!meta || meta.length < 50) {
        failed++
        failures.push(`${p.slug}: too short (${meta?.length ?? 0} chars)`)
        continue
      }
      const final = meta.length <= 160 ? meta : (meta.slice(0, 160).replace(/\s+\S*$/, '') || meta.slice(0, 160))
      const { error: updErr } = await supabaseAdmin
        .from('products')
        .update({ meta_description: final, updated_at: new Date().toISOString() })
        .eq('id', p.id)
      if (updErr) {
        failed++
        failures.push(`${p.slug}: ${updErr.message}`)
      } else {
        ok++
      }
    } catch (err) {
      failed++
      failures.push(`${p.slug}: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  return NextResponse.json({
    ok: true,
    processed: ok,
    failed,
    failures: failures.slice(0, 10),
  })
}
