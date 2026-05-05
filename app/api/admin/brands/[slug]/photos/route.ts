import { NextRequest, NextResponse } from 'next/server'
import { isAdminAuthenticated } from '@/lib/admin-auth'
import { supabaseAdmin } from '@/lib/supabase'

// Bulk update entity_images pro photo curator. Přijme array { id, image_role,
// status, sort_order, caption } a aplikuje změny per řádek.
export const dynamic = 'force-dynamic'

interface PhotoUpdate {
  id: string
  image_role?: string
  status?: string
  sort_order?: number
  caption?: string | null
}

const ALLOWED_ROLES = new Set(['logo', 'hero', 'editorial', 'gallery'])
const ALLOWED_STATUS = new Set(['active', 'inactive'])

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { slug } = await params

  const { data: brand } = await supabaseAdmin
    .from('brands')
    .select('id')
    .eq('slug', slug)
    .maybeSingle()
  if (!brand) return NextResponse.json({ error: 'Brand nenalezen' }, { status: 404 })

  const body = await request.json().catch(() => null)
  if (!body || !Array.isArray(body.updates)) {
    return NextResponse.json({ error: 'Body musí obsahovat updates: PhotoUpdate[]' }, { status: 400 })
  }

  const updates = body.updates as PhotoUpdate[]
  let updated = 0
  const errors: string[] = []

  for (const u of updates) {
    if (!u.id) continue
    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() }
    if (u.image_role && ALLOWED_ROLES.has(u.image_role)) patch.image_role = u.image_role
    if (u.status && ALLOWED_STATUS.has(u.status)) patch.status = u.status
    if (typeof u.sort_order === 'number') patch.sort_order = u.sort_order
    if (u.caption !== undefined) {
      patch.caption = u.caption || null
      // Sync alt_text na caption pokud má smysluplný obsah
      if (u.caption && u.caption.trim().length > 5) patch.alt_text = u.caption.trim().slice(0, 200)
    }

    const { error } = await supabaseAdmin
      .from('entity_images')
      .update(patch)
      .eq('id', u.id)
      .eq('entity_id', brand.id) // bezpečnostní filtr — admin nemůže upravit cizí brand
    if (error) errors.push(`${u.id}: ${error.message}`)
    else updated++
  }

  return NextResponse.json({
    ok: errors.length === 0,
    updated,
    errors,
  })
}
