/**
 * check-recent-products.ts
 * Zkontroluj produkty upravené dnes (od půlnoci) na bad chars,
 * a přitom fetchuj raw text (ne přes Supabase JS klienta).
 *
 * Run: env -u ANTHROPIC_API_KEY npx tsx --env-file=.env.local scripts/check-recent-products.ts
 */
const CTRL = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g

async function rawGet(path: string, params: Record<string, string> = {}): Promise<string> {
  const url = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL! + path)
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v)
  const res = await fetch(url.toString(), {
    headers: {
      apikey: process.env.SUPABASE_SERVICE_KEY!,
      Authorization: `Bearer ${process.env.SUPABASE_SERVICE_KEY!}`,
      Accept: 'application/json',
    },
  })
  return res.text()
}

async function main() {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const since = today.toISOString()

  console.log('Checking products updated since', since)

  const txt = await rawGet('/rest/v1/products', {
    select: 'id,slug,status,updated_at,description_long,description_short,name',
    updated_at: `gte.${since}`,
    order: 'updated_at.desc',
    limit: '100',
  })

  let data: Record<string, string | null>[]
  try {
    data = JSON.parse(txt)
  } catch (e: unknown) {
    console.error('RAW fetch JSON.parse FAILED:', (e as Error).message)
    console.log('First 500 chars of response:', txt.slice(0, 500))
    // Find the bad char
    const matches = [...txt.matchAll(CTRL)]
    for (const m of matches.slice(0, 5)) {
      const pos = m.index!
      console.log(`  bad char at pos=${pos} code=0x${txt.charCodeAt(pos).toString(16)} ctx=${JSON.stringify(txt.slice(Math.max(0, pos-80), pos+80))}`)
    }
    return
  }

  console.log(`Found ${data.length} recently updated products`)

  for (const row of data) {
    for (const [k, v] of Object.entries(row)) {
      if (typeof v === 'string' && CTRL.test(v)) {
        console.log(`DIRTY: ${row.slug} [${k}] has control chars`)
      }
    }
  }

  // Also check products that are 'draft' - might have been just imported
  console.log('\nChecking draft products...')
  const draftTxt = await rawGet('/rest/v1/products', {
    select: 'id,slug,status,description_long,description_short',
    status: 'eq.draft',
    order: 'created_at.desc',
    limit: '50',
  })

  try {
    const drafts = JSON.parse(draftTxt) as Record<string, string | null>[]
    console.log(`Found ${drafts.length} draft products`)
    for (const row of drafts) {
      for (const [k, v] of Object.entries(row)) {
        if (typeof v === 'string' && CTRL.test(v)) {
          console.log(`DIRTY DRAFT: ${row.slug} [${k}]`)
        }
      }
    }
  } catch {
    console.error('Draft fetch parse failed')
    const matches = [...draftTxt.matchAll(CTRL)]
    for (const m of matches.slice(0, 3)) {
      const pos = m.index!
      console.log(`  pos=${pos} code=0x${draftTxt.charCodeAt(pos).toString(16)} ctx=${JSON.stringify(draftTxt.slice(Math.max(0, pos-80), pos+80))}`)
    }
  }
}

main().catch(e => {
  console.error(e)
  process.exit(1)
})
