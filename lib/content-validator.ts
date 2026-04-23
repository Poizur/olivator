// Automated QA for AI-generated product descriptions.
// Catches hallucinations + banned marketing phrases + missing required data.
// Runs after each Claude rewrite. Admin sees color-coded issues.

export type Severity = 'error' | 'warning' | 'info'
export type Category =
  | 'banned_phrase'
  | 'hallucination'
  | 'missing_required'
  | 'missing_recommended'
  | 'length'
  | 'style'

export interface ValidationIssue {
  severity: Severity
  category: Category
  message: string
  matched?: string // the actual offending text
}

export interface ValidationResult {
  ok: boolean              // no errors (warnings are fine)
  errors: number
  warnings: number
  infos: number
  wordCount: number
  charCount: number
  issues: ValidationIssue[]
}

export interface ValidationInput {
  shortDescription: string
  longDescription: string
  // source context — we check if text claims match
  acidity?: number | null
  polyphenols?: number | null
  region?: string | null
  country?: string | null
  certifications?: string[]
}

// ── Rule sets ─────────────────────────────────────────────────────────

/** Always forbidden — these are pure marketing fluff or imitations of e-shop copy. */
const BANNED_PHRASES: { phrase: RegExp; message: string }[] = [
  { phrase: /perfektn[íi]\s+volb/i, message: 'Marketingová fráze "perfektní volba"' },
  { phrase: /ide[áa]ln[íi]\s+volb/i, message: 'Marketingová fráze "ideální volba"' },
  { phrase: /patř[ií]\s+mezi\s+nejlep/i, message: 'Nepodložený superlativ "patří mezi nejlepší"' },
  { phrase: /patř[ií]\s+mezi\s+nejkvalitn/i, message: 'Nepodložený superlativ "patří mezi nejkvalitnější"' },
  { phrase: /jedn[yi]\s+z\s+nej\w+\s+(v[ůu]bec|ve\s+sv[ěe]t)/i, message: 'Globální superlativ "jedny z nejlepších vůbec/ve světě"' },
  { phrase: /mimoř[áa]dn[áaáuéy]\s+kvalit/i, message: 'Prázdná fráze "mimořádná kvalita"' },
  { phrase: /v[yý]jime[čc]n[áaáuéy]\s+(chut|kvalit)/i, message: 'Prázdná fráze "výjimečná chuť/kvalita"' },
  { phrase: /pr[ée]miov[áaéyý]\s+(kvalit|z[áa]žit)/i, message: 'Prázdná fráze "prémiová kvalita/zážitek"' },
  { phrase: /nejcenn[ěe]jš[ií][ch]?\s+(olej|ve\s+st[řr]edomo)/i, message: 'Globální superlativ "nejcennější ve Středomoří"' },
  { phrase: /klikni\s+zde/i, message: 'Agresivní CTA "KLIKNI ZDE"' },
  { phrase: /nev[áa]hejte/i, message: 'Nátlakové CTA "neváhejte"' },
  { phrase: /kupte\s+(hned|te[ďd])/i, message: 'Nátlakové CTA "kupte hned"' },
  { phrase: /\bnáš\s+olej\b|\bnaše\s+oliv/i, message: 'Osobní zájmena — text imituje e-shop místo objektivního popisu' },
  { phrase: /\bu\s+n[áa]s\s+(doma|na\s+farm|na\s+plant)/i, message: 'Osobní zájmena "u nás"' },
]

/** Topics Claude frequently hallucinates when data is missing.
 *  We warn if mentioned without corresponding context. */
const HALLUCINATION_RISKS: { re: RegExp; topic: string; contextKey?: 'region' }[] = [
  { re: /vulk[áa]nick\w+|soupeč\w+|sope[čc]n\w+/i, topic: 'vulkanická geologie' },
  { re: /v[áa]pencov\w+\s+(p[ůu]d|skal|hornin)/i, topic: 'vápencové půdy' },
  { re: /j[íi]lovit\w+\s+p[ůu]d/i, topic: 'jílovité půdy' },
  { re: /mikroklimat\w*/i, topic: 'mikroklima' },
  { re: /ion[sš]k[éeýá]?\s+v[ěe]tr/i, topic: 'ionské větry' },
  { re: /stolet[áa]\s+tradic/i, topic: 'staletá tradice' },
  { re: /od\s+roku\s+1[789]\d\d|zakl[áa]d[áa]n[áa]\s+v\s+(r\.|roce)\s+1[789]\d\d/i, topic: 'historický rok založení' },
  { re: /[řr][íi]msk[áa]?\s+(doba|tradice|met[oó]d)/i, topic: 'římské tradice' },
  { re: /koroneiki|arbequina|frantoio|picual|hojiblanca|leccino/i, topic: 'konkrétní odrůda oliv' },
]

/** Award-related phrases — only allowed if source has NYIOOC certification. */
const AWARD_PATTERNS: RegExp[] = [
  /zlat[áeáýé]\s+medail/i,
  /st[řr][íi]br[áeáýné]\s+medail/i,
  /bronzov[áeáýé]\s+medail/i,
  /oceněn[ýí]\s+na\s+sout[ěe]ž/i,
  /v[ýy]herc[ei]\s+soutěž/i,
  /[oó]ceněn[ýí]\s+prest[íi]žn/i,
]

// ── Main entry ────────────────────────────────────────────────────────

export function validateContent(input: ValidationInput): ValidationResult {
  const issues: ValidationIssue[] = []
  const full = `${input.shortDescription}\n\n${input.longDescription}`
  const wordCount = countWords(input.longDescription)
  const charCount = input.shortDescription.length

  // 1. Banned phrases → ERROR (regenerate)
  for (const { phrase, message } of BANNED_PHRASES) {
    const m = full.match(phrase)
    if (m) {
      issues.push({
        severity: 'error',
        category: 'banned_phrase',
        message,
        matched: m[0],
      })
    }
  }

  // 2. Hallucination risks → WARNING (admin check)
  for (const { re, topic } of HALLUCINATION_RISKS) {
    const m = full.match(re)
    if (m) {
      issues.push({
        severity: 'warning',
        category: 'hallucination',
        message: `Zmiňuje "${topic}" — ověř zda to odpovídá realitě (Claude si to mohl domyslet)`,
        matched: m[0],
      })
    }
  }

  // 3. Award claims without NYIOOC → ERROR
  const hasNYIOOC = (input.certifications ?? []).includes('nyiooc')
  if (!hasNYIOOC) {
    for (const pattern of AWARD_PATTERNS) {
      const m = full.match(pattern)
      if (m) {
        issues.push({
          severity: 'error',
          category: 'hallucination',
          message: 'Zmiňuje medaili/ocenění, ale produkt nemá NYIOOC certifikaci v DB',
          matched: m[0],
        })
      }
    }
  }

  // 4. Required data — if source has it, text should mention it
  if (input.acidity != null) {
    const acidityStr = String(input.acidity).replace('.', ',')
    const altStr = String(input.acidity)
    if (!full.includes(acidityStr) && !full.includes(altStr)) {
      issues.push({
        severity: 'warning',
        category: 'missing_required',
        message: `Text neobsahuje kyselost (${input.acidity}%) — chybí klíčová data`,
      })
    }
  }
  if (input.polyphenols != null && input.polyphenols > 0) {
    if (!full.includes(String(input.polyphenols))) {
      issues.push({
        severity: 'warning',
        category: 'missing_required',
        message: `Text neobsahuje polyfenoly (${input.polyphenols} mg/kg) — chybí klíčová data`,
      })
    }
  }
  if (input.region && !full.includes(input.region)) {
    issues.push({
      severity: 'info',
      category: 'missing_recommended',
      message: `Text nezmiňuje region "${input.region}"`,
    })
  }

  // 5. Length checks
  if (charCount < 60) {
    issues.push({
      severity: 'warning',
      category: 'length',
      message: `Krátký popis (${charCount} znaků) — doporučeno 100-180`,
    })
  } else if (charCount > 200) {
    issues.push({
      severity: 'warning',
      category: 'length',
      message: `Krátký popis je moc dlouhý (${charCount} znaků) — max 180`,
    })
  }

  if (wordCount < 150) {
    issues.push({
      severity: 'warning',
      category: 'length',
      message: `Dlouhý popis je krátký (${wordCount} slov) — doporučeno 200-350 pro long-tail SEO`,
    })
  } else if (wordCount > 450) {
    issues.push({
      severity: 'info',
      category: 'length',
      message: `Dlouhý popis je delší (${wordCount} slov) — doporučeno 200-350`,
    })
  }

  const errors = issues.filter(i => i.severity === 'error').length
  const warnings = issues.filter(i => i.severity === 'warning').length
  const infos = issues.filter(i => i.severity === 'info').length

  return {
    ok: errors === 0,
    errors,
    warnings,
    infos,
    wordCount,
    charCount,
    issues,
  }
}

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length
}
