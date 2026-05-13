/**
 * fix-control-chars.ts
 *
 * Najde produkty s literal control znaky (0x00–0x1F kromě \t \n \r)
 * v textových polích a vyčistí je. Tyto znaky způsobují JSON parse error
 * v Supabase JS klientovi při prerenderu /srovnavac.
 *
 * Run: env -u ANTHROPIC_API_KEY npx tsx --env-file=.env.local scripts/fix-control-chars.ts
 */

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!,
  { auth: { persistSession: false } }
)

// Regex pro control chars: 0x00-0x08, 0x0B, 0x0C, 0x0E-0x1F, 0x7F
// Povolujeme: 0x09=\t, 0x0A=\n, 0x0D=\r (standardní whitespace)
const CTRL_RE = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g

function stripControlChars(s: string | null): string | null {
  if (!s) return s
  return s.replace(CTRL_RE, '')
}

function hasControlChars(s: string | null): boolean {
  if (!s) return false
  return CTRL_RE.test(s.replace(CTRL_RE, '') !== s ? s : 'x') || s !== s.replace(CTRL_RE, '')
}

const TEXT_FIELDS = [
  'description_short',
  'description_long',
  'meta_title',
  'meta_description',
  'name',
  'slug',
  'name_short',
  'origin_region',
  'raw_description',
] as const

async function main() {
  console.log('Fetching all products...')

  // Stahujeme po 200 kusech — velky payload 71+ produktu muze obsahovat bad char
  let offset = 0
  const PAGE = 200
  let totalFixed = 0
  let totalScanned = 0

  while (true) {
    const { data, error } = await supabase
      .from('products')
      .select(`id, slug, ${TEXT_FIELDS.join(', ')}`)
      .range(offset, offset + PAGE - 1)

    if (error) {
      // Pokud error i na maly batch, zkus po 1
      console.error(`Batch ${offset}-${offset + PAGE - 1} failed:`, error.message)
      break
    }

    if (!data || data.length === 0) break

    for (const row of data as Record<string, string | null>[]) {
      totalScanned++
      const dirty: Record<string, string | null> = {}
      let hasDirty = false

      for (const field of TEXT_FIELDS) {
        const val = row[field]
        if (typeof val === 'string' && val !== val.replace(CTRL_RE, '')) {
          dirty[field] = val.replace(CTRL_RE, '')
          hasDirty = true
          console.log(`  → ${row.slug} [${field}]: bad chars found`)
        }
      }

      if (hasDirty) {
        const { error: updateErr } = await supabase
          .from('products')
          .update(dirty)
          .eq('id', row.id as string)

        if (updateErr) {
          console.error(`  ✗ Update failed for ${row.slug}:`, updateErr.message)
        } else {
          console.log(`  ✓ Fixed ${row.slug}`)
          totalFixed++
        }
      }
    }

    offset += data.length
    if (data.length < PAGE) break
  }

  console.log(`\nDone — scanned: ${totalScanned}, fixed: ${totalFixed}`)

  // Tez zkontroluj product_offers a articles pro jistotu
  console.log('\nChecking articles...')
  const { data: articles, error: artErr } = await supabase
    .from('articles')
    .select('id, slug, meta_title, meta_description')

  if (!artErr && articles) {
    for (const a of articles as Record<string, string | null>[]) {
      const dirty: Record<string, string | null> = {}
      let hasDirty = false
      for (const f of ['meta_title', 'meta_description'] as const) {
        const v = a[f]
        if (typeof v === 'string' && v !== v.replace(CTRL_RE, '')) {
          dirty[f] = v.replace(CTRL_RE, '')
          hasDirty = true
        }
      }
      if (hasDirty) {
        await supabase.from('articles').update(dirty).eq('id', a.id as string)
        console.log(`  ✓ Fixed article ${a.slug}`)
      }
    }
  }

  console.log('All done.')
}

main().catch(e => {
  console.error(e)
  process.exit(1)
})
