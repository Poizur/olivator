// Projde uložené radar_items stejným procesem jako radar-agent:
// skutečná URL zdroje → plný text → (zprávy ≤30 dní, ne zdravotní) nový překlad → brána.
// Výchozí režim jen vypíše výsledek. --apply uloží nové překlady a skutečné URL,
// zveřejní položky s decision=publish.
//   env -u ANTHROPIC_API_KEY npx tsx --env-file=.env.local scripts/radar-reprocess.ts [--apply]

import { writeFileSync } from 'node:fs'
import { supabaseAdmin } from '@/lib/supabase'
import { resolveGoogleNewsUrl } from '@/lib/google-news-url'
import { fetchArticleText } from '@/lib/article-fetcher'
import { evaluateRadarItem, fullTextMatchesTitle } from '@/lib/radar-quality'
import { translateChecked, type TranslationResult } from '@/lib/radar-agent'

const APPLY = process.argv.includes('--apply')
const CONCURRENCY = 4
const PUBLISH_WINDOW_MS = 30 * 86_400_000

type Decision = 'publish' | 'draft' | 'drop' | 'old'

interface Row {
  id: string
  source: string
  original_url: string
  original_title: string | null
  czech_title: string
  badge: string | null
  published_at: string
}

interface Outcome {
  row: Row
  sourceUrl: string | null
  decision: Decision
  reasons: string[]
  translation: TranslationResult | null
}

async function evaluate(row: Row): Promise<Outcome> {
  const base = { row, translation: null }
  const sourceUrl = await resolveGoogleNewsUrl(row.original_url)
  if (!sourceUrl) return { ...base, sourceUrl, decision: 'drop', reasons: ['nedohledaná skutečná URL článku'] }
  const fullText = await fetchArticleText(sourceUrl)
  if (!fullText || fullText.length < 200) {
    return { ...base, sourceUrl, decision: 'drop', reasons: ['nepodařilo se stáhnout text originálu'] }
  }
  if (row.original_title && !fullTextMatchesTitle(fullText, row.original_title)) {
    return { ...base, sourceUrl, decision: 'drop', reasons: ['stažený text neodpovídá článku (asi jen navigace webu)'] }
  }
  if (row.badge === 'science') {
    return { ...base, sourceUrl, decision: 'draft', reasons: ['zdravotní studie — vždy ruční schválení'] }
  }
  if (Date.now() - new Date(row.published_at).getTime() > PUBLISH_WINDOW_MS) {
    return { ...base, sourceUrl, decision: 'old', reasons: ['starší než 30 dní — housekeeping by ji skryl'] }
  }

  const translation = await translateChecked(
    { source: row.source, title: row.original_title ?? row.czech_title, url: sourceUrl, description: '', pubDate: new Date(row.published_at), freshness: 0 },
    fullText,
  )
  if (!translation || !translation.isRelevant) {
    return { ...base, sourceUrl, decision: 'drop', reasons: [translation ? 'podle překladu nesouvisí s olivovým olejem' : 'překlad selhal'] }
  }
  const badge = translation.badge || row.badge || 'news'
  if (badge === 'science') {
    return { row, translation, sourceUrl, decision: 'draft', reasons: ['zdravotní studie — vždy ruční schválení'] }
  }
  const q = await evaluateRadarItem({
    sourceUrl,
    fullText,
    originalTitle: row.original_title,
    badge,
    czechTitle: translation.czechTitle,
    czechSummary: translation.czechSummary,
    czechArticle: translation.czechArticle,
    czContext: translation.czContext,
  })
  return { row, translation, sourceUrl, decision: q.decision, reasons: q.reasons }
}

async function main() {
  const { data, error } = await supabaseAdmin
    .from('radar_items')
    .select('id, source, original_url, original_title, czech_title, badge, published_at')
    .neq('source', 'olivator')
    .order('published_at', { ascending: false })
  if (error) throw new Error(error.message)
  const rows = (data ?? []) as Row[]

  const outcomes: Outcome[] = []
  for (let i = 0; i < rows.length; i += CONCURRENCY) {
    outcomes.push(...(await Promise.all(rows.slice(i, i + CONCURRENCY).map(evaluate))))
    console.error(`  ${Math.min(i + CONCURRENCY, rows.length)}/${rows.length}`)
  }

  const summary = (d: Decision) => {
    const list = outcomes.filter((o) => o.decision === d)
    const why = new Map<string, number>()
    for (const o of list) {
      const k = o.reasons[0]?.replace(/:.*/, '') ?? '—'
      why.set(k, (why.get(k) ?? 0) + 1)
    }
    return `${list.length} ${JSON.stringify(Object.fromEntries(why))}`
  }
  console.log(`položek: ${rows.length}`)
  console.log(`publish: ${summary('publish')}`)
  console.log(`draft:   ${summary('draft')}`)
  console.log(`drop:    ${summary('drop')}`)
  console.log(`starší 30 dní (nepublikovatelné): ${summary('old')}`)
  console.log('\n--- PUBLISH:')
  for (const o of outcomes.filter((x) => x.decision === 'publish')) {
    console.log(`${o.row.published_at.slice(0, 10)} [${o.translation!.badge}] ${o.translation!.czechTitle}\n   ${o.translation!.czechSummary}\n   zdroj: ${o.sourceUrl}\n`)
  }
  console.log('--- DRAFT (nové překlady):')
  for (const o of outcomes.filter((x) => x.decision === 'draft' && x.translation)) {
    console.log(`${o.row.published_at.slice(0, 10)} ${o.translation!.czechTitle.slice(0, 70)}\n   ${o.reasons.join(' | ').slice(0, 300)}`)
  }
  writeFileSync('/tmp/radar-reprocess.json', JSON.stringify(outcomes.map((o) => ({
    id: o.row.id, published_at: o.row.published_at, decision: o.decision, reasons: o.reasons, sourceUrl: o.sourceUrl,
    title: o.translation?.czechTitle ?? o.row.czech_title, summary: o.translation?.czechSummary ?? null,
  })), null, 2))

  if (!APPLY) return
  for (const o of outcomes) {
    const patch: Record<string, unknown> = {}
    if (o.sourceUrl && o.sourceUrl !== o.row.original_url) patch.original_url = o.sourceUrl
    if (o.translation) {
      Object.assign(patch, {
        czech_title: o.translation.czechTitle,
        czech_summary: o.translation.czechSummary,
        czech_article: o.translation.czechArticle,
        cz_context: o.translation.czContext || null,
        meta_title: o.translation.metaTitle,
        meta_description: o.translation.metaDescription,
      })
    }
    if (o.decision === 'publish') patch.is_published = true
    if (Object.keys(patch).length === 0) continue
    const { error: e } = await supabaseAdmin.from('radar_items').update(patch).eq('id', o.row.id)
    if (e) console.error(`update ${o.row.id}: ${e.message}`)
  }
  console.log('APPLY hotovo')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
