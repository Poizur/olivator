import { supabaseAdmin } from '@/lib/supabase'

async function main() {
  const { error } = await supabaseAdmin
    .from('seo_tasks')
    .update({ status: 'done' })
    .eq('task_key', 'second_wave_entities')
  if (error) { console.error('ERROR:', error.message); process.exit(1) }
  console.log('✅ second_wave_entities → done')
}
main().catch(console.error)
