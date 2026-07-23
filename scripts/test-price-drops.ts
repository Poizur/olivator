#!/usr/bin/env tsx
// Sanity check pro getWeeklyPriceDrops — spusť před buildem UI
// npx tsx --env-file=.env.local scripts/test-price-drops.ts
import { getWeeklyPriceDrops } from '@/lib/price-drops'

async function main() {
  console.log('Načítám weekly price drops...\n')
  const result = await getWeeklyPriceDrops(50)

  console.log(`Celkem poklesů: ${result.totalCount}`)
  console.log(`Zobrazeno (limit 50): ${result.drops.length}`)
  console.log(`Aktualizováno: ${result.updatedAt}\n`)

  if (result.drops.length === 0) {
    console.log('Žádné poklesy za posledních 7 dní.')
    return
  }

  console.log('TOP poklesy:\n')
  for (const d of result.drops.slice(0, 15)) {
    const score = d.olivatorScore != null ? ` [score ${d.olivatorScore}]` : ''
    const aff = d.hasAffiliateUrl ? '✓' : '✗'
    console.log(
      `${d.dropPct.toString().padStart(2)}% (-${d.dropCzk} Kč)  ` +
      `${d.priceBefore} → ${d.priceNow} Kč  ` +
      `${d.retailerName.padEnd(18)}  ` +
      `aff:${aff}${score}  ` +
      `${d.name}`
    )
  }
}

main().catch(err => {
  console.error('CHYBA:', err)
  process.exit(1)
})
