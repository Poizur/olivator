import { supabaseAdmin } from '@/lib/supabase'
async function main() {
  await supabaseAdmin.from('seo_tasks').update({ status: 'done' }).eq('task_key', 'localbusiness_schema')
  console.log('✅ localbusiness_schema → done')
}
main().catch(console.error)
