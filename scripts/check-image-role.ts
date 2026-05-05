/**
 * Check image_role column existence via direct PostgREST.
 * Run: node --env-file=.env.local --import tsx scripts/check-image-role.ts
 */

async function checkImageRoleMain() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const key = process.env.SUPABASE_SERVICE_KEY!

  // Force schema reload
  console.log('1) Pinging /rest/v1/ to force schema reload...')
  await fetch(`${url}/rest/v1/`, { headers: { apikey: key, Authorization: `Bearer ${key}` } })

  console.log('2) Selecting image_role column directly via PostgREST...')
  const res = await fetch(`${url}/rest/v1/entity_images?select=id,image_role&limit=1`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
  })
  const text = await res.text()
  console.log(`   HTTP ${res.status}:`)
  console.log(`   ${text}`)
  console.log()

  console.log('3) Checking column metadata via /rest/v1/?columns=...')
  const meta = await fetch(`${url}/rest/v1/entity_images?select=*&limit=0`, {
    headers: { apikey: key, Authorization: `Bearer ${key}`, Prefer: 'count=exact' },
  })
  console.log(`   HTTP ${meta.status}, content-range: ${meta.headers.get('content-range')}`)
  console.log()

  console.log('4) Try filtering by image_role=logo (should return 0 if column exists, 400 if not)...')
  const filter = await fetch(`${url}/rest/v1/entity_images?image_role=eq.logo&limit=1`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
  })
  console.log(`   HTTP ${filter.status}: ${(await filter.text()).slice(0, 200)}`)
}

checkImageRoleMain().catch((e) => {
  console.error(e)
  process.exit(1)
})
