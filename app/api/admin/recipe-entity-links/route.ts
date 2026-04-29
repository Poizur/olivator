// CRUD pro recipe_entity_links — propojení receptů s oblastmi/odrůdami/značkami.
// POST   { recipeSlug, entityType, entitySlug }  → vytvoří link
// DELETE ?recipeSlug=&entityType=&entitySlug=    → smaže link
// GET    ?entityType=&entitySlug=                → list linků pro entitu

import { NextResponse } from 'next/server'
import { isAdminAuthenticated } from '@/lib/admin-auth'
import { supabaseAdmin } from '@/lib/supabase'

const VALID_TYPES = new Set(['region', 'brand', 'cultivar'])

export async function GET(req: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const url = new URL(req.url)
  const entityType = url.searchParams.get('entityType')
  const entitySlug = url.searchParams.get('entitySlug')

  if (!entityType || !entitySlug || !VALID_TYPES.has(entityType)) {
    return NextResponse.json({ error: 'entityType + entitySlug required' }, { status: 400 })
  }

  const { data, error } = await supabaseAdmin
    .from('recipe_entity_links')
    .select('recipe_slug')
    .eq('entity_type', entityType)
    .eq('entity_slug', entitySlug)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({
    ok: true,
    links: (data ?? []).map((d: { recipe_slug: string }) => d.recipe_slug),
  })
}

export async function POST(req: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const body = await req.json().catch(() => null)
  if (!body) return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })

  const { recipeSlug, entityType, entitySlug } = body as {
    recipeSlug: string
    entityType: string
    entitySlug: string
  }

  if (!recipeSlug || !entityType || !entitySlug || !VALID_TYPES.has(entityType)) {
    return NextResponse.json({ error: 'recipeSlug + entityType + entitySlug required' }, { status: 400 })
  }

  const { error } = await supabaseAdmin
    .from('recipe_entity_links')
    .upsert(
      {
        recipe_slug: recipeSlug,
        entity_type: entityType,
        entity_slug: entitySlug,
      },
      { onConflict: 'recipe_slug,entity_type,entity_slug', ignoreDuplicates: true }
    )

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const url = new URL(req.url)
  const recipeSlug = url.searchParams.get('recipeSlug')
  const entityType = url.searchParams.get('entityType')
  const entitySlug = url.searchParams.get('entitySlug')

  if (!recipeSlug || !entityType || !entitySlug) {
    return NextResponse.json({ error: 'recipeSlug + entityType + entitySlug required' }, { status: 400 })
  }

  const { error } = await supabaseAdmin
    .from('recipe_entity_links')
    .delete()
    .eq('recipe_slug', recipeSlug)
    .eq('entity_type', entityType)
    .eq('entity_slug', entitySlug)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
