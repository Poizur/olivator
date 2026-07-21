// Pravidlo 3: přepočítá Olivator Score pro produkty kde je NULL ale existují data.
// Trigger: status='active', olivator_score IS NULL, acidity IS NOT NULL (nebo polyphenols).
// Skip: type='flavored' (calculateScore vrátí null) a insufficientData=true.
import { supabaseAdmin } from '@/lib/supabase'
import { calculateScore } from '@/lib/score'
import type { ExecutorRule, ExecutorRuleOptions, OperationResult } from '../types'

const recalcScore: ExecutorRule = {
  name: 'recalc_score',
  async run(opts: ExecutorRuleOptions): Promise<OperationResult[]> {
    const results: OperationResult[] = []

    const { data: products } = await supabaseAdmin
      .from('products')
      .select('id, slug, type, acidity, polyphenols, peroxide_value, certifications')
      .eq('status', 'active')
      .is('olivator_score', null)
      .not('acidity', 'is', null)
      .neq('type', 'flavored')
      .limit(opts.maxOps)

    if (!products?.length) {
      console.log('[recalc_score] žádné produkty bez score (s aciditou)')
      return results
    }

    for (const product of products) {
      if (results.filter(r => r.status === 'applied').length >= opts.maxOps) {
        console.log('[recalc_score] limit dosažen')
        break
      }

      const slug = product.slug as string
      const productId = product.id as string

      // Nejlevnější nabídka pro value komponentu
      const { data: cheapest } = await supabaseAdmin
        .from('product_offers')
        .select('price, products!inner(volume_ml)')
        .eq('product_id', productId)
        .eq('in_stock', true)
        .gt('price', 0)
        .order('price', { ascending: true })
        .limit(1)
        .maybeSingle()

      const volumeMl = (cheapest?.products as any)?.volume_ml as number | null
      const price = cheapest?.price as number | null
      const pricePer100ml = price && volumeMl ? (price / volumeMl) * 100 : null

      const scoreResult = calculateScore({
        acidity: product.acidity as number | null,
        polyphenols: product.polyphenols as number | null,
        peroxideValue: product.peroxide_value as number | null,
        certifications: product.certifications as string[] | null,
        pricePer100ml,
        type: product.type as string | null,
      })

      if (scoreResult.insufficientData || scoreResult.total === 0) {
        results.push({
          operationType: 'recalc_score',
          targetType: 'product',
          targetId: productId,
          targetSlug: slug,
          fieldChanged: 'olivator_score',
          valueBefore: 'null',
          verifiedAtSource: false,
          status: 'skipped',
          skipReason: `insufficientData — kyselost ${product.acidity}, polyfenoly ${product.polyphenols ?? 'null'}`,
        })
        console.log(`[recalc_score] SKIP ${slug} — insufficientData`)
        continue
      }

      const newScore = scoreResult.total

      if (opts.dryRun) {
        results.push({
          operationType: 'recalc_score',
          targetType: 'product',
          targetId: productId,
          targetSlug: slug,
          fieldChanged: 'olivator_score',
          valueBefore: 'null',
          valueAfter: String(newScore),
          verifiedAtSource: false,
          sourceEvidence: `acidity=${product.acidity}, polyphenols=${product.polyphenols ?? 'null'}, pricePer100ml=${pricePer100ml?.toFixed(1) ?? 'null'}`,
          status: 'applied',
        })
        console.log(`[recalc_score] DRY-RUN ${slug}: null → ${newScore} (acidity=${product.acidity}, poly=${product.polyphenols ?? '?'})`)
        continue
      }

      const { error } = await supabaseAdmin
        .from('products')
        .update({
          olivator_score: newScore,
          score_breakdown: scoreResult.breakdown,
          updated_at: new Date().toISOString(),
        })
        .eq('id', productId)

      if (error) {
        results.push({
          operationType: 'recalc_score',
          targetType: 'product',
          targetId: productId,
          targetSlug: slug,
          fieldChanged: 'olivator_score',
          valueBefore: 'null',
          valueAfter: String(newScore),
          verifiedAtSource: false,
          status: 'failed',
          skipReason: error.message,
        })
      } else {
        results.push({
          operationType: 'recalc_score',
          targetType: 'product',
          targetId: productId,
          targetSlug: slug,
          fieldChanged: 'olivator_score',
          valueBefore: 'null',
          valueAfter: String(newScore),
          verifiedAtSource: false,
          sourceEvidence: `acidity=${product.acidity}, polyphenols=${product.polyphenols ?? 'null'}`,
          status: 'applied',
        })
        console.log(`[recalc_score] APPLIED ${slug}: ${newScore}`)
      }
    }

    return results
  },
}

export default recalcScore
