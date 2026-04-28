/**
 * Backfill flavor_profile.bitter z extracted_facts.parameter_table.
 * Reckonasbavi shopy mají label 'Hořkost:' s hodnotami:
 *   Jemný olivový olej (low) → 25
 *   Středně hořký           → 50
 *   Výrazný olivový olej    → 75
 *   Pálivý                  → 80
 *
 * Run: node --env-file=.env.local --import tsx scripts/backfill-bitterness.ts
 */
import { supabaseAdmin } from '@/lib/supabase'

interface FlavorProfile {
  fruity?: number
  herbal?: number
  bitter?: number
  spicy?: number
  mild?: number
  nutty?: number
  buttery?: number
}

interface ProductRow {
  id: string
  slug: string
  flavor_profile: FlavorProfile | null
  extracted_facts: unknown
}

function mapBitterness(text: string | null): number | null {
  if (!text) return null
  const t = text.toLowerCase()
  if (/jemn[ýá]/.test(t)) return 25
  if (/středn[ěí]/.test(t)) return 50
  if (/výrazn[ýá]/.test(t)) return 75
  if (/pálivý|štiplavý/.test(t)) return 80
  if (/hořk[ýá]/.test(t)) return 70
  return null
}

async function main() {
  const { data: products, error } = await supabaseAdmin
    .from('products')
    .select('id, slug, flavor_profile, extracted_facts')
    .eq('status', 'active')
    .returns<ProductRow[]>()
  if (error || !products) {
    console.error(error)
    process.exit(1)
  }

  let updated = 0
  let noBitterness = 0
  let alreadySet = 0
  for (const p of products) {
    const facts = Array.isArray(p.extracted_facts) ? p.extracted_facts : []
    const tableEntry = (facts as Array<{ key: string; value: string }>).find(
      (f) => typeof f === 'object' && f !== null && f.key === 'parameter_table'
    )
    if (!tableEntry?.value) {
      noBitterness++
      continue
    }
    let table: Record<string, string> = {}
    try {
      table = JSON.parse(tableEntry.value)
    } catch {
      noBitterness++
      continue
    }
    const horkost =
      table['Hořkost:'] || table['Hořkost'] || table['Hořkost: '] || null
    const bitter = mapBitterness(horkost)
    if (bitter == null) {
      noBitterness++
      continue
    }

    const currentProfile = p.flavor_profile ?? {}
    if (currentProfile.bitter && currentProfile.bitter > 0) {
      // Pravděpodobně AI flavor agent už vyplnil — neprepisovat
      alreadySet++
      continue
    }

    const newProfile = { ...currentProfile, bitter }
    const { error: updErr } = await supabaseAdmin
      .from('products')
      .update({ flavor_profile: newProfile, updated_at: new Date().toISOString() })
      .eq('id', p.id)
    if (updErr) {
      console.warn(`  ✗ ${p.slug}: ${updErr.message}`)
    } else {
      updated++
      console.log(`  ✓ ${p.slug.slice(0, 60).padEnd(60)} bitter=${bitter} (${horkost})`)
    }
  }

  console.log('')
  console.log(`[bitter] done — updated=${updated} already_set=${alreadySet} no_horkost=${noBitterness}`)
  process.exit(0)
}

main().catch((err) => {
  console.error('[bitter] fatal:', err)
  process.exit(1)
})
