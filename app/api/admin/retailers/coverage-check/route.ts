import { NextRequest, NextResponse } from 'next/server'
import { isAdminAuthenticated } from '@/lib/admin-auth'
import { supabaseAdmin } from '@/lib/supabase'
import { checkRetailerCoverage, type CoverageReport } from '@/lib/coverage-check'

// Admin endpoint — projde VŠECHNY XML retailery a vrátí coverage report.
// Při velkém diffu doporučí přepnutí na discovery agent.
export const maxDuration = 300
export const dynamic = 'force-dynamic'

export async function GET(_req: NextRequest) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const { data: retailers, error } = await supabaseAdmin
      .from('retailers')
      .select('slug, domain, xml_feed_url')
      .not('xml_feed_url', 'is', null)
      .eq('is_active', true)

    if (error) throw error
    if (!retailers || retailers.length === 0) {
      return NextResponse.json({ ok: true, reports: [], message: 'Žádný aktivní XML retailer.' })
    }

    const reports: CoverageReport[] = []
    for (const r of retailers) {
      const report = await checkRetailerCoverage({
        slug: r.slug as string,
        domain: r.domain as string,
        xmlFeedUrl: r.xml_feed_url as string | null,
      })
      reports.push(report)
    }

    const summary = {
      ok: reports.filter((r) => r.status === 'ok').length,
      warn: reports.filter((r) => r.status === 'warn').length,
      critical: reports.filter((r) => r.status === 'critical').length,
      errors: reports.filter((r) => r.status === 'error' || r.status === 'no_feed').length,
    }

    return NextResponse.json({ ok: true, reports, summary })
  } catch (err) {
    console.error('[admin/retailers/coverage-check]', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Server error' },
      { status: 500 }
    )
  }
}
