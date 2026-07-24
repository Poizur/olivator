/**
 * Adds flavor_labels text[] column to products table via Supabase Management API.
 */

import https from 'https'

const PROJECT_REF = 'dyaloliwynmfnpjemzrh'
const MGMT_TOKEN = process.env.SUPABASE_MANAGEMENT_TOKEN!

const body = JSON.stringify({
  query: "ALTER TABLE products ADD COLUMN IF NOT EXISTS flavor_labels text[] NOT NULL DEFAULT '{}';"
})

const options = {
  hostname: 'api.supabase.com',
  path: `/v1/projects/${PROJECT_REF}/database/query`,
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${MGMT_TOKEN}`,
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(body),
  },
}

const req = https.request(options, (res) => {
  let data = ''
  res.on('data', (chunk) => { data += chunk })
  res.on('end', () => {
    if (res.statusCode === 200 || res.statusCode === 201) {
      console.log('✅ Sloupec flavor_labels přidán (nebo již existoval)')
    } else {
      console.error(`❌ HTTP ${res.statusCode}:`, data)
      process.exit(1)
    }
  })
})

req.on('error', (e) => { console.error('Chyba:', e); process.exit(1) })
req.write(body)
req.end()
