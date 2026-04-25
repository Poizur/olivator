import { NextRequest, NextResponse } from 'next/server'
import { isAdminAuthenticated } from '@/lib/admin-auth'
import { supabaseAdmin } from '@/lib/supabase'
import { generateProductDescriptions } from '@/lib/content-agent'
import { validateContent } from '@/lib/content-validator'
import { validateCzechStyle } from '@/lib/czech-style'
import { factsToPromptContext, type ExtractedFact } from '@/lib/fact-extractor'
import { countryName } from '@/lib/utils'

export const maxDuration = 90

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const { id } = await params
    const body = await request.json().catch(() => ({}))
    const rawDescription: string | undefined = body?.rawDescription

    const { data: product, error } = await supabaseAdmin
      .from('products')
      .select('*')
      .eq('id', id)
      .maybeSingle()
    if (error || !product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    const facts: ExtractedFact[] = Array.isArray(product.extracted_facts)
      ? (product.extracted_facts as ExtractedFact[])
      : []

    const generated = await generateProductDescriptions({
      name: product.name as string,
      brand: null,
      origin: product.origin_country ? countryName(product.origin_country as string) : null,
      region: (product.origin_region as string) ?? null,
      type: (product.type as string) ?? null,
      volumeMl: (product.volume_ml as number) ?? null,
      acidity: (product.acidity as number) ?? null,
      polyphenols: (product.polyphenols as number) ?? null,
      certifications: (product.certifications as string[]) ?? [],
      olivatorScore: (product.olivator_score as number) ?? null,
      // IMPORTANT: Prefer raw_description (untouched scrape) to avoid feedback loop
      // where Claude reads its own previous output. Only fall back to description_long
      // for legacy products that were imported before the raw_description column existed.
      rawDescription:
        rawDescription
        ?? (product.raw_description as string)
        ?? (product.description_long as string)
        ?? (product.description_short as string)
        ?? null,
      factsPromptContext: facts.length > 0 ? factsToPromptContext(facts) : null,
    })

    // Validate + also check that all HIGH-importance facts appear in long text
    const validation = validateContent({
      shortDescription: generated.shortDescription,
      longDescription: generated.longDescription,
      acidity: (product.acidity as number) ?? null,
      polyphenols: (product.polyphenols as number) ?? null,
      region: (product.origin_region as string) ?? null,
      country: (product.origin_country as string) ?? null,
      certifications: (product.certifications as string[]) ?? [],
    })

    // Extra check — each HIGH fact should be referenced.
    // Matching strategy (any of these is enough):
    //  1. Contiguous fact value appears literally (normalized — "do 40 °C" matches "do 40 °C" in any casing/spacing)
    //  2. The KEY NUMBER in the value appears (e.g. "40" for temperature, "4" for hours)
    //  3. A content-word token (>3 chars, not a stopword) appears
    const fullText = `${generated.shortDescription} ${generated.longDescription}`.toLowerCase()
    const normalize = (s: string) => s.toLowerCase().replace(/\s+/g, ' ').trim()
    const normalizedFull = normalize(fullText)
    const stopwords = /^(pro|od|do|bez|bez chem|s|v|na|za|ve|či|dle)$/

    // Czech stem match: "mechanický" matches "mechanicky" / "mechanického" / "mechanickou"
    // Strategy: for each content word, strip common Czech inflection endings (ý/í/á/é/ou/ího/…)
    // to get a stem, then check if that stem is a prefix of any word in the text.
    const stemOf = (word: string): string => {
      const w = word.toLowerCase()
      // Strip longest-matching suffix first
      const suffixes = ['ního', 'ními', 'ějším', 'ěmi', 'ého', 'ému', 'ými', 'ím', 'ích', 'ými', 'ou', 'ý', 'á', 'é', 'í', 'ě', 'y', 'a', 'e', 'u', 'i', 'o']
      for (const sfx of suffixes) {
        if (w.length - sfx.length >= 4 && w.endsWith(sfx)) {
          return w.slice(0, -sfx.length)
        }
      }
      return w
    }
    const textTokens = fullText.split(/[\s,.\-:;!?"“”()]+/).filter(t => t.length > 2)
    const textStems = new Set(textTokens.map(stemOf))

    for (const fact of facts.filter(f => f.importance === 'high')) {
      const value = normalize(fact.value)
      // 1. contiguous phrase match
      if (normalizedFull.includes(value)) continue
      // 2. numeric match (temperatures, hours, percentages)
      const numbers = value.match(/\d+/g) ?? []
      if (numbers.length > 0) {
        const allNumbersPresent = numbers.every(n => {
          const re = new RegExp(`\\b${n}\\b\\s*(?:°c|hodin|mez|mg|%|ks|ml|l)?`, 'i')
          return re.test(fullText)
        })
        if (allNumbersPresent) continue
      }
      // 3. stem-based content-word matching (handles Czech inflection)
      const valueTokens = value
        .split(/\s+/)
        .filter(t => t.length > 3 && !stopwords.test(t))
      const hasStemMatch = valueTokens.some(t => {
        const stem = stemOf(t)
        if (stem.length < 4) return false
        // Check if any text word shares this stem prefix
        return textStems.has(stem) || textTokens.some(tt => tt.startsWith(stem))
      })
      if (hasStemMatch) continue

      validation.issues.push({
        severity: 'warning',
        category: 'missing_required',
        message: `Text nezmiňuje fakt "${fact.label}: ${fact.value}" (vysoká důležitost)`,
      })
      validation.warnings++
    }
    // Czech style check (grammar, typography, EN-translated phrases)
    const combinedForStyle = `${generated.shortDescription}\n\n${generated.longDescription}`
    const styleIssues = validateCzechStyle(combinedForStyle)
    for (const s of styleIssues) {
      validation.issues.push({
        severity: s.severity,
        category: s.category === 'wrong_word' ? 'banned_phrase' :
                  s.category === 'typography' ? 'style' :
                  s.category === 'awkward' ? 'style' : 'style',
        message: s.message + (s.suggestion ? ` (návrh: ${s.suggestion})` : ''),
        matched: s.matched,
      })
      if (s.severity === 'error') validation.errors++
      else validation.warnings++
    }
    validation.ok = validation.errors === 0

    return NextResponse.json({ ok: true, ...generated, validation })
  } catch (err) {
    console.error('[rewrite]', err)
    const message = err instanceof Error ? err.message : 'Server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
