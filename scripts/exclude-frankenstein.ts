import { supabaseAdmin } from '@/lib/supabase'
async function main() {
  await supabaseAdmin.from('products').update({
    status: 'excluded',
    status_reason_code: 'data_corruption',
    status_reason_note: 'Frankenstein produkt — slug, name, image z různých scrape runs nelze rekonstruovat',
    status_changed_by: 'auto',
    status_changed_at: new Date().toISOString(),
    brand_slug: null,
    updated_at: new Date().toISOString(),
  }).eq('id', 'f687d2b3-a022-4f40-a3eb-af4b576e57cf')
  console.log('✓ Product excluded (FK chains zachovány)')
}
main().catch(console.error)
