// Jednorázový GSC data pull pro SEO analýzu (ne cron — spustit manuálně).
// npx tsx --env-file=.env.local scripts/gsc-snapshot.ts
import { google } from 'googleapis'
import { writeFileSync } from 'node:fs'

const keyJson = process.env.GSC_SERVICE_ACCOUNT_KEY
const siteUrl = process.env.GSC_SITE_URL
if (!keyJson || !siteUrl) {
  console.error('Chybí GSC_SERVICE_ACCOUNT_KEY nebo GSC_SITE_URL')
  process.exit(1)
}

const auth = new google.auth.GoogleAuth({
  credentials: JSON.parse(keyJson),
  scopes: ['https://www.googleapis.com/auth/webmasters.readonly'],
})
const sc = google.searchconsole({ version: 'v1', auth })

function fmt(d: Date) {
  return d.toISOString().slice(0, 10)
}

async function query(dimensions: string[], rowLimit: number, days: number) {
  const endDate = new Date()
  const startDate = new Date()
  startDate.setDate(endDate.getDate() - days)
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

async function main() {
  console.log('[gsc-snapshot] stahuji data za 28 dní…')
  const [queries, pages, daily, countries, devices] = await Promise.all([
    query(['query'], 30, 28),
    query(['page'], 30, 28),
    query(['date'], 28, 28),
    query(['country'], 10, 28),
    query(['device'], 10, 28),
  ])

  // Souhrn počítat z `daily` (28 řádků, žádný rowLimit ořez), ne z top-30 queries —
  // top-30 queries pokrývá jen zlomek skutečného provozu (long tail), podhodnocuje total.
  const totalClicks = daily.reduce((s, r) => s + (r.clicks ?? 0), 0)
  const totalImpressions = daily.reduce((s, r) => s + (r.impressions ?? 0), 0)
  const weightedPosition =
    totalImpressions > 0
      ? daily.reduce((s, r) => s + (r.position ?? 0) * (r.impressions ?? 0), 0) / totalImpressions
      : 0

  const output = {
    fetchedAt: new Date().toISOString(),
    periodDays: 28,
    summary: {
      totalClicks,
      totalImpressions,
      avgCtr: totalImpressions > 0 ? totalClicks / totalImpressions : 0,
      avgPosition: weightedPosition,
    },
    queries,
    pages,
    daily,
    countries,
    devices,
  }

  writeFileSync('/tmp/gsc-snapshot.json', JSON.stringify(output, null, 2))
  console.log(
    `[gsc-snapshot] hotovo — queries=${queries.length} pages=${pages.length} daily=${daily.length} countries=${countries.length} devices=${devices.length}`
  )
}

main().catch((err) => {
  console.error('[gsc-snapshot] FATAL:', err)
  process.exit(1)
})
