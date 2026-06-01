import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://dyaloliwynmfnpjemzrh.supabase.co'
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY!
const SLUG = 'olivovy-olej-s-citronem-po-rano'

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

const { data: article, error: fetchErr } = await supabase
  .from('articles')
  .select('id, slug, body_markdown, meta_title, meta_description, status')
  .eq('slug', SLUG)
  .single()

if (fetchErr || !article) { console.error('FETCH ERROR:', fetchErr); process.exit(1) }
console.log(`✓ Fetched: ${article.slug} (${article.status}, ${article.body_markdown.length} chars)`)

let body = article.body_markdown

// ── Change 1: Replace 5 hallucinated tokens with valid DB products ─────────
const OLD_TOKENS = `{{product:lozano-cervinka-picual-500ml}}

{{product:sitia-0-3-500ml}}

{{product:early-harvest-kolymvari-500ml}}

{{product:bartolini-primo-dop-500ml}}

{{product:cretan-mill-koroneiki-unfiltered}}`

// Context sentence + valid tokens in fresh order (Evolution first for variety)
const NEW_TOKENS = `Pro ranní konzumaci nalačno hledáš olej, kde polyfenoly skutečně cítíš — ta pálivost v hrdle není vada, je to oleocanthal v práci. Tady jsou oleje s nejvyšším obsahem polyfenolů dostupné v ČR:

{{product:premiovy-extra-panensky-olivovy-olej-evolution-denocciolato-500-ml-s-vysokym-podilem-polyfenolu}}

{{product:evolia-platinum-2777-polyfenolu-bio-extra-panensky-olivovy-olej-250-ml-extremne-vzacna-sklizen}}

{{product:limitovana-edice-reckeho-premiove-olivoveho-oleje-the-governor-500-ml}}

{{product:evolia-platinum-2000-polyfenolu-bio-extra-panensky-olivovy-olej-500-ml}}

{{product:premiovy-extra-panensky-olivovy-olej-le-selezioni-coratina-500-ml-z-italske-farmy-le-tre-colonne}}`

if (!body.includes(OLD_TOKENS)) { console.error('ERROR: OLD_TOKENS not found'); process.exit(1) }
body = body.replace(OLD_TOKENS, NEW_TOKENS)
console.log('✓ Change 1: 5 hallucinated tokens → 5 valid DB tokens (Evolution first)')

// ── Validate all 5 new tokens present ─────────────────────────────────────
const expectedTokens = [
  '{{product:premiovy-extra-panensky-olivovy-olej-evolution-denocciolato-500-ml-s-vysokym-podilem-polyfenolu}}',
  '{{product:evolia-platinum-2777-polyfenolu-bio-extra-panensky-olivovy-olej-250-ml-extremne-vzacna-sklizen}}',
  '{{product:limitovana-edice-reckeho-premiove-olivoveho-oleje-the-governor-500-ml}}',
  '{{product:evolia-platinum-2000-polyfenolu-bio-extra-panensky-olivovy-olej-500-ml}}',
  '{{product:premiovy-extra-panensky-olivovy-olej-le-selezioni-coratina-500-ml-z-italske-farmy-le-tre-colonne}}',
]
for (const t of expectedTokens) {
  if (!body.includes(t)) { console.error(`ERROR: token missing: ${t}`); process.exit(1) }
}
console.log(`✓ All ${expectedTokens.length} product tokens validated`)

// ── Validate forbidden hallucinated slugs are gone ─────────────────────────
const forbidden = [
  'lozano-cervinka-picual-500ml',
  'sitia-0-3-500ml',
  'early-harvest-kolymvari-500ml',
  'bartolini-primo-dop-500ml',
  'cretan-mill-koroneiki-unfiltered',
]
for (const f of forbidden) {
  if (body.includes(f)) { console.error(`ERROR: hallucinated slug still present: ${f}`); process.exit(1) }
}
console.log('✓ All hallucinated slugs removed')

// ── Change 2: meta_title ───────────────────────────────────────────────────
const NEW_META_TITLE = 'Olivový olej nalačno s citronem: věda vs. TikTok hype'
if (NEW_META_TITLE.length > 60) { console.error(`ERROR: meta_title ${NEW_META_TITLE.length}ch > 60`); process.exit(1) }
console.log(`✓ Change 2: meta_title → "${NEW_META_TITLE}" (${NEW_META_TITLE.length}ch)`)

// ── Change 3: meta_description ────────────────────────────────────────────
const NEW_META_DESC = 'Olivový olej s citronem nalačno slibuje zázraky, věda mluví jinak. Co opravdu funguje, jak na žaludek a které oleje s polyfenoly mají smysl.'
if (NEW_META_DESC.length < 140 || NEW_META_DESC.length > 160) {
  console.error(`ERROR: meta_description ${NEW_META_DESC.length}ch — must be 140-160`); process.exit(1)
}
console.log(`✓ Change 3: meta_description → ${NEW_META_DESC.length}ch`)

// ── PATCH (status stays draft) ─────────────────────────────────────────────
const updatedAt = new Date().toISOString()
const { error: patchErr } = await supabase
  .from('articles')
  .update({
    body_markdown: body,
    meta_title: NEW_META_TITLE,
    meta_description: NEW_META_DESC,
    updated_at: updatedAt,
  })
  .eq('slug', SLUG)

if (patchErr) { console.error('PATCH ERROR:', patchErr); process.exit(1) }
console.log('✓ PATCH applied — body, meta_title, meta_description updated (status stays draft)')

// ── Verify ─────────────────────────────────────────────────────────────────
const { data: v } = await supabase
  .from('articles')
  .select('status, meta_title, meta_description, body_markdown')
  .eq('slug', SLUG)
  .single()

if (v?.status !== 'draft') { console.error('VERIFY FAILED: status changed unexpectedly'); process.exit(1) }
if (!v.meta_title.includes('TikTok hype')) { console.error('VERIFY FAILED: meta_title mismatch'); process.exit(1) }
if (!v.body_markdown.includes('evolution-denocciolato')) { console.error('VERIFY FAILED: evolution token missing'); process.exit(1) }
if (v.body_markdown.includes('lozano-cervinka')) { console.error('VERIFY FAILED: hallucinated slug still present'); process.exit(1) }
if (!v.meta_description.includes('věda mluví jinak')) { console.error('VERIFY FAILED: meta_description mismatch'); process.exit(1) }
console.log('✓ Verification passed')

console.log('\nSUMMARY:')
console.log('  Article:', SLUG)
console.log('  Status: draft (awaiting publish approval)')
console.log('  Meta title:', NEW_META_TITLE, `(${NEW_META_TITLE.length}ch)`)
console.log('  Meta desc:', NEW_META_DESC, `(${NEW_META_DESC.length}ch)`)
console.log('  Body length:', v!.body_markdown.length, 'chars')
console.log('  Tokens:', expectedTokens.length, 'valid DB tokens')
