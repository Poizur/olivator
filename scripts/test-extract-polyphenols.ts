// Unit test for extractPolyphenols comparative context guard.
// Run: npx tsx scripts/test-extract-polyphenols.ts

import { extractPolyphenols } from '../lib/product-scraper'

let passed = 0
let failed = 0

function assert(label: string, actual: number | null, expected: number | null) {
  if (actual === expected) {
    console.log(`  ✓ ${label}`)
    passed++
  } else {
    console.error(`  ✗ ${label} — expected ${expected}, got ${actual}`)
    failed++
  }
}

console.log('\nextractPolyphenols — unit tests\n')

// KROK B validation: comparative context EVOLIA 2777
// Root cause: "...SITIA má 479mg/kg polyfenolů. Tento olej EVOLIA je mnohem výš..."
assert(
  'EVOLIA 2777 — comparative context (must return 2777, not 479)',
  extractPolyphenols(
    'kvalitní oleje mohou obsahovat více než 400 mg na kg. Např. SITIA 0,2%, která má 479mg/kg polyfenolů. ' +
    'Tento olej EVOLIA je mnohem výš, je totiž úplně jiný. Obsah polyfenolů: 2 777 mg/kg.'
  ),
  2777
)

// Standard cases — must still work
assert(
  'number before keyword: "2012 mg/kg polyfenolů"',
  extractPolyphenols('Obsah: 2012 mg/kg polyfenolů, kyselost 0,13%'),
  2012
)

assert(
  'number after keyword: "polyfenolů: 646"',
  extractPolyphenols('Polyfenolů: 646 mg/kg, lisováno za studena'),
  646
)

assert(
  'plus sign: "600+ polyfenolů"',
  extractPolyphenols('CORINTO Peloponés — 600+ polyfenolů Extra panenský olivový olej'),
  600
)

assert(
  'threshold marker — skip EU norm value',
  extractPolyphenols('Polyfenolů minimálně 250 mg/kg dle EU normy'),
  null
)

assert(
  'no polyphenol info',
  extractPolyphenols('Vynikající chuť, lisováno za studena na Krétě.'),
  null
)

assert(
  'vs. comparative marker',
  extractPolyphenols('vs. standardní oleje s 180mg/kg polyfenolů — tento má 920 mg/kg polyfenolů'),
  920
)

assert(
  'například marker skips first value',
  extractPolyphenols('Například běžné oleje mají 200 polyfenolů, zatímco náš má 850 polyfenolů.'),
  850
)

assert(
  'průměrný marker',
  extractPolyphenols('Průměrný olej obsahuje 300 polyfenolů. Náš dosahuje 1200 polyfenolů.'),
  1200
)

console.log(`\n${passed + failed} tests: ${passed} passed, ${failed} failed\n`)
if (failed > 0) process.exit(1)
