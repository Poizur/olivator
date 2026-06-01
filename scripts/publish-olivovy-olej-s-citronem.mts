import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://dyaloliwynmfnpjemzrh.supabase.co'
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY!
const SLUG_CITRON = 'olivovy-olej-s-citronem-po-rano'
const SLUG_ZDRAVY = 'je-olivovy-olej-zdravy'

const sb = createClient(SUPABASE_URL, SUPABASE_KEY)

// ── Fetch both articles ────────────────────────────────────────────────────
const [r1, r2] = await Promise.all([
  sb.from('articles').select('id, slug, body_markdown, status').eq('slug', SLUG_CITRON).single(),
  sb.from('articles').select('id, slug, body_markdown, status').eq('slug', SLUG_ZDRAVY).single(),
])

if (r1.error || !r1.data) { console.error('FETCH ERROR citron:', r1.error); process.exit(1) }
if (r2.error || !r2.data) { console.error('FETCH ERROR zdravy:', r2.error); process.exit(1) }

console.log(`✓ Fetched: ${r1.data.slug} (${r1.data.status}, ${r1.data.body_markdown.length} chars)`)
console.log(`✓ Fetched: ${r2.data.slug} (${r2.data.status}, ${r2.data.body_markdown.length} chars)`)

// ── Hub-and-spoke audit ────────────────────────────────────────────────────
console.log('\n── Hub-and-spoke audit ──')

// Direction 1: citron → zdravy (should exist from brief)
const citron2zdravy = r1.data.body_markdown.includes(SLUG_ZDRAVY)
console.log(`citron → zdravy: ${citron2zdravy ? '✓ PRESENT' : '✗ MISSING'}`)
if (citron2zdravy) {
  r1.data.body_markdown.split('\n')
    .filter(l => l.includes(SLUG_ZDRAVY))
    .forEach(l => console.log('  ', l.trim()))
}

// Direction 2: zdravy → citron (likely missing — needs adding)
const zdravy2citron = r2.data.body_markdown.includes(SLUG_CITRON)
console.log(`zdravy → citron: ${zdravy2citron ? '✓ PRESENT' : '✗ MISSING — will add'}`)

// ── Fix direction 2 if missing ─────────────────────────────────────────────
let zdravyBody = r2.data.body_markdown
let zdravyPatched = false

if (!zdravy2citron) {
  // Insert hub-spoke link in FAQ section — before the FAQ heading or before the last H2
  // Strategy: append note to the "Kolik olivového oleje denně?" or at end of existing body
  // Better: insert before ## FAQ or before the last ## block
  // Find the FAQ section
  const faqAnchor = '\n\n## FAQ'
  const backupAnchor = '\n\n## Závěr'
  const anchor = zdravyBody.includes(faqAnchor) ? faqAnchor : backupAnchor

  const citronLink = `\n\nPro ty, kdo chtějí olivový olej zařadit do ranního rituálu s citronem — viz [Olivový olej s citronem po ránu: věda vs. TikTok hype](/pruvodce/olivovy-olej-s-citronem-po-rano).`

  if (!zdravyBody.includes(anchor)) {
    // No FAQ/Závěr anchor — append to end
    zdravyBody = zdravyBody.trimEnd() + citronLink + '\n'
    console.log('  → Appended to end of je-olivovy-olej-zdravy (no FAQ/Závěr anchor found)')
  } else {
    zdravyBody = zdravyBody.replace(anchor, citronLink + anchor)
    console.log(`  → Inserted before "${anchor.trim()}" in je-olivovy-olej-zdravy`)
  }
  zdravyPatched = true
}

// ── Publish CITRON: status=active, published_at=now() ─────────────────────
const publishedAt = new Date().toISOString()

const { error: publishErr } = await sb
  .from('articles')
  .update({
    status: 'active',
    published_at: publishedAt,
    updated_at: publishedAt,
  })
  .eq('slug', SLUG_CITRON)

if (publishErr) { console.error('PUBLISH ERROR:', publishErr); process.exit(1) }
console.log(`\n✓ Published: ${SLUG_CITRON}`)
console.log(`  published_at: ${publishedAt}`)

// ── Patch ZDRAVY body if needed ────────────────────────────────────────────
if (zdravyPatched) {
  const { error: zdravyErr } = await sb
    .from('articles')
    .update({ body_markdown: zdravyBody, updated_at: publishedAt })
    .eq('slug', SLUG_ZDRAVY)

  if (zdravyErr) { console.error('PATCH zdravy ERROR:', zdravyErr); process.exit(1) }
  console.log(`✓ Patched: ${SLUG_ZDRAVY} — back-link přidán`)
}

// ── Verify ─────────────────────────────────────────────────────────────────
const [v1, v2] = await Promise.all([
  sb.from('articles').select('status, published_at, body_markdown').eq('slug', SLUG_CITRON).single(),
  sb.from('articles').select('body_markdown').eq('slug', SLUG_ZDRAVY).single(),
])

if (v1.data?.status !== 'active') { console.error('VERIFY FAILED: citron not active'); process.exit(1) }
if (!v1.data.body_markdown.includes(SLUG_ZDRAVY)) { console.error('VERIFY FAILED: citron→zdravy link missing'); process.exit(1) }
if (!v2.data?.body_markdown.includes(SLUG_CITRON)) { console.error('VERIFY FAILED: zdravy→citron link missing'); process.exit(1) }

console.log('\n✓ Verification passed — hub-and-spoke bidirectional ✓')

console.log('\n══ SUMMARY ══')
console.log(`  URL:          https://olivator.cz/pruvodce/${SLUG_CITRON}`)
console.log(`  Published at: ${publishedAt}`)
console.log(`  citron → zdravy: ✓`)
console.log(`  zdravy → citron: ${zdravyPatched ? '✓ (přidáno)' : '✓ (bylo)'}`)
