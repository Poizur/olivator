/**
 * validate-article-products.ts — CLI validace produktových dat v článcích.
 *
 * Zkontroluje každý /olej/slug odkaz v body_markdown:
 *   ❌ ERROR  — produkt neexistuje v DB
 *   ❌ ERROR  — hardcoded score / kyselost neodpovídá DB
 *   ⚠️ WARNING — polyfenoly / cena se liší víc než tolerance
 *
 * Run:
 *   npx tsx --env-file=.env.local scripts/validate-article-products.ts
 *   npx tsx --env-file=.env.local scripts/validate-article-products.ts --slug=nejlepsi-olivovy-olej-2026
 *   npx tsx --env-file=.env.local scripts/validate-article-products.ts --all
 *
 * Exit code: 0 = vše OK, 1 = alespoň jeden ERROR
 */

import { validateArticle, validateAllArticles } from '@/lib/article-validator'
import type { ValidationResult, ValidationIssue } from '@/lib/article-validator'

// ── ANSI barvy ───────────────────────────────────────────────────────────────

const R  = '\x1b[31m'   // červená — ERROR
const Y  = '\x1b[33m'   // žlutá  — WARNING
const G  = '\x1b[32m'   // zelená — OK
const B  = '\x1b[34m'   // modrá  — info
const DIM = '\x1b[2m'
const RST = '\x1b[0m'

// ── CLI args ─────────────────────────────────────────────────────────────────

const targetSlug = process.argv.find(a => a.startsWith('--slug='))?.split('=')[1]
const runAll     = process.argv.includes('--all') || !targetSlug

// ── Issue type labels ─────────────────────────────────────────────────────────

const TYPE_LABEL: Record<string, string> = {
  missing_product: 'Produkt neexistuje v DB',
  wrong_score:     'Špatné Score',
  wrong_acidity:   'Špatná kyselost',
  wrong_poly:      'Odchylka polyfenoly',
  wrong_price:     'Zastaralá cena',
}

function formatIssue(issue: ValidationIssue): string {
  const icon  = issue.severity === 'error' ? `${R}❌ ERROR${RST}` : `${Y}⚠ WARN ${RST}`
  const label = TYPE_LABEL[issue.type] ?? issue.type
  let detail  = ''

  if (issue.type === 'missing_product') {
    detail = `slug "${issue.productSlug}" — nenalezen v DB`
  } else {
    detail = `"${issue.productSlug}" — v článku: ${issue.articleValue}, v DB: ${issue.dbValue ?? '—'}`
  }

  const ctx = issue.context
    ? `\n         ${DIM}…${issue.context.trim().slice(0, 100).replace(/\n/g, ' ')}…${RST}`
    : ''

  return `  ${icon}  [${label}] ${detail}${ctx}`
}

function printResult(r: ValidationResult) {
  const total = r.errors.length + r.warnings.length
  if (total === 0) {
    console.log(`  ${G}✓ OK${RST}  ${r.articleSlug}`)
    return
  }

  const badge = r.errors.length > 0 ? `${R}CHYBY: ${r.errors.length}${RST}` : ''
  const wbadge = r.warnings.length > 0 ? `${Y}VAROVÁNÍ: ${r.warnings.length}${RST}` : ''
  const badges = [badge, wbadge].filter(Boolean).join('  ')
  console.log(`\n${B}── ${r.articleSlug} ${RST}${badges}`)

  for (const issue of [...r.errors, ...r.warnings]) {
    console.log(formatIssue(issue))
  }
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('\nOlivator — Validace produktových dat v článcích')
  console.log('═'.repeat(52) + '\n')

  let results: ValidationResult[]

  if (targetSlug) {
    console.log(`${B}Validuji článek: ${targetSlug}${RST}\n`)
    results = [await validateArticle(targetSlug)]
  } else {
    console.log(`${B}Validuji všechny aktivní + draft články…${RST}\n`)
    results = await validateAllArticles()
  }

  let totalErrors   = 0
  let totalWarnings = 0

  for (const r of results) {
    printResult(r)
    totalErrors   += r.errors.length
    totalWarnings += r.warnings.length
  }

  console.log('\n' + '═'.repeat(52))
  console.log(`Celkem článků: ${results.length}`)

  if (totalErrors > 0) {
    console.log(`${R}❌ Chyby: ${totalErrors}${RST}  ${Y}⚠ Varování: ${totalWarnings}${RST}`)
    console.log(`\n${R}Validace selhala — oprav chyby před publish.${RST}\n`)
    process.exit(1)
  } else if (totalWarnings > 0) {
    console.log(`${G}✓ Žádné chyby${RST}  ${Y}⚠ Varování: ${totalWarnings}${RST}`)
    console.log(`\n${G}Validace prošla (varování jsou informatívní).${RST}\n`)
  } else {
    console.log(`${G}✓ Vše OK — žádné chyby ani varování.${RST}\n`)
  }
}

main().catch(err => {
  console.error('Validace selhala s neočekávanou chybou:', err)
  process.exit(1)
})
