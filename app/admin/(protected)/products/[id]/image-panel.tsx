'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface ImagePanelProps {
  productId: string
  currentImageUrl: string | null
  currentSource: string | null
  ean: string
}

export function ImagePanel({ productId, currentImageUrl, currentSource, ean }: ImagePanelProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [manualUrl, setManualUrl] = useState('')
  const [status, setStatus] = useState<
    | { kind: 'idle' }
    | { kind: 'ok'; imageUrl: string; source: string }
    | { kind: 'err'; reason: string }
  >({ kind: 'idle' })

  async function onFetchOFF() {
    setLoading(true)
    setStatus({ kind: 'idle' })
    try {
      const res = await fetch(`/api/admin/products/${productId}/fetch-image`, {
        method: 'POST',
      })
      const data = await res.json()
      if (res.ok && data.ok) {
        setStatus({ kind: 'ok', imageUrl: data.imageUrl, source: data.source })
        router.refresh()
      } else {
        setStatus({ kind: 'err', reason: data.error || 'Nepodařilo se načíst obrázek' })
      }
    } catch (err) {
      setStatus({ kind: 'err', reason: err instanceof Error ? err.message : 'Chyba sítě' })
    } finally {
      setLoading(false)
    }
  }

  async function onSubmitManual() {
    if (!manualUrl.trim()) return
    setLoading(true)
    setStatus({ kind: 'idle' })
    try {
      const res = await fetch(`/api/admin/products/${productId}/fetch-image`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ manualUrl: manualUrl.trim() }),
      })
      const data = await res.json()
      if (res.ok && data.ok) {
        setStatus({ kind: 'ok', imageUrl: data.imageUrl, source: data.source })
        setManualUrl('')
        router.refresh()
      } else {
        setStatus({ kind: 'err', reason: data.error || 'Nepodařilo se uložit obrázek' })
      }
    } catch (err) {
      setStatus({ kind: 'err', reason: err instanceof Error ? err.message : 'Chyba sítě' })
    } finally {
      setLoading(false)
    }
  }

  async function onRemove() {
    if (!confirm('Smazat fotku?')) return
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/products/${productId}/fetch-image`, { method: 'DELETE' })
      if (res.ok) router.refresh()
    } finally {
      setLoading(false)
    }
  }

  const hasImage = !!currentImageUrl

  return (
    <div className="bg-white border border-off2 rounded-[var(--radius-card)] p-6">
      <div className="flex items-start justify-between mb-4 gap-4">
        <div>
          <div className="text-sm font-semibold text-text">Produktová fotka</div>
          <div className="text-xs text-text3 mt-0.5">
            {hasImage
              ? `Uloženo ze zdroje: ${currentSource ?? 'neznámý'}`
              : 'Žádná fotka. Načti z Open Food Facts přes EAN nebo vlož URL ručně.'}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-4 mb-4">
        <div className="w-32 h-32 bg-off rounded-xl flex items-center justify-center overflow-hidden shrink-0">
          {hasImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={currentImageUrl!} alt="Produkt" className="w-full h-full object-contain" />
          ) : (
            <span className="text-4xl">🫒</span>
          )}
        </div>
        <div className="flex-1 text-xs text-text3 leading-relaxed">
          <div className="mb-1">EAN: <span className="font-mono text-text2">{ean}</span></div>
          {hasImage && (
            <a href={currentImageUrl!} target="_blank" rel="noopener noreferrer" className="text-olive hover:underline break-all">
              {currentImageUrl}
            </a>
          )}
        </div>
      </div>

      {/* Actions — two columns */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Auto from OFF */}
        <div className="bg-off rounded-lg p-3">
          <div className="text-xs font-medium text-text mb-2">Automaticky z Open Food Facts</div>
          <button
            type="button"
            onClick={onFetchOFF}
            disabled={loading}
            className="bg-olive text-white rounded-full px-3 py-1.5 text-[12px] font-medium hover:bg-olive-dark disabled:opacity-40 transition-colors"
          >
            {loading ? 'Načítám...' : '📷 Načíst z OFF'}
          </button>
          <div className="text-[11px] text-text3 mt-2 leading-relaxed">
            Funguje pokud je EAN v databázi. 14k+ olivových olejů, převážně mainstream značky.
          </div>
        </div>

        {/* Manual URL */}
        <div className="bg-off rounded-lg p-3">
          <div className="text-xs font-medium text-text mb-2">Ručně z URL</div>
          <div className="flex gap-2">
            <input
              type="url"
              value={manualUrl}
              onChange={e => setManualUrl(e.target.value)}
              placeholder="https://brand.cz/images/olej.jpg"
              className="flex-1 px-2.5 py-1.5 border border-off2 rounded text-xs focus:outline-none focus:border-olive"
            />
            <button
              type="button"
              onClick={onSubmitManual}
              disabled={loading || !manualUrl.trim()}
              className="bg-olive text-white rounded-full px-3 py-1.5 text-[12px] font-medium hover:bg-olive-dark disabled:opacity-40 transition-colors whitespace-nowrap"
            >
              Uložit
            </button>
          </div>
          <div className="text-[11px] text-text3 mt-2 leading-relaxed">
            Z webu značky nebo prodejce. Systém stáhne a zkonvertuje na WebP.
          </div>
        </div>
      </div>

      {hasImage && (
        <div className="mt-3 text-right">
          <button
            type="button"
            onClick={onRemove}
            disabled={loading}
            className="text-xs text-red-600 hover:underline disabled:opacity-40"
          >
            Smazat fotku
          </button>
        </div>
      )}

      {status.kind === 'ok' && (
        <div className="mt-3 text-xs text-olive-dark bg-olive-bg border border-olive-border rounded-lg px-3 py-2">
          ✓ Uloženo ze zdroje <strong>{status.source}</strong>
        </div>
      )}
      {status.kind === 'err' && (
        <div className="mt-3 text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          ⚠ {status.reason}
        </div>
      )}
    </div>
  )
}
