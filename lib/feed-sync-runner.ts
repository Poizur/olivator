// Feed sync runner — projde VŠECHNY retailery, kteří mají vyplněný xml_feed_url
// + xml_feed_format, a zavolá lib/feed-sync.syncRetailerFeed pro každého.
// Po sync ještě dvě "doháněcí" pasy:
//   1) Auto-research prezentace pro retailery s prázdnými poli (jednou per retailer).
//   2) Rescrape pending drafty (status='draft' bez score/popisu) — řeší
//      drafty vytvořené před auto-rescrape feature i ty kde se rescrape nepovedl.
//
// Volá se z:
//   - scripts/cron/feed-sync.ts (standalone, Railway cron service)
//   - app/api/cron/feed-sync/route.ts (HTTP-triggered alternative)
//
// Errory v jednom retailerovi NESMÍ shodit ostatní (BUG-002 lekce — best effort).

import { supabaseAdmin } from './supabase'
import { syncRetailerFeed, type FeedSyncResult } from './feed-sync'
import { researchRetailer } from './retailer-research'
import { runRescrape } from './product-rescrape'

// Kolik pending draftů zpracovat per cron run. Každý rescrape ~30-90s.
// 10 × 60s = 10 min — bezpečně v 15 min cron timeoutu i s feed sync samotným.
const MAX_PENDING_RESCRAPES_PER_RUN = 10

export interface FeedSyncRunResult {
  retailersChecked: number
  retailersSynced: number
  retailersFailed: number
  totalProductsCreated: number
  totalOffersUpserted: number
  totalSkipped: number
  // Bonus pasy (auto-prepare):
  retailersAutoResearched: number
  pendingDraftsRescraped: number
  pendingDraftsFailed: number
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
    retailersAutoResearched: 0,
    pendingDraftsRescraped: 0,
    pendingDraftsFailed: 0,
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

  // ── PASS 2: Auto-research prázdných retailerů ────────────────────────────
  // Když admin přidá nového eshopu jen s doménou + affiliate, prezentace
  // (tagline / story / founders) zůstává null. Při prvním cron běhu Claude
  // Haiku z webu eshopu vytáhne info — admin pak jen reviewuje. ~$0.005/eshop.
  try {
    result.retailersAutoResearched = await autoResearchEmptyRetailers()
    if (result.retailersAutoResearched > 0) {
      console.log(`[feed-sync] auto-research: ${result.retailersAutoResearched} retailerů vyplněno`)
    }
  } catch (err) {
    console.warn('[feed-sync] auto-research stage failed:', err)
  }

  // ── PASS 3: Rescrape pending draftů ──────────────────────────────────────
  // Drafty vytvořené před auto-rescrape feature (commit 42d7480) nebo ty
  // co se v sync rescrape nezdařily zůstávají bez Score / popisů. Doháníme
  // je v cap MAX_PENDING_RESCRAPES_PER_RUN per run.
  try {
    const rescrapeStats = await rescrapePendingDrafts(MAX_PENDING_RESCRAPES_PER_RUN)
    result.pendingDraftsRescraped = rescrapeStats.succeeded
    result.pendingDraftsFailed = rescrapeStats.failed
    if (rescrapeStats.succeeded + rescrapeStats.failed > 0) {
      console.log(`[feed-sync] pending drafty: ${rescrapeStats.succeeded} OK, ${rescrapeStats.failed} failed`)
    }
  } catch (err) {
    console.warn('[feed-sync] pending drafts stage failed:', err)
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

/** Pro každý aktivní retailer s NULL prezentací (tagline + story zároveň)
 *  spustí researchRetailer + uloží non-null fields. Vrací počet úspěšně
 *  zpracovaných retailerů. */
async function autoResearchEmptyRetailers(): Promise<number> {
  const { data, error } = await supabaseAdmin
    .from('retailers')
    .select('id, slug, name, domain, tagline, story')
    .eq('is_active', true)
    .not('domain', 'is', null)
    .is('tagline', null)
    .is('story', null)
  if (error || !data) return 0

  let done = 0
  for (const r of data) {
    const domain = (r.domain as string | null) ?? null
    if (!domain) continue
    try {
      const research = await researchRetailer(domain)
      const updates: Record<string, unknown> = {}
      if (research.tagline) updates.tagline = research.tagline
      if (research.story) updates.story = research.story
      if (research.founders) updates.founders = research.founders
      if (research.headquarters) updates.headquarters = research.headquarters
      if (research.foundedYear) updates.founded_year = research.foundedYear
      if (research.specialization) updates.specialization = research.specialization
      if (research.logoUrl) updates.logo_url = research.logoUrl

      if (Object.keys(updates).length > 0) {
        await supabaseAdmin.from('retailers').update(updates).eq('id', r.id)
        done++
        console.log(`[auto-research] ${r.slug}: ${Object.keys(updates).join(', ')}`)
      }
    } catch (err) {
      console.warn(`[auto-research] ${r.slug} failed:`, err instanceof Error ? err.message : err)
    }
  }
  return done
}

/** Najde drafty bez Score / popisu (pre-existing nebo failed rescrape) a
 *  spustí runRescrape. Cap aby cron neutekl. */
async function rescrapePendingDrafts(limit: number): Promise<{ succeeded: number; failed: number }> {
  const { data, error } = await supabaseAdmin
    .from('products')
    .select('id, name')
    .eq('status', 'draft')
    .or('olivator_score.is.null,description_long.is.null')
    .not('source_url', 'is', null)
    .order('created_at', { ascending: true })
    .limit(limit)
  if (error || !data || data.length === 0) return { succeeded: 0, failed: 0 }

  let succeeded = 0
  let failed = 0
  for (const p of data) {
    try {
      await runRescrape(p.id as string)
      succeeded++
    } catch (err) {
      failed++
      console.warn(`[pending-rescrape] ${p.id} failed:`, err instanceof Error ? err.message : err)
    }
  }
  return { succeeded, failed }
}
