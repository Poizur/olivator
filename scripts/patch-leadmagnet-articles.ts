import { supabaseAdmin } from '@/lib/supabase'

async function main() {
  const slugs = ['kde-koupit-olivovy-olej-cr', 'nejlepsi-olivovy-olej-2026', 'olivovy-olej-na-plet-a-vlasy']
  const { data } = await supabaseAdmin.from('articles').select('slug, body_markdown').in('slug', slugs)
  if (!data) { console.log('no data'); process.exit(1) }

  for (const a of data as { slug: string; body_markdown: string }[]) {
    const body = a.body_markdown || ''
    if (body.includes('{{leadmagnet}}')) {
      console.log(a.slug + ': already has {{leadmagnet}}, skipping')
      continue
    }

    const lines = body.split('\n')
    const pIdx = lines.findIndex((l: string) => l.trim().startsWith('{{product:'))

    let insertAt: number
    if (pIdx > 0) {
      // Insert before first product token (with a blank line)
      insertAt = pIdx
      console.log(a.slug + ': inserting before product token at line ' + pIdx)
    } else {
      // No product tokens — insert before last H2 (if exists), else append
      let lastH2 = -1
      for (let i = lines.length - 1; i >= 0; i--) {
        if (lines[i].startsWith('## ')) { lastH2 = i; break }
      }
      insertAt = lastH2 > 0 ? lastH2 : lines.length
      console.log(a.slug + ': no product tokens, inserting at line ' + insertAt)
    }

    const newLines = [
      ...lines.slice(0, insertAt),
      '',
      '{{leadmagnet}}',
      '',
      ...lines.slice(insertAt),
    ]
    const newBody = newLines.join('\n')

    const { error } = await supabaseAdmin
      .from('articles')
      .update({ body_markdown: newBody, updated_at: new Date().toISOString() })
      .eq('slug', a.slug)

    if (error) {
      console.error(a.slug + ': DB error:', error.message)
    } else {
      console.log(a.slug + ': PATCHED OK')
    }
  }
}

main().catch(e => { console.error(e); process.exit(1) })
