'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import type { Retailer, ProductOffer } from '@/lib/types'
import { formatPrice } from '@/lib/utils'

interface OffersManagerProps {
  productId: string
  productSlug: string
  retailers: Retailer[]
  initialOffers: ProductOffer[]
}

interface Row {
  id?: string
  retailerId: string
  retailer: Retailer
  price: string
  inStock: boolean
  productUrl: string
  dirty: boolean
  saving: boolean
  saved: boolean
  error: string | null
}

export function OffersManager({ productId, retailers, initialOffers }: OffersManagerProps) {
  const router = useRouter()

  const [rows, setRows] = useState<Row[]>(() => {
    const byRetailer = new Map(initialOffers.map(o => [o.retailerId, o]))
    return retailers.map(r => {
      const existing = byRetailer.get(r.id)
      return {
        id: existing?.id,
        retailerId: r.id,
        retailer: r,
        price: existing ? String(existing.price) : '',
        inStock: existing?.inStock ?? true,
        productUrl: existing?.productUrl ?? '',
        dirty: false,
        saving: false,
        saved: false,
        error: null,
      }
    })
  })

  const cheapestPrice = useMemo(() => {
    const prices = rows
      .filter(r => r.price && !isNaN(Number(r.price)))
      .map(r => Number(r.price))
    return prices.length > 0 ? Math.min(...prices) : null
  }, [rows])

  function updateRow(retailerId: string, patch: Partial<Row>) {
    setRows(prev =>
      prev.map(r => (r.retailerId === retailerId ? { ...r, ...patch, dirty: true, saved: false, error: null } : r))
    )
  }

  async function saveRow(retailerId: string) {
    const row = rows.find(r => r.retailerId === retailerId)
    if (!row) return

    updateRow(retailerId, { saving: true })

    // Empty price = delete the offer
    if (!row.price.trim()) {
      if (row.id) {
        try {
          const res = await fetch(`/api/admin/offers/${row.id}`, { method: 'DELETE' })
          if (!res.ok) throw new Error('Delete failed')
          setRows(prev =>
            prev.map(r =>
              r.retailerId === retailerId
                ? { ...r, id: undefined, dirty: false, saving: false, saved: true, error: null, inStock: true, productUrl: '' }
                : r
            )
          )
          setTimeout(() => updateRow(retailerId, { saved: false }), 2000)
          router.refresh()
        } catch (err) {
          setRows(prev =>
            prev.map(r =>
              r.retailerId === retailerId
                ? { ...r, saving: false, error: err instanceof Error ? err.message : 'Chyba' }
                : r
            )
          )
        }
      } else {
        updateRow(retailerId, { saving: false, dirty: false })
      }
      return
    }

    // Save / upsert
    try {
      const body = {
        productId,
        retailerId,
        price: Number(row.price),
        inStock: row.inStock,
        productUrl: row.productUrl,
      }
      const res = await fetch(row.id ? `/api/admin/offers/${row.id}` : '/api/admin/offers', {
        method: row.id ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Uložení selhalo')
      }
      const data = await res.json().catch(() => ({}))
      setRows(prev =>
        prev.map(r =>
          r.retailerId === retailerId
            ? { ...r, id: data.id || r.id, saving: false, saved: true, dirty: false, error: null }
            : r
        )
      )
      setTimeout(() => updateRow(retailerId, { saved: false }), 2000)
      router.refresh()
    } catch (err) {
      setRows(prev =>
        prev.map(r =>
          r.retailerId === retailerId
            ? { ...r, saving: false, error: err instanceof Error ? err.message : 'Chyba' }
            : r
        )
      )
    }
  }

  return (
    <div className="bg-white border border-off2 rounded-[var(--radius-card)] p-6">
      <div className="mb-4">
        <div className="text-sm font-semibold text-text">Nabídky prodejců</div>
        <div className="text-xs text-text3 mt-0.5">
          Vyplň cenu a URL produktu u každého prodejce. Prázdná cena = nabídka se smaže.
          Affiliate URL generuje systém automaticky dle šablony prodejce.
        </div>
      </div>

      <div className="space-y-2">
        {rows.map(row => {
          const price = Number(row.price)
          const isCheapest = !isNaN(price) && price === cheapestPrice && row.price !== ''
          return (
            <div
              key={row.retailerId}
              className={`grid grid-cols-[160px_120px_1fr_80px_120px] items-center gap-3 p-3 rounded-lg border ${
                isCheapest ? 'border-olive bg-olive-bg/30' : 'border-off2'
              }`}
            >
              <div>
                <div className="text-sm font-medium text-text">{row.retailer.name}</div>
                <div className="text-[10px] text-text3">
                  {row.retailer.defaultCommissionPct}% komise
                  {isCheapest && <span className="ml-1 text-olive">· nejlevněji</span>}
                </div>
              </div>
              <input
                type="number"
                step="1"
                value={row.price}
                onChange={e => updateRow(row.retailerId, { price: e.target.value })}
                placeholder="Kč"
                className="px-2.5 py-1.5 border border-off2 rounded text-sm text-right tabular-nums focus:outline-none focus:border-olive"
              />
              <input
                type="url"
                value={row.productUrl}
                onChange={e => updateRow(row.retailerId, { productUrl: e.target.value })}
                placeholder={`https://${row.retailer.domain}/olej...`}
                className="px-2.5 py-1.5 border border-off2 rounded text-xs font-mono focus:outline-none focus:border-olive"
              />
              <label className="flex items-center gap-1.5 text-xs text-text2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={row.inStock}
                  onChange={e => updateRow(row.retailerId, { inStock: e.target.checked })}
                  className="accent-olive"
                />
                skladem
              </label>
              <button
                type="button"
                onClick={() => saveRow(row.retailerId)}
                disabled={!row.dirty || row.saving}
                className={`text-xs rounded-full px-3 py-1.5 font-medium transition-colors ${
                  row.saved
                    ? 'bg-olive-bg text-olive-dark'
                    : row.dirty
                    ? 'bg-olive text-white hover:bg-olive-dark'
                    : 'bg-off text-text3'
                } disabled:cursor-not-allowed`}
              >
                {row.saving ? '...' : row.saved ? '✓ Uloženo' : row.dirty ? 'Uložit' : (row.id ? 'Uloženo' : 'Prázdné')}
              </button>
              {row.error && (
                <div className="col-span-5 text-[11px] text-red-600">{row.error}</div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
