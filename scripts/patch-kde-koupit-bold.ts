import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!,
  { auth: { persistSession: false } }
)

async function main() {
  const { data, error } = await supabase
    .from('articles')
    .select('slug, body_markdown')
    .eq('slug', 'kde-koupit-olivovy-olej-cr')
    .single()

  if (error || !data) { console.error(error ?? 'not found'); process.exit(1) }

  const original = data.body_markdown as string
  const matches = [...original.matchAll(/\*\*(\[[^\]]+\]\([^)]+\))\*\*/g)]
  console.log('Found bad **[link](url)** patterns:', matches.length)
  matches.forEach(m => console.log(' -', m[0].slice(0, 80)))

  if (matches.length === 0) { console.log('Nothing to patch'); return }

  const fixed = original.replace(/\*\*(\[[^\]]+\]\([^)]+\))\*\*/g, '$1')
  const { error: err } = await supabase
    .from('articles')
    .update({ body_markdown: fixed })
    .eq('slug', 'kde-koupit-olivovy-olej-cr')

  if (err) { console.error(err); process.exit(1) }
  console.log('PATCH OK —', matches.length, 'patterns fixed')
}

main()
