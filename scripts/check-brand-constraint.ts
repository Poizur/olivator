import { supabaseAdmin } from '../lib/supabase'

async function main() {
  // Check the actual brands rows for dennree
  const { data: b, error: be } = await supabaseAdmin
    .from('brands')
    .select('slug, status, name')
    .eq('slug', 'dennree')
  console.log('dennree current:', JSON.stringify(b), be?.message)

  // Try updating to 'inactive' 
  const { data: d2, error: e2 } = await supabaseAdmin
    .from('brands')
    .update({ status: 'inactive', updated_at: new Date().toISOString() })
    .eq('slug', 'dennree')
    .select('slug, status')
  console.log('inactive test:', JSON.stringify(d2), 'error:', e2?.message, e2?.code)

  // Try 'hidden'
  const { data: d3, error: e3 } = await supabaseAdmin
    .from('brands')
    .update({ status: 'hidden' })
    .eq('slug', 'dennree')
    .select('slug, status')
  console.log('hidden test:', JSON.stringify(d3), 'error:', e3?.message)

  // Try 'archived'
  const { data: d4, error: e4 } = await supabaseAdmin
    .from('brands')
    .update({ status: 'archived' })
    .eq('slug', 'dennree')
    .select('slug, status')
  console.log('archived test:', JSON.stringify(d4), 'error:', e4?.message)
}
main().catch(console.error)
