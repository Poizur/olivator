import { supabaseAdmin } from '@/lib/supabase'
async function main() {
  // Smaž korupní product f687d2b3
  const { error } = await supabaseAdmin.from('products').delete().eq('id', 'f687d2b3-a022-4f40-a3eb-af4b576e57cf')
  if (error) console.log('ERR:', error.message)
  else console.log('✓ Frankenstein product smazán')

  // Casa dos Montes brand má teď 0 produktů — smaž jako prázdný stub
  const { count } = await supabaseAdmin.from('products').select('*', { count: 'exact', head: true }).eq('brand_slug', 'casa-dos-montes')
  if ((count ?? 0) === 0) {
    await supabaseAdmin.from('brands').delete().eq('slug', 'casa-dos-montes')
    console.log('✓ Casa dos Montes brand stub smazán (0 produktů)')
  }
}
main().catch(console.error)
