// Přehled produktů propojených s entitou (region/brand/cultivar) — read-only.
// Server component — načítá data přímo.

import Link from 'next/link'
import { supabaseAdmin } from '@/lib/supabase'
import { formatPrice } from '@/lib/utils'

interface Props {
  entityType: 'region' | 'brand' | 'cultivar'
  entitySlug: string
}

const ENTITY_LABEL = {
  region: 'regionu',
  brand: 'značce',
  cultivar: 'odrůdě',
}

export async function EntityProductsList({ entityType, entitySlug }: Props) {
  let products: Array<unknown> | null = null

  if (entityType === 'region') {
    const { data } = await supabaseAdmin
      .from('products')
      .select(`
        id, slug, name, name_short, olivator_score, origin_country, status,
        product_offers ( price, currency )
      `)
      .eq('region_slug', entitySlug)
      .order('olivator_score', { ascending: false })
      .limit(50)
    products = data
  } else if (entityType === 'brand') {
    const { data } = await supabaseAdmin
      .from('products')
      .select(`
        id, slug, name, name_short, olivator_score, origin_country, status,
        product_offers ( price, currency )
      `)
      .eq('brand_slug', entitySlug)
      .order('olivator_score', { ascending: false })
      .limit(50)
    products = data
  } else if (entityType === 'cultivar') {
    // Junction tabulka product_cultivars → product_id → products
    const { data: links } = await supabaseAdmin
      .from('product_cultivars')
      .select('product_id')
      .eq('cultivar_slug', entitySlug)
    const productIds = (links ?? []).map((l: { product_id: string }) => l.product_id)
    if (productIds.length === 0) {
      products = []
    } else {
      const { data } = await supabaseAdmin
        .from('products')
        .select(`
          id, slug, name, name_short, olivator_score, origin_country, status,
          product_offers ( price, currency )
        `)
        .in('id', productIds)
        .order('olivator_score', { ascending: false })
        .limit(50)
      products = data
    }
  }

  const items = (products ?? []) as Array<{
    id: string
    slug: string
    name: string
    name_short: string | null
    olivator_score: number
    origin_country: string | null
    status: string
    product_offers: Array<{ price: number; currency: string }>
  }>

  if (items.length === 0) return null

  const avgScore = Math.round(items.reduce((s, p) => s + p.olivator_score, 0) / items.length)
  const cheapest = items
    .flatMap((p) => p.product_offers.map((o) => o.price))
    .filter(Boolean)
    .sort((a, b) => a - b)[0]

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-text">
          Produkty v {ENTITY_LABEL[entityType]} ({items.length})
        </h3>
        <div className="flex gap-4 text-xs text-text3">
          <span>Průměrný Score: <strong className="text-text">{avgScore}</strong></span>
          {cheapest && <span>Nejlevnější: <strong className="text-text">{formatPrice(cheapest)}</strong></span>}
        </div>
      </div>

      <div className="border border-off2 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-off text-xs text-text3 font-medium border-b border-off2">
              <th className="text-left px-3 py-2">Produkt</th>
              <th className="text-center px-3 py-2 w-16">Score</th>
              <th className="text-right px-3 py-2 w-28">Cena</th>
              <th className="text-center px-3 py-2 w-20">Status</th>
              <th className="w-10 px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {items.map((p, i) => {
              const minPrice = p.product_offers.length > 0
                ? Math.min(...p.product_offers.map((o) => o.price))
                : null
              return (
                <tr
                  key={p.id}
                  className={`border-b border-off2 last:border-0 hover:bg-off/40 transition-colors ${
                    p.status !== 'active' ? 'opacity-60' : ''
                  }`}
                >
                  <td className="px-3 py-2">
                    <div className="font-medium text-text leading-tight line-clamp-1">
                      {p.name_short ?? p.name}
                    </div>
                    <div className="text-[11px] text-text3">{p.origin_country?.toUpperCase()}</div>
                  </td>
                  <td className="px-3 py-2 text-center">
                    <span className={`inline-block text-[11px] font-bold rounded-full px-2 py-0.5 tabular-nums ${
                      p.olivator_score >= 80
                        ? 'bg-olive text-white'
                        : p.olivator_score >= 70
                        ? 'bg-olive-bg text-olive-dark'
                        : 'bg-off text-text2'
                    }`}>
                      {p.olivator_score}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-right text-[13px] tabular-nums font-medium">
                    {minPrice ? formatPrice(minPrice) : <span className="text-text3">—</span>}
                  </td>
                  <td className="px-3 py-2 text-center">
                    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${
                      p.status === 'active'
                        ? 'bg-olive-bg text-olive-dark'
                        : p.status === 'draft'
                        ? 'bg-amber-50 text-amber-700'
                        : 'bg-off text-text3'
                    }`}>
                      {p.status}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-right">
                    <Link
                      href={`/admin/products/${p.id}`}
                      className="text-[11px] text-olive hover:text-olive-dark"
                    >
                      Edit →
                    </Link>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
