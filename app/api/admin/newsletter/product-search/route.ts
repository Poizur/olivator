// GET /api/admin/newsletter/product-search?q=term&limit=8
// Lightweight product search pro newsletter tip picker.

import { NextRequest, NextResponse } from 'next/server'
import { isAdminAuthenticated } from '@/lib/admin-auth'
import { supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const q = req.nextUrl.searchParams.get('q')?.trim() ?? ''
  const limit = Math.min(parseInt(req.nextUrl.searchParams.get('limit') ?? '8'), 20)

  let query = supabaseAdmin
    .from('products')
    .select('id, slug, name, name_short, image_url, olivator_score, origin_country')
    .eq('status', 'active')
    .order('olivator_score', { ascending: false })
    .limit(limit)

  if (q.length >= 2) {
    query = query.ilike('name', `%${q}%`)
  }

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json(data ?? [])
}
