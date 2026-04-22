import { NextRequest, NextResponse } from 'next/server'
import { isAdminAuthenticated } from '@/lib/admin-auth'
import { supabaseAdmin } from '@/lib/supabase'
import { ensureProductsBucket, fetchAndStoreProductImage } from '@/lib/product-image'

export const maxDuration = 300 // 5 min — batch job

export async function POST(_request: NextRequest) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    await ensureProductsBucket()

    const { data: products, error } = await supabaseAdmin
      .from('products')
      .select('id, ean, name')
      .is('image_url', null)
    if (error) throw error

    const results: Array<{ id: string; name: string; ok: boolean; reason?: string }> = []
    for (const p of products ?? []) {
      const res = await fetchAndStoreProductImage(p.id as string)
      results.push({
        id: p.id as string,
        name: p.name as string,
        ok: res.ok,
        reason: res.ok ? undefined : res.reason,
      })
      // Be nice to OFF servers
      await new Promise(r => setTimeout(r, 500))
    }

    const succeeded = results.filter(r => r.ok).length
    const failed = results.length - succeeded
    return NextResponse.json({
      ok: true,
      total: results.length,
      succeeded,
      failed,
      results,
    })
  } catch (err) {
    console.error('[fetch-missing-images]', err)
    const message = err instanceof Error ? err.message : 'Server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
