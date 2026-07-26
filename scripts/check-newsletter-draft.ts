import { supabaseAdmin } from '@/lib/supabase'

async function main() {
  const { data } = await supabaseAdmin
    .from('newsletter_drafts')
    .select('id, subject, blocks, reviewer_notes, reviewer_severity')
    .eq('id', 'f0cd4990-4668-43d9-b2ed-2c334b95e6fb')
    .single()
  
  const blocks = data?.blocks as any
  const ow = blocks?.oilOfWeek
  console.log('subject:', data?.subject)
  console.log('reviewer_severity:', data?.reviewer_severity)
  console.log('oilOfWeek:', ow?.name, '|', ow?.slug?.slice(0, 50))
  
  console.log('\nDeals:')
  ;(blocks?.deals ?? []).forEach((d: any, i: number) => {
    console.log(`  [${i}] ${d.name}`)
  })
  
  console.log('\nreviewer_notes:', JSON.stringify(data?.reviewer_notes, null, 2))
}
main().catch(e => { console.error(e); process.exit(1) })
