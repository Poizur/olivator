// PATCH /api/admin/entity-images/[id]  → { isPrimary?, altText?, sortOrder? }
// DELETE /api/admin/entity-images/[id] → soft-delete (status=inactive)

import { NextResponse } from 'next/server'
import { isAdminAuthenticated } from '@/lib/admin-auth'
import { supabaseAdmin } from '@/lib/supabase'

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { id } = await params
  const body = await req.json().catch(() => ({}))
  const { isPrimary, altText, sortOrder } = body as {
    isPrimary?: boolean
    altText?: string
    sortOrder?: number
  }

  if (isPrimary === true) {
    // Zjisti entityId + entityType
    const { data: photo } = await supabaseAdmin
      .from('entity_images')
      .select('entity_id, entity_type')
      .eq('id', id)
      .single()
    if (!photo) return NextResponse.json({ error: 'Foto nenalezeno.' }, { status: 404 })

    // Odeber primary ostatním
    await supabaseAdmin
      .from('entity_images')
      .update({ is_primary: false })
      .eq('entity_id', photo.entity_id)
      .eq('entity_type', photo.entity_type)

    // Nastav primary tomuto
    const { error } = await supabaseAdmin
      .from('entity_images')
      .update({ is_primary: true })
      .eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  }

  const patch: Record<string, unknown> = {}
  if (altText !== undefined) patch.alt_text = altText
  if (sortOrder !== undefined) patch.sort_order = sortOrder
  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: 'Nic k aktualizaci.' }, { status: 400 })
  }

  const { error } = await supabaseAdmin.from('entity_images').update(patch).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { id } = await params
  // Soft-delete — neničíme záznamy, jen skryjeme
  const { error } = await supabaseAdmin
    .from('entity_images')
    .update({ status: 'inactive' })
    .eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
