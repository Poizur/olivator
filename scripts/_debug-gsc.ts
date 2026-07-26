// Lokální test GSC připojení s JSON klíčem
import { google } from 'googleapis'
import { readFileSync } from 'fs'

const KEY_PATH = '/Users/martinnavratil/Downloads/only5l-agent-34f7ae036105.json'
const SITE_URL = 'sc-domain:olivator.cz'

async function main() {
  let key: Record<string, string>
  try {
    key = JSON.parse(readFileSync(KEY_PATH, 'utf-8'))
    console.log('✓ JSON klíč načten')
    console.log('  project_id:', key.project_id)
    console.log('  client_email:', key.client_email)
    console.log('  private_key_id:', key.private_key_id)
  } catch (e) {
    console.error('✗ Nelze načíst JSON:', (e as Error).message)
    return
  }

  try {
    const auth = new google.auth.GoogleAuth({
      credentials: key,
      scopes: ['https://www.googleapis.com/auth/webmasters.readonly'],
    })
    console.log('✓ Auth objekt vytvořen')

    const sc = google.searchconsole({ version: 'v1', auth })
    
    // Nejdřív zkus seznam properties
    const sites = await sc.sites.list()
    console.log('✓ Sites list OK — properties:')
    for (const s of (sites.data.siteEntry ?? [])) {
      console.log(' ', s.siteUrl, '—', s.permissionLevel)
    }

    // Pak zkus query
    const res = await sc.searchanalytics.query({
      siteUrl: SITE_URL,
      requestBody: {
        startDate: '2026-04-01',
        endDate: '2026-05-27',
        dimensions: ['query'],
        rowLimit: 5,
      },
    })
    console.log('\n✓ Query OK — rows:', res.data.rows?.length ?? 0)
    if (res.data.rows?.length) {
      for (const r of res.data.rows.slice(0, 3)) {
        console.log(' ', r.keys?.[0], '— clicks:', r.clicks)
      }
    } else {
      console.log('  (žádná data — web ještě nemá GSC historii)')
    }
  } catch (e) {
    console.error('✗ GSC API chyba:', (e as Error).message)
  }
}

main()
