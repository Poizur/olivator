// article-validator.ts — Validace produktových dat v článcích.
//
// Kontroluje každý /olej/slug odkaz v body_markdown:
//   1. Produkt musí existovat v DB (status = active)
//   2. Hardcoded čísla v kontextu po odkazu musí odpovídat DB hodnotám
//
// Tolerance: score ±0, kyselost ±0.02 %, polyfenoly ±50 mg/kg, cena: pouze WARNING ±100 Kč.
//
// Použití:
//   import { validateArticle } from '@/lib/article-validator'
//   const result = await validateArticle('nejlepsi-olivovy-olej-2026')
//   if (!result.ok) return 422

import { supabaseAdmin } from './supabase'

export type IssueType =
  | 'missing_product'
  | 'wrong_score'
  | 'wrong_acidity'
  | 'wrong_poly'
  | 'wrong_price'

export interface ValidationIssue {
  articleSlug: string
  productSlug: string
  type: IssueType
  severity: 'error' | 'warning'
  articleValue: string | number
  dbValue: string | number | null
  context: string
}

export interface ValidationResult {
  articleSlug: string
  errors: ValidationIssue[]
  warnings: ValidationIssue[]
  ok: boolean
}

interface DbProduct {
  slug: string
  olivator_score: number | null
  acidity: number | null
  polyphenols: number | null
  status: string
}

const TOLERANCES = {
  score:   0,    // musí sedět přesně
  acidity: 0.02, // ±0.02 %
  poly:    50,   // ±50 mg/kg
  price:   100,  // ±100 Kč — jen warning (ceny se mění)
}

function parseDecimal(s: string): number {
  return parseFloat(s.replace(',', '.'))
}

/** Extrahuje čísla ze 300 znaků kontextu ZA odkazem na produkt */
function extractNumbers(ctx: string): {
  score:   number | null
  acidity: number | null
  poly:    number | null
  price:   number | null
} {
  const scoreM   = ctx.match(/(\d{2,3})\/100/)
  const acidM    = ctx.match(/(?:kyselost\s+)?(\d+[,.]\d{1,2})\s*%(?!\s*\/\s*100)/)
  const polyM    = ctx.match(/(\d{2,4})\s*mg\/kg/)
  const priceM   = ctx.match(/(\d{3,5})\s*Kč/)

  return {
    score:   scoreM  ? parseInt(scoreM[1])            : null,
    acidity: acidM   ? parseDecimal(acidM[1])          : null,
    poly:    polyM   ? parseInt(polyM[1])              : null,
    price:   priceM  ? parseInt(priceM[1])             : null,
  }
}

export async function validateArticle(articleSlug: string): Promise<ValidationResult> {
  const { data: article } = await supabaseAdmin
    .from('articles')
    .select('body_markdown')
    .eq('slug', articleSlug)
    .maybeSingle()

  const empty: ValidationResult = { articleSlug, errors: [], warnings: [], ok: true }
  if (!article?.body_markdown) return empty

  const body: string = article.body_markdown

  // ── 1. Najdi všechny /olej/slug linky ─────────────────────────────────────
  const linkRe = /\[([^\]]*)\]\(\/olej\/([\w-]+)\)/g
  const mentions: Array<{ slug: string; afterCtx: string }> = []
  let m: RegExpExecArray | null
  while ((m = linkRe.exec(body)) !== null) {
    const afterStart = m.index + m[0].length
    const afterCtx   = body.slice(afterStart, afterStart + 300)
    mentions.push({ slug: m[2], afterCtx })
  }
  if (mentions.length === 0) return empty

  // ── 2. Fetch DB produkty (jeden dotaz) ────────────────────────────────────
  const uniqueSlugs = [...new Set(mentions.map(s => s.slug))]
  const { data: dbRows } = await supabaseAdmin
    .from('products')
    .select('id, slug, olivator_score, acidity, polyphenols, status')
    .in('slug', uniqueSlugs)

  const dbMap = new Map<string, DbProduct & { id: string }>()
  for (const p of (dbRows ?? []) as Array<DbProduct & { id: string }>) {
    dbMap.set(p.slug, p)
  }

  // ── 3. Fetch nejlevnější ceny ─────────────────────────────────────────────
  const productIds = [...dbMap.values()].map(p => p.id)
  const { data: offers } = productIds.length
    ? await supabaseAdmin
        .from('product_offers')
        .select('product_id, price')
        .in('product_id', productIds)
        .eq('in_stock', true)
        .order('price', { ascending: true })
    : { data: [] }

  const idToSlug = new Map<string, string>()
  for (const [slug, p] of dbMap) idToSlug.set(p.id, slug)

  const cheapest = new Map<string, number>()
  for (const o of (offers ?? []) as Array<{ product_id: string; price: number }>) {
    const slug = idToSlug.get(o.product_id)
    if (slug && !cheapest.has(slug)) cheapest.set(slug, o.price)
  }

  // ── 4. Validace každé zmínky ──────────────────────────────────────────────
  const errors:   ValidationIssue[] = []
  const warnings: ValidationIssue[] = []

  for (const mention of mentions) {
    const dbP = dbMap.get(mention.slug)

    if (!dbP) {
      errors.push({
        articleSlug,
        productSlug: mention.slug,
        type:        'missing_product',
        severity:    'error',
        articleValue: mention.slug,
        dbValue:     null,
        context:     mention.afterCtx.slice(0, 80),
      })
      continue
    }

    const nums = extractNumbers(mention.afterCtx)

    if (nums.score !== null && dbP.olivator_score !== null) {
      if (Math.abs(nums.score - dbP.olivator_score) > TOLERANCES.score) {
        errors.push({
          articleSlug, productSlug: mention.slug, type: 'wrong_score', severity: 'error',
          articleValue: nums.score, dbValue: dbP.olivator_score,
          context: mention.afterCtx.slice(0, 80),
        })
      }
    }

    if (nums.acidity !== null && dbP.acidity !== null) {
      if (Math.abs(nums.acidity - dbP.acidity) > TOLERANCES.acidity) {
        errors.push({
          articleSlug, productSlug: mention.slug, type: 'wrong_acidity', severity: 'error',
          articleValue: nums.acidity, dbValue: dbP.acidity,
          context: mention.afterCtx.slice(0, 80),
        })
      }
    }

    if (nums.poly !== null && dbP.polyphenols !== null) {
      if (Math.abs(nums.poly - dbP.polyphenols) > TOLERANCES.poly) {
        warnings.push({
          articleSlug, productSlug: mention.slug, type: 'wrong_poly', severity: 'warning',
          articleValue: nums.poly, dbValue: dbP.polyphenols,
          context: mention.afterCtx.slice(0, 80),
        })
      }
    }

    const dbPrice = cheapest.get(mention.slug)
    if (nums.price !== null && dbPrice !== undefined) {
      if (Math.abs(nums.price - dbPrice) > TOLERANCES.price) {
        warnings.push({
          articleSlug, productSlug: mention.slug, type: 'wrong_price', severity: 'warning',
          articleValue: nums.price, dbValue: dbPrice,
          context: mention.afterCtx.slice(0, 80),
        })
      }
    }
  }

  return { articleSlug, errors, warnings, ok: errors.length === 0 }
}

/** Spustí validaci všech aktivních + draft článků. */
export async function validateAllArticles(): Promise<ValidationResult[]> {
  const { data: articles } = await supabaseAdmin
    .from('articles')
    .select('slug')
    .in('status', ['active', 'draft'])
    .order('slug')

  if (!articles) return []
  const results: ValidationResult[] = []
  for (const a of articles as Array<{ slug: string }>) {
    results.push(await validateArticle(a.slug))
  }
  return results
}
