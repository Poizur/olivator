import { NextRequest, NextResponse } from 'next/server'
import { isAdminAuthenticated } from '@/lib/admin-auth'
import { supabaseAdmin } from '@/lib/supabase'
import { autoFillBrand } from '@/lib/brand-auto-fill'

// Bulk auto-fill — projde všechny značky které mají prázdné description_long
// (nebo `?force=1` všechny). Sekvenčně, ne paralelně — Anthropic web search
// má rate limit a paralelně by se to ucpalo.
//
// 800 s strop (Railway gateway limit). Při 12 značkách × ~30 s = 360 s,
// max 25 značek za jeden běh.
export const maxDuration = 800
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const force = request.nextUrl.searchParams.get('force') === '1'
  const limit = Number(request.nextUrl.searchParams.get('limit') ?? '25')

  let query = supabaseAdmin.from('brands').select('slug, name, description_long').order('slug')
  if (!force) query = query.or('description_long.is.null,description_long.eq.')

  const { data: brands, error } = await query.limit(limit)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const results: Array<{
    slug: string
    name: string
    status: string
    confidence: number | null
    message: string
  }> = []

  for (const brand of brands ?? []) {
    try {
      const report = await autoFillBrand(brand.slug as string)
      const overall = report.candidate && report.verification
        ? Math.min(report.candidate.confidence, report.verification.confidence)
        : report.candidate?.confidence ?? null
      results.push({
        slug: brand.slug as string,
        name: brand.name as string,
        status: report.status,
        confidence: overall,
        message: report.message,
      })
    } catch (err) {
      results.push({
        slug: brand.slug as string,
        name: brand.name as string,
        status: 'error',
        confidence: null,
        message: err instanceof Error ? err.message : 'unknown error',
      })
    }
  }

  const summary = {
    total: results.length,
    applied: results.filter((r) => r.status === 'applied').length,
    pending: results.filter((r) => r.status === 'pending_review').length,
    rejected: results.filter((r) => r.status === 'rejected').length,
    no_url: results.filter((r) => r.status === 'no_url').length,
    error: results.filter((r) => r.status === 'error').length,
  }

  return NextResponse.json({ ok: true, summary, results })
}
