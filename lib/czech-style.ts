// Czech grammar + typography + style validator.
// Catches:
//   - Typography: missing non-breaking space before units (40°C → 40 °C, 0,32% → 0,32 %)
//   - Wrong words: typos that pass spell-check but aren't Czech (litové → litrové)
//   - Awkward EN translations: "za hlídání teploty", "výrazně se pohybuje pod limitem"
//
// Two modes:
//   - applyCzechTypographyFixes() — safe rewrites, apply automatically before saving
//   - validateCzechStyle() — returns issues (warnings) to surface in UI

export interface StyleIssue {
  severity: 'error' | 'warning'
  category: 'typography' | 'wrong_word' | 'awkward' | 'en_translation'
  message: string
  matched: string
  suggestion?: string
}

// ── 1. Auto-fix: safe typographic rewrites ────────────────────────────

const TYPO_AUTOFIX_RULES: Array<{ re: RegExp; to: string; desc: string }> = [
  // Non-breaking space (U+00A0) before units. Czech norm ČSN 01 6910.
  { re: /(\d)°C\b/g, to: '$1\u00a0°C', desc: 'mezera před °C' },
  { re: /(\d)\s?°\s?C\b/g, to: '$1\u00a0°C', desc: 'normalizace °C' },
  { re: /(\d)%/g, to: '$1\u00a0%', desc: 'mezera před %' },
  { re: /(\d)(ml|dl|cl|mg|kg)\b/g, to: '$1\u00a0$2', desc: 'mezera před jednotkou (ml/mg/kg)' },
  // "1 l" tricky — don't touch "olej" "cel" etc; require digit before l with word boundary
  { re: /(\b\d+)(l)\b/g, to: '$1\u00a0$2', desc: 'mezera před l (litr)' },
  // mg/kg combined
  { re: /(\d)\s?(mg\/kg)\b/g, to: '$1\u00a0$2', desc: 'mezera před mg/kg' },
  // "200 - 300" → "200–300" (numeric range uses en dash, no spaces)
  { re: /(\d+)\s+-\s+(\d+)/g, to: '$1–$2', desc: 'pomlčka v rozsahu čísel' },
  // Ordinary "-" between words that should be en-dashes in Czech: skip (risky)
]

/** Apply safe typographic fixes. Returns corrected text + list of rules that fired. */
export function applyCzechTypographyFixes(text: string): { fixed: string; applied: string[] } {
  let fixed = text
  const applied: string[] = []
  for (const rule of TYPO_AUTOFIX_RULES) {
    if (rule.re.test(fixed)) {
      fixed = fixed.replace(rule.re, rule.to)
      applied.push(rule.desc)
    }
    // Reset regex lastIndex (global flag state)
    rule.re.lastIndex = 0
  }
  return { fixed, applied }
}

// ── 2. Wrong words — not spell-check errors but invalid Czech ─────────

const WRONG_WORDS: Array<{ re: RegExp; correct: string; message: string }> = [
  {
    re: /\blitov(?:á|é|ého|ých|é|ou|ými|ém)\b/gi,
    correct: 'litrov{stejná koncovka}',
    message: '"litové/á/ých" není české slovo. Od "litr" je správně "litrové/á/ých".',
  },
  {
    re: /\bskleněnic[eiou]\b/gi,
    correct: 'skleněná láhev',
    message: '"skleněnice" není standardní — správně "skleněná láhev" nebo "sklenice"',
  },
]

// ── 3. Awkward phrases (translated from EN / clunky) ──────────────────

const AWKWARD_PHRASES: Array<{ re: RegExp; suggestion: string; message: string }> = [
  {
    re: /za\s+hlídání\s+(?:správné\s+)?teplot/i,
    suggestion: 'při kontrolované teplotě / za hlídané teploty',
    message: '"za hlídání teploty" zní jako překlad z EN. Použij "při kontrolované teplotě".',
  },
  {
    re: /výrazně\s+se\s+pohybuje\s+(?:pod|nad)/i,
    suggestion: 'je výrazně pod / drží se pod',
    message: '"olej se pohybuje pod limitem" — olej se nepohybuje. Použij "je výrazně pod limitem".',
  },
  {
    re: /vydrží\s+(?:i\s+)?(?:přípravu|vaření|smažení)/i,
    suggestion: 'snese / hodí se i na',
    message: '"olej vydrží přípravu" — olej není trpělivý. Použij "snese přípravu" nebo "hodí se na".',
  },
  {
    re: /oxidačn[íe]?ho?\s+stres/i,
    suggestion: 'oxidace / oxidační poškození',
    message: '"oxidační stres" je medicínský termín — zní odborně bez hodnoty pro čtenáře. Použij "oxidace".',
  },
  {
    re: /neřež[eí]\s+(?:chuť|jídlo)/i,
    suggestion: 'nepřebíjí chuť / neruší',
    message: '"olej neřeže chuť" — doslovný překlad. Použij "nepřebíjí chuť".',
  },
  {
    re: /obsah\s+(?:volných\s+)?mastných\s+kyselin\s+signalizuje/i,
    suggestion: 'znamená / ukazuje',
    message: '"obsah signalizuje" zní technicky. Použij "znamená".',
  },
  {
    re: /filosofi[iou]\s+výrobce/i,
    suggestion: 'přístup výrobce / styl výrobce',
    message: '"filosofie výrobce" je těžkopádné pro web. Lepší "přístup výrobce".',
  },
  {
    re: /balí\s+se\s+do\s+(?:tmavé\s+)?(?:skleněn|plastov)/i,
    suggestion: 'dodává se v / přichází v',
    message: '"balí se do" zní jako výroba. Použij "dodává se v".',
  },
  {
    re: /je\s+(?:ideáln|vhodn)[íěýáé]m?\s+pro\s+ty,?\s+kdo/i,
    suggestion: 'pro toho, kdo / kdo',
    message: 'Krkolomná konstrukce "ideální pro ty, kdo". Zkrať.',
  },
]

export function validateCzechStyle(text: string): StyleIssue[] {
  const issues: StyleIssue[] = []

  // Wrong words → warnings
  for (const { re, correct, message } of WRONG_WORDS) {
    const matches = [...text.matchAll(re)]
    for (const m of matches) {
      issues.push({
        severity: 'warning',
        category: 'wrong_word',
        message,
        matched: m[0],
        suggestion: correct,
      })
    }
  }

  // Awkward phrases → warnings
  for (const { re, suggestion, message } of AWKWARD_PHRASES) {
    const m = text.match(re)
    if (m) {
      issues.push({
        severity: 'warning',
        category: 'awkward',
        message,
        matched: m[0],
        suggestion,
      })
    }
  }

  // Detect: numbers without non-breaking space (should have been autofixed, but check anyway)
  const unitsWithoutSpace = text.match(/\d(?:°C|%)(?!\d)/g) ?? []
  const firstMatch = unitsWithoutSpace[0]
  if (firstMatch) {
    issues.push({
      severity: 'warning',
      category: 'typography',
      message: `Mezera před jednotkou chybí (ČSN 01 6910) — pravděpodobně ${firstMatch} místo "${firstMatch.replace(/(\d)/, '$1 ')}"`,
      matched: firstMatch,
    })
  }

  // Very long sentence detection (>35 words = hard to read)
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0)
  for (const s of sentences) {
    const words = s.trim().split(/\s+/).length
    if (words > 35) {
      issues.push({
        severity: 'warning',
        category: 'awkward',
        message: `Dlouhá věta (${words} slov) — rozbij. Čtivý web má věty 12-20 slov.`,
        matched: s.trim().slice(0, 80) + '...',
      })
    }
  }

  return issues
}
