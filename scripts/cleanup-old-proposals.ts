import { supabaseAdmin } from '@/lib/supabase'
async function main() {
  const { error, count } = await supabaseAdmin.from('seo_proposals').delete({ count: 'exact' }).eq('rule_id', 'offer_no_affiliate').eq('status', 'pending')
  console.log('Deleted obsolete offer_no_affiliate proposals:', count, error?.message ?? '')
}
main().catch(console.error)
