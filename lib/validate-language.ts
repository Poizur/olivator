/**
 * Output language validator — UZÁVĚRA-4.
 *
 * Volej na výstupu KAŽDÉHO generátoru před uložením do DB.
 * Detekuje: cirilici, angličtinu, chybějící slovenštinu (pro SK target).
 */

const CYRILLIC_RE = /[Ѐ-ӿ]/
const CHINESE_RE = /[一-鿿]/
const ARABIC_RE = /[؀-ۿ]/

// Anglické stopwords — pokud jich je >5 v textu, text je pravděpodobně anglicky
const EN_STOPWORDS = /\b(the|and|of|for|with|that|this|from|are|was|been|have|will|they|their|there|which|about|would|could|should|also|more|some|than|then|when|been|into|over|after|such|each|most|other|these|those)\b/gi

// Česky-specifická slova (DK test: přítomnost ≥3 z nich = CZ text)
const CS_MARKERS = /\b(olivový|olej|kyselost|polyfenoly|certifikace|obsah|extra|panenský|hodnocení|nabídka|přehled|koupit|dostupný|cena|litr|sklizeň|původ|výrobce|kvalita|doporučujeme|nejlepší|srovnání)\b/gi

// Slovensky-specifická slova
const SK_MARKERS = /\b(olivový|olej|kyslost|polyfenoly|certifikácia|obsah|extra|panenský|hodnotenie|ponuka|prehľad|kúpiť|dostupný|cena|liter|zber|pôvod|výrobca|kvalita|odporúčame|najlepší|porovnanie)\b/gi

export interface LanguageValidationResult {
  ok: boolean
  issues: string[]
  enWordCount: number
  hasCyrillic: boolean
  hasChineseOrArabic: boolean
  csMarkerCount: number
  skMarkerCount: number
}

export function validateOutputLanguage(
  text: string,
  target: 'cs' | 'sk',
): LanguageValidationResult {
  const issues: string[] = []

  const hasCyrillic = CYRILLIC_RE.test(text)
  const hasChineseOrArabic = CHINESE_RE.test(text) || ARABIC_RE.test(text)
  const enMatches = text.match(EN_STOPWORDS) ?? []
  const enWordCount = enMatches.length
  const csMarkerCount = (text.match(CS_MARKERS) ?? []).length
  const skMarkerCount = (text.match(SK_MARKERS) ?? []).length

  if (hasCyrillic) {
    issues.push('Text obsahuje cyrilici — pravděpodobně špatný jazyk výstupu')
  }
  if (hasChineseOrArabic) {
    issues.push('Text obsahuje čínské nebo arabské znaky')
  }
  if (enWordCount > 8) {
    issues.push(`Text obsahuje ${enWordCount} anglických stopwords — možná anglický výstup místo ${target.toUpperCase()}`)
  }
  if (target === 'cs' && csMarkerCount < 3 && text.length > 200) {
    issues.push(`Málo českých markerů (${csMarkerCount}) — ověř že výstup je česky`)
  }
  if (target === 'sk' && skMarkerCount < 3 && text.length > 200) {
    issues.push(`Málo slovenských markerů (${skMarkerCount}) — ověř že výstup je slovensky`)
  }

  return {
    ok: issues.length === 0,
    issues,
    enWordCount,
    hasCyrillic,
    hasChineseOrArabic,
    csMarkerCount,
    skMarkerCount,
  }
}

/** Rychlá kontrola pro inline použití — vrací true pokud je výstup OK */
export function isValidLanguage(text: string, target: 'cs' | 'sk' = 'cs'): boolean {
  return validateOutputLanguage(text, target).ok
}

/** Loguje výsledek validace — nezastaví proces, jen loguje */
export function logLanguageValidation(
  text: string,
  target: 'cs' | 'sk',
  context: string,
): void {
  const result = validateOutputLanguage(text, target)
  if (!result.ok) {
    console.warn(`[validate-language] ⚠ ${context}: ${result.issues.join('; ')}`)
  }
}
