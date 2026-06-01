import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://dyaloliwynmfnpjemzrh.supabase.co'
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY!
const SLUG = 'olivovy-olej-na-plet-a-vlasy'

const sb = createClient(SUPABASE_URL, SUPABASE_KEY)

const { data: article, error: fetchErr } = await sb
  .from('articles')
  .select('id, slug, body_markdown, meta_title, meta_description, status')
  .eq('slug', SLUG)
  .single()

if (fetchErr || !article) { console.error('FETCH ERROR:', fetchErr); process.exit(1) }
console.log(`✓ Fetched: ${article.slug} (${article.status}, ${article.body_markdown.length} chars)`)

let body = article.body_markdown

// ── Change 1: Replace 5 wrong tokens with correct affordable BIO selection ─
const OLD_TOKENS = `{{product:bio-extra-panensky-olivovy-olej-terracuza-biologico-500-ml-ze-sardinie}}
{{product:premiovy-bio-extra-panensky-olivovy-olej-miceli-sensat-verde-500-ml-v-darkovem-baleni}}
{{product:bio-extra-panensky-olivovy-olej-elixir-500-ml}}
{{product:sitia-kreta-premium-gold-0-2-extra-panensky-olivovy-olej-5-l}}
{{product:sitia-kreta-premium-gold-0-2-extra-panensky-olivovy-olej-3-l}}`

// Context sentence + 5 correct tokens (BIO pref., poly 450+, 40–65 Kč/100ml, 250–1000ml)
const NEW_TOKENS = `Pro kosmetiku hledáš BIO oleje s polyfenoly nad 400 mg/kg a cenou do 65 Kč/100 ml — bez pesticidů na pokožce a bez přeplatku za lahev. Tady je pětice, která to splňuje:

{{product:sitia-kreta-premium-gold-0-2-extra-panensky-olivovy-olej-500-ml}}

{{product:myrtoo-bio-extra-panensky-olivovy-olej-750ml-stamatakos}}

{{product:bio-extra-panensky-olivovy-olej-1l-mitira}}

{{product:early-harvest-liophos-bio-extra-panensky-olivovy-olej-pgi-lakonia-750ml-stamatakos}}

{{product:picual-bio-500-ml}}`

if (!body.includes(OLD_TOKENS)) { console.error('ERROR: OLD_TOKENS not found'); process.exit(1) }
body = body.replace(OLD_TOKENS, NEW_TOKENS)
console.log('✓ Change 1: 5 expensive/wrong tokens → 5 BIO affordable tokens')

// ── Validate all 5 new tokens present ─────────────────────────────────────
const expectedTokens = [
  '{{product:sitia-kreta-premium-gold-0-2-extra-panensky-olivovy-olej-500-ml}}',
  '{{product:myrtoo-bio-extra-panensky-olivovy-olej-750ml-stamatakos}}',
  '{{product:bio-extra-panensky-olivovy-olej-1l-mitira}}',
  '{{product:early-harvest-liophos-bio-extra-panensky-olivovy-olej-pgi-lakonia-750ml-stamatakos}}',
  '{{product:picual-bio-500-ml}}',
]
for (const t of expectedTokens) {
  if (!body.includes(t)) { console.error(`ERROR: token missing: ${t}`); process.exit(1) }
}
console.log(`✓ All ${expectedTokens.length} product tokens validated`)

// ── Validate forbidden wrong tokens are gone ───────────────────────────────
const forbidden = ['terracuza-biologico', 'miceli-sensat-verde', 'elixir-500-ml', 'olivovy-olej-5-l', 'olivovy-olej-3-l']
for (const f of forbidden) {
  if (body.includes(f)) { console.error(`ERROR: wrong token still present: ${f}`); process.exit(1) }
}
console.log('✓ All wrong tokens removed')

// ── Change 2: meta_title ───────────────────────────────────────────────────
const NEW_META_TITLE = 'Olivový olej na pleť, vlasy i opalování: průvodce bez mýtů'
if (NEW_META_TITLE.length > 60) { console.error(`ERROR: meta_title ${NEW_META_TITLE.length}ch > 60`); process.exit(1) }
console.log(`✓ Change 2: meta_title → "${NEW_META_TITLE}" (${NEW_META_TITLE.length}ch)`)

// ── Change 3: meta_description ────────────────────────────────────────────
const NEW_META_DESC = 'Olivový olej na pleť hydratuje a odličuje — ale ne pro každý typ pleti. Průvodce bez mýtů: SPF, fototoxicita citronu a jak ho správně používat na vlasy.'
if (NEW_META_DESC.length < 140 || NEW_META_DESC.length > 160) {
  console.error(`ERROR: meta_description ${NEW_META_DESC.length}ch — must be 140-160`); process.exit(1)
}
console.log(`✓ Change 3: meta_description → ${NEW_META_DESC.length}ch`)

// ── PATCH (status stays draft) ─────────────────────────────────────────────
const updatedAt = new Date().toISOString()
const { error: patchErr } = await sb
  .from('articles')
  .update({
    body_markdown: body,
    meta_title: NEW_META_TITLE,
    meta_description: NEW_META_DESC,
    updated_at: updatedAt,
  })
  .eq('slug', SLUG)

if (patchErr) { console.error('PATCH ERROR:', patchErr); process.exit(1) }
console.log('✓ PATCH applied (status stays draft)')

// ── Verify ─────────────────────────────────────────────────────────────────
const { data: v } = await sb
  .from('articles')
  .select('status, meta_title, meta_description, body_markdown')
  .eq('slug', SLUG)
  .single()

if (v?.status !== 'draft') { console.error('VERIFY FAILED: status changed'); process.exit(1) }
if (!v.meta_title.includes('průvodce bez mýtů')) { console.error('VERIFY FAILED: meta_title'); process.exit(1) }
if (!v.body_markdown.includes('picual-bio-500-ml')) { console.error('VERIFY FAILED: picual token missing'); process.exit(1) }
if (v.body_markdown.includes('terracuza')) { console.error('VERIFY FAILED: terracuza still present'); process.exit(1) }
if (!v.meta_description?.includes('fototoxicita')) { console.error('VERIFY FAILED: meta_description'); process.exit(1) }
console.log('✓ Verification passed')

console.log('\nSUMMARY:')
console.log('  Article:', SLUG)
console.log('  Status: draft — čeká na schválení meta description + publish OK')
console.log('  Meta title:', NEW_META_TITLE, `(${NEW_META_TITLE.length}ch)`)
console.log('  Meta desc:', NEW_META_DESC, `(${NEW_META_DESC.length}ch)`)
console.log('  Body:', v!.body_markdown.length, 'chars | 5 tokens ✓')
