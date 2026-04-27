import { NextRequest, NextResponse } from 'next/server'
import { isAdminAuthenticated } from '@/lib/admin-auth'
import { supabaseAdmin } from '@/lib/supabase'
import { runDiscoveryAgent } from '@/lib/discovery-agent'
import { setSetting } from '@/lib/settings'

// Long timeout — bulk import per shop can take 5-15 min
export const maxDuration = 600
export const dynamic = 'force-dynamic'

/** POST — bulk import all olive oil products from one shop.
 *  Temporarily overrides discovery_enabled_shops to JUST this slug,
 *  raises daily_limit to 999, runs agent, restores settings. */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const { id } = await params
    const { data: source } = await supabaseAdmin
      .from('discovery_sources')
      .select('slug, status, domain')
      .eq('id', id)
      .maybeSingle()
    if (!source) {
      return NextResponse.json({ error: 'Source not found' }, { status: 404 })
    }
    if (source.status !== 'enabled') {
      return NextResponse.json(
        { error: 'Source musí být ve statusu enabled. Nejdřív aktivuj.' },
        { status: 400 }
      )
    }

    // Snapshot existing settings so we can restore
    const { getSetting } = await import('@/lib/settings')
    const previousShops = await getSetting<string[]>('discovery_enabled_shops')
    const previousLimit = await getSetting<number>('discovery_daily_limit')

    try {
      // Temporarily restrict Discovery to JUST this shop, no limit
      await setSetting('discovery_enabled_shops', [source.slug as string])
      await setSetting('discovery_daily_limit', 999)

      const result = await runDiscoveryAgent()

      // Update source stats
      await supabaseAdmin
        .from('discovery_sources')
        .update({
          last_scanned_at: new Date().toISOString(),
          last_scan_url_count: result.totalUrlsFound,
          last_scan_error: result.shopErrors[0]?.error ?? null,
          total_products_imported:
            (await supabaseAdmin
              .from('discovery_sources')
              .select('total_products_imported')
              .eq('id', id)
              .maybeSingle()
            ).data?.total_products_imported ?? 0
            + result.autoPublished,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)

      return NextResponse.json({ ok: true, ...result })
    } finally {
      // Restore previous settings
      if (previousShops) await setSetting('discovery_enabled_shops', previousShops)
      if (previousLimit != null) await setSetting('discovery_daily_limit', previousLimit)
    }
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Server error' },
      { status: 500 }
    )
  }
}
