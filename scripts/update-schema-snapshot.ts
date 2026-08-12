#!/usr/bin/env tsx
/**
 * Aktualizuje supabase/schema-snapshot.json z živé Supabase DB.
 *
 * Spouštět po každé aplikované SQL migraci:
 *   npm run schema:snapshot
 *
 * Potřebuje: NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_KEY v .env.local
 */

import { writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!,
  { auth: { persistSession: false } },
)

async function main() {
  console.log('[update-schema-snapshot] Načítám schema z Supabase...')

  // Supabase PostgREST neumí přímý SQL, ale vrtíme se přes table listing
  // Heuristika: vezmi LIMIT 0 pro každou known tabulku a čti column names z response headers
  // Lepší: použij introspection přes pg_catalog RPC pokud existuje

  // Fallback: načti existující snapshot a updatuj jen tabulky kde máme data
  const existingPath = join(__dirname, '..', 'supabase', 'schema-snapshot.json')

  // Pro každou tabulku z existujícího snapshotu fetchni 1 řádek a zjisti sloupce
  const existing = JSON.parse(require('fs').readFileSync(existingPath, 'utf8'))
  delete existing['_meta']

  const newSnapshot: Record<string, string[]> = {
    _meta: {
      generated: new Date().toISOString().split('T')[0],
      note: 'Spusť npm run schema:snapshot po každé aplikované SQL migraci.',
    } as unknown as string[],
  }

  for (const tableName of Object.keys(existing)) {
    const { data, error } = await supabase.from(tableName).select('*').limit(1)
    if (error) {
      console.warn(`  [skip] ${tableName}: ${error.message}`)
      newSnapshot[tableName] = existing[tableName]
      continue
    }
    if (data && data.length > 0) {
      const cols = Object.keys(data[0])
      console.log(`  ✓ ${tableName}: ${cols.length} sloupců`)
      newSnapshot[tableName] = cols
    } else {
      // Prázdná tabulka — neznáme sloupce, zachováme existující
      console.log(`  ~ ${tableName}: prázdná, zachovávám existující sloupce`)
      newSnapshot[tableName] = existing[tableName]
    }
  }

  writeFileSync(existingPath, JSON.stringify(newSnapshot, null, 2) + '\n', 'utf8')
  console.log(`[update-schema-snapshot] ✓ Aktualizováno: ${existingPath}`)
  console.log('[update-schema-snapshot] Nezapomeň commitnout změny!')
}

main().catch(e => {
  console.error('[update-schema-snapshot] Chyba:', e.message)
  process.exit(1)
})
