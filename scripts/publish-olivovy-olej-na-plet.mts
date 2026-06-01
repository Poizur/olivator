import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://dyaloliwynmfnpjemzrh.supabase.co'
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY!
const SLUG = 'olivovy-olej-na-plet-a-vlasy'

const sb = createClient(SUPABASE_URL, SUPABASE_KEY)

const publishedAt = new Date().toISOString()

const { error } = await sb
  .from('articles')
  .update({ status: 'active', published_at: publishedAt, updated_at: publishedAt })
  .eq('slug', SLUG)

if (error) { console.error('PUBLISH ERROR:', error); process.exit(1) }

const { data: v } = await sb
  .from('articles')
  .select('status, published_at, meta_title')
  .eq('slug', SLUG)
  .single()

if (v?.status !== 'active') { console.error('VERIFY FAILED: not active'); process.exit(1) }

console.log('✓ Published:', SLUG)
console.log('  URL:          https://olivator.cz/pruvodce/' + SLUG)
console.log('  Published at:', publishedAt)
console.log('  Meta title:  ', v.meta_title)
