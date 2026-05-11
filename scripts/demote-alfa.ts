import { supabaseAdmin } from '@/lib/supabase'
async function main() {
  // Just demote alfa to draft
  const { error } = await supabaseAdmin.from('brands').update({ status: 'draft' }).eq('slug', 'alfa')
  console.log(error ? error.message : '✓ alfa → draft')
}
main().catch(console.error)
