// Pravidlo 1: nahradí {{product:slug}} tokeny odkazující na neaktivní/chybějící produkty.
// Zdrojová verifikace: produkt_url náhradníka musí vrátit HTTP 200.
// Bezpečnostní zábrany z validate-tokens.ts:
//   - YMYL kategorie → skip
//   - specifická čísla v kontextu (mg/kg, %) → skip
//   - superlativy v kontextu → skip
//   - min 2 kandidáti, score ≥ 60, typ musí sedět
import { supabaseAdmin } from '@/lib/supabase'
import type { ExecutorRule, ExecutorRuleOptions, OperationResult } from '../types'
import { verifyUrl } from '../verify-at-source'

const TOKEN_RE = /\{\{product:([\w-]+)\}\}/g
const YMYL_CATEGORIES = new Set(['zdravi', 'kosmetika'])
const SPECIFIC_NUMBER_RE = /\d+\s*(mg\/kg|%)/i
const SUPERLATIVE_RE = /\b(rekord|nejvyšší|unikátní|nejlepší|nejdražší|nejlevnější)\b/i

async function findReplacement(
  brokenSlug: string,
  articleBody: string,
  articleCategory: string | null,
): Promise<{ slug: string; productUrl: string | null } | null> {
  if (YMYL_CATEGORIES.has(articleCategory ?? '')) return null

  const { data: broken } = await supabaseAdmin
    .from('products')
    .select('type, product_offers(price, in_stock)')
    .eq('slug', brokenSlug)
    .maybeSingle()

  if (!broken?.type) return null

  const tokenStr = `{{product:${brokenSlug}}}`
  const idx = articleBody.indexOf(tokenStr)
  if (idx < 0) return null

  const ctx = articleBody.slice(Math.max(0, idx - 150), idx + tokenStr.length + 150)
  if (SPECIFIC_NUMBER_RE.test(ctx) || SUPERLATIVE_RE.test(ctx)) return null

  const offers = (broken.product_offers ?? []) as Array<{ price: number; in_stock: boolean }>
  const brokenPrice = offers.find(o => o.price > 0)?.price ?? null

  const { data: candidates } = await supabaseAdmin
    .from('products')
    .select('slug, olivator_score, product_offers(price, in_stock), product_offers!inner(product_url)')
    .eq('type', broken.type)
    .eq('status', 'active')
    .gte('olivator_score', 60)
    .neq('slug', brokenSlug)
    .order('olivator_score', { ascending: false })
    .limit(10)

  if (!candidates || candidates.length < 2) return null

  let filtered = candidates
  if (brokenPrice) {
    filtered = candidates.filter(c => {
      const price = (c.product_offers as any[])?.find((o: any) => o.price > 0)?.price
      return !price || (price >= brokenPrice * 0.7 && price <= brokenPrice * 1.3)
    })
    if (filtered.length < 2) return null
  }

  const best = filtered[0]
  const productUrl = (best.product_offers as any[])?.find((o: any) => o.product_url)?.product_url ?? null
  return { slug: best.slug as string, productUrl }
}

const fixBrokenToken: ExecutorRule = {
  name: 'fix_broken_token',
  async run(opts: ExecutorRuleOptions): Promise<OperationResult[]> {
    const results: OperationResult[] = []

    const { data: articles } = await supabaseAdmin
      .from('articles')
      .select('id, slug, body_markdown, category')
      .eq('status', 'active')

    if (!articles?.length) return results

    // Unikátní sada slugů referencovaných tokeny
    const allSlugs = new Set<string>()
    const articleTokenMap = new Map<string, { id: string; body: string; category: string | null; slugs: Set<string> }>()

    for (const a of articles) {
      const body = (a.body_markdown as string) ?? ''
      if (!body.includes('{{product:')) continue
      const slugs = new Set<string>()
      const re = new RegExp(TOKEN_RE)
      let m: RegExpExecArray | null
      while ((m = re.exec(body)) !== null) {
        slugs.add(m[1])
        allSlugs.add(m[1])
      }
      if (slugs.size > 0) {
        articleTokenMap.set(a.slug as string, { id: a.id as string, body, category: (a.category as string | null) ?? null, slugs })
      }
    }

    if (allSlugs.size === 0) {
      console.log('[fix_broken_token] žádné tokeny v aktivních článcích')
      return results
    }

    const { data: products } = await supabaseAdmin
      .from('products')
      .select('slug, status')
      .in('slug', [...allSlugs])

    const statusBySlug = new Map((products ?? []).map(p => [p.slug as string, p.status as string]))

    for (const [articleSlug, { id: articleId, body, category, slugs }] of articleTokenMap) {
      for (const slug of slugs) {
        const status = statusBySlug.get(slug)
        if (status === 'active') continue

        if (results.filter(r => r.status === 'applied').length >= opts.maxOps) {
          console.log('[fix_broken_token] limit dosažen, přerušuji')
          return results
        }

        const replacement = await findReplacement(slug, body, category)
        if (!replacement) {
          results.push({
            operationType: 'fix_broken_token',
            targetType: 'article',
            targetId: articleId,
            targetSlug: articleSlug,
            fieldChanged: 'body_markdown',
            valueBefore: `{{product:${slug}}}`,
            verifiedAtSource: false,
            status: 'skipped',
            skipReason: `broken token {{product:${slug}}} — nelze bezpečně nahradit`,
          })
          console.log(`[fix_broken_token] SKIP ${articleSlug}:${slug} — nelze nahradit`)
          continue
        }

        // Zdrojová verifikace
        let verified = false
        let sourceUrl: string | undefined
        let sourceEvidence = 'product_url chybí'
        if (replacement.productUrl) {
          sourceUrl = replacement.productUrl
          const vResult = await verifyUrl(replacement.productUrl)
          verified = vResult.ok
          sourceEvidence = vResult.evidence
        }

        if (!verified) {
          results.push({
            operationType: 'fix_broken_token',
            targetType: 'article',
            targetId: articleId,
            targetSlug: articleSlug,
            fieldChanged: 'body_markdown',
            valueBefore: `{{product:${slug}}}`,
            valueAfter: `{{product:${replacement.slug}}}`,
            verifiedAtSource: false,
            sourceUrl,
            sourceEvidence,
            status: 'skipped',
            skipReason: `zdrojová verifikace selhala: ${sourceEvidence}`,
          })
          console.log(`[fix_broken_token] SKIP ${articleSlug}:${slug} → ${replacement.slug} — ${sourceEvidence}`)
          continue
        }

        if (opts.dryRun) {
          results.push({
            operationType: 'fix_broken_token',
            targetType: 'article',
            targetId: articleId,
            targetSlug: articleSlug,
            fieldChanged: 'body_markdown',
            valueBefore: `{{product:${slug}}}`,
            valueAfter: `{{product:${replacement.slug}}}`,
            verifiedAtSource: true,
            sourceUrl,
            sourceEvidence,
            status: 'applied',
          })
          console.log(`[fix_broken_token] DRY-RUN ${articleSlug}: {{product:${slug}}} → {{product:${replacement.slug}}} (${sourceEvidence})`)
          continue
        }

        const newBody = body.replace(`{{product:${slug}}}`, `{{product:${replacement.slug}}}`)
        const { error } = await supabaseAdmin
          .from('articles')
          .update({ body_markdown: newBody, updated_at: new Date().toISOString() })
          .eq('id', articleId)

        if (error) {
          results.push({
            operationType: 'fix_broken_token',
            targetType: 'article',
            targetId: articleId,
            targetSlug: articleSlug,
            fieldChanged: 'body_markdown',
            valueBefore: `{{product:${slug}}}`,
            valueAfter: `{{product:${replacement.slug}}}`,
            verifiedAtSource: true,
            sourceUrl,
            sourceEvidence,
            status: 'failed',
            skipReason: error.message,
          })
        } else {
          results.push({
            operationType: 'fix_broken_token',
            targetType: 'article',
            targetId: articleId,
            targetSlug: articleSlug,
            fieldChanged: 'body_markdown',
            valueBefore: `{{product:${slug}}}`,
            valueAfter: `{{product:${replacement.slug}}}`,
            verifiedAtSource: true,
            sourceUrl,
            sourceEvidence,
            status: 'applied',
          })
          console.log(`[fix_broken_token] APPLIED ${articleSlug}: {{product:${slug}}} → {{product:${replacement.slug}}}`)
        }
      }
    }

    return results
  },
}

export default fixBrokenToken
