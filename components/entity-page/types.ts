// Sdílené typy pro entity-page komponenty (oblast / značka / odrůda).
// BRIEF.md: 8 bloků, jedna kostra, tři duše.

export type EntityType = 'region' | 'brand' | 'cultivar'

export interface KpiItem {
  label: string
  value: string
  hint?: string
}

export interface FaqItem {
  question: string
  answer: string
}

export interface AccordionSection {
  title: string
  body: string  // Markdown-light: ## podnadpisy + odstavce
}

export interface EntityChipLink {
  href: string
  label: string
}

export interface RelatedRecipeCard {
  slug: string
  title: string
  excerpt: string
  readTime: string
}

export interface ProductTableRow {
  slug: string
  name: string
  cultivarLabel: string | null   // "Coratina" nebo "Coratina + Frantoio"
  brandSlug: string | null
  brandName: string | null
  regionSlug: string | null
  regionName: string | null
  harvestYear: number | null
  olivatorScore: number | null
  acidity: number | null
  polyphenols: number | null
  price: number | null
  pricePer100ml: number | null
  retailerName: string | null
  type: string | null   // 'evoo' | 'blend' | ... — pro filtr u značky
}

export interface CtaConfig {
  label: string         // "Spustit quiz"
  href: string          // "/quiz"
  description: string   // "Nevíte který? Quiz vám doporučí za 60 sekund."
}
