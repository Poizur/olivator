import { supabaseAdmin } from '@/lib/supabase'

async function main() {
  // Try newsletters table
  const tables = ['newsletter_drafts', 'newsletters', 'newsletter_issues', 'newsletter_queue']
  for (const t of tables) {
    const { data, error } = await supabaseAdmin.from(t).select('*').order('created_at', { ascending: false }).limit(1).maybeSingle()
    if (!error) {
      console.log(t + ':', JSON.stringify(data, null, 2))
      return
    }
    console.log(t + ':', error.message.slice(0, 60))
  }
}
main().catch(e => { console.error(e); process.exit(1) })
