import { supabaseAdmin } from '@/lib/supabase'

async function main() {
  // Smaž všech brand Unsplash photos — riziko že ukážeme lahev jiné značky.
  // Brand hero foto musí dodat admin ručně (logo nebo skutečná lahev).
  const { error, count } = await supabaseAdmin
    .from('entity_images')
    .delete({ count: 'exact' })
    .eq('entity_type', 'brand')
    .like('url', '%images.unsplash.com%')

  if (error) console.error('ERR:', error.message)
  else console.log(`✓ Smazáno ${count} brand Unsplash fotek`)

  // Region + cultivar Unsplash fotky NESMAZAT — landscape/olive shots jsou OK
  const { count: regionCnt } = await supabaseAdmin
    .from('entity_images')
    .select('*', { count: 'exact', head: true })
    .eq('entity_type', 'region')
    .like('url', '%images.unsplash.com%')
  const { count: cultCnt } = await supabaseAdmin
    .from('entity_images')
    .select('*', { count: 'exact', head: true })
    .eq('entity_type', 'cultivar')
    .like('url', '%images.unsplash.com%')
  console.log(`Region Unsplash photos: ${regionCnt} (zachováno — landscape je OK)`)
  console.log(`Cultivar Unsplash photos: ${cultCnt} (zachováno — olive shots OK)`)
}
main().catch(console.error)
