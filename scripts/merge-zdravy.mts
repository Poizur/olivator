import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://dyaloliwynmfnpjemzrh.supabase.co'
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY!
const SLUG = 'je-olivovy-olej-zdravy'

const sb = createClient(SUPABASE_URL, SUPABASE_KEY)

// ── Read merged body from pre-validated file ───────────────────────────────
const MERGED_BODY = readFileSync('docs/article-backups/je-olivovy-olej-zdravy-MERGED.md', 'utf-8')

// ── Pre-PATCH validation ───────────────────────────────────────────────────
const REQUIRED_TOKENS = [
  '{{product:evolia-platinum-2777-polyfenolu-bio-extra-panensky-olivovy-olej-250-ml-extremne-vzacna-sklizen}}',
  '{{product:evolia-platinum-2000-polyfenolu-bio-extra-panensky-olivovy-olej-500-ml}}',
  '{{product:premiovy-extra-panensky-olivovy-olej-evolution-denocciolato-500-ml-s-vysokym-podilem-polyfenolu}}',
  '{{product:premiovy-extra-panensky-olivovy-olej-le-selezioni-coratina-500-ml-z-italske-farmy-le-tre-colonne}}',
  '{{product:limitovana-edice-reckeho-premiove-olivoveho-oleje-the-governor-500-ml}}',
]

for (const t of REQUIRED_TOKENS) {
  if (!MERGED_BODY.includes(t)) { console.error(`PRE-VALIDATION ERROR: token missing: ${t}`); process.exit(1) }
}
console.log('✓ Pre-validation: all 5 product tokens present')

if (MERGED_BODY.includes('/pruvodce/olivovy-olej-a-zdravi-veda-2026')) {
  console.error('PRE-VALIDATION ERROR: old article link still in merged body'); process.exit(1)
}
console.log('✓ Pre-validation: old article link removed')

const h2Count = (MERGED_BODY.match(/^## .+$/gm) || []).length
console.log(`✓ Pre-validation: ${MERGED_BODY.length} chars | ${h2Count} H2 sections`)

// ── PATCH ──────────────────────────────────────────────────────────────────
const updatedAt = new Date().toISOString()
const { error } = await sb.from('articles')
  .update({ body_markdown: MERGED_BODY, updated_at: updatedAt })
  .eq('slug', SLUG)

if (error) { console.error('PATCH ERROR:', error); process.exit(1) }
console.log('✓ PATCH applied')

// ── Post-PATCH verification ────────────────────────────────────────────────
const { data: v, error: ve } = await sb.from('articles')
  .select('slug, status, body_markdown, meta_title')
  .eq('slug', SLUG)
  .single()

if (ve || !v) { console.error('VERIFY FETCH ERROR:', ve); process.exit(1) }

for (const t of REQUIRED_TOKENS) {
  if (!v.body_markdown.includes(t)) { console.error(`VERIFY FAILED: token missing in DB: ${t}`); process.exit(1) }
}
if (v.body_markdown.includes('/pruvodce/olivovy-olej-a-zdravi-veda-2026')) {
  console.error('VERIFY FAILED: old article link still in DB'); process.exit(1)
}
if (v.status !== 'active') { console.error(`VERIFY FAILED: status changed to ${v.status}`); process.exit(1) }

const dbH2s = (v.body_markdown.match(/^## .+$/gm) || [])
console.log('✓ Post-PATCH verification passed')
console.log(`\nRESULT:`)
console.log(`  slug:        ${v.slug}`)
console.log(`  status:      ${v.status}`)
console.log(`  meta_title:  ${v.meta_title}`)
console.log(`  body length: ${v.body_markdown.length} chars`)
console.log(`  H2 sections: ${dbH2s.length}`)
for (const h of dbH2s) console.log(`    ${h}`)
console.log(`\n⏸  AWAITING APPROVAL before archiving old article.`)
console.log(`   Old article (olivovy-olej-a-zdravi-veda-2026) is still status=active.`)
