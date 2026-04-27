// Quality Audit Agent — rule engine.
// Each rule has a check() function that examines a product and returns
// either a violation or null. Some rules have an autoFix() function.
//
// Rules are run after every product write (publish, rescrape, AI rewrite)
// and on-demand via /admin/quality dashboard.

import { supabaseAdmin } from './supabase'

export type Severity = 'error' | 'warning' | 'info'

export interface ProductSnapshot {
  id: string
  name: string
  slug: string
  status: string
  type: string | null
  acidity: number | null
  polyphenols: number | null
  peroxide_value: number | null
  certifications: string[]
  description_short: string | null
  description_long: string | null
  raw_description: string | null
  image_url: string | null
  image_source: string | null
  source_url: string | null
  volume_ml: number | null
}

export interface RuleViolation {
  ruleId: string
  severity: Severity
  message: string
  details?: Record<string, unknown>
}

export interface QualityRule {
  ruleId: string
  check: (p: ProductSnapshot) => Promise<RuleViolation | null> | RuleViolation | null
  autoFix?: (p: ProductSnapshot) => Promise<{ ok: boolean; message?: string }>
}

const STORAGE_PREFIX = '/storage/v1/object/public/products/'

// ── Rule definitions ─────────────────────────────────────────────────

const rules: QualityRule[] = [
  // Low Score for valid EVOO — usually means acidity wasn't extracted properly
  {
    ruleId: 'low_score_for_valid_evoo',
    check: async (p) => {
      if (p.type !== 'evoo') return null
      // Get score
      const { data } = await supabaseAdmin
        .from('products')
        .select('olivator_score')
        .eq('id', p.id)
        .maybeSingle()
      const score = data?.olivator_score ?? 0
      if (p.acidity != null && p.acidity <= 0.4 && score < 30) {
        return {
          ruleId: 'low_score_for_valid_evoo',
          severity: 'warning',
          message: `EVOO s kyselostí ${p.acidity} % má Score ${score} — očekáváme ≥30. Pravděpodobně chybí cena nebo se ztratila acidity.`,
          details: { score, acidity: p.acidity },
        }
      }
      return null
    },
    autoFix: async (p) => {
      // Re-fetch fresh acidity from raw + recompute
      const { detectCertificationsInText } = await import('./cert-detector')
      const { calculateScore } = await import('./score')
      const certCandidates = detectCertificationsInText(`${p.name}\n${p.raw_description ?? ''}`)
      const certs = certCandidates.filter(c => c.confidence === 'high').map(c => c.cert)
      const { data: offers } = await supabaseAdmin
        .from('product_offers')
        .select('price')
        .eq('product_id', p.id)
        .order('price', { ascending: true })
        .limit(1)
      const cheapest = offers?.[0]?.price ? Number(offers[0].price) : null
      const pricePer100ml = cheapest && p.volume_ml ? (cheapest / p.volume_ml) * 100 : null
      const score = calculateScore({
        acidity: p.acidity,
        polyphenols: p.polyphenols,
        peroxideValue: p.peroxide_value,
        certifications: certs.length > 0 ? certs : p.certifications,
        pricePer100ml,
      })
      await supabaseAdmin
        .from('products')
        .update({
          certifications: certs.length > 0 ? certs : p.certifications,
          olivator_score: score.total,
          score_breakdown: score.breakdown,
        })
        .eq('id', p.id)
      return { ok: true, message: `Score recomputed: ${score.total}` }
    },
  },

  // Missing acidity but text has it — typical scraper miss
  {
    ruleId: 'missing_acidity_with_text',
    check: (p) => {
      if (p.acidity != null) return null
      if (!p.raw_description) return null
      // Same regex as scraper extractAcidity
      const m = p.raw_description.match(
        /(?:acidita|kyselost|acidity)[:\s]*(?:max\.?\s*)?(?:[≤<]\s*|do\s+)?(\d+[,.]?\d*)\s*(?:%|\s*-\s*\d+[,.]?\d*\s*%)/i
      )
      if (!m) return null
      const value = parseFloat(m[1].replace(',', '.'))
      return {
        ruleId: 'missing_acidity_with_text',
        severity: 'warning',
        message: `Acidity je null, ale v textu nalezena hodnota "${m[0]}" → ${value} %`,
        details: { extracted: value, snippet: m[0] },
      }
    },
    autoFix: async (p) => {
      const m = p.raw_description!.match(
        /(?:acidita|kyselost|acidity)[:\s]*(?:max\.?\s*)?(?:[≤<]\s*|do\s+)?(\d+[,.]?\d*)\s*(?:%|\s*-\s*\d+[,.]?\d*\s*%)/i
      )
      if (!m) return { ok: false, message: 'Regex přestal matchovat' }
      const value = parseFloat(m[1].replace(',', '.'))
      await supabaseAdmin.from('products').update({ acidity: value }).eq('id', p.id)
      return { ok: true, message: `Acidity nastavena na ${value} %` }
    },
  },

  // Description too short
  {
    ruleId: 'description_too_short',
    check: (p) => {
      if (!p.description_long) return null
      const wordCount = p.description_long.trim().split(/\s+/).filter(Boolean).length
      if (wordCount >= 250) return null
      return {
        ruleId: 'description_too_short',
        severity: 'warning',
        message: `description_long má ${wordCount} slov (min 250). Pro SEO příliš krátké.`,
        details: { wordCount },
      }
    },
    // autoFix would call AI rewrite — expensive, requires raw_description + facts.
    // For now, manual: admin clicks "Auto-Fix" → triggers rewrite endpoint.
    autoFix: async (p) => {
      // No-op — admin uses ✨ Přepsat AI on product page
      return { ok: false, message: 'Klikni ✨ Přepsat AI na detail produktu' }
    },
  },

  // Description missing entirely
  {
    ruleId: 'description_missing',
    check: (p) => {
      if (p.description_long && p.description_long.trim().length > 50) return null
      return {
        ruleId: 'description_missing',
        severity: 'error',
        message: 'Produkt nemá description_long. Spustit AI rewrite.',
      }
    },
  },

  // No image at all
  {
    ruleId: 'image_missing',
    check: (p) => {
      if (p.image_url && p.image_url.length > 0) return null
      return {
        ruleId: 'image_missing',
        severity: 'error',
        message: 'Produkt nemá image_url. Doplň fotku v admin UI.',
      }
    },
  },

  // Image is on external CDN, not our storage
  {
    ruleId: 'image_external_cdn',
    check: (p) => {
      if (!p.image_url) return null
      if (p.image_url.includes(STORAGE_PREFIX)) return null
      return {
        ruleId: 'image_external_cdn',
        severity: 'warning',
        message: `image_url ukazuje na ${new URL(p.image_url).hostname} místo Supabase Storage. Riziko ztráty obrázku pokud shop URL přestane fungovat.`,
        details: { externalUrl: p.image_url },
      }
    },
    autoFix: async (p) => {
      if (!p.image_url) return { ok: false, message: 'Žádné image_url' }
      try {
        const { downloadAndStoreImage } = await import('./product-image')
        const stored = await downloadAndStoreImage(p.image_url, p.slug)
        await supabaseAdmin
          .from('products')
          .update({ image_url: stored, image_source: 'auto_migrated' })
          .eq('id', p.id)
        return { ok: true, message: 'Obrázek migrován do Supabase Storage' }
      } catch (err) {
        return { ok: false, message: err instanceof Error ? err.message : 'Migration failed' }
      }
    },
  },

  // BIO claim without certification
  {
    ruleId: 'bio_claim_without_cert',
    check: (p) => {
      const text = `${p.description_short ?? ''}\n${p.description_long ?? ''}`.toLowerCase()
      if (!text.trim()) return null
      const hasBioCert = p.certifications.some(c => c === 'bio' || c === 'organic')
      if (hasBioCert) return null
      // Match common bio claim patterns
      const patterns = [
        /\bbio\s+(?:extra\s+panensk|olivov|olej|certif)/i,
        /\bbio\s+certifika[cč]/i,
        /\borganic\s+(?:certif|oil)/i,
        /\bekologick[áéý][hm]?\s+(?:olej|zem[eě]d)/i,
      ]
      const matched = patterns.map(re => text.match(re)?.[0]).find(Boolean)
      if (!matched) return null
      return {
        ruleId: 'bio_claim_without_cert',
        severity: 'error',
        message: `Text zmiňuje "${matched}" ale certifikace neobsahuje bio. KLAMAVÁ REKLAMA — riziko pokuty (EU 2018/848).`,
        details: { matchedSnippet: matched },
      }
    },
    // No auto-fix — admin must manually decide: remove bio claim from text, or add cert
  },

  // Draft with offers — probably forgot to publish
  {
    ruleId: 'inactive_with_offers',
    check: async (p) => {
      if (p.status !== 'draft') return null
      const { count } = await supabaseAdmin
        .from('product_offers')
        .select('*', { count: 'exact', head: true })
        .eq('product_id', p.id)
      if (!count || count === 0) return null
      return {
        ruleId: 'inactive_with_offers',
        severity: 'warning',
        message: `Produkt je draft ale má ${count} nabídek. Klikni "Publikovat" v admin pro zveřejnění.`,
        details: { offerCount: count },
      }
    },
  },

  // No offers — user can't buy
  {
    ruleId: 'no_offers',
    check: async (p) => {
      const { count } = await supabaseAdmin
        .from('product_offers')
        .select('*', { count: 'exact', head: true })
        .eq('product_id', p.id)
      if (count && count > 0) return null
      return {
        ruleId: 'no_offers',
        severity: 'warning',
        message: 'Produkt nemá žádný offer. Uživatel nemá kde koupit.',
        details: {},
      }
    },
  },

  // Source URL missing — can't auto-update
  {
    ruleId: 'source_url_missing',
    check: (p) => {
      if (p.source_url && p.source_url.length > 0) return null
      return {
        ruleId: 'source_url_missing',
        severity: 'info',
        message: 'Bez source_url nelze automaticky rescrape ani Price Agent.',
      }
    },
  },
]

// ── Public API ────────────────────────────────────────────────────────

/** Run all active rules against a product, return violations.
 *  Optionally persists to quality_issues table. */
export async function auditProduct(
  productId: string,
  options: { persist?: boolean } = {}
): Promise<RuleViolation[]> {
  const { data: row, error } = await supabaseAdmin
    .from('products')
    .select('id, name, slug, status, type, acidity, polyphenols, peroxide_value, certifications, description_short, description_long, raw_description, image_url, image_source, source_url, volume_ml')
    .eq('id', productId)
    .maybeSingle()
  if (error || !row) return []

  const product = row as ProductSnapshot
  const violations: RuleViolation[] = []
  for (const rule of rules) {
    try {
      const v = await rule.check(product)
      if (v) violations.push(v)
    } catch (err) {
      console.warn(`[quality] rule ${rule.ruleId} threw:`, err)
    }
  }

  if (options.persist) {
    await persistViolations(productId, violations)
  }
  return violations
}

/** Run audit on ALL active products. Returns summary. */
export async function auditAllProducts(): Promise<{
  total: number
  totalViolations: number
  byRule: Record<string, number>
  bySeverity: Record<string, number>
}> {
  const { data: products } = await supabaseAdmin
    .from('products')
    .select('id')
    .eq('status', 'active')
  const ids = (products ?? []).map(p => p.id as string)

  const summary = {
    total: ids.length,
    totalViolations: 0,
    byRule: {} as Record<string, number>,
    bySeverity: {} as Record<string, number>,
  }

  for (const id of ids) {
    const violations = await auditProduct(id, { persist: true })
    summary.totalViolations += violations.length
    for (const v of violations) {
      summary.byRule[v.ruleId] = (summary.byRule[v.ruleId] ?? 0) + 1
      summary.bySeverity[v.severity] = (summary.bySeverity[v.severity] ?? 0) + 1
    }
  }
  return summary
}

/** Persist a set of violations for a product. Marks resolved any
 *  open issues with rules NOT in the new violation set (issue self-healed). */
async function persistViolations(productId: string, current: RuleViolation[]): Promise<void> {
  const currentRuleIds = new Set(current.map(v => v.ruleId))

  // 1. Auto-resolve open issues that are no longer detected
  const { data: existing } = await supabaseAdmin
    .from('quality_issues')
    .select('id, rule_id')
    .eq('product_id', productId)
    .eq('status', 'open')
  for (const ex of existing ?? []) {
    if (!currentRuleIds.has(ex.rule_id as string)) {
      await supabaseAdmin
        .from('quality_issues')
        .update({
          status: 'resolved',
          resolved_at: new Date().toISOString(),
          resolved_by: 'audit_self_heal',
        })
        .eq('id', ex.id)
    }
  }

  // 2. Insert new violations (skip if already open for same rule)
  const existingOpenRules = new Set((existing ?? []).map(e => e.rule_id as string))
  for (const v of current) {
    if (existingOpenRules.has(v.ruleId)) continue
    await supabaseAdmin
      .from('quality_issues')
      .insert({
        product_id: productId,
        rule_id: v.ruleId,
        severity: v.severity,
        message: v.message,
        details: v.details ?? {},
        status: 'open',
      })
      .select('id')
      .maybeSingle()
  }
}

/** Pre-publish gate. Runs full audit, attempts auto-fix on fixable issues,
 *  re-runs to see what survived. Returns whether product is safe to activate.
 *
 *  Used by:
 *  - Discovery auto-publish (publishCandidate) — if blocked, leaves draft
 *  - Manual approve from /admin/discovery — same
 *  - Status PATCH draft→active in future (currently bypassed for admin override)
 */
export async function runPrePublishAudit(productId: string): Promise<{
  canPublish: boolean
  blockingErrors: RuleViolation[]
  warnings: RuleViolation[]
  autoFixed: string[]
}> {
  const initialViolations = await auditProduct(productId, { persist: true })
  const autoFixed: string[] = []

  // Try auto-fix on every issue that has one
  const { data: issues } = await supabaseAdmin
    .from('quality_issues')
    .select('id, rule_id')
    .eq('product_id', productId)
    .eq('status', 'open')

  for (const issue of issues ?? []) {
    const rule = rules.find(r => r.ruleId === issue.rule_id)
    if (!rule || !rule.autoFix) continue
    try {
      const result = await attemptAutoFix(issue.id as string)
      if (result.ok) autoFixed.push(issue.rule_id as string)
    } catch {
      // continue
    }
  }

  // Re-audit after auto-fix attempts
  const finalViolations = autoFixed.length > 0
    ? await auditProduct(productId, { persist: true })
    : initialViolations

  const blockingErrors = finalViolations.filter(v => v.severity === 'error')
  const warnings = finalViolations.filter(v => v.severity === 'warning')

  return {
    canPublish: blockingErrors.length === 0,
    blockingErrors,
    warnings,
    autoFixed,
  }
}

/** Run auto-fix for a specific issue. Returns success status. */
export async function attemptAutoFix(issueId: string): Promise<{ ok: boolean; message?: string }> {
  const { data: issue } = await supabaseAdmin
    .from('quality_issues')
    .select('id, product_id, rule_id, status')
    .eq('id', issueId)
    .maybeSingle()
  if (!issue) return { ok: false, message: 'Issue not found' }
  if (issue.status !== 'open') return { ok: false, message: 'Issue is not open' }

  const rule = rules.find(r => r.ruleId === issue.rule_id)
  if (!rule || !rule.autoFix) {
    return { ok: false, message: 'Rule has no auto-fix' }
  }

  const { data: product } = await supabaseAdmin
    .from('products')
    .select('id, name, slug, status, type, acidity, polyphenols, peroxide_value, certifications, description_short, description_long, raw_description, image_url, image_source, source_url, volume_ml')
    .eq('id', issue.product_id)
    .maybeSingle()
  if (!product) return { ok: false, message: 'Product not found' }

  let result: { ok: boolean; message?: string }
  try {
    result = await rule.autoFix(product as ProductSnapshot)
  } catch (err) {
    result = { ok: false, message: err instanceof Error ? err.message : 'Auto-fix threw' }
  }

  await supabaseAdmin
    .from('quality_issues')
    .update({
      status: result.ok ? 'auto_fixed' : 'open',
      auto_fix_attempted: true,
      auto_fix_succeeded: result.ok,
      resolved_at: result.ok ? new Date().toISOString() : null,
      resolved_by: result.ok ? 'auto_fix' : null,
    })
    .eq('id', issueId)

  return result
}
