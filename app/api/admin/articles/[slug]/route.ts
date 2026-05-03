// PATCH /api/admin/articles/[slug] — update; DELETE — hard delete
import { NextRequest, NextResponse } from 'next/server'
import { isAdminAuthenticated } from '@/lib/admin-auth'
import { supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

const SNAKE: Record<string, string> = {
  readTime: 'read_time',
  heroImageUrl: 'hero_image_url',
  bodyMarkdown: 'body_markdown',
  metaTitle: 'meta_title',
  metaDescription: 'meta_description',
}
const ALLOWED = [
  'title', 'excerpt', 'emoji', 'read_time', 'hero_image_url',
  'category', 'body_markdown', 'meta_title', 'meta_description', 'status',
]

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const { slug } = await params
    const body = await request.json()
    const payload: Record<string, unknown> = { updated_at: new Date().toISOString() }
    for (const [k, v] of Object.entries(body)) {
      const key = SNAKE[k] ?? k
      if (ALLOWED.includes(key)) payload[key] = v
    }
    if (payload.status === 'active') {
      const { data: existing } = await supabaseAdmin
        .from('articles').select('published_at').eq('slug', slug).maybeSingle()
      if (existing && !existing.published_at) {
        payload.published_at = new Date().toISOString()
      }
    }
    if (Object.keys(payload).length === 1) {
      return NextResponse.json({ error: 'Nic k aktualizaci' }, { status: 400 })
    }
    const { error } = await supabaseAdmin.from('articles').update(payload).eq('slug', slug)
    if (error) throw error
    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const { slug } = await params
    const { error } = await supabaseAdmin.from('articles').delete().eq('slug', slug)
    if (error) throw error
    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Server error' },
      { status: 500 }
    )
  }
}
