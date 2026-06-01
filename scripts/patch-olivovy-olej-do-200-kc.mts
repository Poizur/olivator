import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://dyaloliwynmfnpjemzrh.supabase.co'
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY!
const ARTICLE_SLUG = 'olivovy-olej-do-200-kc'
const BACKUP_PATH = '/Users/martinnavratil/Desktop/Projekty/olivator/docs/article-backups/olivovy-olej-do-200-kc.pre-b.json'

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

const { data: article, error: fetchErr } = await supabase
  .from('articles')
  .select('id, slug, body_markdown')
  .eq('slug', ARTICLE_SLUG)
  .single()

if (fetchErr || !article) {
  console.error('FETCH ERROR:', fetchErr)
  process.exit(1)
}

// Backup
fs.mkdirSync(path.dirname(BACKUP_PATH), { recursive: true })
fs.writeFileSync(
  BACKUP_PATH,
  JSON.stringify({ id: article.id, slug: article.slug, body_markdown: article.body_markdown, backed_up_at: new Date().toISOString() }, null, 2),
  'utf-8'
)
console.log('✓ Backup saved to', BACKUP_PATH)

let body = article.body_markdown

// ──────────────────────────────────────────────────────────────────────────
// Change 1: Replace 5 wrong tokens in "## Top olivové oleje do 200 Kč"
// ──────────────────────────────────────────────────────────────────────────
const OLD_TOKENS = `{{product:chiavalon-atilio-100-ml}}
{{product:chiavalon-organic-100-ml-testovaci-vzorek-bio-extra-panenskeho-olivoveho-oleje}}
{{product:chiavalon-romano-100-ml}}
{{product:picual-250-ml-extra-panensky-olivovy-olej}}
{{product:corinto-pelopones-bio-extra-panensky-olivovy-olej-manaki-0-4-100-ml-sklo}}`

const NEW_TOKENS = `{{product:picual-500-ml-extra-panensky-olivovy-olej}}
{{product:picual-500-ml-extra-panensky-nefiltrovany-olivovy-olej}}
{{product:arbequina-500-ml}}
{{product:picual-250-ml-extra-panensky-olivovy-olej}}
{{product:premium-extra-panensky-olivovy-olej-kyselost-0-2-250-ml-vafis}}`

if (!body.includes(OLD_TOKENS)) {
  console.error('ERROR: OLD_TOKENS not found — aborting')
  process.exit(1)
}
body = body.replace(OLD_TOKENS, NEW_TOKENS)
console.log('✓ Change 1: section-1 tokens replaced (4 wrong → 4 budget + 1 kept)')

// ──────────────────────────────────────────────────────────────────────────
// Change 2: Replace fabricated "Top 5 picks" editorial section with real tokens
// Uses section boundary markers — no exact content match needed
// ──────────────────────────────────────────────────────────────────────────
const SEC2_START = '## Top 5 picks pod 200 Kč (data z Olivator katalogu)'
const SEC2_END   = '## Mark-up past: malé láhve vypadají levněji, ale nejsou'

const startIdx = body.indexOf(SEC2_START)
const endIdx   = body.indexOf(SEC2_END)

if (startIdx === -1) {
  console.error('ERROR: SEC2_START not found — aborting')
  process.exit(1)
}
if (endIdx === -1) {
  console.error('ERROR: SEC2_END not found — aborting')
  process.exit(1)
}
if (startIdx >= endIdx) {
  console.error('ERROR: SEC2_START not before SEC2_END — aborting')
  process.exit(1)
}

const OLD_SEC2 = body.slice(startIdx, endIdx)
const NEW_SEC2 = `## Dalších 5 olejů z Olivator katalogu pod 200 Kč

{{product:casitas-de-hualdo-250-ml-zluty}}
{{product:bio-extra-panensky-olivovy-olej-250ml-mitira}}
{{product:iliada-kalamata-extra-panensky-olivovy-olej-0-5-500ml}}
{{product:extra-panensky-olivovy-olej-250-ml-p-d-o-kolymbari}}
{{product:premiovy-extra-panensky-olivovy-olej-pure-drop-250ml-ena-ena}}

`

body = body.slice(0, startIdx) + NEW_SEC2 + body.slice(endIdx)
console.log('✓ Change 2: fabricated editorial section replaced with 5 real tokens')
console.log(`  Removed ${OLD_SEC2.length} chars of fabricated content`)

// ──────────────────────────────────────────────────────────────────────────
// Validate all 10 tokens present
// ──────────────────────────────────────────────────────────────────────────
const expectedTokens = [
  // Section 1
  '{{product:picual-500-ml-extra-panensky-olivovy-olej}}',
  '{{product:picual-500-ml-extra-panensky-nefiltrovany-olivovy-olej}}',
  '{{product:arbequina-500-ml}}',
  '{{product:picual-250-ml-extra-panensky-olivovy-olej}}',
  '{{product:premium-extra-panensky-olivovy-olej-kyselost-0-2-250-ml-vafis}}',
  // Section 2
  '{{product:casitas-de-hualdo-250-ml-zluty}}',
  '{{product:bio-extra-panensky-olivovy-olej-250ml-mitira}}',
  '{{product:iliada-kalamata-extra-panensky-olivovy-olej-0-5-500ml}}',
  '{{product:extra-panensky-olivovy-olej-250-ml-p-d-o-kolymbari}}',
  '{{product:premiovy-extra-panensky-olivovy-olej-pure-drop-250ml-ena-ena}}',
]
for (const token of expectedTokens) {
  if (!body.includes(token)) {
    console.error(`ERROR: token missing: ${token}`)
    process.exit(1)
  }
}
console.log(`✓ All ${expectedTokens.length} tokens present`)

// Verify old wrong tokens are gone
const forbidden = [
  'chiavalon-atilio-100-ml',
  'chiavalon-romano-100-ml',
  'corinto-pelopones-bio-extra-panensky-olivovy-olej-manaki-0-4-100-ml-sklo',
  'Sitia PDO',
  'Terra Creta BIO',
  'interním testingem',
]
for (const f of forbidden) {
  if (body.includes(f)) {
    console.error(`ERROR: forbidden string still present: "${f}"`)
    process.exit(1)
  }
}
console.log('✓ Forbidden strings cleared')

// Length check
console.log(`  New body length: ${body.length} chars (was ${article.body_markdown.length})`)

// ──────────────────────────────────────────────────────────────────────────
// PATCH
// ──────────────────────────────────────────────────────────────────────────
const { error: patchErr } = await supabase
  .from('articles')
  .update({ body_markdown: body, updated_at: new Date().toISOString() })
  .eq('slug', ARTICLE_SLUG)

if (patchErr) {
  console.error('PATCH ERROR:', patchErr)
  process.exit(1)
}
console.log('✓ PATCH applied to DB')

// Verify by re-fetching
const { data: verify } = await supabase
  .from('articles')
  .select('body_markdown')
  .eq('slug', ARTICLE_SLUG)
  .single()

if (!verify?.body_markdown.includes('{{product:picual-500-ml-extra-panensky-olivovy-olej}}')) {
  console.error('VERIFY FAILED: picual-500ml token not found in re-fetched body')
  process.exit(1)
}
if (!verify.body_markdown.includes('{{product:casitas-de-hualdo-250-ml-zluty}}')) {
  console.error('VERIFY FAILED: casitas token not found in re-fetched body')
  process.exit(1)
}
if (verify.body_markdown.includes('chiavalon-atilio-100-ml')) {
  console.error('VERIFY FAILED: chiavalon-atilio still present')
  process.exit(1)
}
if (verify.body_markdown.includes('interním testingem')) {
  console.error('VERIFY FAILED: fabricated "interním testingem" still present')
  process.exit(1)
}
console.log('✓ Verification passed')

console.log('\nSUMMARY:')
console.log('  Article:', ARTICLE_SLUG)
console.log('  Backup:', BACKUP_PATH)
console.log('  Change 1: 4 Chiavalon/Corinto 100ml tokens → 3 Picual/Arbequina 500ml + Vafis 250ml')
console.log('  Change 2: fabricated "Top 5 picks" editorial → 5 real DB tokens (Casitas, Mitira, Iliada, Kolymbari, PureDrop)')
