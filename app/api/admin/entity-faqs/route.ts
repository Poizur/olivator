// CRUD endpoint pro entity_faqs.
// POST   { entityType, entityId, question, answer, sortOrder }
// PATCH  { id, question?, answer?, sortOrder? }
// DELETE ?id=...

import { NextResponse } from 'next/server'
import { isAdminAuthenticated } from '@/lib/admin-auth'
import { supabaseAdmin } from '@/lib/supabase'

const VALID_TYPES = new Set(['region', 'brand', 'cultivar'])

export async function POST(req: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json().catch(() => null)
  if (!body) return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })

  const { entityType, entityId, question, answer, sortOrder } = body as {
    entityType: string
    entityId: string
    question: string
    answer: string
    sortOrder?: number
  }

  if (!VALID_TYPES.has(entityType)) {
    return NextResponse.json({ error: `Invalid entityType: ${entityType}` }, { status: 400 })
  }
  if (!entityId || !question?.trim() || !answer?.trim()) {
    return NextResponse.json(
      { error: 'entityId + question + answer required' },
      { status: 400 }
    )
  }

  const trimmedQ = question.trim()

  // Dedup — pokud existuje stejná otázka pro tuto entitu, neprovádět insert
  const { data: existing } = await supabaseAdmin
    .from('entity_faqs')
    .select('id, question, answer, sort_order')
    .eq('entity_type', entityType)
    .eq('entity_id', entityId)
    .ilike('question', trimmedQ)
    .maybeSingle()
  if (existing) {
    return NextResponse.json({ ok: true, faq: existing, skipped: 'duplicate' })
  }

  const { data, error } = await supabaseAdmin
    .from('entity_faqs')
    .insert({
      entity_type: entityType,
      entity_id: entityId,
      question: trimmedQ,
      answer: answer.trim(),
      sort_order: sortOrder ?? 0,
    })
    .select('id, question, answer, sort_order')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, faq: data })
}

export async function PATCH(req: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json().catch(() => null)
  if (!body) return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })

  const { id, question, answer, sortOrder } = body as {
    id: string
    question?: string
    answer?: string
    sortOrder?: number
  }

  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (typeof question === 'string') patch.question = question.trim()
  if (typeof answer === 'string') patch.answer = answer.trim()
  if (typeof sortOrder === 'number') patch.sort_order = sortOrder

  const { error } = await supabaseAdmin.from('entity_faqs').update(patch).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const url = new URL(req.url)
  const id = url.searchParams.get('id')
  const entityType = url.searchParams.get('entityType')
  const entityId = url.searchParams.get('entityId')

  // Single delete by id
  if (id) {
    const { error } = await supabaseAdmin.from('entity_faqs').delete().eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  }

  // Bulk delete VŠECH FAQ pro danou entitu (vyčistit duplikáty)
  if (entityType && entityId) {
    if (!VALID_TYPES.has(entityType)) {
      return NextResponse.json({ error: 'Invalid entityType' }, { status: 400 })
    }
    const { error, count } = await supabaseAdmin
      .from('entity_faqs')
      .delete({ count: 'exact' })
      .eq('entity_type', entityType)
      .eq('entity_id', entityId)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true, deleted: count ?? 0 })
  }

  return NextResponse.json(
    { error: 'id NEBO (entityType + entityId) required' },
    { status: 400 }
  )
}
