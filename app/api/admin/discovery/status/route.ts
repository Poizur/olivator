import { NextRequest, NextResponse } from 'next/server'
import { isAdminAuthenticated } from '@/lib/admin-auth'
import { supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

/** GET — live status for Discovery progress polling.
 *  Counts candidates created since `since` query param (ISO timestamp). */
export async function GET(request: NextRequest) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const since = request.nextUrl.searchParams.get('since')
    if (!since) {
      return NextResponse.json({ error: 'since param required' }, { status: 400 })
    }
    const { data, error } = await supabaseAdmin
      .from('discovery_candidates')
      .select('id, status, source_domain, created_at, candidate_data')
      .gte('created_at', since)
      .order('created_at', { ascending: false })
    if (error) throw error

    const counts = {
      total: data?.length ?? 0,
      auto_published: 0,
      auto_added_offer: 0,
      needs_review: 0,
      failed: 0,
    }
    const recent: Array<{ name: string; status: string; domain: string }> = []
    for (const c of data ?? []) {
      const s = c.status as keyof typeof counts
      if (s in counts) (counts as Record<string, number>)[s]++
      if (recent.length < 5) {
        const cd = c.candidate_data as { name?: string }
        recent.push({
          name: cd?.name ?? '—',
          status: c.status as string,
          domain: c.source_domain as string,
        })
      }
    }

    return NextResponse.json({ ok: true, counts, recent })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Server error' },
      { status: 500 }
    )
  }
}
