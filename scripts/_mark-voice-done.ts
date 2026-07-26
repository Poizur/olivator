import { supabaseAdmin } from '@/lib/supabase'
async function main() {
  await supabaseAdmin.from('seo_tasks').update({ 
    status: 'done',
    notes: 'FAQ sekce přidány do 17 článků (Haiku generátor). Formát: ## FAQ, ### Otázka?, odpověď. Vhodné pro voice search + FAQPage schema.org.'
  }).eq('task_key', 'voice_search_optimization')
  console.log('✅ voice_search_optimization → done')
}
main().catch(console.error)
