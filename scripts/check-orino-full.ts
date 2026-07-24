import { createClient } from '@supabase/supabase-js'
const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!, { auth: { persistSession: false } })
async function main() {
  const { data } = await s.from('products')
    .select('slug, name, certifications, score_breakdown, description_short, description_long, olivator_score')
    .ilike('name', '%orino%')
    .eq('status','active')
    .limit(5)
  for (const p of data ?? []) {
    console.log(`\n═══ ${p.name} ═══`)
    console.log('score:', p.olivator_score)
    console.log('certs:', p.certifications)
    console.log('score_breakdown:', JSON.stringify(p.score_breakdown, null, 2))
    const bioInShort = p.description_short?.toLowerCase().includes('bio') ?? false
    const bioInLong = p.description_long?.toLowerCase().includes('bio') ?? false
    console.log('BIO v description_short:', bioInShort)
    console.log('BIO v description_long:', bioInLong)
    if (bioInLong) {
      const idx = p.description_long!.toLowerCase().indexOf('bio')
      console.log('Kontext z long desc:', p.description_long!.slice(Math.max(0, idx-80), idx+120))
    }
  }
}
main().catch(console.error)
