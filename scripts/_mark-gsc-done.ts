import { supabaseAdmin } from '@/lib/supabase'
async function main() {
  await supabaseAdmin.from('seo_tasks').update({ status: 'done' }).eq('task_key', 'gsc_dashboard')
  console.log('✅ gsc_dashboard → done')
}
main().catch(console.error)
