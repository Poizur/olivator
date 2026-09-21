// POST /api/admin/article-drafts/[id]/action
// Actions: publish | return | reject
// publish: creates article from draft body_markdown (YMYL WARN blocks it)
// return: sets status=pending with admin_note
// reject: sets status=rejected

import { NextRequest, NextResponse } from 'next/server'
import { isAdminAuthenticated } from '@/lib/admin-auth'
import { supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const body = await request.json()
  const action = body.action as string
  const adminNote = (body.admin_note as string | undefined) ?? null

  if (!['publish', 'return', 'reject'].includes(action)) {
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  }

  // Fetch the draft
  const { data: draft, error: fetchErr } = await supabaseAdmin
    .from('article_drafts')
    .select('id, slug, title, body_markdown, reviewer_severity, status')
    .eq('id', id)
    .maybeSingle()

  if (fetchErr || !draft) {
    return NextResponse.json({ error: 'Draft not found' }, { status: 404 })
  }

  // YMYL safety: block=publish, warn requires explicit override flag
  if (action === 'publish') {
    if (draft.reviewer_severity === 'block') {
      return NextResponse.json(
        { error: 'YMYL BLOCK: Reviewer zablokoval publikaci. Oprav problémy a spusť reviewer znovu.' },
        { status: 422 }
      )
    }
    if (draft.reviewer_severity === 'warn' && !body.override_ymyl_warn) {
      return NextResponse.json(
        { error: 'YMYL WARN: Reviewer doporučil opravy. Přidej override_ymyl_warn: true pro vynucení.' },
        { status: 422 }
      )
    }

    // Check slug collision
    const { data: existing } = await supabaseAdmin
      .from('articles')
      .select('slug')
      .eq('slug', draft.slug)
      .maybeSingle()

    if (existing) {
      // Update existing article body + set active
      const { error: updateErr } = await supabaseAdmin
        .from('articles')
        .update({
          body_markdown: draft.body_markdown,
          status: 'active',
          updated_at: new Date().toISOString(),
        })
        .eq('slug', draft.slug)
      if (updateErr) throw updateErr
    } else {
      // Insert new article from draft
      const { error: insertErr } = await supabaseAdmin
        .from('articles')
        .insert({
          slug: draft.slug,
          title: draft.title,
          body_markdown: draft.body_markdown,
          status: 'active',
          category: 'pruvodce',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
      if (insertErr) throw insertErr
    }

    // Mark draft as published
    await supabaseAdmin
      .from('article_drafts')
      .update({ status: 'published', admin_note: adminNote, updated_at: new Date().toISOString() })
      .eq('id', id)

    return NextResponse.json({ ok: true, action: 'published', slug: draft.slug })
  }

  if (action === 'return') {
    await supabaseAdmin
      .from('article_drafts')
      .update({ status: 'pending', admin_note: adminNote, updated_at: new Date().toISOString() })
      .eq('id', id)
    return NextResponse.json({ ok: true, action: 'returned' })
  }

  if (action === 'reject') {
    await supabaseAdmin
      .from('article_drafts')
      .update({ status: 'rejected', admin_note: adminNote, updated_at: new Date().toISOString() })
      .eq('id', id)
    return NextResponse.json({ ok: true, action: 'rejected' })
  }
}
