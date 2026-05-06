'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { Product } from '@/lib/types'
import type { CompletenessResult } from '@/lib/completeness'
import { typeLabel, extractBrand } from '@/lib/utils'
import { completenessColor } from '@/lib/completeness'
import { StatusBadge as SharedStatusBadge } from '@/components/admin/status-badge'

type ProductWithCompleteness = Product & { _completeness: CompletenessResult }

interface Props {
  products: ProductWithCompleteness[]
  sort?: string
}

function CompletenessBadge({ result }: { result: CompletenessResult }) {
  const { bg, text } = completenessColor(result.weightedPercent)
  const tooltip = result.missing.length > 0
    ? `Chybí: ${result.missing.map((m) => m.label).join(', ')}`
    : 'Vše vyplněno'
  return (
    <span
      className={`text-[11px] ${bg} ${text} px-2 py-0.5 rounded-full font-medium whitespace-nowrap inline-block`}
      title={tooltip}
    >
      {result.weightedPercent}%
    </span>
  )
}

export function ProductsBulkTable({ products, sort }: Props) {
  const router = useRouter()
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [busy, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const allSelected = products.length > 0 && selected.size === products.length
  const someSelected = selected.size > 0 && !allSelected

  function toggleAll() {
    if (allSelected || someSelected) {
      setSelected(new Set())
    } else {
      setSelected(new Set(products.map((p) => p.id)))
    }
  }

  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function bulkSetStatus(status: 'excluded' | 'inactive' | 'active', label: string) {
    if (selected.size === 0) return
    if (
      !confirm(
        `${label} ${selected.size} produkt${selected.size === 1 ? '' : selected.size < 5 ? 'y' : 'ů'}? Akci lze vrátit změnou statusu jednotlivě.`
      )
    ) {
      return
    }
    setError(null)
    startTransition(async () => {
      try {
        const res = await fetch('/api/admin/products/bulk-status', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ids: Array.from(selected),
            status,
          }),
        })
        const data = await res.json()
        if (!res.ok || !data.ok) throw new Error(data.error ?? 'Akce selhala')
        setSelected(new Set())
        router.refresh()
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Chyba')
      }
    })
  }

  return (
    <>
      <div className="bg-white border border-off2 rounded-[var(--radius-card)] overflow-hidden">
        <table className="w-full">
          <thead className="bg-off">
            <tr>
              <th className="px-3 py-3 w-[40px] text-center">
                <input
                  type="checkbox"
                  aria-label="Vybrat všechny"
                  checked={allSelected}
                  ref={(el) => {
                    if (el) el.indeterminate = someSelected
                  }}
                  onChange={toggleAll}
                  className="w-4 h-4 accent-olive cursor-pointer"
                />
              </th>
              <th className="px-3 py-3 w-[56px]"></th>
              <th className="text-left px-3 py-3 text-[11px] font-semibold tracking-wider uppercase text-text3">Produkt</th>
              <th className="text-left px-3 py-3 text-[11px] font-semibold tracking-wider uppercase text-text3">Výrobce</th>
              <th className="text-left px-3 py-3 text-[11px] font-semibold tracking-wider uppercase text-text3 whitespace-nowrap">EAN</th>
              <th className="text-left px-3 py-3 text-[11px] font-semibold tracking-wider uppercase text-text3">Typ</th>
              <th className="text-right px-3 py-3 text-[11px] font-semibold tracking-wider uppercase text-text3">Score</th>
              <th className="text-right px-3 py-3 text-[11px] font-semibold tracking-wider uppercase text-text3 whitespace-nowrap">Kyselost</th>
              <th className="text-center px-3 py-3 text-[11px] font-semibold tracking-wider uppercase text-text3">
                <Link
                  href={sort === 'completeness' ? '/admin/products' : '/admin/products?sort=completeness'}
                  className={`hover:text-olive transition-colors ${sort === 'completeness' ? 'text-olive' : ''}`}
                  title="Kliknutím seřadit od nejvíce neúplných"
                >
                  Komplet {sort === 'completeness' ? '↑' : '↕'}
                </Link>
              </th>
              <th className="text-center px-3 py-3 text-[11px] font-semibold tracking-wider uppercase text-text3">Stav</th>
              <th className="px-3 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {products.length === 0 && (
              <tr>
                <td colSpan={11} className="px-4 py-10 text-center text-text3 text-sm">
                  Žádné produkty neodpovídají vybraným filtrům
                </td>
              </tr>
            )}
            {products.map((p) => {
              const isChecked = selected.has(p.id)
              return (
                <tr
                  key={p.id}
                  className={`border-t border-off2 transition-colors ${
                    isChecked ? 'bg-olive-bg/30' : 'hover:bg-off/60'
                  }`}
                >
                  <td className="px-3 py-2 text-center">
                    <input
                      type="checkbox"
                      aria-label={`Vybrat ${p.name}`}
                      checked={isChecked}
                      onChange={() => toggleOne(p.id)}
                      className="w-4 h-4 accent-olive cursor-pointer"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <Link href={`/admin/products/${p.id}`} className="block w-10 h-10 bg-off rounded overflow-hidden border border-off2">
                      {p.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={p.imageUrl} alt={p.name} className="w-full h-full object-contain" loading="lazy" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center font-[family-name:var(--font-display)] text-base italic text-text3/40">
                          {p.name.charAt(0)}
                        </div>
                      )}
                    </Link>
                  </td>
                  <td className="px-3 py-3">
                    <div className="text-sm font-medium text-text">{p.name}</div>
                    <div className="text-xs text-text3">
                      {p.originRegion}{p.volumeMl ? ` · ${p.volumeMl} ml` : ''}
                    </div>
                    {(p.status === 'inactive' || p.status === 'excluded') && (p.statusReasonCode || p.statusReasonNote) && (
                      <div className={`mt-1 inline-flex items-center gap-1.5 text-[11px] px-2 py-0.5 rounded ${p.status === 'excluded' ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-800'}`}>
                        <span>{p.statusChangedBy === 'auto' ? '🤖' : '👤'}</span>
                        <span>
                          {p.statusReasonCode === 'url_404' && 'URL nedostupné'}
                          {p.statusReasonCode === 'out_of_stock' && 'Vyprodáno'}
                          {p.statusReasonCode === 'duplicate' && 'Duplikát'}
                          {p.statusReasonCode === 'low_quality' && 'Málo dat'}
                          {p.statusReasonCode === 'wrong_category' && 'Špatná kategorie'}
                          {p.statusReasonCode === 'price_anomaly' && 'Cenová anomálie'}
                          {p.statusReasonCode === 'not_interesting' && 'Mimo fokus'}
                          {p.statusReasonCode === 'custom' && (p.statusReasonNote ?? 'Vlastní')}
                          {!p.statusReasonCode && p.statusReasonNote}
                        </span>
                        {p.statusReasonNote && p.statusReasonCode && p.statusReasonCode !== 'custom' && (
                          <span className="opacity-70">· {p.statusReasonNote}</span>
                        )}
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-3 text-xs text-text2">{extractBrand(p.name)}</td>
                  <td className="px-3 py-3 text-xs text-text2 font-mono whitespace-nowrap">
                    {p.ean ?? <span className="text-text3 italic">—</span>}
                  </td>
                  <td className="px-3 py-3 text-xs text-text2">{typeLabel(p.type)}</td>
                  <td className="px-3 py-3 text-right">
                    <span className="text-sm font-semibold text-amber-700 tabular-nums">{p.olivatorScore || '—'}</span>
                  </td>
                  <td className="px-3 py-3 text-right text-sm text-text tabular-nums whitespace-nowrap">
                    {p.acidity ? `${p.acidity}%` : '—'}
                  </td>
                  <td className="px-3 py-3 text-center">
                    <CompletenessBadge result={p._completeness} />
                  </td>
                  <td className="px-3 py-3 text-center">
                    <SharedStatusBadge status={p.status} />
                  </td>
                  <td className="px-3 py-3 text-right">
                    <Link
                      href={`/admin/products/${p.id}`}
                      className="text-[12px] text-olive hover:text-olive-dark whitespace-nowrap"
                    >
                      Upravit →
                    </Link>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Floating bulk action bar — sticky bottom, viditelný jen když 1+ vybráno */}
      {selected.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-text text-white rounded-full pl-5 pr-2 py-2 shadow-lg flex items-center gap-3 max-w-[calc(100%-3rem)]">
          <div className="text-[13px] font-medium whitespace-nowrap">
            <span className="tabular-nums">{selected.size}</span> vybráno
          </div>
          <button
            type="button"
            onClick={() => setSelected(new Set())}
            disabled={busy}
            className="text-[12px] text-white/70 hover:text-white px-2 disabled:opacity-50"
          >
            zrušit
          </button>
          <div className="h-6 w-px bg-white/20" />
          <button
            type="button"
            onClick={() => bulkSetStatus('active', 'Publikovat')}
            disabled={busy}
            className="text-[12px] bg-olive text-white rounded-full px-3 py-1.5 hover:bg-olive2 disabled:opacity-50 transition-colors whitespace-nowrap"
          >
            ✓ Publikovat
          </button>
          <button
            type="button"
            onClick={() => bulkSetStatus('inactive', 'Skrýt jako neaktivní')}
            disabled={busy}
            className="text-[12px] bg-white/10 text-white rounded-full px-3 py-1.5 hover:bg-white/20 disabled:opacity-50 transition-colors whitespace-nowrap"
          >
            ⏸ Neaktivní
          </button>
          <button
            type="button"
            onClick={() => bulkSetStatus('excluded', 'Vyřadit (odpad)')}
            disabled={busy}
            className="text-[12px] bg-red-600 text-white rounded-full px-3 py-1.5 hover:bg-red-700 disabled:opacity-50 transition-colors whitespace-nowrap"
          >
            ✗ Vyřadit
          </button>
          {busy && <span className="text-[11px] text-white/70 pl-1">⏳</span>}
        </div>
      )}

      {error && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 text-[12px] text-red-700 bg-red-50 border border-red-200 rounded px-3 py-1.5">
          ⚠ {error}
        </div>
      )}
    </>
  )
}
