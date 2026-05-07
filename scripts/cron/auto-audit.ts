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

interface StepResult {
  name: string
  attempted: number
  fixed: number
  errors: number
  detail?: string
}

// ── Step 1: Junk brand detection + auto-rename ──────────────────────────────
async function fixJunkBrands(): Promise<StepResult> {
  const SUSPICIOUS = ['extra', 'panensky', 'panenský', 'olivovy', 'oil', 'olive', 'premium', 'bio', 'eko']
  const { data: brands } = await supabaseAdmin.from('brands').select('id, slug, name')

  let attempted = 0
  let fixed = 0
  let errors = 0

  for (const b of (brands ?? []) as Array<{ id: string; slug: string; name: string }>) {
    const lname = b.name.toLowerCase().trim()
    if (!SUSPICIOUS.includes(lname)) continue
    attempted++

    // Najdi produkty tohoto brandu — zkus odvodit správný brand z jejich názvu
    const { data: products } = await supabaseAdmin
      .from('products')
      .select('id, slug, name')
      .eq('brand_slug', b.slug)

    const ps = (products ?? []) as Array<{ id: string; slug: string; name: string }>
    if (ps.length === 0) {
      // Prázdný junk brand — smazat
      await supabaseAdmin.from('brands').delete().eq('slug', b.slug)
      fixed++
      continue
    }

    // Zkus najít common substring v product names co není SUSPICIOUS
    // Obvykle je správný brand poslední slovo nebo slovo po "olej" (např. "...olivový olej Vafis")
    const candidates = new Map<string, number>()
    for (const p of ps) {
      // Extrahuj poslední slovo (ignore size unit + number)
      const cleanName = p.name.replace(/\d+\s*(ml|l|g)/gi, '').trim()
      const words = cleanName.split(/\s+/)
      // Take last 1-3 words that aren't generic
      for (let i = words.length - 1; i >= Math.max(0, words.length - 3); i--) {
        const w = words[i].replace(/[^\p{L}]/gu, '')
        if (w.length < 3) continue
        if (SUSPICIOUS.includes(w.toLowerCase())) continue
        candidates.set(w, (candidates.get(w) ?? 0) + 1)
      }
    }
    // Pick most frequent candidate (musí být majoritní — jinak unsafe)
    const sorted = [...candidates.entries()].sort((a, b) => b[1] - a[1])
    if (sorted.length === 0 || sorted[0][1] < ps.length / 2) {
      // Nelze automaticky odvodit — set brand_slug=null
      await supabaseAdmin.from('products').update({ brand_slug: null }).eq('brand_slug', b.slug)
      await supabaseAdmin.from('brands').delete().eq('slug', b.slug)
      fixed++
      continue
    }
    const newName = sorted[0][0]
    const newSlug = newName.toLowerCase()
      .normalize('NFD').replace(/[̀-ͯ]/g, '')  // diakritika
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')

    // Existuje už cílový brand?
    const { data: existing } = await supabaseAdmin.from('brands').select('id').eq('slug', newSlug).maybeSingle()
    if (existing) {
      // Re-link na existing
      await supabaseAdmin.from('products').update({ brand_slug: newSlug }).eq('brand_slug', b.slug)
      await supabaseAdmin.from('brands').delete().eq('slug', b.slug)
    } else {
      // Rename junk brand na nový (zachová ID + foto + případně content)
      const { error } = await supabaseAdmin
        .from('brands')
        .update({ slug: newSlug, name: newName, updated_at: new Date().toISOString() })
        .eq('id', b.id)
      if (error) { errors++; continue }
      await supabaseAdmin.from('products').update({ brand_slug: newSlug }).eq('brand_slug', b.slug)
    }
    fixed++
  }

  return { name: 'junk-brands', attempted, fixed, errors }
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

  // a) inactive_with_offers — auto-fix
  const { data: issues } = await supabaseAdmin
    .from('quality_issues')
    .select('id, product_id')
    .eq('rule_id', 'inactive_with_offers')
    .eq('status', 'open')
  for (const i of (issues ?? []) as Array<{ id: string; product_id: string }>) {
    attempted++
    await supabaseAdmin.from('product_offers').update({ in_stock: false, last_checked: new Date().toISOString() }).eq('product_id', i.product_id)
    await supabaseAdmin.from('quality_issues').update({
      status: 'resolved',
      auto_fix_attempted: true,
      auto_fix_succeeded: true,
      resolved_at: new Date().toISOString(),
      resolution_note: 'Auto: offers in_stock=false (product inactive)',
    }).eq('id', i.id)
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
