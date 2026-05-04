'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

interface StatusActionsProps {
  productId: string
  currentStatus: string
  publicUrl: string
  statusReasonCode?: string | null
  statusReasonNote?: string | null
  statusChangedBy?: 'admin' | 'auto' | null
  statusChangedAt?: string | null
}

// Preset důvody pro inactive / excluded. Code = strojový (filtr v UI),
// label = co user vidí v dropdownu, note = pre-fill textarea pokud chce
// víc detailů. Pokud user vybere 'custom', textarea zůstane prázdná pro
// vlastní popis.
const REASON_PRESETS: Record<string, { label: string; defaultNote: string }> = {
  url_404: { label: 'URL prodejce neexistuje (404 / mrtvý link)', defaultNote: '' },
  out_of_stock: { label: 'Vyprodáno / mimo prodej', defaultNote: '' },
  duplicate: { label: 'Duplicitní záznam', defaultNote: '' },
  low_quality: { label: 'Nedostatek dat / nekompletní', defaultNote: '' },
  wrong_category: { label: 'Špatná kategorie (není olej)', defaultNote: '' },
  price_anomaly: { label: 'Podezřelá cena', defaultNote: '' },
  not_interesting: { label: 'Nelíbí se mi / mimo můj fokus', defaultNote: '' },
  custom: { label: 'Vlastní důvod (napiš níže)', defaultNote: '' },
}

const REASON_LABEL: Record<string, string> = {
  url_404: 'URL nedostupné',
  out_of_stock: 'Vyprodáno',
  duplicate: 'Duplikát',
  low_quality: 'Málo dat',
  wrong_category: 'Špatná kategorie',
  price_anomaly: 'Cenová anomálie',
  not_interesting: 'Mimo fokus',
  custom: 'Vlastní',
}

export function StatusActions({
  productId,
  currentStatus,
  publicUrl,
  statusReasonCode,
  statusReasonNote,
  statusChangedBy,
  statusChangedAt,
}: StatusActionsProps) {
  const router = useRouter()
  const [busy, setBusy] = useState<'publish' | 'unpublish' | 'exclude' | 'restore' | 'delete' | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Reason modal — otevírá se pro change na inactive nebo excluded
  const [reasonModal, setReasonModal] = useState<{
    targetStatus: 'inactive' | 'excluded'
    actionLabel: 'unpublish' | 'exclude'
  } | null>(null)
  const [reasonCode, setReasonCode] = useState<string>('not_interesting')
  const [reasonNote, setReasonNote] = useState<string>('')

  function openReasonModal(targetStatus: 'inactive' | 'excluded', actionLabel: 'unpublish' | 'exclude') {
    setReasonModal({ targetStatus, actionLabel })
    setReasonCode('not_interesting')
    setReasonNote('')
    setError(null)
  }

  async function submitReason() {
    if (!reasonModal) return
    const { targetStatus, actionLabel } = reasonModal
    setBusy(actionLabel)
    setError(null)
    try {
      const res = await fetch(`/api/admin/products/${productId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: targetStatus,
          reasonCode,
          reasonNote: reasonNote.trim() || null,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Změna statusu selhala')
      setReasonModal(null)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Chyba')
    } finally {
      setBusy(null)
    }
  }

  // Změna na active / draft NEpotřebuje důvod (vyčistí audit fields)
  async function changeStatusNoReason(
    newStatus: 'active' | 'draft',
    actionLabel: 'publish' | 'restore'
  ) {
    setBusy(actionLabel)
    setError(null)
    try {
      const res = await fetch(`/api/admin/products/${productId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Změna statusu selhala')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Chyba')
    } finally {
      setBusy(null)
    }
  }

  async function deleteProduct() {
    if (!confirm('NAVŽDY smazat tento produkt z databáze?\n\nSmažou se i:\n- všechny nabídky prodejců\n- obrázky v Storage\n- FAQ, fakta, kvalita issues\n\nTuto akci nelze vrátit.\n\nTip: pokud je produkt v aktivním XML feedu, sync ho zítra přidá zpět. Pro permanentní blocklist použij „🚫 Vyřadit ze syncu" místo smazání.')) return
    if (!confirm('Opravdu? Tohle smaže produkt navždy.')) return
    setBusy('delete')
    setError(null)
    try {
      const res = await fetch(`/api/admin/products/${productId}`, { method: 'DELETE' })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Smazání selhalo')
      router.push('/admin/products')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Chyba')
      setBusy(null)
    }
  }

  // Big status pill — same design family as action buttons
  const statusBadge = (() => {
    if (currentStatus === 'active') {
      return (
        <span className="inline-flex items-center gap-1.5 bg-olive-bg text-olive-dark border border-olive-border rounded-full px-4 py-2.5 text-sm font-medium">
          <span className="w-2 h-2 rounded-full bg-olive-dark"></span>
          Aktivní na webu
        </span>
      )
    }
    if (currentStatus === 'draft') {
      return (
        <span className="inline-flex items-center gap-1.5 bg-amber-50 text-amber-700 border border-terra/30 rounded-full px-4 py-2.5 text-sm font-medium">
          <span className="w-2 h-2 rounded-full bg-terra"></span>
          Draft
        </span>
      )
    }
    if (currentStatus === 'excluded') {
      return (
        <span className="inline-flex items-center gap-1.5 bg-red-50 text-red-700 border border-red-200 rounded-full px-4 py-2.5 text-sm font-medium">
          <span className="w-2 h-2 rounded-full bg-red-700"></span>
          Vyřazeno (sync skip)
        </span>
      )
    }
    return (
      <span className="inline-flex items-center gap-1.5 bg-off border border-off2 text-text2 rounded-full px-4 py-2.5 text-sm font-medium">
        <span className="w-2 h-2 rounded-full bg-text3"></span>
        Neaktivní
      </span>
    )
  })()

  // Reason banner — viditelný kdykoliv currentStatus je inactive nebo excluded
  // a máme vyplněný code nebo note. Ukazuje WHO + WHEN + WHAT (kód + free text).
  const reasonBanner = (() => {
    if (currentStatus === 'active' || currentStatus === 'draft') return null
    if (!statusReasonCode && !statusReasonNote) return null
    const codeLabel = statusReasonCode ? (REASON_LABEL[statusReasonCode] ?? statusReasonCode) : null
    const byLabel = statusChangedBy === 'auto' ? '🤖 automatika' : '👤 admin'
    const whenLabel = statusChangedAt
      ? new Date(statusChangedAt).toLocaleString('cs-CZ', { dateStyle: 'short', timeStyle: 'short' })
      : null
    const ringClass = currentStatus === 'excluded' ? 'border-red-200 bg-red-50/60' : 'border-amber-200 bg-amber-50/60'
    return (
      <div className={`mt-3 border rounded-lg px-3 py-2 text-[12px] ${ringClass}`}>
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap">
            {codeLabel && (
              <span className="bg-white border border-off2 rounded-full px-2 py-0.5 text-[11px] font-medium text-text">
                {codeLabel}
              </span>
            )}
            {statusReasonNote && (
              <span className="text-text2">{statusReasonNote}</span>
            )}
          </div>
          <div className="text-[11px] text-text3 whitespace-nowrap">
            {byLabel}
            {whenLabel && <> · {whenLabel}</>}
          </div>
        </div>
      </div>
    )
  })()

  return (
    <div>
    <div className="flex items-center gap-2 flex-wrap">
      {statusBadge}

      {/* Save form — submits the form rendered below via form="product-form" attribute */}
      <button
        type="submit"
        form="product-form"
        className="inline-flex items-center gap-2 bg-olive text-white rounded-full px-5 py-2.5 text-sm font-medium hover:bg-olive-dark transition-colors"
        title="Uložit všechny změny ve formuláři"
      >
        💾 Uložit změny
      </button>

      {/* Publish button — visible when not active */}
      {currentStatus !== 'active' && (
        <button
          type="button"
          onClick={() => {
            if (!confirm('Publikovat produkt na webu?\n\nObjeví se v listingu /srovnavac, na homepage a bude indexován Googlem.')) return
            void changeStatusNoReason('active', 'publish')
          }}
          disabled={busy !== null}
          className="inline-flex items-center gap-2 bg-terra text-text rounded-full px-5 py-2.5 text-sm font-medium hover:opacity-90 disabled:opacity-40 transition-opacity"
        >
          {busy === 'publish' ? '⏳ Publikuji...' : '⚡ Publikovat'}
        </button>
      )}

      {/* Unpublish button — visible when active */}
      {currentStatus === 'active' && (
        <button
          type="button"
          onClick={() => openReasonModal('inactive', 'unpublish')}
          disabled={busy !== null}
          className="inline-flex items-center gap-2 bg-off border border-off2 text-text2 rounded-full px-4 py-2.5 text-sm font-medium hover:border-terra hover:text-amber-700 disabled:opacity-40 transition-colors"
        >
          {busy === 'unpublish' ? '⏳ Stahuji...' : '○ Stáhnout z webu'}
        </button>
      )}

      {/* View on web button */}
      <a
        href={publicUrl}
        target="_blank"
        rel="noopener noreferrer"
        className={`inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium transition-colors ${
          currentStatus === 'active'
            ? 'bg-olive text-white hover:bg-olive-dark'
            : 'bg-white border border-off2 text-text2 hover:border-olive3 hover:text-olive'
        }`}
        title={currentStatus === 'active' ? 'Otevřít produkt na webu' : 'Náhled (produkt není veřejný)'}
      >
        👁 {currentStatus === 'active' ? 'Zobrazit na webu' : 'Náhled'}
        <span className="text-[11px] opacity-70">↗</span>
      </a>

      {/* Back to list — same pill style */}
      <Link
        href="/admin/products"
        className="inline-flex items-center gap-2 bg-white border border-off2 text-text2 rounded-full px-4 py-2.5 text-sm font-medium hover:border-olive3 hover:text-olive transition-colors"
        title="Zpět na seznam produktů"
      >
        ← Zpět
      </Link>

      {/* Vyřadit — soft delete, blokuje feed-sync re-import */}
      {currentStatus !== 'excluded' && (
        <button
          type="button"
          onClick={() => openReasonModal('excluded', 'exclude')}
          disabled={busy !== null}
          className="inline-flex items-center gap-2 bg-white border border-off2 text-text3 rounded-full px-4 py-2.5 text-sm font-medium hover:border-red-300 hover:text-red-700 hover:bg-red-50 disabled:opacity-40 transition-colors"
          title="Vyřadit ze syncu — nepřidá se zpět z feedu"
        >
          {busy === 'exclude' ? '⏳ Vyřazuji...' : '🚫 Vyřadit ze syncu'}
        </button>
      )}

      {/* Restore — vrátit z blocklistu zpět do draftů */}
      {currentStatus === 'excluded' && (
        <button
          type="button"
          onClick={() => {
            if (!confirm('Vrátit produkt do draftů?\n\nProdukt opět začne dostávat aktualizace cen z XML feedu. Status se nastaví na „Draft" — pak ho můžeš publikovat tlačítkem ⚡ Publikovat.')) return
            void changeStatusNoReason('draft', 'restore')
          }}
          disabled={busy !== null}
          className="inline-flex items-center gap-2 bg-white border border-amber-300 text-amber-700 rounded-full px-4 py-2.5 text-sm font-medium hover:border-amber-500 hover:bg-amber-50 disabled:opacity-40 transition-colors"
          title="Vrátit z blocklistu zpět do draftů"
        >
          {busy === 'restore' ? '⏳ Vracím...' : '↺ Vrátit do draftů'}
        </button>
      )}

      {/* Trvalé smazání — destrutivní, izolovaně červené */}
      <button
        type="button"
        onClick={deleteProduct}
        disabled={busy !== null}
        className="inline-flex items-center gap-2 bg-white border border-off2 text-text3 rounded-full px-4 py-2.5 text-sm font-medium hover:border-red-300 hover:text-red-700 hover:bg-red-50 disabled:opacity-40 transition-colors"
        title="Trvale smazat (pozor: pokud je v aktivním feedu, sync ho přidá zpět)"
      >
        🗑 Smazat trvale
      </button>

      {error && (
        <span className="text-[11px] text-red-700 bg-red-50 border border-red-200 rounded px-2 py-1">
          ⚠ {error}
        </span>
      )}
    </div>

    {reasonBanner}

    {reasonModal && (
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => !busy && setReasonModal(null)}>
        <div className="bg-white rounded-[var(--radius-card)] shadow-xl max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
          <div className="text-[10px] font-bold tracking-widest uppercase text-text3 mb-1.5">
            {reasonModal.targetStatus === 'excluded' ? '— Vyřadit ze syncu' : '— Stáhnout z webu'}
          </div>
          <h3 className="text-lg font-semibold text-text mb-1">
            {reasonModal.targetStatus === 'excluded' ? 'Proč vyřazuješ?' : 'Proč stahuješ?'}
          </h3>
          <p className="text-[12px] text-text3 mb-4 leading-snug">
            {reasonModal.targetStatus === 'excluded'
              ? 'Důvod se uloží jako audit log a zobrazí se vedle produktu v listingu. Pomůže ti i kolegům pochopit historii.'
              : 'Důvod uvidíš v listingu vedle „neaktivní" — abys za týden nemusela přemýšlet, proč jsi produkt skryla.'}
          </p>

          <div className="space-y-3 mb-4">
            <div>
              <label className="block text-[11px] font-medium text-text2 uppercase tracking-wider mb-1.5">Důvod</label>
              <select
                value={reasonCode}
                onChange={(e) => setReasonCode(e.target.value)}
                className="w-full px-3 py-2 border border-off2 rounded-lg text-sm focus:outline-none focus:border-olive"
              >
                {Object.entries(REASON_PRESETS).map(([code, preset]) => (
                  <option key={code} value={code}>{preset.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-medium text-text2 uppercase tracking-wider mb-1.5">
                Poznámka (volitelně)
              </label>
              <textarea
                value={reasonNote}
                onChange={(e) => setReasonNote(e.target.value)}
                rows={3}
                placeholder={reasonCode === 'custom' ? 'Vlastní text…' : 'Detail / kontext (volitelné)…'}
                className="w-full px-3 py-2 border border-off2 rounded-lg text-sm focus:outline-none focus:border-olive resize-y"
              />
            </div>
          </div>

          {error && (
            <div className="text-[11px] text-red-700 bg-red-50 border border-red-200 rounded px-2 py-1 mb-3">
              ⚠ {error}
            </div>
          )}

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setReasonModal(null)}
              disabled={busy !== null}
              className="px-4 py-2 text-sm text-text2 hover:text-text disabled:opacity-40"
            >
              Zrušit
            </button>
            <button
              type="button"
              onClick={submitReason}
              disabled={busy !== null}
              className={`px-4 py-2 rounded-full text-sm font-medium text-white disabled:opacity-40 ${
                reasonModal.targetStatus === 'excluded' ? 'bg-red-700 hover:bg-red-800' : 'bg-olive hover:bg-olive-dark'
              }`}
            >
              {busy ? '⏳ Ukládám…' : reasonModal.targetStatus === 'excluded' ? '🚫 Vyřadit' : '○ Stáhnout'}
            </button>
          </div>
        </div>
      </div>
    )}
    </div>
  )
}
