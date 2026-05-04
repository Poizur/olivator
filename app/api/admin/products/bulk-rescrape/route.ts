import { NextRequest, NextResponse } from 'next/server'
import { isAdminAuthenticated } from '@/lib/admin-auth'
import { supabaseAdmin } from '@/lib/supabase'
import { runRescrape } from '@/lib/product-rescrape'

// 30-90s per produkt × N. 800s strop = ~10 produktů max v jednom běhu.
// Frontend musí volat opakovaně dokud jsou nějaké drafty bez source_url
// nebo s prázdným score.
export const maxDuration = 800
export const dynamic = 'force-dynamic'

interface BulkRescrapeBody {
  status?: 'draft' | 'inactive'  // default 'draft'
  ids?: string[]                 // konkrétní subset; jinak všechny daného statusu
  limit?: number                 // hard cap (default 10)
}

export async function POST(req: NextRequest) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const body: BulkRescrapeBody = await req.json().catch(() => ({}))
    const status = body.status ?? 'draft'
    const limit = Math.min(body.limit ?? 10, 20)  // hard cap 20 — Anthropic 529 risk

    let query = supabaseAdmin
      .from('products')
      .select('id, name, source_url')
      .eq('status', status)
      .not('source_url', 'is', null)
      .order('created_at', { ascending: true })
      .limit(limit)

    if (body.ids && body.ids.length > 0) {
      query = supabaseAdmin
        .from('products')
        .select('id, name, source_url')
        .in('id', body.ids)
        .not('source_url', 'is', null)
        .limit(limit)
    }

    const { data: targets, error } = await query
    if (error) throw error
    if (!targets || targets.length === 0) {
      return NextResponse.json({ ok: true, processed: 0, results: [] })
    }

    const results: Array<{
      id: string
      name: string
      ok: boolean
      score?: number | null
      steps?: number
      error?: string
    }> = []

    for (const t of targets) {
      try {
        const r = await runRescrape(t.id as string)
        results.push({
          id: t.id as string,
          name: t.name as string,
          ok: r.failures.length === 0,
          score: r.scoreTotal,
          steps: r.steps.length,
          error: r.failures.length > 0 ? r.failures.join('; ') : undefined,
        })
      } catch (err) {
        results.push({
          id: t.id as string,
          name: t.name as string,
          ok: false,
          error: err instanceof Error ? err.message : String(err),
        })
      }
    }

    return NextResponse.json({
      ok: true,
      processed: results.length,
      succeeded: results.filter((r) => r.ok).length,
      failed: results.filter((r) => !r.ok).length,
      results,
    })
  } catch (err) {
    console.error('[bulk-rescrape]', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Server error' },
      { status: 500 }
    )
  }
}
