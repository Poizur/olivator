/**
 * Master auto-audit — denní cron co projde celý web a opraví VŠE co lze
 * deterministicky. User by NEMĚL přicházet do /admin/quality jako první obranu.
 *
 * Co opravuje:
 *   1. Junk brandy (name = "Extra"/"Panenský"/etc → re-link na správný brand
 *      odvozený z product.name nebo source_url, smaže prázdné stub brandy)
 *   2. Orphan brand_slugs (brand_slug v products neexistuje v brands tabulce
 *      → vytvoří stub nebo unlinkne)
 *   3. Quality issues (delegate na auto-resolve-quality):
 *      - inactive_with_offers → offers in_stock=false
 *      - description_missing/too_short → Claude regenerate
 *      - image_missing → Unsplash fallback
 *      - no_offers → product status=inactive
 *   4. Re-populate rankings (catch new produkty co fit do filterů)
 *   5. Metric snapshot
 *
 * Schedule: `0 4 * * *` Railway cron (4:00 UTC denně, před scraperem)
 * Run:      npx tsx --env-file=.env.local scripts/cron/auto-audit.ts
 *
 * Logs vše do seo_activity_log → vidíš v /admin/seo Historie tab.
 */
import { supabaseAdmin } from '@/lib/supabase'
import { logActivity, takeMetricSnapshot } from '@/lib/seo-activity'
import { runJunkBrandCleanup } from '@/lib/junk-brand-detector'
import { createCostTracker } from '@/lib/cost-tracker'
import { logAgentAction } from '@/lib/audit-log'

interface StepResult {
  name: string
  attempted: number
  fixed: number
  errors: number
  detail?: string
}

// ── Step 1: Junk brand detection + Claude-driven re-extract ─────────────────
//
// Fáze 2 master-foundation plánu (2026-05): nahrazeno naivní substring check
// pravdivým detektorem + Claude Haiku re-extract producenta ze source_url.
// Detektor: lib/junk-brand-detector.ts (40+ blocked words, ALL-CAPS, encoding
// artifacts). Re-extract používá raw_description už uložený v products.
// Hard cost limit $0.50 per den (denní cron — větší cleanup beží přes
// scripts/cleanup-junk-brands.ts s vyšším limitem).
async function fixJunkBrands(): Promise<StepResult> {
  const costTracker = createCostTracker({ hardLimitUsd: 0.5, name: 'auto-audit:junk-brands' })
  const summary = await runJunkBrandCleanup({ costTracker })

  return {
    name: 'junk-brands',
    attempted: summary.junkDetected,
    fixed: summary.deletedEmpty + summary.deletedAfterReassign,
    errors: summary.flaggedNoExtraction,
    detail:
      `deleted=${summary.deletedEmpty + summary.deletedAfterReassign}, ` +
      `flagged=${summary.flaggedPartial + summary.flaggedNoExtraction}, ` +
      `keptNotJunk=${summary.keptNotJunk}, ` +
      `reassigned=${summary.totalReassigned}, ` +
      `cost=$${costTracker.totalUsd().toFixed(4)}`,
  }
}

// ── Step 2: Orphan brand_slug → vytvořit stub nebo unlink ────────────────────
async function fixOrphanBrandSlugs(): Promise<StepResult> {
  const { data: products } = await supabaseAdmin.from('products').select('brand_slug').not('brand_slug', 'is', null)
  const slugCounts = new Map<string, number>()
  for (const p of (products ?? []) as Array<{ brand_slug: string }>) {
    slugCounts.set(p.brand_slug, (slugCounts.get(p.brand_slug) ?? 0) + 1)
  }

  const { data: brands } = await supabaseAdmin.from('brands').select('slug')
  const existing = new Set(((brands ?? []) as Array<{ slug: string }>).map(b => b.slug))

  let attempted = 0
  let fixed = 0
  for (const [slug, count] of slugCounts) {
    if (existing.has(slug)) continue
    attempted++
    // Vytvoř stub brand
    const name = slug.split('-').map(w => w[0].toUpperCase() + w.slice(1)).join(' ')
    const { error } = await supabaseAdmin.from('brands').insert({
      slug,
      name,
      status: 'draft',
    })
    if (!error) fixed++
  }
  return { name: 'orphan-brand-slugs', attempted, fixed, errors: 0, detail: `${attempted} orphan slugs` }
}

// ── Step 3: Re-populate rankings ─────────────────────────────────────────────
async function repopulateRankings(): Promise<StepResult> {
  // Delegate na separate script (already idempotent)
  try {
    const { spawn } = await import('node:child_process')
    return await new Promise<StepResult>((resolve) => {
      const proc = spawn('npx', ['tsx', '--env-file=.env.local', 'scripts/populate-rankings.ts'], { cwd: process.cwd() })
      let updated = 0
      proc.stdout.on('data', (d: Buffer) => {
        const s = d.toString()
        const matches = s.match(/✅ \S+: \d+ produktů/g)
        if (matches) updated += matches.length
      })
      proc.on('close', () => resolve({ name: 'rankings-repopulate', attempted: 13, fixed: updated, errors: 0 }))
    })
  } catch (err) {
    return { name: 'rankings-repopulate', attempted: 0, fixed: 0, errors: 1, detail: String(err) }
  }
}

// ── Step 4: Quality issues delegate ───────────────────────────────────────────
async function quickQualityFixes(): Promise<StepResult> {
  // Inline lite version — jen rychlé deterministické fixy bez Claude (Claude je drahé)
  // Plné description/image fix běží přes manual `auto-resolve-quality.ts`

  let attempted = 0
  let fixed = 0

  // a) inactive_with_offers — POZOR: rule je misnomer, ve skutečnosti detekuje
  // 'draft + má offers'. Správný fix: publikovat draft (produkt connection
  // ready). NEDEAKTIVOVAT offers — to je ztráta dat.
  const { data: issues } = await supabaseAdmin
    .from('quality_issues')
    .select('id, product_id')
    .eq('rule_id', 'inactive_with_offers')
    .eq('status', 'open')
  for (const i of (issues ?? []) as Array<{ id: string; product_id: string }>) {
    attempted++
    // Publikuj produkt: draft → active
    const { error: publishErr } = await supabaseAdmin.from('products').update({
      status: 'active',
      status_changed_by: 'auto',
      status_changed_at: new Date().toISOString(),
      status_reason_code: null,
      status_reason_note: 'Auto-publish (draft + má offers)',
      updated_at: new Date().toISOString(),
    }).eq('id', i.product_id).eq('status', 'draft')  // jen pokud je STÁLE draft
    await supabaseAdmin.from('quality_issues').update({
      status: 'resolved',
      auto_fix_attempted: true,
      auto_fix_succeeded: true,
      resolved_at: new Date().toISOString(),
      resolution_note: 'Auto: published (draft → active, má offers)',
    }).eq('id', i.id)
    if (!publishErr) {
      void logAgentAction({
        agentName: 'auto-audit',
        decisionType: 'product_published',
        payload: {
          product_id: i.product_id,
          before: 'draft',
          after: 'active',
          reason: 'draft_with_offers',
        },
      })
    }
    fixed++
  }

  // b) no_offers — deactivate
  const { data: noOffer } = await supabaseAdmin
    .from('quality_issues')
    .select('id, product_id')
    .eq('rule_id', 'no_offers')
    .eq('status', 'open')
  for (const i of (noOffer ?? []) as Array<{ id: string; product_id: string }>) {
    attempted++
    await supabaseAdmin.from('products').update({
      status: 'inactive',
      status_reason_code: 'no_offers',
      status_reason_note: 'Auto-deaktivováno (žádné nabídky)',
      status_changed_by: 'auto',
      status_changed_at: new Date().toISOString(),
    }).eq('id', i.product_id)
    await supabaseAdmin.from('quality_issues').update({
      status: 'resolved',
      auto_fix_attempted: true,
      auto_fix_succeeded: true,
      resolved_at: new Date().toISOString(),
      resolution_note: 'Auto: product → inactive',
    }).eq('id', i.id)
    void logAgentAction({
      agentName: 'auto-audit',
      decisionType: 'product_deactivated',
      payload: {
        product_id: i.product_id,
        before: 'active',
        after: 'inactive',
        reason: 'no_offers',
      },
    })
    fixed++
  }

  return { name: 'quick-quality-fixes', attempted, fixed, errors: 0 }
}

// ── Step 5: Snapshot ─────────────────────────────────────────────────────────
async function snapshot(): Promise<StepResult> {
  const r = await takeMetricSnapshot()
  return { name: 'metric-snapshot', attempted: 8, fixed: r.snapshots, errors: 0 }
}

// ── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  const startedAt = Date.now()
  console.log('═══ Auto-audit starting ═══\n')

  const results: StepResult[] = []
  results.push(await fixJunkBrands())
  console.log(`✓ junk-brands: ${results.at(-1)!.fixed} fixed of ${results.at(-1)!.attempted}`)

  results.push(await fixOrphanBrandSlugs())
  console.log(`✓ orphan-brand-slugs: ${results.at(-1)!.fixed} fixed`)

  results.push(await quickQualityFixes())
  console.log(`✓ quick-quality-fixes: ${results.at(-1)!.fixed} fixed`)

  results.push(await repopulateRankings())
  console.log(`✓ rankings-repopulate: ${results.at(-1)!.fixed} ranked`)

  results.push(await snapshot())
  console.log(`✓ metric-snapshot: ${results.at(-1)!.fixed} snapshots`)

  const elapsed = ((Date.now() - startedAt) / 1000).toFixed(1)
  const totalFixed = results.reduce((s, r) => s + r.fixed, 0)
  const totalErrors = results.reduce((s, r) => s + r.errors, 0)

  // Souhrnný log entry do seo_activity_log
  await logActivity({
    action_type: 'audit',
    title: 'Auto-audit (denní)',
    description: `Opraveno ${totalFixed} položek napříč ${results.length} oblastmi (${elapsed}s, ${totalErrors} chyb)`,
    metadata: { results, elapsed_s: parseFloat(elapsed) },
    source: 'cron',
  })

  console.log(`\n═══ Done in ${elapsed}s — ${totalFixed} fixes, ${totalErrors} errors ═══`)
}

main().catch(err => {
  console.error('FATAL:', err)
  process.exit(1)
})
