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
  const [status, setStatus] = useState<
    | { kind: 'idle' }
    | { kind: 'ok'; imageUrl: string; source: string }
    | { kind: 'err'; reason: string }
  >({ kind: 'idle' })

  async function onFetch() {
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
      setStatus({
        kind: 'err',
        reason: err instanceof Error ? err.message : 'Chyba sítě',
      })
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
              : 'Žádná fotka. Lze načíst z Open Food Facts databáze přes EAN.'}
          </div>
        </div>
        <button
          type="button"
          onClick={onFetch}
          disabled={loading}
          className="bg-olive text-white rounded-full px-4 py-2 text-[13px] font-medium hover:bg-olive-dark disabled:opacity-40 transition-colors whitespace-nowrap"
        >
          {loading ? 'Načítám...' : hasImage ? '↻ Znovu načíst' : '📷 Načíst fotku'}
        </button>
      </div>

      <div className="flex items-center gap-4">
        <div className="w-32 h-32 bg-off rounded-xl flex items-center justify-center overflow-hidden shrink-0">
          {hasImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={currentImageUrl!}
              alt="Produkt"
              className="w-full h-full object-contain"
            />
          ) : (
            <span className="text-4xl">🫒</span>
          )}
        </div>
        <div className="flex-1 text-xs text-text3 leading-relaxed">
          <div className="mb-1">EAN: <span className="font-mono text-text2">{ean}</span></div>
          {hasImage && (
            <a
              href={currentImageUrl!}
              target="_blank"
              rel="noopener noreferrer"
              className="text-olive hover:underline break-all"
            >
              {currentImageUrl}
            </a>
          )}
        </div>
      </div>

      {status.kind === 'ok' && (
        <div className="mt-3 text-xs text-olive-dark bg-olive-bg border border-olive-border rounded-lg px-3 py-2">
          ✓ Fotka načtena z <strong>{status.source}</strong>
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
