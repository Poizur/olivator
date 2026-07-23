// Striking distance analýza — GSC dotazy na pozicích 5–15, seřazené dle impresí.
// npx tsx --env-file=.env.local scripts/gsc-striking-distance.ts
import { google } from 'googleapis'

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

function fmt(d: Date) { return d.toISOString().slice(0, 10) }

async function main() {
  const end = new Date()
  const start = new Date()
  start.setDate(end.getDate() - 28)

  console.log(`[gsc-striking] Stahuju data ${fmt(start)} → ${fmt(end)}`)

  // Query+Page dimenze — pro vazbu dotaz ↔ stránka
  const res = await sc.searchanalytics.query({
    siteUrl,
    requestBody: {
      startDate: fmt(start),
      endDate: fmt(end),
      dimensions: ['query', 'page'],
      rowLimit: 1000,
      dataState: 'all',
    },
  })

  const rows = res.data.rows ?? []
  console.log(`[gsc-striking] Celkem řádků: ${rows.length}`)

  // Filtruj striking distance: pozice 5–15
  const striking = rows
    .filter(r => (r.position ?? 0) >= 5 && (r.position ?? 0) <= 15)
    .sort((a, b) => (b.impressions ?? 0) - (a.impressions ?? 0))

  console.log(`[gsc-striking] Striking distance (5–15): ${striking.length} řádků`)
  console.log()

  // Agregace per stránka — kolik impresí dohromady
  const pageMap = new Map<string, { impressions: number; clicks: number; queries: string[] }>()
  for (const r of striking) {
    const page = (r.keys?.[1] ?? '').replace('https://olivator.cz', '')
    const query = r.keys?.[0] ?? ''
    const prev = pageMap.get(page) ?? { impressions: 0, clicks: 0, queries: [] }
    prev.impressions += r.impressions ?? 0
    prev.clicks += r.clicks ?? 0
    if (prev.queries.length < 5) prev.queries.push(`${query} (${(r.position ?? 0).toFixed(1)}, ${r.impressions}impr)`)
    pageMap.set(page, prev)
  }

  const pages = [...pageMap.entries()]
    .sort((a, b) => b[1].impressions - a[1].impressions)
    .slice(0, 20)

  console.log('══════════════════════════════════════════════════')
  console.log('TOP STRÁNKY — striking distance dotazy (5–15)')
  console.log('══════════════════════════════════════════════════')
  for (const [page, data] of pages) {
    const ctr = data.impressions > 0 ? ((data.clicks / data.impressions) * 100).toFixed(1) : '0'
    console.log(`\n📄 ${page}`)
    console.log(`   Impr: ${data.impressions} | Kliky: ${data.clicks} | CTR: ${ctr}%`)
    console.log(`   Dotazy: ${data.queries.join(' | ')}`)
  }

  console.log()
  console.log('══════════════════════════════════════════════════')
  console.log('TOP 30 DOTAZŮ — striking distance (pozice 5–15, dle impresí)')
  console.log('══════════════════════════════════════════════════')
  console.log()

  const topQueries = striking.slice(0, 30)
  for (const r of topQueries) {
    const query = r.keys?.[0] ?? ''
    const page = (r.keys?.[1] ?? '').replace('https://olivator.cz', '')
    const pos = (r.position ?? 0).toFixed(1)
    const ctr = r.impressions ? ((r.clicks ?? 0) / r.impressions * 100).toFixed(1) : '0'
    console.log(`${query.padEnd(50)} | poz ${pos.padStart(5)} | ${String(r.impressions).padStart(4)}impr | ${String(r.clicks).padStart(3)}klik | ${ctr.padStart(5)}% CTR`)
    console.log(`  → ${page}`)
  }
}

main().catch(e => { console.error(e); process.exit(1) })
