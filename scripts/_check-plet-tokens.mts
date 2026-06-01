import { createClient } from '@supabase/supabase-js'
const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://dyaloliwynmfnpjemzrh.supabase.co',
  process.env.SUPABASE_SERVICE_KEY!
)
const { data } = await sb.from('articles').select('body_markdown')
  .eq('slug', 'olivovy-olej-na-plet-a-vlasy').single()
if (!data) { console.error('no data'); process.exit(1) }

// Print the token section with surrounding context
const idx = data.body_markdown.indexOf('### Oleje vhodné pro kosmetické')
if (idx === -1) { console.error('section not found'); process.exit(1) }
// Print 30 chars before and 600 chars after
const excerpt = data.body_markdown.slice(Math.max(0, idx - 10), idx + 600)
// Show raw bytes for whitespace inspection
console.log('=== RAW SECTION (token area) ===')
console.log(JSON.stringify(excerpt))
console.log('\n=== READABLE ===')
console.log(excerpt)
