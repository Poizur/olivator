import { NextRequest, NextResponse } from 'next/server'
import { isAdminAuthenticated } from '@/lib/admin-auth'
import { supabaseAdmin } from '@/lib/supabase'

// PATCH /api/admin/brands/[slug]/featured
// Body: { is_featured: boolean, featured_order?: number | null }
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  if (!await isAdminAuthenticated()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { slug } = await params
  const body = await req.json()
  const { is_featured, featured_order } = body as { is_featured: boolean; featured_order?: number | null }

  const update: Record<string, unknown> = { is_featured }
  if (is_featured === false) {
    update.featured_order = null
  } else if (featured_order !== undefined) {
    update.featured_order = featured_order
  }

  const { error } = await supabaseAdmin.from('brands').update(update).eq('slug', slug)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
