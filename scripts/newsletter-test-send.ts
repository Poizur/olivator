import { generateWeeklyDraft } from '@/lib/newsletter-composer'
import { sendTestEmail } from '@/lib/newsletter-sender'

const TARGET_EMAIL = 'italienasbavi@gmail.com'

async function main() {
  console.log('=== Newsletter test send ===')
  console.log(`Cíl: ${TARGET_EMAIL}\n`)

  console.log('1) Generuji weekly draft...')
  const { id, subject } = await generateWeeklyDraft()
  console.log(`   Draft ID: ${id}`)
  console.log(`   Subject: ${subject}\n`)

  console.log('2) Posílám test email...')
  const result = await sendTestEmail({
    to: TARGET_EMAIL,
    subject,
    html: await getDraftHtml(id),
  })

  if (!result.ok) {
    console.error('   ✗ Send failed:', result.error)
    process.exit(1)
  }
  console.log(`   ✓ Odesláno (messageId: ${result.messageId ?? 'n/a'})`)
  console.log(`\nDraft ID pro admin UI: ${id}`)
}

async function getDraftHtml(id: string): Promise<string> {
  const { supabaseAdmin } = await import('@/lib/supabase')
  const { data } = await supabaseAdmin
    .from('newsletter_drafts')
    .select('html_body')
    .eq('id', id)
    .maybeSingle()
  if (!data?.html_body) throw new Error('Draft HTML not found')
  return data.html_body as string
}

main().catch(err => { console.error('FATAL:', err); process.exit(1) })
