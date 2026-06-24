// Jednorázová kontrola konkrétních URL v GSC — indexace/traffic status pro Vlnu 1 a 2.
// npx tsx --env-file=.env.local scripts/gsc-check-pages.ts
import { google } from 'googleapis'

const keyJson = process.env.GSC_SERVICE_ACCOUNT_KEY!
const siteUrl = process.env.GSC_SITE_URL!

const auth = new google.auth.GoogleAuth({
  credentials: JSON.parse(keyJson),
  scopes: ['https://www.googleapis.com/auth/webmasters.readonly'],
})
const sc = google.searchconsole({ version: 'v1', auth })

const pages: [string, string][] = [
  ['olivovy-olej-na-plet-a-vlasy', '2026-06-01'],
  ['olivovy-olej-s-citronem-po-rano', '2026-06-01'],
  ['je-olivovy-olej-zdravy', '2026-05-31'],
  ['olivovy-olej-ve-spreji', '2026-06-02'],
  ['rafinovany-olivovy-olej', '2026-06-02'],
  ['domaci-olivovy-olej', '2026-06-03'],
  ['olivovy-olej-vs-slunecnicovy', '2026-06-03'],
  ['kalamata-pdo-olivovy-olej', '2026-06-03'],
  ['extra-panensky-vs-panensky-vs-rafinovany', '2026-05-07 (Vlna1)'],
  ['polyfenoly-kolik-je-dost', '2026-05-07 (Vlna1)'],
  ['polyfenoly-proc-na-nich-zalezi', '2026-05-03 (Vlna1)'],
  ['olivovy-olej-z-pokrutin', '? starší'],
]

function fmt(d: Date) {
  return d.toISOString().slice(0, 10)
}

async function main() {
  const endDate = new Date()
  const startDate = new Date()
  startDate.setDate(endDate.getDate() - 28)

  for (const [slug, created] of pages) {
    const url = `https://olivator.cz/pruvodce/${slug}`
    try {
      const res = await sc.searchanalytics.query({
        siteUrl,
        requestBody: {
          startDate: fmt(startDate),
          endDate: fmt(endDate),
          dimensions: ['page'],
          dimensionFilterGroups: [
            { filters: [{ dimension: 'page', operator: 'equals', expression: url }] },
          ],
          rowLimit: 1,
        },
      })
      const row = (res.data.rows ?? [])[0]
      if (row) {
        console.log(
          `${slug} (created ${created}): clicks=${row.clicks} impressions=${row.impressions} ctr=${((row.ctr ?? 0) * 100).toFixed(1)}% pos=${(row.position ?? 0).toFixed(1)}`
        )
      } else {
        console.log(`${slug} (created ${created}): ŽÁDNÁ DATA (0 impressions / možná neindexováno)`)
      }
    } catch (e) {
      console.log(`${slug}: ERROR ${(e as Error).message}`)
    }
  }
}

main()
