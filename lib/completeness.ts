// Per-product data completeness audit. Scores how many key fields are filled
// out of the canonical list. Used in admin product list (badge + sort) and
// detail page (panel) so admin sees gaps without manually checking.

import type { Product } from './types'

interface FieldDef {
  key: string
  label: string
  weight: number
  isFilled: (p: Product) => boolean
}

const FIELDS: FieldDef[] = [
  // Identity (high weight — hard to do without)
  { key: 'name', label: 'Název', weight: 3, isFilled: (p) => !!p.name && p.name.length > 5 },
  { key: 'ean', label: 'EAN', weight: 3, isFilled: (p) => !!p.ean && p.ean.length >= 8 },
  { key: 'image', label: 'Hlavní fotka', weight: 3, isFilled: (p) => !!p.imageUrl },

  // Chemistry (high weight — to je naše USP)
  { key: 'acidity', label: 'Kyselost', weight: 3, isFilled: (p) => p.acidity != null },
  { key: 'polyphenols', label: 'Polyfenoly', weight: 3, isFilled: (p) => p.polyphenols != null },
  { key: 'peroxide', label: 'Peroxidové číslo', weight: 2, isFilled: (p) => p.peroxideValue != null },

  // Classification
  { key: 'origin', label: 'Země původu', weight: 2, isFilled: (p) => !!p.originCountry },
  { key: 'type', label: 'Typ oleje', weight: 2, isFilled: (p) => !!p.type },
  { key: 'volume', label: 'Objem', weight: 2, isFilled: (p) => p.volumeMl > 0 },
  { key: 'packaging', label: 'Obal', weight: 1, isFilled: (p) => !!p.packaging },
  { key: 'certifications', label: 'Certifikace', weight: 1, isFilled: (p) => p.certifications.length > 0 },

  // Content (SEO + admin tooling)
  { key: 'description_short', label: 'Krátký popis', weight: 2, isFilled: (p) => p.descriptionShort.length > 50 },
  { key: 'description_long', label: 'Dlouhý popis', weight: 3, isFilled: (p) => p.descriptionLong.length > 300 },
  { key: 'meta_description', label: 'SEO meta description', weight: 2, isFilled: (p) => !!p.metaDescription && p.metaDescription.length > 50 },

  // Score
  { key: 'score', label: 'Olivator Score', weight: 1, isFilled: (p) => p.olivatorScore > 0 },
]

export interface CompletenessResult {
  percent: number       // 0-100
  weightedPercent: number // 0-100, weighted by field importance
  filled: number        // count of filled fields
  total: number         // total fields
  missing: Array<{ key: string; label: string; weight: number }>
}

export function calculateCompleteness(p: Product): CompletenessResult {
  const total = FIELDS.length
  const totalWeight = FIELDS.reduce((sum, f) => sum + f.weight, 0)
  let filled = 0
  let filledWeight = 0
  const missing: CompletenessResult['missing'] = []
  for (const f of FIELDS) {
    if (f.isFilled(p)) {
      filled++
      filledWeight += f.weight
    } else {
      missing.push({ key: f.key, label: f.label, weight: f.weight })
    }
  }
  return {
    percent: Math.round((filled / total) * 100),
    weightedPercent: Math.round((filledWeight / totalWeight) * 100),
    filled,
    total,
    missing,
  }
}

/** Tailwind classes for badge color based on weighted percent. */
export function completenessColor(percent: number): { bg: string; text: string } {
  if (percent >= 85) return { bg: 'bg-emerald-500/10', text: 'text-emerald-400' }
  if (percent >= 60) return { bg: 'bg-amber-500/10', text: 'text-amber-400' }
  return { bg: 'bg-red-500/10', text: 'text-red-400' }
}
