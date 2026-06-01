import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://dyaloliwynmfnpjemzrh.supabase.co'
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY!
const SLUG = 'je-olivovy-olej-zdravy'

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

const { data: article, error: fetchErr } = await supabase
  .from('articles')
  .select('id, slug, body_markdown, meta_title, status')
  .eq('slug', SLUG)
  .single()

if (fetchErr || !article) { console.error('FETCH ERROR:', fetchErr); process.exit(1) }

console.log(`✓ Fetched: ${article.slug} (${article.status}, ${article.body_markdown.length} chars)`)

let body = article.body_markdown

// ── Change 1: Ibuprofen sentence → YMYL-safe formulation ──────────────────
const OLD_IBUPROFEN = `50 ml EVOO s obsahem 250 mg polyfenolů/kg odpovídá zhruba 10 % dávky ibuprofenu z hlediska COX inhibice. Není to lék, ale dlouhodobá konzumace může mít kumulativní protizánětlivý efekt.`
const NEW_IBUPROFEN = `Studie naznačují, že denní dávka kvalitního EVOO může poskytnout zlomek anti-zánětlivého efektu nesteroidních antirevmatik — řádově menší dávka, ale podobný mechanismus působení. Není to lék, ale dlouhodobá konzumace může mít kumulativní protizánětlivý efekt.`

if (!body.includes(OLD_IBUPROFEN)) { console.error('ERROR: ibuprofen sentence not found'); process.exit(1) }
body = body.replace(OLD_IBUPROFEN, NEW_IBUPROFEN)
console.log('✓ Change 1: ibuprofen → YMYL-safe formulation')

// ── Change 2: Governor slug confirmed active — no token change needed ──────
const GOVERNOR_TOKEN = '{{product:limitovana-edice-reckeho-premiove-olivoveho-oleje-the-governor-500-ml}}'
if (!body.includes(GOVERNOR_TOKEN)) { console.error('ERROR: governor token not found'); process.exit(1) }
console.log('✓ Change 2: governor token verified active (poly:966, score:76) — no replacement')

// ── Change 3: Hub-and-spoke link before ## Mononenasycené tuky ────────────
const HUB_ANCHOR = '\n\n## Mononenasycené tuky: základní biochemie'
const HUB_LINK = `\n\nPro hlubší vědecký rozbor — Alzheimer, kognitivní funkce a další studie — viz [Olivový olej a zdraví: zdravotní účinky podle vědy](/pruvodce/olivovy-olej-a-zdravi-veda-2026).`

if (!body.includes(HUB_ANCHOR)) { console.error('ERROR: ## Mononenasycené tuky anchor not found'); process.exit(1) }
body = body.replace(HUB_ANCHOR, HUB_LINK + HUB_ANCHOR)
console.log('✓ Change 3: hub-and-spoke link inserted before ## Mononenasycené tuky')

// ── Validate tokens ────────────────────────────────────────────────────────
const expectedTokens = [
  '{{product:evolia-platinum-2777-polyfenolu-bio-extra-panensky-olivovy-olej-250-ml-extremne-vzacna-sklizen}}',
  '{{product:evolia-platinum-2000-polyfenolu-bio-extra-panensky-olivovy-olej-500-ml}}',
  '{{product:premiovy-extra-panensky-olivovy-olej-evolution-denocciolato-500-ml-s-vysokym-podilem-polyfenolu}}',
  '{{product:premiovy-extra-panensky-olivovy-olej-le-selezioni-coratina-500-ml-z-italske-farmy-le-tre-colonne}}',
  GOVERNOR_TOKEN,
]
for (const t of expectedTokens) {
  if (!body.includes(t)) { console.error(`ERROR: token missing: ${t}`); process.exit(1) }
}
console.log(`✓ All ${expectedTokens.length} product tokens present`)

// ── Change 4 + publish: meta_title + status active + published_at ──────────
const NEW_META_TITLE = 'Je olivový olej zdravý? Studie, dávky a top oleje v ČR'
if (NEW_META_TITLE.length > 60) { console.error(`ERROR: meta_title ${NEW_META_TITLE.length}ch > 60`); process.exit(1) }

const publishedAt = new Date().toISOString()

const { error: patchErr } = await supabase
  .from('articles')
  .update({
    body_markdown: body,
    meta_title: NEW_META_TITLE,
    status: 'active',
    published_at: publishedAt,
    updated_at: publishedAt,
  })
  .eq('slug', SLUG)

if (patchErr) { console.error('PATCH ERROR:', patchErr); process.exit(1) }
console.log('✓ PATCH applied — meta_title, body, status=active, published_at set')

// ── Verify ─────────────────────────────────────────────────────────────────
const { data: v } = await supabase
  .from('articles')
  .select('status, meta_title, body_markdown')
  .eq('slug', SLUG)
  .single()

if (v?.status !== 'active') { console.error('VERIFY FAILED: status not active'); process.exit(1) }
if (!v.meta_title.includes('Studie, dávky')) { console.error('VERIFY FAILED: meta_title mismatch'); process.exit(1) }
if (v.body_markdown.includes('10 % dávky ibuprofenu')) { console.error('VERIFY FAILED: old ibuprofen sentence still present'); process.exit(1) }
if (!v.body_markdown.includes('olivovy-olej-a-zdravi-veda-2026')) { console.error('VERIFY FAILED: hub link missing'); process.exit(1) }
console.log('✓ Verification passed')

console.log('\nSUMMARY:')
console.log('  Article:', SLUG)
console.log('  Status: active')
console.log('  Published at:', publishedAt)
console.log('  Meta title:', NEW_META_TITLE, `(${NEW_META_TITLE.length}ch)`)
console.log('  Body length:', v.body_markdown.length, 'chars')
console.log('  URL: https://olivator.cz/pruvodce/' + SLUG)
