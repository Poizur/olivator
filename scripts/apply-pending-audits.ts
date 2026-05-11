// Apply pending HIGH (and optionally MEDIUM) rows z product_data_audit.
// Fáze 3 master-foundation plánu (2026-05).
//
// Workflow:
//   1. Pro každý řádek (applied=false, dismissed=false, confidence=<level>):
//      a. Načti aktuální hodnotu pole z products
//      b. Aplikuj new_value
//      c. Marker applied=true, applied_at=now()
//   2. Pro Score-affecting fields (acidity, polyphenols, certifications):
//      Recalc Score po aplikaci všech změn pro daný produkt.
//
// Žádné Claude volání. Cena $0.00.
//
// Spuštění:
//   env -u ANTHROPIC_API_KEY npx tsx --env-file=../../../.env.local scripts/apply-pending-audits.ts
//   --confidence=high,medium      (default: high)
//   --dry-run                     (jen ukáže co by se aplikovalo)

import { supabaseAdmin } from '@/lib/supabase'
import { calculateScore } from '@/lib/score'

const SCORE_AFFECTING_FIELDS = new Set(['acidity', 'polyphenols', 'certifications', 'peroxide_value', 'type'])

// Pole co berou non-string typy: cast na správný typ při insertu
const NUMERIC_FIELDS = new Set(['acidity', 'polyphenols', 'harvest_year', 'peroxide_value', 'oleic_acid_pct', 'volume_ml'])
const ARRAY_FIELDS = new Set(['certifications', 'use_cases'])

interface AuditRow {
  id: string
  product_id: string
  field: string
  old_value: string | null
  new_value: string | null
  source_quote: string | null
  source_url: string | null
  confidence: string
}

function parseArgs() {
  const args = process.argv.slice(2)
  const confidenceArg = args.find(a => a.startsWith('--confidence='))
  const confidences = confidenceArg
    ? confidenceArg.split('=')[1].split(',').map(s => s.trim())
    : ['high']
  return {
    confidences,
    dryRun: args.includes('--dry-run'),
  }
}

function castValue(field: string, raw: string | null): unknown {
  if (raw == null) return null
  if (NUMERIC_FIELDS.has(field)) {
    const n = parseFloat(raw.replace(',', '.'))
    return isNaN(n) ? null : n
  }
  if (ARRAY_FIELDS.has(field)) {
    // raw může být JSON array nebo CSV: "[\"dop\",\"bio\"]" nebo "dop, bio"
    try {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) return parsed.filter(v => typeof v === 'string').map(v => v.trim()).filter(Boolean)
    } catch {}
    return raw.split(/[,;]/).map(s => s.trim()).filter(Boolean)
  }
  return raw.trim()
}

async function recalcScore(productId: string): Promise<{ before: number | null; after: number | null }> {
  const { data: p } = await supabaseAdmin
    .from('products')
    .select('acidity, polyphenols, peroxide_value, certifications, volume_ml, type, olivator_score')
    .eq('id', productId)
    .maybeSingle()
  if (!p) return { before: null, after: null }

  const { data: offers } = await supabaseAdmin
    .from('product_offers')
    .select('price')
    .eq('product_id', productId)
    .order('price', { ascending: true })
    .limit(1)
  const cheapest = offers?.[0]?.price ? Number(offers[0].price) : null
  const volumeMl = p.volume_ml ? Number(p.volume_ml) : null
  const pricePer100ml = cheapest && volumeMl ? (cheapest / volumeMl) * 100 : null

  const score = calculateScore({
    acidity: p.acidity != null ? Number(p.acidity) : null,
    polyphenols: (p.polyphenols as number | null) ?? null,
    peroxideValue: p.peroxide_value != null ? Number(p.peroxide_value) : null,
    certifications: (p.certifications as string[]) ?? [],
    pricePer100ml,
    type: (p.type as string) ?? null,
  })

  const dbScoreValue = score.insufficientData ? null : score.total
  await supabaseAdmin
    .from('products')
    .update({
      olivator_score: dbScoreValue,
      score_breakdown: score.breakdown,
      updated_at: new Date().toISOString(),
    })
    .eq('id', productId)

  return { before: (p.olivator_score as number | null) ?? null, after: dbScoreValue }
}

async function main() {
  const args = parseArgs()
  const startedAt = Date.now()

  console.log('═══ Apply Pending Audits ═══')
  console.log(`Confidence: ${args.confidences.join(', ')}`)
  console.log(`Mode: ${args.dryRun ? 'DRY RUN' : 'LIVE'}`)
  console.log()

  const { data: audits } = await supabaseAdmin
    .from('product_data_audit')
    .select('id, product_id, field, old_value, new_value, source_quote, source_url, confidence')
    .eq('applied', false)
    .eq('dismissed', false)
    .in('confidence', args.confidences)
    .order('created_at', { ascending: true })

  const rows = (audits ?? []) as AuditRow[]
  console.log(`Found ${rows.length} pending rows\n`)

  let applied = 0
  let skipped = 0
  let failed = 0
  const affectedProductIds = new Set<string>()
  const scoreAffectedProductIds = new Set<string>()
  const byField = new Map<string, { applied: number; failed: number; conflicts: number }>()

  for (const row of rows) {
    const stat = byField.get(row.field) ?? { applied: 0, failed: 0, conflicts: 0 }
    byField.set(row.field, stat)

    const newCasted = castValue(row.field, row.new_value)

    // Sanity check — load current value
    const { data: prod } = await supabaseAdmin
      .from('products')
      .select(`${row.field}, name`)
      .eq('id', row.product_id)
      .maybeSingle()
    if (!prod) {
      failed++
      stat.failed++
      console.log(`  ✗ ${row.field.padEnd(18)} product not found (${row.product_id})`)
      continue
    }
    const current = (prod as Record<string, unknown>)[row.field]
    const productName = (prod.name as string)?.slice(0, 40) ?? '?'
    const isConflict =
      current != null && current !== '' && String(current).toLowerCase() !== String(newCasted).toLowerCase()
    if (isConflict) stat.conflicts++

    const prefix = isConflict ? '⚠️ ' : '+ '

    if (args.dryRun) {
      console.log(
        `  ${prefix}${row.field.padEnd(18)} "${productName}"  ${JSON.stringify(current)} → ${JSON.stringify(newCasted)}`
      )
      stat.applied++
      applied++
      continue
    }

    const { error } = await supabaseAdmin
      .from('products')
      .update({
        [row.field]: newCasted,
        updated_at: new Date().toISOString(),
      })
      .eq('id', row.product_id)

    if (error) {
      failed++
      stat.failed++
      console.log(`  ✗ ${row.field.padEnd(18)} "${productName}"  ${error.message.slice(0, 60)}`)
      continue
    }

    // Mark audit row applied
    await supabaseAdmin
      .from('product_data_audit')
      .update({ applied: true, applied_at: new Date().toISOString() })
      .eq('id', row.id)

    applied++
    stat.applied++
    affectedProductIds.add(row.product_id)
    if (SCORE_AFFECTING_FIELDS.has(row.field)) {
      scoreAffectedProductIds.add(row.product_id)
    }
    console.log(
      `  ${prefix}${row.field.padEnd(18)} "${productName}"  ${JSON.stringify(current)} → ${JSON.stringify(newCasted)}`
    )
  }

  // Recalc Score pro affected produkty
  let recalcedCount = 0
  let scoreChangedCount = 0
  if (!args.dryRun && scoreAffectedProductIds.size > 0) {
    console.log(`\n─── Recalculating Score for ${scoreAffectedProductIds.size} affected products ───`)
    for (const pid of scoreAffectedProductIds) {
      const { before, after } = await recalcScore(pid)
      recalcedCount++
      if (before !== after) {
        scoreChangedCount++
        console.log(`  Score: ${before ?? 'null'} → ${after ?? 'null'}`)
      }
    }
  }

  // Souhrn
  const elapsed = ((Date.now() - startedAt) / 1000).toFixed(1)
  console.log('\n═══ Shrnutí ═══')
  console.log(`Aplikováno:       ${applied}/${rows.length}`)
  console.log(`Skip:             ${skipped}`)
  console.log(`Failed:           ${failed}`)
  console.log(`Affected produkty: ${affectedProductIds.size}`)
  console.log()
  console.log('Per-field:')
  for (const [field, stat] of [...byField].sort((a, b) => b[1].applied - a[1].applied)) {
    const conflictNote = stat.conflicts > 0 ? `, ${stat.conflicts} conflicts` : ''
    console.log(`  ${field.padEnd(20)} ${stat.applied} applied${conflictNote}${stat.failed > 0 ? `, ${stat.failed} failed` : ''}`)
  }
  if (!args.dryRun && scoreAffectedProductIds.size > 0) {
    console.log()
    console.log(`Score recalc:     ${recalcedCount} (${scoreChangedCount} změn)`)
  }
  console.log(`\nČas: ${elapsed}s — žádné Claude volání, cena $0.00`)
}

main().catch(err => {
  console.error('FATAL:', err)
  process.exit(1)
})
