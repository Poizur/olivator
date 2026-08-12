import { supabaseAdmin } from '@/lib/supabase'

async function main() {
  // Query pg_proc to see available RPC functions
  const { data, error } = await supabaseAdmin
    .from('pg_catalog.pg_proc')
    .select('proname')
    .eq('pronamespace', 2200) // public schema oid
    .limit(50)
  if (error) {
    // Try via information_schema
    const { data: d2, error: e2 } = await supabaseAdmin
      .rpc('version')
    console.log('version:', d2, e2?.message)
  } else {
    console.log(data)
  }
}
main().catch(console.error)
