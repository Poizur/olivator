import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!,
  { auth: { persistSession: false } }
)

const since7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

const TOPIC_KEYWORDS: Array<[string, string]> = [
  ['polyfenol', 'polyfenoly'],
  ['lehk', 'lehké oleje'],
  ['řeck', 'řecké oleje'],
  ['italsk', 'italské oleje'],
  ['bio', 'BIO'],
  ['dárek', 'dárky'],
  ['smažen', 'smažení'],
  ['salát', 'saláty'],
  ['levn', 'levné'],
  ['dop', 'DOP'],
  ['chuť', 'chuťový profil'],
  ['zdraví', 'zdraví'],
]

async function main() {
  const [convRes, clickRes, noRecRes] = await Promise.all([
    supabase
      .from('olik_conversations')
      .select('query, recommended_slugs, created_at')
      .gte('created_at', since7d)
      .order('created_at', { ascending: false }),
    supabase
      .from('affiliate_clicks')
      .select('*', { count: 'exact', head: true })
      .eq('source_type', 'olik')
      .gte('clicked_at', since7d),
    // no_recommendation sloupec — může ještě neexistovat (migrace zatím nepřiložena)
    supabase
      .from('olik_conversations')
      .select('*', { count: 'exact', head: true })
      .eq('no_recommendation', true)
      .gte('created_at', since7d),
  ])

  if (convRes.error) {
    console.error('DB error:', convRes.error.message)
    process.exit(1)
  }

  const convs = convRes.data ?? []
  const totalConversations = convs.length
  const affiliateClicks = clickRes.count ?? 0
  const noRecommendationCount = noRecRes.error ? null : (noRecRes.count ?? 0)

  const topicCounts = new Map<string, number>()
  for (const c of convs) {
    const q = ((c.query as string) ?? '').toLowerCase()
    for (const [kw, label] of TOPIC_KEYWORDS) {
      if (q.includes(kw)) {
        topicCounts.set(label, (topicCounts.get(label) ?? 0) + 1)
      }
    }
  }
  const topTopics = [...topicCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([label, count]) => `${label} (${count}×)`)

  const conversionRate =
    totalConversations > 0
      ? `${((affiliateClicks / totalConversations) * 100).toFixed(1)}%`
      : '0%'

  console.log('\n════════════════════════════════════════')
  console.log('Olík pasáž v neděl. briefu (dry-run)')
  console.log('════════════════════════════════════════\n')

  if (!totalConversations) {
    console.log('🫒 Olík — AI Sommelier (posledních 7 dní):')
    console.log('  Olíka tento týden nikdo nepoužil.')
  } else {
    const topicsStr = topTopics.length ? topTopics.join(', ') : '(různá témata)'
    console.log('🫒 Olík — AI Sommelier (posledních 7 dní):')
    console.log(`  Dotazů: ${totalConversations} | Kliků z Olíka: ${affiliateClicks} | Konverze: ${conversionRate}`)
    console.log(`  Top témata: ${topicsStr}`)
    if (noRecommendationCount != null && noRecommendationCount > 0) {
      console.log(`  ⚠ Bez doporučení (mezera v katalogu): ${noRecommendationCount} dotazů`)
    } else if (noRecommendationCount === null) {
      console.log('  ⚠ no_recommendation sloupec zatím neexistuje — aplikuj migraci 20260724_olik_no_recommendation.sql')
    }
  }

  console.log('\n────────────────────────────────────────')
  console.log('Raw data:')
  console.log(`  totalConversations: ${totalConversations}`)
  console.log(`  affiliateClicks: ${affiliateClicks}`)
  console.log(`  noRecommendationCount: ${noRecommendationCount ?? '(migrace čeká)'}`)
  console.log(`  topTopics: ${JSON.stringify(topTopics)}`)
  console.log(`  conversionRate: ${conversionRate}`)

  if (convs.length > 0) {
    console.log('\n────────────────────────────────────────')
    console.log('Posledních 5 dotazů:')
    convs.slice(0, 5).forEach((c, i) => {
      const slugs = ((c.recommended_slugs as string[]) ?? []).slice(0, 2).join(', ')
      console.log(`  ${i + 1}. "${c.query}"`)
      console.log(`     → ${slugs || '(žádné doporučení)'}`)
    })
  }
}

main().catch((e) => { console.error(e); process.exit(1) })
