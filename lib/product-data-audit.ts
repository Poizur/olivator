// Product Data Audit — Fáze 3 master-foundation plánu.
//
// Pipeline:
//   1. Pro daný produkt → načti raw_description + aktuální field values
//   2. Claude Haiku audit: pro každé pole vrať NEW_VALUE + CONFIDENCE + EVIDENCE
//   3. Persist do product_data_audit (s audit_run_id pro skupinování)
//   4. Auto-apply HIGH změn → UPDATE products + applied=true
//   5. MEDIUM/LOW → jen log
//
// Score-affecting pole (acidity, polyphenols, certifications, peroxide_value)
// triggeruje recalc po apply.
//
// Voláno z scripts/audit-products.ts (batch s env vars).

import { supabaseAdmin } from './supabase'
import { callClaude, extractText } from './anthropic'
import { getInjectionBlock } from './learning-injector'
import { calculateScore } from './score'
import type { CostTracker } from './cost-tracker'

const AUDIT_MODEL = 'claude-haiku-4-5-20251001'

// Pole co audit kontroluje. Klíče matchují products columns.
const AUDITED_FIELDS = [
  'producer',         // brand / výrobce
  'variety',          // odrůda oliv (Koroneiki, Arbequina)
  'origin_country',   // ISO 2 (GR, IT, ES)
  'origin_region',    // konkrétní region (Andalusie, Sicílie)
  'harvest_year',     // rok sklizně (2024, 2025)
  'processing',       // way (early_harvest, cold_pressed, filtered)
  'acidity',          // % (0.18, 0.32)
  'polyphenols',      // mg/kg (250-2000+)
  'peroxide_value',   // index (<15 typically)
  'certifications',   // ["dop", "bio", "nyiooc"]
  'type',             // evoo, virgin, refined, flavored
] as const

type AuditField = (typeof AUDITED_FIELDS)[number]

const SCORE_AFFECTING_FIELDS = new Set<AuditField>([
  'acidity', 'polyphenols', 'certifications', 'peroxide_value', 'type',
])

const NUMERIC_FIELDS = new Set<AuditField>(['acidity', 'polyphenols', 'harvest_year', 'peroxide_value'])
const ARRAY_FIELDS = new Set<AuditField>(['certifications'])

const AUDIT_SYSTEM = `Jsi auditor strukturovaných dat olivových olejů pro Olivator.cz.
Z poskytnutých vstupů (název, source URL, raw popis z e-shopu, aktuální DB hodnoty)
NAVRHNI VYLEPŠENÍ jednotlivých polí. Pro každé pole vrať NEW_VALUE pokud máš lepší
hodnotu, jinak NULL.

VRACÍŠ POUZE VALIDNÍ JSON — žádný markdown, žádné komentáře:
{
  "audits": [
    {
      "field": "producer",
      "new_value": "Frantoio Muraglia",
      "confidence": "high",
      "evidence": "max 200 znaků citace z textu nebo URL"
    },
    {
      "field": "variety",
      "new_value": null,
      "confidence": "low",
      "evidence": "Žádná konkrétní odrůda v textu"
    }
  ]
}

PRAVIDLA:
- Vrať audit pro KAŽDÉ pole (i pokud new_value=null → říkáš "nemám nic lepšího")
- new_value = null pokud nemáš solidní důkaz, NEHÁDEJ
- confidence:
  * high = explicitní v textu nebo URL ("Castillo de Canena", "Koroneiki", "kyselost 0,18 %")
  * medium = implicitní ale silné (DOP Sitia → origin_region=Sitia)
  * low = odhad / triangulace bez citace
- evidence = krátká citace ze surového textu, max 200 znaků

POLE A JEJICH HODNOTY:

- producer: skutečné jméno výrobce/farmy ("Frantoio Muraglia", "Castillo de Canena").
  NIKDY generická slova (extra panenský, olivový, prémiový).
- variety: jedna nebo víc odrůd ("Koroneiki", "Arbequina, Picual", "Frantoio").
  CSV řetězec pokud víc, latina jména.
- origin_country: ISO 2 ("GR" Řecko, "IT" Itálie, "ES" Španělsko, "HR" Chorvatsko,
  "PT" Portugalsko, "TR" Turecko, "TN" Tunisko).
- origin_region: lokální název ("Kréta", "Sitia", "Toskánsko", "Apulie", "Andalusie",
  "Sicílie"). Ne hrubé celostátní. Pokud DOP zóna, dej tu zónu.
- harvest_year: integer (2024, 2025). NULL pokud nejasné.
- processing: jedna z hodnot: "cold_pressed", "early_harvest", "filtered",
  "unfiltered", "late_harvest". NULL pokud nejasné.
- acidity: decimal v procentech (0.18, 0.32). NIKDY záporné, max ~0.8 pro EVOO.
- polyphenols: integer mg/kg (250-2500 typicky). Pod 100 = nemá smysl audit (asi
  není EVOO).
- peroxide_value: decimal mEq/kg (<20 pro EVOO).
- certifications: pole stringů — "dop", "pgi", "bio", "organic", "nyiooc",
  "demeter", "agrocert". Lowercase. Pokud current je array, navrhni nový array
  (přidej / odeber prvky).
- type: "evoo" (extra panenský), "virgin" (panenský), "refined" (rafinovaný),
  "olive_oil" (běžný), "pomace" (z výlisků), "flavored" (s příchutí — chilli/lemon).

DŮLEŽITÉ — KDY VRACET NULL:
- Pole už má správnou hodnotu (== current) → new_value: null
- Nemáš lepší data než current → new_value: null
- Nemáš dost důkazů → new_value: null (NIKDY nehádej generickou hodnotu)

Pokud raw_description nestačí, ale source_url obsahuje název výrobce nebo region,
to JE důkaz pro HIGH confidence.`

export interface AuditSuggestion {
  field: AuditField
  new_value: string | number | string[] | null
  confidence: 'high' | 'medium' | 'low'
  evidence: string
}

interface AuditResponse {
  audits: AuditSuggestion[]
}

export interface ProductAuditResult {
  productId: string
  productName: string
  auditRunId: string
  suggestionsByConfidence: { high: number; medium: number; low: number }
  appliedHigh: number
  scoreChanged: boolean
  scoreBefore: number | null
  scoreAfter: number | null
  errors: string[]
}

function castValue(field: AuditField, raw: string | number | string[] | null): unknown {
  if (raw == null) return null
  if (NUMERIC_FIELDS.has(field)) {
    if (typeof raw === 'number') return raw
    if (typeof raw === 'string') {
      const n = parseFloat(raw.replace(',', '.'))
      return isNaN(n) ? null : n
    }
    return null
  }
  if (ARRAY_FIELDS.has(field)) {
    if (Array.isArray(raw)) return raw.filter(s => typeof s === 'string').map(s => s.toLowerCase().trim()).filter(Boolean)
    if (typeof raw === 'string') {
      try {
        const parsed = JSON.parse(raw)
        if (Array.isArray(parsed)) return parsed.filter(s => typeof s === 'string').map(s => s.toLowerCase().trim()).filter(Boolean)
      } catch {}
      return raw.split(/[,;]/).map(s => s.toLowerCase().trim()).filter(Boolean)
    }
    return null
  }
  if (typeof raw === 'string') return raw.trim()
  return raw
}

function valuesEqual(a: unknown, b: unknown): boolean {
  if (a == null && b == null) return true
  if (a == null || b == null) return false
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false
    const sa = [...a].map(s => String(s).toLowerCase()).sort()
    const sb = [...b].map(s => String(s).toLowerCase()).sort()
    return sa.every((v, i) => v === sb[i])
  }
  return String(a).toLowerCase() === String(b).toLowerCase()
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

  const before = (p.olivator_score as number | null) ?? null
  const after = score.insufficientData ? null : score.total

  await supabaseAdmin
    .from('products')
    .update({
      olivator_score: after,
      score_breakdown: score.breakdown,
      updated_at: new Date().toISOString(),
    })
    .eq('id', productId)

  return { before, after }
}

/** Audit jednoho produktu přes Claude Haiku.
 *  Volá Claude → JSON parse → ukládá do product_data_audit → auto-apply HIGH.
 *  Vrací summary s počty + score impact. */
export async function auditProductWithClaude(
  productId: string,
  auditRunId: string,
  costTracker: CostTracker
): Promise<ProductAuditResult> {
  const result: ProductAuditResult = {
    productId,
    productName: '',
    auditRunId,
    suggestionsByConfidence: { high: 0, medium: 0, low: 0 },
    appliedHigh: 0,
    scoreChanged: false,
    scoreBefore: null,
    scoreAfter: null,
    errors: [],
  }

  // 1. Načti produkt
  const { data: prod } = await supabaseAdmin
    .from('products')
    .select([
      'id', 'name', 'source_url', 'raw_description',
      'producer', 'variety', 'origin_country', 'origin_region',
      'harvest_year', 'processing', 'acidity', 'polyphenols',
      'peroxide_value', 'certifications', 'type', 'olivator_score',
    ].join(', '))
    .eq('id', productId)
    .maybeSingle()

  if (!prod) {
    result.errors.push('product not found')
    return result
  }
  const p = prod as unknown as Record<string, unknown>
  result.productName = (p.name as string) ?? ''

  if (!p.source_url) {
    result.errors.push('no source_url — skip')
    return result
  }

  costTracker.guard()

  // 2. Vytvoř Claude prompt
  const currentValues = AUDITED_FIELDS.map(f => {
    const v = p[f]
    const display = v == null ? '(null)' : Array.isArray(v) ? JSON.stringify(v) : String(v)
    return `  ${f}: ${display}`
  }).join('\n')

  const userText = [
    `Název: ${p.name ?? '(unknown)'}`,
    `Source URL: ${p.source_url}`,
    '',
    'Aktuální DB hodnoty:',
    currentValues,
    '',
    'Raw popis z e-shopu (zkráceno):',
    (p.raw_description as string | null)?.slice(0, 3000) ?? '(žádný popis)',
  ].join('\n')

  // 3. Volej Claude (s learning injekcí)
  const learningsBlock = await getInjectionBlock('fact_extractor')
  let parsedAudits: AuditSuggestion[] = []
  try {
    const res = await callClaude({
      model: AUDIT_MODEL,
      max_tokens: 2000,
      system: `${learningsBlock}${AUDIT_SYSTEM}`,
      messages: [{ role: 'user', content: userText }],
    })
    costTracker.recordUsage(AUDIT_MODEL, res.usage)

    const raw = extractText(res).trim()
    // Robust JSON extract — Claude občas přidá trailing text za } na konci array
    // (např. když dojdou tokens uprostřed JSON object → unclosed structure).
    // Extrahuj substring od první { do poslední } co odpovídá JSONu.
    let text = raw.replace(/^```(?:json)?\s*/, '').replace(/\s*```\s*$/, '').trim()
    const firstBrace = text.indexOf('{')
    const lastBrace = text.lastIndexOf('}')
    if (firstBrace > -1 && lastBrace > firstBrace) {
      text = text.slice(firstBrace, lastBrace + 1)
    }
    const parsed = JSON.parse(text) as AuditResponse
    parsedAudits = parsed.audits ?? []
  } catch (err) {
    result.errors.push(`Claude/parse: ${err instanceof Error ? err.message.slice(0, 100) : 'unknown'}`)
    return result
  }

  // 4. Persist audit rows + auto-apply HIGH
  let touchedScoreFields = false
  for (const sugg of parsedAudits) {
    if (!AUDITED_FIELDS.includes(sugg.field)) continue
    if (sugg.new_value == null) continue // Claude nemá nic lepšího

    const conf = (sugg.confidence ?? 'low').toLowerCase() as 'high' | 'medium' | 'low'
    if (conf !== 'high' && conf !== 'medium' && conf !== 'low') continue
    result.suggestionsByConfidence[conf]++

    const casted = castValue(sugg.field, sugg.new_value)
    const current = p[sugg.field]

    // Skip pokud už identicky
    if (valuesEqual(current, casted)) continue

    // Insert audit row
    const { error: insErr } = await supabaseAdmin.from('product_data_audit').insert({
      audit_run_id: auditRunId,
      product_id: productId,
      field: sugg.field,
      old_value: current == null ? null : (Array.isArray(current) ? JSON.stringify(current) : String(current)),
      new_value: casted == null ? null : (Array.isArray(casted) ? JSON.stringify(casted) : String(casted)),
      source_quote: (sugg.evidence ?? '').slice(0, 500),
      source_url: p.source_url as string,
      confidence: conf,
      applied: conf === 'high', // auto-apply HIGH
      applied_at: conf === 'high' ? new Date().toISOString() : null,
      dismissed: false,
    })
    if (insErr) {
      result.errors.push(`insert audit row: ${insErr.message.slice(0, 80)}`)
      continue
    }

    // Auto-apply HIGH directly to products
    if (conf === 'high') {
      const { error: updErr } = await supabaseAdmin
        .from('products')
        .update({
          [sugg.field]: casted,
          updated_at: new Date().toISOString(),
        })
        .eq('id', productId)
      if (updErr) {
        result.errors.push(`apply ${sugg.field}: ${updErr.message.slice(0, 80)}`)
        continue
      }
      result.appliedHigh++
      if (SCORE_AFFECTING_FIELDS.has(sugg.field)) {
        touchedScoreFields = true
      }
    }
  }

  // 5. Recalc Score pokud applied HIGH dotklo score-affecting pole
  if (touchedScoreFields) {
    const r = await recalcScore(productId)
    result.scoreBefore = r.before
    result.scoreAfter = r.after
    result.scoreChanged = r.before !== r.after
  }

  return result
}

/** Vrátí UUID pro nový audit run. Generuje crypto. */
export function newAuditRunId(): string {
  return crypto.randomUUID()
}

// ─────────────────────────────────────────────────────────────────────
// 2nd pass — re-evaluate MEDIUM suggestions s přísnějším promptem
// ─────────────────────────────────────────────────────────────────────

const MEDIUM_PASS_SYSTEM = `Jsi přísný re-validátor audit návrhů pro Olivator.cz.
Dostaneš seznam návrhů co minulé kolo označilo MEDIUM (implicitní důkaz, ne
explicitní citace). Tvůj úkol: ROZHODNI s vyšší přísností.

PRAVIDLA:
- HIGH = MUSÍŠ mít explicit citaci ze zdrojového textu nebo URL. Žádné
  triangulace, žádné domněnky. Citaci uveď v evidence.
- LOW = Není dost důkazu (nebo původní MEDIUM byl optimistický odhad).
- KEEP = Zůstaň MEDIUM (nejistota se nezměnila, admin musí ručně).

Pro každý návrh vrať:
- new_value: ponech původní pokud HIGH/KEEP, jinak null
- new_confidence: "high" | "low" | "keep"
- evidence: max 200 znaků citace pokud HIGH, jinak důvod proč LOW/KEEP

VRACÍŠ POUZE VALIDNÍ JSON:
{
  "audits": [
    {"field": "processing", "new_confidence": "high", "new_value": "cold_pressed", "evidence": "raw text: 'lisováno za studena pod 27 °C'"},
    {"field": "harvest_year", "new_confidence": "low", "new_value": null, "evidence": "Žádný explicitní rok v textu"}
  ]
}`

interface MediumSuggestion {
  field: AuditField
  proposed_value: string | null
  new_confidence: 'high' | 'low' | 'keep'
  new_value: string | number | string[] | null
  evidence: string
}

interface MediumPassResponse {
  audits: Array<{
    field: string
    new_confidence: string
    new_value: string | number | string[] | null
    evidence: string
  }>
}

export interface MediumPassResult {
  productId: string
  productName: string
  mediumRowsProcessed: number
  upgradedToHigh: number
  demotedToLow: number
  keptMedium: number
  scoreChanged: boolean
  scoreBefore: number | null
  scoreAfter: number | null
  errors: string[]
}

/** Re-evaluate MEDIUM suggestions pro jeden produkt přes Claude Haiku.
 *  Když 2nd pass řekne HIGH → aplikuje + označí původní MEDIUM row jako
 *  applied. Když LOW → původní row přejde do dismissed (admin ho nemusí
 *  řešit). Když KEEP → row zůstává MEDIUM (admin musí ručně).
 *
 *  Lean prompt — pošle jen MEDIUM fields, ne celý product audit. Cíl
 *  ~500 in + 200 out tokens = ~$0.0007/call. */
export async function auditMediumPassForProduct(
  productId: string,
  costTracker: CostTracker
): Promise<MediumPassResult> {
  const result: MediumPassResult = {
    productId,
    productName: '',
    mediumRowsProcessed: 0,
    upgradedToHigh: 0,
    demotedToLow: 0,
    keptMedium: 0,
    scoreChanged: false,
    scoreBefore: null,
    scoreAfter: null,
    errors: [],
  }

  // 1. Načti produkt + pending MEDIUM rows
  const { data: prod } = await supabaseAdmin
    .from('products')
    .select('id, name, source_url, raw_description, olivator_score')
    .eq('id', productId)
    .maybeSingle()
  if (!prod) {
    result.errors.push('product not found')
    return result
  }
  const p = prod as Record<string, unknown>
  result.productName = (p.name as string) ?? ''
  result.scoreBefore = (p.olivator_score as number | null) ?? null

  const { data: mediumRows } = await supabaseAdmin
    .from('product_data_audit')
    .select('id, field, new_value, source_quote')
    .eq('product_id', productId)
    .eq('confidence', 'medium')
    .eq('applied', false)
    .eq('dismissed', false)

  const rows = (mediumRows ?? []) as Array<{ id: string; field: string; new_value: string | null; source_quote: string | null }>
  result.mediumRowsProcessed = rows.length

  if (rows.length === 0) return result

  if (!p.source_url) {
    result.errors.push('no source_url — keep MEDIUMs untouched')
    return result
  }

  costTracker.guard()

  // 2. Build lean prompt
  const suggestionsList = rows
    .map((r) => `- field=${r.field}, navrhovaná hodnota="${r.new_value}", původní evidence: "${(r.source_quote ?? '').slice(0, 100)}"`)
    .join('\n')

  const userText = [
    `Produkt: ${p.name ?? '(unknown)'}`,
    `Source URL: ${p.source_url}`,
    '',
    'NÁVRHY K RE-VALIDACI:',
    suggestionsList,
    '',
    'Raw popis (zkráceno):',
    (p.raw_description as string | null)?.slice(0, 2500) ?? '(žádný popis)',
    '',
    `Vrať JSON s ${rows.length} audity (jeden per field).`,
  ].join('\n')

  // 3. Volej Claude
  let parsedAudits: MediumSuggestion[] = []
  try {
    const learningsBlock = await getInjectionBlock('fact_extractor')
    const res = await callClaude({
      model: AUDIT_MODEL,
      max_tokens: 800,
      system: `${learningsBlock}${MEDIUM_PASS_SYSTEM}`,
      messages: [{ role: 'user', content: userText }],
    })
    costTracker.recordUsage(AUDIT_MODEL, res.usage)

    const raw = extractText(res).trim()
    let text = raw.replace(/^```(?:json)?\s*/, '').replace(/\s*```\s*$/, '').trim()
    const firstBrace = text.indexOf('{')
    const lastBrace = text.lastIndexOf('}')
    if (firstBrace > -1 && lastBrace > firstBrace) {
      text = text.slice(firstBrace, lastBrace + 1)
    }
    const parsed = JSON.parse(text) as MediumPassResponse

    parsedAudits = (parsed.audits ?? []).map(a => ({
      field: a.field as AuditField,
      proposed_value: rows.find(r => r.field === a.field)?.new_value ?? null,
      new_confidence: (a.new_confidence ?? 'keep').toLowerCase() as 'high' | 'low' | 'keep',
      new_value: a.new_value ?? null,
      evidence: a.evidence ?? '',
    }))
  } catch (err) {
    result.errors.push(`Claude/parse: ${err instanceof Error ? err.message.slice(0, 100) : 'unknown'}`)
    return result
  }

  // 4. Process responses
  let touchedScoreFields = false
  for (const sugg of parsedAudits) {
    const originalRow = rows.find(r => r.field === sugg.field)
    if (!originalRow) continue

    if (sugg.new_confidence === 'high' && sugg.new_value != null) {
      // Upgrade → apply
      const casted = castValue(sugg.field, sugg.new_value)
      const { error: updErr } = await supabaseAdmin
        .from('products')
        .update({ [sugg.field]: casted, updated_at: new Date().toISOString() })
        .eq('id', productId)
      if (updErr) {
        result.errors.push(`apply ${sugg.field}: ${updErr.message.slice(0, 80)}`)
        continue
      }
      await supabaseAdmin
        .from('product_data_audit')
        .update({
          confidence: 'high',
          applied: true,
          applied_at: new Date().toISOString(),
          source_quote: `[2nd pass HIGH] ${sugg.evidence}`.slice(0, 500),
        })
        .eq('id', originalRow.id)
      result.upgradedToHigh++
      if (SCORE_AFFECTING_FIELDS.has(sugg.field)) touchedScoreFields = true
    } else if (sugg.new_confidence === 'low') {
      // Demote → dismiss (admin nemusí řešit)
      await supabaseAdmin
        .from('product_data_audit')
        .update({
          confidence: 'low',
          dismissed: true,
          source_quote: `[2nd pass LOW] ${sugg.evidence}`.slice(0, 500),
        })
        .eq('id', originalRow.id)
      result.demotedToLow++
    } else {
      // KEEP — nech řádek nezměněn
      result.keptMedium++
    }
  }

  // 5. Recalc Score pokud applied HIGH dotklo score-affecting pole
  if (touchedScoreFields) {
    const r = await recalcScore(productId)
    result.scoreAfter = r.after
    result.scoreChanged = r.before !== r.after
  } else {
    result.scoreAfter = result.scoreBefore
  }

  return result
}
