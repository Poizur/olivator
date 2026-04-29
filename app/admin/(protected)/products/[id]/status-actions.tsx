'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

interface StatusActionsProps {
  productId: string
  currentStatus: string
  publicUrl: string
}

export function StatusActions({ productId, currentStatus, publicUrl }: StatusActionsProps) {
  const router = useRouter()
  const [busy, setBusy] = useState<'publish' | 'unpublish' | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function changeStatus(newStatus: 'active' | 'draft' | 'inactive', actionLabel: 'publish' | 'unpublish') {
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
    if (!confirm('NAVŽDY smazat tento produkt z databáze?\n\nSmažou se i:\n- všechny nabídky prodejců\n- obrázky v Storage\n- FAQ, fakta, kvalita issues\n\nTuto akci nelze vrátit.')) return
    if (!confirm('Opravdu? Tohle smaže produkt navždy.')) return
    setBusy('publish') // reuse busy state
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
    return (
      <span className="inline-flex items-center gap-1.5 bg-off border border-off2 text-text2 rounded-full px-4 py-2.5 text-sm font-medium">
        <span className="w-2 h-2 rounded-full bg-text3"></span>
        Neaktivní
      </span>
    )
  })()

  return (
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
            void changeStatus('active', 'publish')
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
          onClick={() => {
            if (!confirm('Stáhnout produkt z webu?\n\nProdukt zmizí z listingu a homepage. Status se nastaví na "Neaktivní".')) return
            void changeStatus('inactive', 'unpublish')
          }}
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

      {/* Delete — destructive, isolated visually with red hover */}
      <button
        type="button"
        onClick={deleteProduct}
        disabled={busy !== null}
        className="inline-flex items-center gap-2 bg-white border border-off2 text-text3 rounded-full px-4 py-2.5 text-sm font-medium hover:border-red-300 hover:text-red-700 hover:bg-red-50 disabled:opacity-40 transition-colors"
        title="Smazat produkt navždy z databáze"
      >
        🗑 Smazat
      </button>

      {error && (
        <span className="text-[11px] text-red-700 bg-red-50 border border-red-200 rounded px-2 py-1">
          ⚠ {error}
        </span>
      )}
    </div>
  )
}
