// POST /api/admin/articles — vytvoří nový draft článek
import { NextRequest, NextResponse } from 'next/server'
import { isAdminAuthenticated } from '@/lib/admin-auth'
import { supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 200)
}

export async function POST(request: NextRequest) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const body = await request.json()
    const title = String(body.title ?? '').trim()
    if (!title) return NextResponse.json({ error: 'Title je povinný' }, { status: 400 })

    let slug = String(body.slug ?? slugify(title))
    if (!slug) slug = slugify(title)

    const { data: existing } = await supabaseAdmin
      .from('articles')
      .select('slug')
      .eq('slug', slug)
      .maybeSingle()
    if (existing) slug = `${slug}-${Date.now().toString().slice(-5)}`

    const { data, error } = await supabaseAdmin
      .from('articles')
      .insert({
        slug,
        title,
        excerpt: body.excerpt ?? null,
        emoji: body.emoji ?? '📖',
        read_time: body.readTime ?? '5 min čtení',
        category: body.category ?? 'pruvodce',
        body_markdown: body.bodyMarkdown ?? null,
        status: 'draft',
        source: 'manual',
      })
      .select('slug')
      .single()
    if (error) throw error
    return NextResponse.json({ ok: true, slug: data.slug })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Server error' },
      { status: 500 }
    )
  }
}
