// GET  ?entityId=uuid&entityType=region  → list fotek entity
// POST { entityId, entityType, url, altText }  → přidat ručně

import { NextResponse } from 'next/server'
import { isAdminAuthenticated } from '@/lib/admin-auth'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(req: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { searchParams } = new URL(req.url)
  const entityId = searchParams.get('entityId')
  const entityType = searchParams.get('entityType')
  if (!entityId || !entityType) {
    return NextResponse.json({ error: 'entityId + entityType required' }, { status: 400 })
  }
  const { data, error } = await supabaseAdmin
    .from('entity_images')
    .select('id, url, alt_text, is_primary, sort_order, source, source_attribution, width, height')
    .eq('entity_id', entityId)
    .eq('entity_type', entityType)
    .eq('status', 'active')
    .order('sort_order')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ photos: data ?? [] })
}

export async function POST(req: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const body = await req.json().catch(() => null)
  if (!body?.entityId || !body?.entityType || !body?.url) {
    return NextResponse.json({ error: 'entityId, entityType, url required' }, { status: 400 })
  }
  const { entityId, entityType, url, altText } = body as {
    entityId: string
    entityType: string
    url: string
    altText?: string
  }

  // Zkontroluj zda URL již neexistuje
  const { data: existing } = await supabaseAdmin
    .from('entity_images')
    .select('id')
    .eq('entity_id', entityId)
    .eq('url', url)
    .maybeSingle()
  if (existing) {
    return NextResponse.json({ error: 'Tato URL je již přidána.' }, { status: 409 })
  }

  // Zjisti nejvyšší sort_order
  const { data: last } = await supabaseAdmin
    .from('entity_images')
    .select('sort_order, is_primary')
    .eq('entity_id', entityId)
    .eq('entity_type', entityType)
    .eq('status', 'active')
    .order('sort_order', { ascending: false })
    .limit(1)
    .maybeSingle()
  const nextOrder = last ? (last.sort_order as number) + 1 : 0
  const isPrimary = !last // první fotka = automaticky hlavní

  const { data: inserted, error } = await supabaseAdmin
    .from('entity_images')
    .insert({
      entity_type: entityType,
      entity_id: entityId,
      url,
      alt_text: altText ?? null,
      source: 'manual',
      source_id: url,
      is_primary: isPrimary,
      sort_order: nextOrder,
      status: 'active',
    })
    .select('id, url, alt_text, is_primary, sort_order, source, source_attribution, width, height')
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, photo: inserted })
}
