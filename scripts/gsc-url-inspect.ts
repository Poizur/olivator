// Jednorázová kontrola: GSC URL Inspection API + presny landing page pro danou query.
// npx tsx --env-file=.env.local scripts/gsc-url-inspect.ts
import { google } from 'googleapis'

const keyJson = process.env.GSC_SERVICE_ACCOUNT_KEY!
const siteUrl = process.env.GSC_SITE_URL!

const auth = new google.auth.GoogleAuth({
  credentials: JSON.parse(keyJson),
  scopes: ['https://www.googleapis.com/auth/webmasters.readonly'],
})

function fmt(d: Date) {
  return d.toISOString().slice(0, 10)
}

async function landingPageForQuery(query: string) {
  const sc = google.searchconsole({ version: 'v1', auth })
  const endDate = new Date()
  const startDate = new Date()
  startDate.setDate(endDate.getDate() - 28)
  const res = await sc.searchanalytics.query({
    siteUrl,
    requestBody: {
      startDate: fmt(startDate),
      endDate: fmt(endDate),
      dimensions: ['page'],
      dimensionFilterGroups: [
        { filters: [{ dimension: 'query', operator: 'equals', expression: query }] },
      ],
      rowLimit: 10,
    },
  })
  return res.data.rows ?? []
}

async function inspectUrl(url: string) {
  const client = await auth.getClient()
  const token = await client.getAccessToken()
  const res = await fetch('https://searchconsole.googleapis.com/v1/urlInspection/index:inspect', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token.token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ inspectionUrl: url, siteUrl }),
  })
  return res.json()
}

async function main() {
  console.log('=== Landing page pro "kde koupit kvalitní olivový olej" ===')
  const rows = await landingPageForQuery('kde koupit kvalitní olivový olej')
  console.log(JSON.stringify(rows, null, 2))

  console.log('\n=== URL Inspection: polyfenoly-proc-na-nich-zalezi ===')
  try {
    const result = await inspectUrl('https://olivator.cz/pruvodce/polyfenoly-proc-na-nich-zalezi')
    console.log(JSON.stringify(result, null, 2))
  } catch (e) {
    console.log('ERROR:', (e as Error).message)
  }
}

main()
