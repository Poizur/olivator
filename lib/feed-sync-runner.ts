// Feed sync runner — projde VŠECHNY retailery, kteří mají vyplněný xml_feed_url
// + xml_feed_format, a zavolá lib/feed-sync.syncRetailerFeed pro každého.
//
// Volá se z:
//   - scripts/cron/feed-sync.ts (standalone, Railway cron service)
//   - app/api/cron/feed-sync/route.ts (HTTP-triggered alternative)
//
// Errory v jednom retailerovi NESMÍ shodit ostatní (BUG-002 lekce — best effort).

import { supabaseAdmin } from './supabase'
import { syncRetailerFeed, type FeedSyncResult } from './feed-sync'

export interface FeedSyncRunResult {
  retailersChecked: number
  retailersSynced: number
  retailersFailed: number
  totalProductsCreated: number
  totalOffersUpserted: number
  totalSkipped: number
  perRetailer: Array<{
    slug: string
    name: string
    ok: boolean
    error?: string
    summary?: Pick<FeedSyncResult, 'oilsInFeed' | 'productsCreated' | 'productsExisting' | 'offersUpserted' | 'skipped'>
  }>
  startedAt: string
  finishedAt: string
}

export async function runFeedSyncForAllRetailers(): Promise<FeedSyncRunResult> {
  const startedAt = new Date().toISOString()

  const { data: retailers, error } = await supabaseAdmin
    .from('retailers')
    .select('id, slug, name')
    .not('xml_feed_url', 'is', null)
    .not('xml_feed_format', 'is', null)
    .eq('is_active', true)
    .order('name')

  if (error) throw new Error(`Retailer query failed: ${error.message}`)

  const result: FeedSyncRunResult = {
    retailersChecked: retailers?.length ?? 0,
    retailersSynced: 0,
    retailersFailed: 0,
    totalProductsCreated: 0,
    totalOffersUpserted: 0,
    totalSkipped: 0,
    perRetailer: [],
    startedAt,
    finishedAt: '',
  }

  for (const retailer of retailers ?? []) {
    const id = retailer.id as string
    const slug = retailer.slug as string
    const name = retailer.name as string

    try {
      const summary = await syncRetailerFeed(id)
      result.retailersSynced++
      result.totalProductsCreated += summary.productsCreated
      result.totalOffersUpserted += summary.offersUpserted
      result.totalSkipped += summary.skipped
      result.perRetailer.push({
        slug,
        name,
        ok: true,
        summary: {
          oilsInFeed: summary.oilsInFeed,
          productsCreated: summary.productsCreated,
          productsExisting: summary.productsExisting,
          offersUpserted: summary.offersUpserted,
          skipped: summary.skipped,
        },
      })
      console.log(`[feed-sync] ${slug}: +${summary.productsCreated} new, ~${summary.offersUpserted} offers, ${summary.skipped} skipped`)
    } catch (err) {
      result.retailersFailed++
      const reason = err instanceof Error ? err.message : String(err)
      result.perRetailer.push({ slug, name, ok: false, error: reason })
      console.error(`[feed-sync] ${slug} FAILED:`, reason)
    }
  }

  result.finishedAt = new Date().toISOString()
  return result
}

/** Subset retailerů s vyplněným XML feedem — discovery agent je SKIPNE,
 *  aby se denně nesyncovaly přes oba kanály (duplikáty v price_history). */
export async function getRetailerSlugsWithXmlFeed(): Promise<Set<string>> {
  const { data, error } = await supabaseAdmin
    .from('retailers')
    .select('slug')
    .not('xml_feed_url', 'is', null)
    .not('xml_feed_format', 'is', null)
    .eq('is_active', true)
  if (error) {
    console.warn('[feed-sync] getRetailerSlugsWithXmlFeed query failed:', error.message)
    return new Set()
  }
  return new Set((data ?? []).map(r => r.slug as string))
}
