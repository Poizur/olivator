// POST /api/admin/products/bulk-fill-specs
// Re-procesuje uložené extracted_facts.parameter_table + name + raw_description
// a doplní chybějící strukturovaná pole (oleocanthal, harvest_year, processing,
// polyphenols) BEZ nutnosti re-scrape. Rychlé, levné, lze spustit kdykoli.

import { NextResponse } from 'next/server'
import { isAdminAuthenticated } from '@/lib/admin-auth'
import { supabaseAdmin } from '@/lib/supabase'
import {
  extractPolyphenols,
  extractOleocanthal,
  extractProcessing,
} from '@/lib/product-scraper'

export const maxDuration = 120

type Fact = { key: string; value: string }

function getParameterTable(extractedFacts: unknown): Record<string, string> {
  if (!Array.isArray(extractedFacts)) return {}
  const entry = (extractedFacts as Fact[]).find((f) => f?.key === 'parameter_table')
  if (!entry?.value) return {}
  try { return JSON.parse(entry.value) } catch { return {} }
}

function findTableValue(table: Record<string, string>, ...needles: string[]): string | null {
  for (const [k, v] of Object.entries(table)) {
    const norm = k.toLowerCase().replace(/[:.]/g, '').trim()
    if (needles.some((n) => norm.includes(n))) return v
  }
  return null
}

function tableProcessing(table: Record<string, string>): string | null {
  const raw = (findTableValue(table, 'způsob výroby', 'zpracování', 'processing', 'výroba', 'lisování') ?? '').toLowerCase()
  if (!raw) return null
  if (/studena|cold.?press/.test(raw)) return 'cold_pressed'
  if (/nefiltr/.test(raw)) return 'unfiltered'
  if (/filtr[ao]/.test(raw)) return 'filtered'
  if (/early|rann/.test(raw)) return 'early_harvest'
  return null
}

function tableOleocanthal(table: Record<string, string>): number | null {
  const raw = findTableValue(table, 'oleokantal', 'oleocanthal', 'oleokanthal')
  if (!raw) return null
  const m = raw.match(/(\d{1,4})/)
  if (!m) return null
  const v = parseFloat(m[1])
  return v > 0 && v < 2000 ? v : null
}

export async function POST() {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Fetch products where at least one of the target fields is missing
  const { data: products, error } = await supabaseAdmin
    .from('products')
    .select('id, name, raw_description, extracted_facts, polyphenols, oleocanthal, processing')
    .or('polyphenols.is.null,oleocanthal.is.null,processing.is.null')
    .eq('status', 'active')
    .limit(500)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!products || products.length === 0) return NextResponse.json({ ok: true, updated: 0, skipped: 0 })

  let updated = 0
  let skipped = 0

  for (const p of products) {
    const table = getParameterTable(p.extracted_facts)
    const text = [(p.raw_description as string) ?? '', (p.name as string) ?? ''].join(' ')

    const patch: Record<string, unknown> = {}

    if (p.polyphenols == null) {
      const v = extractPolyphenols(text) ?? null
      if (v != null) patch.polyphenols = v
    }
    if (p.oleocanthal == null) {
      const v = tableOleocanthal(table) ?? extractOleocanthal(text) ?? null
      if (v != null) patch.oleocanthal = v
    }
    if (p.processing == null) {
      const v = tableProcessing(table) ?? extractProcessing(text) ?? null
      if (v != null) patch.processing = v
    }

    if (Object.keys(patch).length === 0) { skipped++; continue }

    await supabaseAdmin.from('products').update(patch).eq('id', p.id as string)
    updated++
  }

  return NextResponse.json({ ok: true, updated, skipped, total: products.length })
}
