import { supabaseAdmin } from '@/lib/supabase'

async function main() {
  const a = await supabaseAdmin.from('entity_images').select('*', { count: 'exact', head: true })
  const b = await supabaseAdmin.from('entity_images').select('*', { count: 'exact', head: true }).eq('status', 'active')
  const c = await supabaseAdmin.from('entity_images').select('id, status, entity_type, entity_id').limit(50)

  console.log('TOTAL count:', a.count)
  console.log('ACTIVE count:', b.count)
  console.log('ROWS in select:', c.data?.length)
  const rows = (c.data ?? []) as { status: string; entity_type: string }[]
  console.log('Statuses:', [...new Set(rows.map(r => r.status))])
  console.log('Types:', [...new Set(rows.map(r => r.entity_type))])
  // Group by entity_type + status
  const grouped: Record<string, number> = {}
  rows.forEach(r => {
    const k = `${r.entity_type}/${r.status}`
    grouped[k] = (grouped[k] ?? 0) + 1
  })
  console.log('Grouped:', grouped)
}

main().catch(console.error)
