import { supabaseAdmin } from '@/lib/supabase'
import { searchUnsplash } from '@/lib/unsplash'
async function main() {
  for (const q of ['italian dip vegetables', 'fondue dipping italian', 'italian appetizer dip', 'mediterranean dip vegetables']) {
    const photos = await searchUnsplash(q, 1)
    if (photos[0]?.url) {
      await supabaseAdmin.from('recipes').update({ hero_image_url: photos[0].url }).eq('slug', 'bagna-cauda-piemonteska')
      console.log('✓ via:', q, '→', photos[0].url.slice(0, 60))
      return
    }
  }
  console.log('✗ all queries empty')
}
main().catch(console.error)
