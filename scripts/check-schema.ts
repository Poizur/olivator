#!/usr/bin/env tsx
/**
 * Build-time schema guard — UZÁVĚRA-1.
 *
 * Skenuje všechny *.ts/*.tsx soubory v projektu a hledá Supabase query vzory,
 * kde je explicitně jmenovaný sloupec. Křížuje je s schema-snapshot.json.
 *
 * Selže (exit 1) pokud kód referencuje sloupec, který v snapshotu neexistuje.
 * Snapshot aktualizuj skriptem: npm run schema:snapshot (po každé SQL migraci).
 *
 * Spouštění: tsx scripts/check-schema.ts
 */

import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative, extname } from 'node:path'

const ROOT = join(__dirname, '..')
const SNAPSHOT_PATH = join(ROOT, 'supabase', 'schema-snapshot.json')

const snapshot: Record<string, string[]> = JSON.parse(
  readFileSync(SNAPSHOT_PATH, 'utf8'),
)
delete (snapshot as Record<string, unknown>)['_meta']

const KNOWN_TABLES = new Set(Object.keys(snapshot))
const KNOWN_COLS: Record<string, Set<string>> = {}
for (const [t, cols] of Object.entries(snapshot)) {
  KNOWN_COLS[t] = new Set(cols as string[])
}

// Vzory pro Supabase JS client:
//   .from('table')  followed by .select('col1, col2, ...')
//   .from('table')  followed by .eq('col', val)
//   .from('table')  followed by .order('col', ...)
//   .from('table')  followed by .insert({ col: ... })
//   .from('table')  followed by .update({ col: ... })
const FROM_RE = /\.from\(['"]([a-z_]+)['"]\)/g
const SELECT_RE = /\.select\(['"]([^'"]+)['"]\)/g
const FILTER_RE = /\.(?:eq|neq|gt|gte|lt|lte|like|ilike|is|in|contains|order|not)\(['"]([a-z_]+)['"]/g
const UPSERT_KEY_RE = /onConflict:\s*['"]([a-z_,\s]+)['"]/g

interface Issue {
  file: string
  line: number
  table: string
  col: string
  context: string
}

const SKIP_DIRS = new Set(['node_modules', '.next', '.git', '.claude', 'dist'])
const SKIP_TABLES = new Set(['_meta']) // pseudo-tables in snapshots

// Diagnostic / one-off scripts that intentionally reference stale or non-existent columns.
// These are not production code — skip from schema guard.
const SKIP_FILE_RE = /scripts\/(check-|_|debug-|feed-audit|diag)/

function collectFiles(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    if (SKIP_DIRS.has(entry)) continue
    const full = join(dir, entry)
    const stat = statSync(full)
    if (stat.isDirectory()) {
      collectFiles(full, out)
    } else if (['.ts', '.tsx'].includes(extname(full))) {
      if (!SKIP_FILE_RE.test(full.replace(/\\/g, '/'))) {
        out.push(full)
      }
    }
  }
  return out
}

function parseSelectCols(raw: string): string[] {
  // Strip join sub-selects before comma-splitting so their inner column names
  // are not wrongly attributed to the main table:
  //   "retailers!inner(slug, name)"  →  removed
  //   "brand:brands(slug, name)"     →  removed (alias:table(cols) pattern)
  //   "products(id)"                 →  removed
  const stripped = raw.replace(/(?:\w+:)?\w+!?\w*\([^)]*\)/g, '')
  return stripped
    .split(',')
    .map(s => s.trim())
    .filter(c => c && !c.startsWith('*') && !c.includes('...') && /^[a-z_]+$/.test(c))
}

function checkFile(filePath: string, issues: Issue[]): void {
  const src = readFileSync(filePath, 'utf8')
  const lines = src.split('\n')

  let currentTable: string | null = null
  let currentTableLine = 0

  // Single-pass: track .from() context and validate column refs
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const lineNo = i + 1

    // Detect .from('table')
    const fromMatches = [...line.matchAll(FROM_RE)]
    for (const m of fromMatches) {
      currentTable = m[1]
      currentTableLine = lineNo
      if (!KNOWN_TABLES.has(currentTable) && !SKIP_TABLES.has(currentTable)) {
        // Unknown table is a warning, not error (may be a new table before snapshot update)
        // Don't break build for unknown tables, only for wrong columns on known tables
      }
    }

    if (!currentTable || !KNOWN_TABLES.has(currentTable)) continue

    // Lines with // schema:ignore are intentionally referencing future/pending columns
    if (line.includes('// schema:ignore')) continue

    // .select() — expand CSV of columns
    const selMatches = [...line.matchAll(SELECT_RE)]
    for (const m of selMatches) {
      const cols = parseSelectCols(m[1])
      for (const col of cols) {
        if (!KNOWN_COLS[currentTable].has(col)) {
          issues.push({
            file: relative(ROOT, filePath),
            line: lineNo,
            table: currentTable,
            col,
            context: `.select('${col}') on ${currentTable}`,
          })
        }
      }
    }

    // .eq/.order/etc.
    const filterMatches = [...line.matchAll(FILTER_RE)]
    for (const m of filterMatches) {
      const col = m[1]
      if (!KNOWN_COLS[currentTable].has(col)) {
        issues.push({
          file: relative(ROOT, filePath),
          line: lineNo,
          table: currentTable,
          col,
          context: `filter/order on ${currentTable}.${col}`,
        })
      }
    }

    // onConflict: 'ean' — unique key columns
    const conflictMatches = [...line.matchAll(UPSERT_KEY_RE)]
    for (const m of conflictMatches) {
      for (const col of m[1].split(',').map(c => c.trim())) {
        if (col && !KNOWN_COLS[currentTable].has(col)) {
          issues.push({
            file: relative(ROOT, filePath),
            line: lineNo,
            table: currentTable,
            col,
            context: `onConflict: '${col}' on ${currentTable}`,
          })
        }
      }
    }

    // Reset context after 15 lines without a new .from() (heuristic)
    if (lineNo - currentTableLine > 15 && !fromMatches.length) {
      currentTable = null
    }
  }
}

function main() {
  console.log('[check-schema] Kontroluji sloupce oproti schema-snapshot.json...')

  const files = collectFiles(ROOT)
  const issues: Issue[] = []

  for (const f of files) {
    checkFile(f, issues)
  }

  if (issues.length === 0) {
    console.log(`[check-schema] ✓ OK — ${files.length} souborů zkontrolováno, žádné neznámé sloupce`)
    process.exit(0)
  }

  console.error(`[check-schema] ✗ ${issues.length} PROBLÉM(Ů) — kód referencuje sloupce chybějící v schema-snapshot.json:\n`)
  for (const iss of issues) {
    console.error(`  ${iss.file}:${iss.line}  ${iss.context}`)
    console.error(`    Sloupec '${iss.col}' není v tabulce '${iss.table}' — aplikuj migraci a spusť: npm run schema:snapshot\n`)
  }

  process.exit(1)
}

main()
