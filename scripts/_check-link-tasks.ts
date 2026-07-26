import { supabaseAdmin } from '@/lib/supabase'

async function main() {
  const { data } = await supabaseAdmin
    .from('seo_tasks')
    .select('task_key, title, description, notes, phase')
    .in('task_key', ['resource_page_outreach', 'guest_posts', 'haro_outreach', 'wikipedia_edits'])

  for (const t of (data ?? [])) {
    console.log(`\n[F${t.phase}] ${t.task_key}`)
    console.log(`  Title: ${t.title}`)
    console.log(`  Desc: ${t.description}`)
    if (t.notes) console.log(`  Notes: ${t.notes}`)
  }
}
main().catch(console.error)
