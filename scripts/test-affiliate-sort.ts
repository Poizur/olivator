/**
 * Rychlý test pro sortOffersAffiliate logiku.
 * Spuštění: npx tsx scripts/test-affiliate-sort.ts
 */

interface Offer { price: number; affiliateUrl: string }

function sortOffersAffiliate(offers: Offer[]): Offer[] {
  if (offers.length <= 1) return offers
  const cheapestPrice = Math.min(...offers.map(o => o.price))
  return [...offers].sort((a, b) => {
    const aAff = !!a.affiliateUrl
    const bAff = !!b.affiliateUrl
    const aIn5 = aAff && a.price <= cheapestPrice * 1.05
    const bIn5 = bAff && b.price <= cheapestPrice * 1.05
    if (aIn5 && !bIn5) return -1
    if (bIn5 && !aIn5) return 1
    return a.price - b.price
  })
}

let passed = 0
let failed = 0

function assert(label: string, condition: boolean) {
  if (condition) {
    console.log(`  ✓ ${label}`)
    passed++
  } else {
    console.error(`  ✗ ${label}`)
    failed++
  }
}

console.log('\nAffiliate sort testy:\n')

// Test 1: butik 100 Kč vs affiliate 104 Kč (4 % nad nejlevnější) → affiliate první
{
  const result = sortOffersAffiliate([
    { price: 100, affiliateUrl: '' },
    { price: 104, affiliateUrl: 'https://affiliate.example/link' },
  ])
  assert('Butik 100 vs affiliate 104 → affiliate první', result[0].affiliateUrl !== '')
}

// Test 2: butik 100 Kč vs affiliate 106 Kč (6 % nad nejlevnější) → butik první
{
  const result = sortOffersAffiliate([
    { price: 100, affiliateUrl: '' },
    { price: 106, affiliateUrl: 'https://affiliate.example/link' },
  ])
  assert('Butik 100 vs affiliate 106 → butik první', result[0].affiliateUrl === '')
}

// Test 3: affiliate 100 Kč vs butik 100 Kč (stejná cena) → affiliate první
{
  const result = sortOffersAffiliate([
    { price: 100, affiliateUrl: '' },
    { price: 100, affiliateUrl: 'https://affiliate.example/link' },
  ])
  assert('Stejná cena → affiliate první', result[0].affiliateUrl !== '')
}

// Test 4: přesně 5 % → affiliate první (hranice)
{
  const result = sortOffersAffiliate([
    { price: 100, affiliateUrl: '' },
    { price: 105, affiliateUrl: 'https://affiliate.example/link' },
  ])
  assert('Přesně 5 % (105 Kč) → affiliate první', result[0].affiliateUrl !== '')
}

// Test 5: dvě affiliate nabídky → seřadit cenou
{
  const result = sortOffersAffiliate([
    { price: 120, affiliateUrl: 'https://aff-a.example' },
    { price: 100, affiliateUrl: 'https://aff-b.example' },
  ])
  assert('Dvě affiliate → nejlevnější první', result[0].price === 100)
}

// Test 6: jeden nabídka → beze změny
{
  const result = sortOffersAffiliate([{ price: 200, affiliateUrl: '' }])
  assert('Jedna nabídka → beze změny', result.length === 1 && result[0].price === 200)
}

// Test 7: žádná affiliate nabídka → seřadit cenou
{
  const result = sortOffersAffiliate([
    { price: 150, affiliateUrl: '' },
    { price: 100, affiliateUrl: '' },
    { price: 120, affiliateUrl: '' },
  ])
  assert('Žádná affiliate → seřadit cenou', result[0].price === 100 && result[1].price === 120)
}

console.log(`\n${passed} prošlo, ${failed} selhalo\n`)
if (failed > 0) process.exit(1)
