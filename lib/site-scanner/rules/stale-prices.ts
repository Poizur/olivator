// DB-based rule — kontroluje čerstvost cen per retailer.
// Retailer s ≥10 aktivními produkty a 0 price_history záznamy za 7 dní
// → medium finding. Bez reálného HTTP scrapování — čistě DB dotaz.
//
// Na rozdíl od ostatních ScanRules tato nevyžaduje URL/HTML vstup.
// Volá se přímo z runSiteScanner(), ne přes ALL_RULES iteraci.

import { supabaseAdmin } from '@/lib/supabase'
import type { Finding } from '../types'

const MIN_ACTIVE_PRODUCTS = 10
const STALE_DAYS = 7
const CRITICAL_DAYS = 30

export async function checkStalePrices(): Promise<Finding[]> {
  const since7d = new Date(Date.now() - STALE_DAYS * 24 * 60 * 60 * 1000).toISOString()
  const since30d = new Date(Date.now() - CRITICAL_DAYS * 24 * 60 * 60 * 1000).toISOString()

  const { data: retailers, error } = await supabaseAdmin
    .from('retailers')
    .select('id, name, slug')
    .eq('is_active', true)

  if (error || !retailers) return []

  const findings: Finding[] = []

  for (const r of retailers) {
    const { count: activeOffers } = await supabaseAdmin
      .from('product_offers')
      .select('id', { count: 'exact', head: true })
      .eq('retailer_id', r.id)
      .eq('in_stock', true)

    if ((activeOffers ?? 0) < MIN_ACTIVE_PRODUCTS) continue

    const { count: recent7d } = await supabaseAdmin
      .from('price_history')
      .select('id', { count: 'exact', head: true })
      .eq('retailer_id', r.id)
      .gte('recorded_at', since7d)

    if ((recent7d ?? 0) > 0) continue

    // Zjisti kdy byl poslední záznam
    const { data: lastEntry } = await supabaseAdmin
      .from('price_history')
      .select('recorded_at')
      .eq('retailer_id', r.id)
      .order('recorded_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    const lastDate = lastEntry?.recorded_at
      ? new Date(lastEntry.recorded_at as string)
      : null

    const ageDays = lastDate
      ? Math.floor((Date.now() - lastDate.getTime()) / (1000 * 60 * 60 * 24))
      : null

    const isCritical = !lastDate || lastDate < new Date(since30d)
    const ageStr = ageDays !== null ? `${ageDays} dní` : 'nikdy'

    findings.push({
      findingType: 'stale_prices',
      severity: isCritical ? 'high' : 'medium',
      url: 'https://olivator.cz/admin/retailers',
      element: r.slug,
      detail: `${r.name}: ${activeOffers} aktivních produktů, poslední price_history ${ageStr}`,
      evidence: JSON.stringify({ retailer_id: r.id, activeOffers, ageDays, lastRecorded: lastDate?.toISOString() ?? null }),
    })
  }

  return findings
}
