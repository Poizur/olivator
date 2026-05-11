import { supabaseAdmin } from '@/lib/supabase'

async function main() {
  // 1. Storage buckets
  const { data: buckets } = await supabaseAdmin.storage.listBuckets()
  console.log('Buckets:', (buckets ?? []).map((b: { name: string; public: boolean }) => `${b.name}(${b.public ? 'public' : 'private'})`).join(', '))

  // 2. Products with image_url pointing to Supabase Storage — these get repeatedly fetched
  const { count: supaImg } = await supabaseAdmin.from('products').select('*', { count: 'exact', head: true }).like('image_url', '%supabase.co/storage%')
  console.log(`\nProdukty s image_url v Supabase Storage: ${supaImg}`)

  // 3. product_images
  const { count: imgsTotal } = await supabaseAdmin.from('product_images').select('*', { count: 'exact', head: true })
  const { count: imgsSupabase } = await supabaseAdmin.from('product_images').select('*', { count: 'exact', head: true }).like('url', '%supabase.co/storage%')
  console.log(`product_images: ${imgsTotal} celkem, ${imgsSupabase} v Supabase Storage`)

  // 4. Velikost / počty files v 'products' bucketu
  const { data: files } = await supabaseAdmin.storage.from('products').list('', { limit: 1000 })
  console.log(`\nproducts bucket files: ${(files ?? []).length}`)
  if (files && files.length > 0) {
    const totalBytes = files.reduce((s: number, f: { metadata?: { size?: number } }) => s + (f.metadata?.size ?? 0), 0)
    console.log(`Total size: ${(totalBytes / 1024 / 1024).toFixed(1)} MB`)
    // Top 5 largest
    const sorted = files.sort((a: { metadata?: { size?: number } }, b: { metadata?: { size?: number } }) => (b.metadata?.size ?? 0) - (a.metadata?.size ?? 0))
    console.log('\nTop 5 největších:')
    sorted.slice(0, 5).forEach((f: { name: string; metadata?: { size?: number } }) => console.log(`  ${((f.metadata?.size ?? 0) / 1024).toFixed(0)} KB  ${f.name.slice(0, 60)}`))
  }
}
main().catch(console.error)
