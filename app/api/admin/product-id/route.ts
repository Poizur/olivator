// GET /api/admin/product-id?slug=xxx → { id } nebo 404
// Použití: AdminBarEdit (klient) potřebuje produkt ID pro odkaz na edit stránku.

import { NextRequest, NextResponse } from 'next/server'
import { isAdminAuthenticated } from '@/lib/admin-auth'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const slug = req.nextUrl.searchParams.get('slug')
  if (!slug) return NextResponse.json({ error: 'slug required' }, { status: 400 })

  const { data } = await supabaseAdmin
    .from('products')
    .select('id')
    .eq('slug', slug)
    .maybeSingle()

  if (!data?.id) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ id: data.id })
}
