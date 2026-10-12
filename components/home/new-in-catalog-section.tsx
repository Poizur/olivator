import { supabaseAdmin } from '@/lib/supabase'
import { getProductsWithOffers } from '@/lib/data'
import { TopProductCard } from './top-product-card'

const WINDOW_DAYS = 14
const MAX_PRODUCTS = 12

function oilsLabel(n: number): string {
  return n === 1 ? 'olej' : n < 5 ? 'oleje' : 'olejů'
}

// Stejné pravidlo pro všechny: created_at v okně + aspoň 1 nabídka. Řazení jen podle data.
// status_changed_at nepoužíváme — mění ho i reaktivace starých produktů automatikou.
export async function NewInCatalogSection() {
  const since = new Date(Date.now() - WINDOW_DAYS * 86_400_000).toISOString()

  const [productsRes, retailersRes, all] = await Promise.all([
    supabaseAdmin
      .from('products')
      .select('id, created_at')
      .eq('status', 'active')
      .gte('created_at', since),
    supabaseAdmin
      .from('retailers')
      .select('id, name, created_at')
      .eq('is_active', true)
      .gte('created_at', since)
      .order('created_at', { ascending: false }),
    getProductsWithOffers(),
  ])

  const addedAt = new Map<string, string>()
  for (const r of (productsRes.data ?? []) as Array<{ id: string; created_at: string }>) addedAt.set(r.id, r.created_at)
  const products = all
    .filter((p) => addedAt.has(p.id) && p.cheapestOffer != null)
    .sort((a, b) => addedAt.get(b.id)!.localeCompare(addedAt.get(a.id)!) || a.name.localeCompare(b.name, 'cs'))

  const retailers = (retailersRes.data ?? []) as Array<{ id: string; name: string }>
  const activeIds = new Set(all.map((p) => p.id))
  const retailerCounts = new Map<string, number>()
  if (retailers.length > 0) {
    const { data: offers } = await supabaseAdmin
      .from('product_offers')
      .select('retailer_id, product_id')
      .in('retailer_id', retailers.map((r) => r.id))
    for (const o of (offers ?? []) as Array<{ retailer_id: string; product_id: string }>) {
      if (activeIds.has(o.product_id)) retailerCounts.set(o.retailer_id, (retailerCounts.get(o.retailer_id) ?? 0) + 1)
    }
  }
  const newRetailers = retailers.filter((r) => (retailerCounts.get(r.id) ?? 0) > 0)

  if (products.length === 0 && newRetailers.length === 0) return null

  return (
    <section className="px-6 md:px-10 py-9 border-t border-off2">
      <div className="max-w-[1280px] mx-auto">
        <div className="mb-[18px]">
          <div className="text-[12px] font-medium tracking-[0.05em] uppercase text-text2 mb-[6px]">
            — Nově v katalogu
          </div>
          <h2 className="font-[family-name:var(--font-display)] text-[30px] font-medium text-text leading-[1.1]">
            Přibylo za posledních {WINDOW_DAYS} dní
          </h2>
          <p className="text-[14px] text-text2 mt-[6px] max-w-[560px]">
            Řazeno podle data přidání. Přidání do katalogu nemá vliv na Score ani na žebříčky.
          </p>
        </div>

        {newRetailers.length > 0 && (
          <ul className="flex flex-wrap gap-2 mb-4">
            {newRetailers.map((r) => (
              <li key={r.id} className="text-[12px] bg-off border border-off2 rounded-full px-3 py-1 text-text2">
                Nový e-shop: <span className="text-text font-medium">{r.name}</span>
                <span className="text-text3"> · {retailerCounts.get(r.id)} {oilsLabel(retailerCounts.get(r.id)!)}</span>
              </li>
            ))}
          </ul>
        )}

        {products.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5 md:gap-3">
            {products.slice(0, MAX_PRODUCTS).map((p) => (
              <TopProductCard key={p.id} product={p} />
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
