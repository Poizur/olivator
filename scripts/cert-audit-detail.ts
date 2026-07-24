/** Detailní pohled na produkty s neověřenými scoring certifikacemi */
import { createClient } from '@supabase/supabase-js'
const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!, { auth: { persistSession: false } })

const slugs = [
  'adelfos-zakros-sitia-p-d-o-3-l',
  'bartolini-olivovy-olej-extra-virgin-s-cernym-lanyzem-100ml',
  'bartolini-olivovy-olej-extra-virgin-toscano-i-g-p-0-5l',
  'bartolini-olivovy-olej-extra-virgin-umbria-d-o-p-0-5l',
  'nikolos-kalamata-extra-panensky-olivovy-olej-0-3-1-l-sklo',
  'nikolos-kalamata-extra-panensky-olivovy-olej-0-3-5-l-plech',
  'plakias-extra-panensky-olivovy-olej-5-l',
  'plakias-premium-bio-extra-panensky-olivovy-olej-500-ml',
  'sitia-kreta-premium-gold-0-2-extra-panensky-olivovy-olej-500-ml',
  'sitia-premium-gold-sitia-kreta-premium-gold-0-2-extra-panensky-olivovy-olej-1-l-plech',
]

async function main() {
  const { data } = await s
    .from('products')
    .select('slug, name, certifications, description_short, description_long')
    .in('slug', slugs)

  for (const p of data ?? []) {
    console.log(`\n── ${p.name} ──`)
    console.log('  slug:', p.slug)
    console.log('  certs:', p.certifications)
    const shortPreview = p.description_short?.slice(0, 200) ?? '(prázdné)'
    const longPreview = p.description_long?.slice(0, 300) ?? '(prázdné)'
    console.log('  short:', shortPreview)
    console.log('  long:', longPreview)
  }
}
main().catch(console.error)
