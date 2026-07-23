import { createClient } from '@supabase/supabase-js'
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!, { auth: { persistSession: false } })
async function main() {
  const { data } = await supabase.from('articles').select('body_markdown').eq('slug', 'premium-olivovy-olej-ma-smysl').single()
  const body = data?.body_markdown ?? ''
  // Find context around "Sitia Kréta 0.3" — 400 chars before and after
  const idx = body.indexOf('Sitia Kréta 0.3')
  if (idx >= 0) {
    console.log('=== Sitia Kréta 0.3 context ===')
    console.log(body.slice(Math.max(0, idx-200), idx+400))
  }
  const idx2 = body.indexOf('Coratina Puglia')
  if (idx2 >= 0) {
    console.log('\n=== Coratina Puglia context ===')
    console.log(body.slice(Math.max(0, idx2-100), idx2+300))
  }
  // Also check for affiliate disclosure / reklama mentions
  console.log('\n=== affiliate disclosure mentions ===')
  const { data: articles } = await supabase.from('articles').select('slug, body_markdown').eq('status', 'active')
  let total = 0
  for (const a of articles ?? []) {
    if ((a.body_markdown ?? '').toLowerCase().includes('affiliate') || (a.body_markdown ?? '').toLowerCase().includes('provize') || (a.body_markdown ?? '').includes('*Poznámka:')) {
      total++
      console.log(`  ${a.slug}: has disclosure`)
    }
  }
  if (total === 0) console.log('  ŽÁDNÝ článek neobsahuje affiliate disclaimer')
}
main().catch(e => { console.error(e); process.exit(1) })
