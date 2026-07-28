// Simulace validate-tokens logiky pro ověření fixů (BUG A + BUG B)
// Spustit: npx tsx scripts/cron/validate-tokens-sim.ts
// Nevolá DB ani email — čistá logika.

// ─── Typy ────────────────────────────────────────────────────────────────────

interface BrokenReport { articleSlug: string; tokens: string[]; severity: 'critical' | 'warning' }
interface NewlyBroken  { articleSlug: string; tokens: string[] }

interface SimInput {
  label: string
  /** Broken tokeny v článcích: { articleSlug → [productSlug, ...] } */
  currentBroken: Record<string, string[]>
  /** Které produkty jsou karanténní (z opravené quarantine detekce) */
  quarantineProducts: Set<string>
  /** Uložený snapshot z předchozího runu ({ articleSlug → [slug, ...] }) */
  prevSnapshot: Record<string, string[]>
  isMonday: boolean
}

// ─── Core logika (kopie z validate-tokens.ts, bez DB) ────────────────────────

function simulate(input: SimInput) {
  const { label, currentBroken, quarantineProducts, prevSnapshot, isMonday } = input

  const manualReports: BrokenReport[] = []
  const newlyBrokenArticles: NewlyBroken[] = []
  const currentSnapshot: Record<string, string[]> = {}
  let quarantineTokenCount = 0
  const quarantineArticles = new Set<string>()

  for (const [articleSlug, brokenSlugs] of Object.entries(currentBroken)) {
    if (brokenSlugs.length === 0) continue

    currentSnapshot[articleSlug] = brokenSlugs

    const quarantineSlugs = brokenSlugs.filter(s => quarantineProducts.has(s))
    const realProblemSlugs = brokenSlugs.filter(s => !quarantineProducts.has(s))

    if (quarantineSlugs.length > 0) {
      quarantineTokenCount += quarantineSlugs.length
      quarantineArticles.add(articleSlug)
    }

    if (realProblemSlugs.length > 0) {
      const hasMissing = realProblemSlugs.some(s => s.startsWith('missing-'))
      manualReports.push({
        articleSlug,
        tokens: realProblemSlugs,
        severity: hasMissing ? 'critical' : 'warning',
      })
    }

    const prevBroken = prevSnapshot[articleSlug] ?? []
    const newlySeen = brokenSlugs.filter(s => !prevBroken.includes(s))
    if (newlySeen.length > 0) {
      newlyBrokenArticles.push({ articleSlug, tokens: newlySeen })
    }
  }

  const hasRealProblems = manualReports.length > 0
  const hasNewIssues = newlyBrokenArticles.length > 0
  const shouldSendEmail = hasRealProblems || hasNewIssues || (isMonday && quarantineTokenCount > 0)

  // ─── Output ──────────────────────────────────────────────────────────────
  console.log(`\n${'═'.repeat(70)}`)
  console.log(`SCÉNÁŘ: ${label}`)
  console.log('═'.repeat(70))
  console.log(`  broken celkem: ${Object.values(currentBroken).flat().length} tokenů`)
  console.log(`  karanténní:    ${quarantineTokenCount} tokenů v ${quarantineArticles.size} článcích`)
  console.log(`  reálné problémy: ${manualReports.length} článků`)
  console.log(`  nové od včerejška: ${newlyBrokenArticles.length} článků`)
  console.log(`  je pondělí: ${isMonday}`)
  console.log(`\n→ shouldSendEmail = ${shouldSendEmail}`)

  if (!shouldSendEmail) {
    console.log('→ TICHO — email se nepošle ✓')
  } else {
    const subjectParts: string[] = []
    if (hasNewIssues) subjectParts.push(`${newlyBrokenArticles.length} nové`)
    if (hasRealProblems) subjectParts.push(`${manualReports.length} vyžaduje pozornost`)
    if (isMonday && !hasRealProblems && !hasNewIssues) subjectParts.push(`souhrn: ${quarantineTokenCount} v karanténě`)
    const subject = `[Olivator] Tokeny: ${subjectParts.join(', ')}`
    console.log(`→ EMAIL ODESLÁN`)
    console.log(`   Subject: ${subject}`)
    if (hasNewIssues) {
      console.log(`   🆕 Nové: ${newlyBrokenArticles.map(r => `${r.articleSlug} [${r.tokens.join(', ')}]`).join('; ')}`)
    }
    if (hasRealProblems) {
      console.log(`   ⚠️  Vyžaduje pozornost: ${manualReports.map(r => `${r.articleSlug} [${r.tokens.join(', ')}]`).join('; ')}`)
    }
    if (quarantineTokenCount > 0) {
      console.log(`   ⏳ Čeká na legalizaci: ${quarantineTokenCount} tokenů v ${quarantineArticles.size} článcích (summary)`)
    }
  }
  console.log(`→ Snapshot pro příští run: ${JSON.stringify(currentSnapshot)}\n`)
}

// ─── Testovací data ───────────────────────────────────────────────────────────

// Situace: 3 karanténní tokeny existují v DB (produkty Coratina apod.)
const QUARANTINE_PRODUCTS = new Set([
  'coratina-premium-500ml',
  'bio-evoo-kreta-250ml',
  'sitia-gold-1l',
])

// Snapshot uložený po dnešním runu (po předchozích bězích):
const PREV_SNAPSHOT_STABLE: Record<string, string[]> = {
  'nejlepsi-olivovy-olej-2026': ['coratina-premium-500ml', 'bio-evoo-kreta-250ml'],
  'recept-bruschetta': ['sitia-gold-1l'],
}

// ─── Scénář 1: Stejný stav jako včera → TICHO ────────────────────────────────

simulate({
  label: 'Scénář 1: Stejný stav jako včera → očekáváno TICHO',
  currentBroken: {
    'nejlepsi-olivovy-olej-2026': ['coratina-premium-500ml', 'bio-evoo-kreta-250ml'],
    'recept-bruschetta': ['sitia-gold-1l'],
  },
  quarantineProducts: QUARANTINE_PRODUCTS,
  prevSnapshot: PREV_SNAPSHOT_STABLE,
  isMonday: false,
})

// ─── Scénář 2: 1 nový ne-karanténní broken token ─────────────────────────────

simulate({
  label: 'Scénář 2: 1 nový ne-karanténní token → email s 1 problémem + karanténní souhrn',
  currentBroken: {
    'nejlepsi-olivovy-olej-2026': ['coratina-premium-500ml', 'bio-evoo-kreta-250ml'],
    'recept-bruschetta': ['sitia-gold-1l'],
    'pruvodce-zdravotni-benefity': ['kyselina-oleinova-studie-500ml'], // ← nový, ne-karanténní
  },
  quarantineProducts: QUARANTINE_PRODUCTS,
  prevSnapshot: PREV_SNAPSHOT_STABLE,
  isMonday: false,
})

// ─── Scénář 3: Pondělní souhrn, jen karanténní (bez nových) ──────────────────

simulate({
  label: 'Scénář 3: Pondělí, jen karanténní → týdenní souhrn email',
  currentBroken: {
    'nejlepsi-olivovy-olej-2026': ['coratina-premium-500ml', 'bio-evoo-kreta-250ml'],
    'recept-bruschetta': ['sitia-gold-1l'],
  },
  quarantineProducts: QUARANTINE_PRODUCTS,
  prevSnapshot: PREV_SNAPSHOT_STABLE,
  isMonday: true,
})
