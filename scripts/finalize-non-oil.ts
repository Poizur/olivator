import { supabaseAdmin } from '@/lib/supabase'

async function main() {
  const { error } = await supabaseAdmin
    .from('products')
    .update({
      status: 'inactive',
      admin_note: 'Non-olive product: detected by keyword audit 2026-05-12.',
      updated_at: new Date().toISOString(),
    })
    .in('id', [
      '57aef4e1-2977-46ae-adb5-714ee5072655', // Health Link Kokosový olej
      '12870352-0450-41aa-b2d8-57e539e56fe7', // Kondicionér ABEA
    ])
  console.log(error ? 'ERR: ' + (error.message ?? JSON.stringify(error)) : '✓ deaktivováno 2')

  const { error: e2 } = await supabaseAdmin
    .from('products')
    .update({ admin_note: 'Non-olive product: milk thistle oil. Detected 2026-05-12.' })
    .in('id', [
      '9070dd4c-3d28-46e3-aaa6-5c3fbc4bf0da',
      '1e562933-fe02-406b-83e2-438cac2c9461',
      'd721c384-50ce-4708-af1d-22ebeed3c15c',
      '9e800c5e-d679-4768-b799-7a606a0e8e7c',
    ])
  console.log(e2 ? 'Irel note ERR: ' + (e2.message ?? JSON.stringify(e2)) : '✓ Irel admin_note doplněn')
}

main().catch(err => { console.error(err); process.exit(1) })
