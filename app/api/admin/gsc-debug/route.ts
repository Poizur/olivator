// Temporary debug endpoint — smaž po vyřešení GSC.
// Auth: Admin-Secret header.
import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { google } from 'googleapis'

export async function GET() {
  const hdrs = await headers()
  if (hdrs.get('x-admin-secret') !== process.env.ADMIN_SECRET_KEY) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const keyJson = process.env.GSC_SERVICE_ACCOUNT_KEY
  const siteUrl = process.env.GSC_SITE_URL

  if (!keyJson) return NextResponse.json({ error: 'GSC_SERVICE_ACCOUNT_KEY chybí' })
  if (!siteUrl) return NextResponse.json({ error: 'GSC_SITE_URL chybí' })

  let key: Record<string, string>
  try {
    key = JSON.parse(keyJson)
  } catch (e) {
    return NextResponse.json({ error: 'JSON parse failed: ' + (e as Error).message, first50: keyJson.slice(0, 50) })
  }

  try {
    const auth = new google.auth.GoogleAuth({
      credentials: key,
      scopes: ['https://www.googleapis.com/auth/webmasters.readonly'],
    })
    const sc = google.searchconsole({ version: 'v1', auth })

    // List all accessible sites
    const sites = await sc.sites.list()
    const siteList = (sites.data.siteEntry ?? []).map(s => ({ url: s.siteUrl, perm: s.permissionLevel }))

    // Try query on provided siteUrl
    let queryResult: string
    try {
      const end = new Date()
      const start = new Date()
      start.setDate(end.getDate() - 28)
      const fmt = (d: Date) => d.toISOString().slice(0, 10)

      const res = await sc.searchanalytics.query({
        siteUrl,
        requestBody: { startDate: fmt(start), endDate: fmt(end), dimensions: ['query'], rowLimit: 3 },
      })
      queryResult = `OK — ${res.data.rows?.length ?? 0} řádků`
    } catch (qe) {
      queryResult = 'CHYBA: ' + (qe as Error).message
    }

    return NextResponse.json({
      configuredSiteUrl: siteUrl,
      clientEmail: key.client_email,
      privateKeyId: key.private_key_id,
      accessibleSites: siteList,
      queryResult,
    })
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message })
  }
}
