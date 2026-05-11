import { supabaseAdmin } from '@/lib/supabase'

async function main() {
  const { data } = await supabaseAdmin
    .from('entity_images')
    .select('entity_id, entity_type, role, url, alt_text')
    .eq('status', 'active')
    .order('entity_type')
  console.log('Entity images:', data?.length ?? 0)
  ;(data ?? []).forEach((x: { entity_id: string; entity_type: string; role: string; url: string }) =>
    console.log(' ', x.entity_type, x.entity_id.slice(0, 8), x.role, x.url.slice(0, 60))
  )
}

main().catch(console.error)
