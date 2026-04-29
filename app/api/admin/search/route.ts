// Lightweight admin search — products by name. Used by command palette.

import { NextResponse } from 'next/server'
import { isAdminAuthenticated } from '@/lib/admin-auth'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(req: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const url = new URL(req.url)
  const q = (url.searchParams.get('q') || '').trim()
  if (q.length < 2) return NextResponse.json({ products: [] })

  const { data } = await supabaseAdmin
    .from('products')
    .select('id, name, slug')
    .ilike('name', `%${q}%`)
    .limit(8)

  return NextResponse.json({ products: data ?? [] })
}
