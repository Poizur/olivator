// Jediná brána pro zápis generovaného veřejného textu do DB (produkty, značky, oblasti, odrůdy, recepty, FAQ entit, články):
// jazyk (cyrilice, angličtina) + redakční pravidla (§26 zdravotní tvrzení, „testovali jsme“, počty natvrdo).

import { validateOutputLanguage } from './validate-language'
import { findEditorialIssues, formatEditorialIssues } from './editorial-rules'

/** Vrátí seznam problémů; prázdné pole = text smí do DB. */
export function guardPublicText(fields: Record<string, unknown>, label: string): string[] {
  const issues: string[] = []
  for (const [key, value] of Object.entries(fields)) {
    const text = typeof value === 'string' ? value : value == null ? '' : JSON.stringify(value)
    if (!text.trim()) continue
    const lang = validateOutputLanguage(text, 'cs')
    if (lang.hasCyrillic || lang.hasChineseOrArabic || lang.enWordCount > 8) issues.push(`${label}.${key}: ${lang.issues.join('; ')}`)
    const editorial = findEditorialIssues(text)
    if (editorial.length > 0) issues.push(`${label}.${key}: ${formatEditorialIssues(editorial)}`)
  }
  return issues
}

/** Vyhodí chybu, když text neprojde — generátory ji zachytí a zápis se neprovede. */
export function assertPublicText(fields: Record<string, unknown>, label: string): void {
  const issues = guardPublicText(fields, label)
  if (issues.length > 0) throw new Error(`Text neprošel redakční kontrolou: ${issues.join(' | ')}`)
}
