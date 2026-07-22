// Article Publisher — každé úterý 03:00 UTC
// Pipeline: findOpportunities(1) → draft-generator (Sonnet) → reviewer (Haiku) → article_drafts
//
// Flags:
//   --dry-run    Vygeneruje draft + review, ale NEULOŽÍ do DB. Zobrazí výsledek.
//
// Exit codes:
//   0 — draft uložen nebo dry-run úspěšný
//   1 — reviewer vrátil BLOCK nebo fatální chyba (draft NEULOŽEN)
//   2 — timeout (15 min)

import { findOpportunities, saveOpportunities } from '@/lib/article-publisher/opportunity-finder'
import { generateDraft } from '@/lib/article-publisher/draft-generator'
import { reviewDraft } from '@/lib/article-publisher/article-reviewer'
import { supabaseAdmin } from '@/lib/supabase'

const MAX_RUNTIME_MS = 15 * 60 * 1000

async function main() {
  const args = process.argv.slice(2)
  const dryRun = args.includes('--dry-run')

  const killTimer = setTimeout(() => {
    console.error('[article-publisher] TIMEOUT — překročeno 15 min, ukončuji')
    process.exit(2)
  }, MAX_RUNTIME_MS)
  killTimer.unref()

  console.log(`[article-publisher] start ${new Date().toISOString()} dry-run=${dryRun}`)

  try {
    // 1. Najdi TOP 1 keyword příležitost
    console.log('[article-publisher] Hledám keyword příležitosti...')
    const opportunities = await findOpportunities(1)

    if (!opportunities.length) {
      console.log('[article-publisher] Žádné příležitosti v keyword_mapping — končím')
      clearTimeout(killTimer)
      process.exit(0)
    }

    const opp = opportunities[0]
    console.log(`[article-publisher] TOP příležitost: "${opp.keyword}" (${opp.opportunityType}, score: ${opp.priorityScore})`)

    if (!dryRun) {
      await saveOpportunities(opportunities).catch(e =>
        console.warn('[article-publisher] saveOpportunities warn (non-fatal):', e.message)
      )
    }

    // 2. Vygeneruj draft (Claude Sonnet)
    console.log('[article-publisher] Generuji draft (Sonnet)...')
    const draft = await generateDraft(opp.keyword, opp.opportunityType)
    console.log(`[article-publisher] Draft: "${draft.title}" | ${draft.wordCount} slov | slug: ${draft.slug}`)

    // 3. AI review (Claude Haiku)
    console.log('[article-publisher] Spouštím AI reviewer (Haiku)...')
    const review = await reviewDraft(draft.title, draft.slug, draft.bodyMarkdown)
    console.log(`[article-publisher] Reviewer: ${review.severity.toUpperCase()} — ${review.verdict}`)

    if (review.severity === 'block') {
      console.error('[article-publisher] BLOCK — draft NEULOŽEN. Issues:', review.issues)
      clearTimeout(killTimer)
      process.exit(1)
    }

    if (dryRun) {
      console.log('\n[article-publisher] DRY-RUN — výsledek:')
      console.log('Titulek:', draft.title)
      console.log('Slug:', draft.slug)
      console.log('Meta:', draft.metaDescription)
      console.log('Slov:', draft.wordCount)
      console.log('Reviewer severity:', review.severity)
      console.log('Reviewer verdict:', review.verdict)
      if (review.issues !== 'Žádné') console.log('Reviewer issues:', review.issues)
      console.log('\n--- BODY (prvních 500 znaků) ---')
      console.log(draft.bodyMarkdown.slice(0, 500))
      clearTimeout(killTimer)
      process.exit(0)
    }

    // 4. Ulož do article_drafts
    // Dedup: přeskoč pokud draft nebo aktivní článek se stejným slugem existuje
    const [{ data: existingDraft }, { data: existingArticle }] = await Promise.all([
      supabaseAdmin.from('article_drafts').select('id, status').eq('slug', draft.slug).maybeSingle(),
      supabaseAdmin.from('articles').select('slug').eq('slug', draft.slug).maybeSingle(),
    ])
    if (existingDraft) {
      console.log(`[article-publisher] SKIP — draft se slugem "${draft.slug}" již existuje (id=${existingDraft.id}, status=${existingDraft.status})`)
      clearTimeout(killTimer)
      process.exit(0)
    }
    if (existingArticle) {
      console.log(`[article-publisher] SKIP — článek "${draft.slug}" je již publikovaný`)
      clearTimeout(killTimer)
      process.exit(0)
    }

    // Načti opportunity_id pokud existuje
    const { data: oppRow } = await supabaseAdmin
      .from('article_opportunities')
      .select('id')
      .eq('keyword', opp.keyword)
      .eq('status', 'identified')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    const { data: saved, error: saveErr } = await supabaseAdmin
      .from('article_drafts')
      .insert({
        opportunity_id: oppRow?.id ?? null,
        title: draft.title,
        slug: draft.slug,
        meta_description: draft.metaDescription,
        body_markdown: draft.bodyMarkdown,
        reviewer_notes: {
          severity: review.severity,
          verdict: review.verdict,
          issues: review.issues,
        },
        reviewer_severity: review.severity,
        word_count: draft.wordCount,
        status: 'draft',
      })
      .select('id')
      .single()

    if (saveErr) throw new Error('Uložení do article_drafts selhalo: ' + saveErr.message)

    console.log(`[article-publisher] Draft uložen: id=${saved.id} | severity=${review.severity}`)
    if (review.issues !== 'Žádné') {
      console.log('[article-publisher] Reviewer issues (warn):', review.issues)
    }

    clearTimeout(killTimer)
    process.exit(0)
  } catch (err) {
    console.error('[article-publisher] Fatální chyba:', (err as Error).message)
    clearTimeout(killTimer)
    process.exit(1)
  }
}

main()
