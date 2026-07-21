// Pravidlo 2: doplní affiliate_url pro nabídky kde chybí, ale retailer má base_tracking_url.
// eHUB template: {product_slug} → slug produktu, {product_url} → URL-encoded product_url.
// Zdrojová verifikace: product_url nabídky musí vrátit HTTP 200 před zápisem.
import { supabaseAdmin } from '@/lib/supabase'
import type { ExecutorRule, ExecutorRuleOptions, OperationResult } from '../types'
import { verifyUrl } from '../verify-at-source'

function buildAffiliateUrl(template: string, productSlug: string, productUrl: string): string {
  return template
    .replace('{product_slug}', encodeURIComponent(productSlug))
    .replace('{product_url}', encodeURIComponent(productUrl))
}

const fixAffiliateUrl: ExecutorRule = {
  name: 'fix_affiliate_url',
  async run(opts: ExecutorRuleOptions): Promise<OperationResult[]> {
    const results: OperationResult[] = []

    const { data: retailers } = await supabaseAdmin
      .from('retailers')
      .select('id, name, slug, base_tracking_url')
      .not('base_tracking_url', 'is', null)
      .eq('is_active', true)

    if (!retailers?.length) {
      console.log('[fix_affiliate_url] žádní retaileři s base_tracking_url')
      return results
    }

    for (const retailer of retailers) {
      const template = retailer.base_tracking_url as string

      const { data: offers } = await supabaseAdmin
        .from('product_offers')
        .select('id, product_id, product_url, products!inner(slug)')
        .eq('retailer_id', retailer.id)
        .is('affiliate_url', null)
        .eq('in_stock', true)
        .not('product_url', 'is', null)
        .limit(opts.maxOps)

      if (!offers?.length) {
        console.log(`[fix_affiliate_url] ${retailer.name}: 0 nabídek`)
        continue
      }

      console.log(`[fix_affiliate_url] ${retailer.name}: ${offers.length} nabídek ke zpracování`)

      for (const offer of offers) {
        if (results.filter(r => r.status === 'applied').length >= opts.maxOps) {
          console.log('[fix_affiliate_url] limit dosažen')
          return results
        }

        const productSlug = (offer.products as any)?.slug as string
        const productUrl = offer.product_url as string
        const offerId = offer.id as string
        const productId = offer.product_id as string

        if (!productSlug || !productUrl) {
          results.push({
            operationType: 'fix_affiliate_url',
            targetType: 'offer',
            targetId: offerId,
            targetSlug: productSlug,
            verifiedAtSource: false,
            status: 'skipped',
            skipReason: 'chybí product_slug nebo product_url',
          })
          continue
        }

        // Zdrojová verifikace
        const vResult = await verifyUrl(productUrl)
        if (!vResult.ok) {
          results.push({
            operationType: 'fix_affiliate_url',
            targetType: 'offer',
            targetId: offerId,
            targetSlug: productSlug,
            verifiedAtSource: false,
            sourceUrl: productUrl,
            sourceEvidence: vResult.evidence,
            status: 'skipped',
            skipReason: `produkt nedostupný: ${vResult.evidence}`,
          })
          console.log(`[fix_affiliate_url] SKIP ${productSlug} — ${vResult.evidence}`)
          continue
        }

        const affiliateUrl = buildAffiliateUrl(template, productSlug, productUrl)

        if (opts.dryRun) {
          results.push({
            operationType: 'fix_affiliate_url',
            targetType: 'offer',
            targetId: offerId,
            targetSlug: productSlug,
            fieldChanged: 'affiliate_url',
            valueBefore: undefined,
            valueAfter: affiliateUrl,
            verifiedAtSource: true,
            sourceUrl: productUrl,
            sourceEvidence: vResult.evidence,
            status: 'applied',
          })
          console.log(`[fix_affiliate_url] DRY-RUN ${retailer.name}/${productSlug}: ${affiliateUrl.slice(0, 80)}...`)
          continue
        }

        const { error } = await supabaseAdmin
          .from('product_offers')
          .update({ affiliate_url: affiliateUrl })
          .eq('id', offerId)

        if (error) {
          results.push({
            operationType: 'fix_affiliate_url',
            targetType: 'offer',
            targetId: offerId,
            targetSlug: productSlug,
            fieldChanged: 'affiliate_url',
            valueAfter: affiliateUrl,
            verifiedAtSource: true,
            sourceUrl: productUrl,
            sourceEvidence: vResult.evidence,
            status: 'failed',
            skipReason: error.message,
          })
        } else {
          results.push({
            operationType: 'fix_affiliate_url',
            targetType: 'offer',
            targetId: offerId,
            targetSlug: productSlug,
            fieldChanged: 'affiliate_url',
            valueAfter: affiliateUrl,
            verifiedAtSource: true,
            sourceUrl: productUrl,
            sourceEvidence: vResult.evidence,
            status: 'applied',
          })
          console.log(`[fix_affiliate_url] APPLIED ${retailer.name}/${productSlug}`)
        }
      }
    }

    return results
  },
}

export default fixAffiliateUrl
