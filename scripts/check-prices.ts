#!/usr/bin/env tsx
/**
 * CI price lint — UZÁVĚRA-2.
 *
 * Hledá statické ceny (\d+ Kč / \d+ € apod.) v MDX a TS review souborech,
 * které jsou MIMO {{product:slug}} nebo {{price:...}} tokeny.
 * Statická cena v obsahu = drift riziko (cena se změní, text ne).
 *
 * Výstup: seznam souborů a řádků s varováním. Neblokuje build (exit 0),
 * ale zobrazí WARNING v CI logu.
 *
 * Spouštění: tsx scripts/check-prices.ts
 */

import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative, extname } from 'node:path'

const ROOT = join(__dirname, '..')

const PRICE_RE = /\b(\d[\d\s]*[\d])\s*(Kč|CZK|€|EUR)(?=[\s.,;!?)\]"']|$)/g
const TOKEN_LINE_RE = /\{\{(?:product|price):[^}]+\}\}/

// Vzory pro editorial cenové rozsahy — méně přísné (jen INFO, ne WARNING)
// "250–320 Kč za litr" = editorially OK (rozsah, ne konkrétní cena produktu)
const RANGE_RE = /\b\d+[–\-]\d+\s*(Kč|CZK|€|EUR)\b/

const SKIP_DIRS = new Set(['node_modules', '.next', '.git', '.claude', 'dist'])
const SKIP_FILES = new Set(['CLAUDE.md', 'BUGS.md', 'BACKLOG.md', 'DESIGN_REFERENCE.html'])
const TARGET_EXTS = new Set(['.mdx', '.md'])

interface Violation {
  file: string
  line: number
  text: string
  severity: 'WARNING' | 'INFO'
}

function collectFiles(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    if (SKIP_DIRS.has(entry)) continue
    const full = join(dir, entry)
    const s = statSync(full)
    if (s.isDirectory()) collectFiles(full, out)
    else if (TARGET_EXTS.has(extname(full)) && !SKIP_FILES.has(entry)) out.push(full)
  }
  return out
}

function checkFile(filePath: string, violations: Violation[]): void {
  const lines = readFileSync(filePath, 'utf8').split('\n')
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (TOKEN_LINE_RE.test(line)) continue         // řádek s tokenem → přeskočit
    if (line.trim().startsWith('//')) continue      // komentář
    if (line.trim().startsWith('*')) continue       // JSDoc
    if (line.includes('price_czk') || line.includes('price:')) continue // TS kód

    const matches = [...line.matchAll(PRICE_RE)]
    for (const m of matches) {
      const isRange = RANGE_RE.test(line)
      violations.push({
        file: relative(ROOT, filePath),
        line: i + 1,
        text: line.trim().slice(0, 120),
        severity: isRange ? 'INFO' : 'WARNING',
      })
    }
  }
}

function main() {
  // Skenujeme jen content/ — editorial MDX soubory.
  // docs/, scripts/ a root *.md jsou plánování, ne živý obsah.
  const contentDir = join(ROOT, 'content')

  // Adresář content/ není v gitu (MDX soubory jsou velké, živý obsah).
  // Na Railway (čistý git clone) neexistuje → přeskoč bez chyby.
  try {
    statSync(contentDir)
  } catch {
    console.log('[check-prices] ✓ content/ neexistuje (Railway build) — přeskakuji')
    process.exit(0)
  }

  const files = collectFiles(contentDir)
  const violations: Violation[] = []
  for (const f of files) checkFile(f, violations)

  if (!violations.length) {
    console.log(`[check-prices] ✓ Žádné statické ceny v ${files.length} souborech`)
    process.exit(0)
  }

  const warnings = violations.filter(v => v.severity === 'WARNING')
  const infos = violations.filter(v => v.severity === 'INFO')

  if (infos.length) {
    console.log(`[check-prices] INFO — cenové rozsahy (editorial OK, ale ověř aktuálnost):`)
    for (const v of infos) {
      console.log(`  ${v.file}:${v.line}  ${v.text.slice(0, 80)}`)
    }
    console.log()
  }

  if (warnings.length) {
    console.warn(`[check-prices] ⚠ ${warnings.length} statická(-ých) cen mimo tokeny:`)
    for (const v of warnings) {
      console.warn(`  ${v.file}:${v.line}  ${v.text.slice(0, 80)}`)
    }
    console.warn('\n  Řešení: nahraď statickou cenu tokenem {{product:slug}} nebo odstraň.')
  }

  // Neblokujeme build — jen informujeme
  process.exit(0)
}

main()
