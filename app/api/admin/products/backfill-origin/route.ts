// POST /api/admin/products/backfill-origin
// Retroaktivně doplní origin_country pro produkty kde je NULL.
// Fallback order: inferOriginFromText(name+description) → skip (admin vyplní ručně).
// Volat z admin UI nebo manuálně — idempotentní, přeskočí produkty co origin_country již mají.

import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { inferOriginFromText } from '@/lib/utils'
import { isAdminAuthenticated } from '@/lib/admin-auth'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function POST() {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: products, error } = await supabaseAdmin
    .from('products')
    .select('id, name, description_short, description_long')
    .is('origin_country', null)
    .limit(500)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!products?.length) return NextResponse.json({ filled: 0, skipped: 0, message: 'Vše již vyplněno' })

  let filled = 0
  let skipped = 0

  for (const p of products) {
    const text = [p.name, p.description_short, p.description_long].filter(Boolean).join(' ')
    const { country } = inferOriginFromText(text)
    if (!country) { skipped++; continue }

    await supabaseAdmin
      .from('products')
      .update({ origin_country: country })
      .eq('id', p.id)

    filled++
  }

  return NextResponse.json({ filled, skipped, total: products.length })
}
