/**
 * Standalone coverage check — pro každý XML retailer porovná feed vs web.
 * CLI verze /api/admin/retailers/coverage-check endpointu.
 *
 * Spuštění: npx tsx scripts/coverage-check.ts
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

// Env loading musí proběhnout PŘED dynamickým importem libů které
// inicializují Supabase client při loadu (lib/supabase.ts).
try {
  const envFile = readFileSync(resolve(process.cwd(), '.env.local'), 'utf-8')
  for (const line of envFile.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq < 0) continue
    const key = trimmed.slice(0, eq).trim()
    let value = trimmed.slice(eq + 1).trim()
    if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1)
    if (!process.env[key]) process.env[key] = value
  }
} catch {
  // .env.local missing — předpokládáme že běží přes Railway (env už set)
}

async function main() {
  // Dynamic imports AŽ po env loading — supabase singleton se vytvoří správně.
  const { supabaseAdmin } = await import('@/lib/supabase')
  const { checkRetailerCoverage } = await import('@/lib/coverage-check')

  const { data, error } = await supabaseAdmin
    .from('retailers')
    .select('slug, domain, xml_feed_url')
    .not('xml_feed_url', 'is', null)
    .eq('is_active', true)
    .order('slug')

  if (error) {
    console.error('Error:', error.message)
    process.exit(1)
  }
  if (!data || data.length === 0) {
    console.log('Žádný aktivní XML retailer.')
    process.exit(0)
  }

  console.log(`\n=== Coverage check pro ${data.length} XML retailerů ===\n`)

  for (const r of data) {
    const report = await checkRetailerCoverage({
      slug: r.slug as string,
      domain: r.domain as string,
      xmlFeedUrl: r.xml_feed_url as string | null,
    })

    const icon = {
      ok: '✅',
      warn: '⚠️ ',
      critical: '🚨',
      no_feed: '⏭️ ',
      error: '❌',
    }[report.status]

    console.log(`${icon} ${report.retailerSlug.toUpperCase()} (${report.domain})`)
    console.log(`   Feed: ${report.feedOilsCount} olejů`)
    console.log(`   Web:  ~${report.webOilsTotal} produktů (max z paths)`)
    if (report.webPathsFound.length > 0) {
      for (const p of report.webPathsFound) {
        console.log(`         ${p.path} → ${p.productCount}`)
      }
    }
    console.log(`   Diff: ${report.diffPct}%`)
    console.log(`   ${report.message}`)
    console.log()
  }
}

main().catch((err) => {
  console.error('FATAL:', err)
  process.exit(1)
})
