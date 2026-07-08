// Simulace AI revieweru na posledním newsletter draftu.
// Použití: node --env-file=.env.local --import tsx scripts/simulate-newsletter-reviewer.ts
// Nemaže ani nepatchuje nic v DB.
import { supabaseAdmin } from '@/lib/supabase'
import { runNewsletterReview } from '@/lib/newsletter-reviewer'

async function main() {
  const { data: drafts } = await supabaseAdmin
    .from('newsletter_drafts')
    .select('id, subject, generated_at, blocks')
    .in('status', ['sent', 'approved', 'draft'])
    .order('generated_at', { ascending: false })
    .limit(5)

  if (!drafts || drafts.length === 0) {
    console.log('Žádné drafty v DB')
    process.exit(1)
  }

  const current = drafts[0]
  console.log('\n=== SIMULACE REVIEWERU ===')
  console.log(`Current draft: [${current.generated_at.slice(0, 10)}] "${current.subject}"`)
  console.log(`Kontext: ${drafts.length - 1} předchozích vydání`)
  for (const d of drafts.slice(1)) {
    const blocks = (d.blocks ?? {}) as Record<string, unknown>
    const oil = (blocks.oilOfWeek as { name?: string } | null)?.name ?? '—'
    console.log(`  [${d.generated_at.slice(0, 10)}] "${d.subject}" — olej týdne: ${oil}`)
  }
  console.log()

  const review = await runNewsletterReview(current.id)

  console.log('=== VÝSLEDEK REVIEWERU ===')
  console.log(`Verdict:  ${review.verdict.toUpperCase()}`)
  console.log(`Summary:  ${review.summary}`)
  if (review.issues.length > 0) {
    console.log(`Issues (${review.issues.length}):`)
    for (const i of review.issues) {
      console.log(`  [${i.severity.toUpperCase()}] ${i.rule}: ${i.detail}`)
    }
  } else {
    console.log('Issues: (žádné)')
  }
}

main().catch(err => { console.error(err); process.exit(1) })
