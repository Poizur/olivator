/**
 * Denní GSC snapshot → uloží do DB (tabulka gsc_snapshot).
 * Ukládá top 200 dotazů + top 100 stránek za posledních 28 dní.
 * Jeden snapshot per den — UPSERT, takže opakované spuštění = idempotentní.
 *
 * Předpoklady:
 *   - Tabulka gsc_snapshot musí existovat (viz supabase/migrations/20260922_gsc_snapshot.sql)
 *   - GSC_SERVICE_ACCOUNT_KEY + GSC_SITE_URL v env
 *
 * Schedule: 0 7 * * * (7:00 UTC — po GSC datech přes noc)
 * Local: npm run cron:gsc-daily
 */
import { google } from 'googleapis'
import { supabaseAdmin } from '@/lib/supabase'

const MAX_RUNTIME_MS = 3 * 60 * 1000

async function main() {
  const startedAt = Date.now()
  console.log('[cron:gsc-daily] start', new Date().toISOString())

  const keyJson = process.env.GSC_SERVICE_ACCOUNT_KEY
  const siteUrl = process.env.GSC_SITE_URL

  if (!keyJson || !siteUrl) {
    console.warn('[cron:gsc-daily] GSC_SERVICE_ACCOUNT_KEY nebo GSC_SITE_URL chybí — přeskakuji')
    process.exit(0)
  }

  const killTimer = setTimeout(() => {
    console.error('[cron:gsc-daily] TIMEOUT 3 min')
    process.exit(2)
  }, MAX_RUNTIME_MS)
  killTimer.unref()

  const auth = new google.auth.GoogleAuth({
    credentials: JSON.parse(keyJson),
    scopes: ['https://www.googleapis.com/auth/webmasters.readonly'],
  })
  const sc = google.searchconsole({ version: 'v1', auth })
  const today = new Date().toISOString().slice(0, 10)
  const PERIOD_DAYS = 28

  const endDate = new Date()
  const startDate = new Date()
  startDate.setDate(endDate.getDate() - PERIOD_DAYS)
  const fmt = (d: Date) => d.toISOString().slice(0, 10)

  async function fetchDim(dimensions: string[], rowLimit: number) {
    const res = await sc.searchanalytics.query({
      siteUrl,
      requestBody: {
        startDate: fmt(startDate),
        endDate: fmt(endDate),
        dimensions,
        rowLimit,
        dataState: 'all',
      },
    })
    return res.data.rows ?? []
  }

  const [queryRows, pageRows] = await Promise.all([
    fetchDim(['query'], 200),
    fetchDim(['page'], 100),
  ])

  console.log(`[cron:gsc-daily] fetched: queries=${queryRows.length} pages=${pageRows.length}`)

  // Build upsert rows
  const rows: Array<{
    taken_at: string
    dimension: string
    key1: string
    key2: string | null
    clicks: number
    impressions: number
    ctr: number
    position: number
    period_days: number
  }> = []

  for (const r of queryRows) {
    rows.push({
      taken_at: today,
      dimension: 'query',
      key1: (r.keys ?? [])[0] ?? '',
      key2: null,
      clicks: r.clicks ?? 0,
      impressions: r.impressions ?? 0,
      ctr: r.ctr ?? 0,
      position: r.position ?? 0,
      period_days: PERIOD_DAYS,
    })
  }

  for (const r of pageRows) {
    const page = ((r.keys ?? [])[0] ?? '').replace(/^https?:\/\/[^/]+/, '')
    rows.push({
      taken_at: today,
      dimension: 'page',
      key1: page,
      key2: null,
      clicks: r.clicks ?? 0,
      impressions: r.impressions ?? 0,
      ctr: r.ctr ?? 0,
      position: r.position ?? 0,
      period_days: PERIOD_DAYS,
    })
  }

  const { error } = await supabaseAdmin
    .from('gsc_snapshot')
    .upsert(rows, { onConflict: 'taken_at,dimension,key1' })

  clearTimeout(killTimer)

  if (error) {
    console.error('[cron:gsc-daily] DB upsert failed:', error.message)
    process.exit(1)
  }

  const elapsed = Math.round((Date.now() - startedAt) / 1000)
  console.log(`[cron:gsc-daily] upserted ${rows.length} rows in ${elapsed}s`)
  process.exit(0)
}

main().catch(err => {
  console.error('[cron:gsc-daily] FATAL:', err)
  process.exit(1)
})
