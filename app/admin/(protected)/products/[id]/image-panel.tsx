'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface ImagePanelProps {
  productId: string
  currentImageUrl: string | null
  currentSource: string | null
  ean: string
}

type PreviewState =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'preview'; url: string }
  | { kind: 'none' }
  | { kind: 'err'; reason: string }

export function ImagePanel({ productId, currentImageUrl, currentSource, ean }: ImagePanelProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [manualUrl, setManualUrl] = useState('')
  const [preview, setPreview] = useState<PreviewState>({ kind: 'idle' })
  const [status, setStatus] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Step 1: Preview — fetch OFF URL without committing
  async function onPreviewOFF() {
    setPreview({ kind: 'loading' })
    setError(null)
    setStatus(null)
    try {
      const res = await fetch(`/api/admin/products/${productId}/fetch-image`, { method: 'GET' })
      const data = await res.json()
      if (data.ok && data.previewUrl) {
        setPreview({ kind: 'preview', url: data.previewUrl })
      } else {
        setPreview({ kind: 'none' })
      }
    } catch (err) {
      setPreview({ kind: 'err', reason: err instanceof Error ? err.message : 'Chyba sítě' })
    }
  }

  // Step 2a: Save the OFF preview (download + convert + upload)
  async function onAcceptOFF() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/products/${productId}/fetch-image`, {
        method: 'POST',
      })
      const data = await res.json()
      if (res.ok && data.ok) {
        setStatus(`Uloženo ze zdroje: ${data.source}`)
        setPreview({ kind: 'idle' })
        router.refresh()
      } else {
        setError(data.error || 'Uložení selhalo')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Chyba sítě')
    } finally {
      setLoading(false)
    }
  }

  // Step 2b: Reject preview
  function onRejectPreview() {
    setPreview({ kind: 'idle' })
    setStatus(null)
    setError(null)
  }

  async function onSubmitManual() {
    if (!manualUrl.trim()) return
    setLoading(true)
    setError(null)
    setStatus(null)
    try {
      const res = await fetch(`/api/admin/products/${productId}/fetch-image`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ manualUrl: manualUrl.trim() }),
      })
      const data = await res.json()
      if (res.ok && data.ok) {
        setStatus('Fotka uložena z URL')
        setManualUrl('')
        router.refresh()
      } else {
        setError(data.error || 'Nepodařilo se uložit')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Chyba sítě')
    } finally {
      setLoading(false)
    }
  }

  async function onRemove() {
    if (!confirm('Smazat fotku?')) return
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/products/${productId}/fetch-image`, { method: 'DELETE' })
      if (res.ok) {
        setStatus('Fotka smazána')
        router.refresh()
      }
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
              : 'Žádná fotka. Nejlepší zdroj: oficiální web značky nebo produktová fotka z Rohlík/Košík. OFF je fallback.'}
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
          <div className="mb-1">
            EAN: <span className="font-mono text-text2">{ean}</span>
          </div>
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

      {/* Two input paths */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Manual URL — primary CTA since it gives best quality */}
        <div className="bg-olive-bg/40 border border-olive-border rounded-lg p-3">
          <div className="text-xs font-medium text-text mb-1">🔗 Ručně z URL (doporučeno)</div>
          <div className="text-[11px] text-text3 mb-2 leading-relaxed">
            Nejlepší kvalita — z webu značky nebo eshopu. Pravým klikem na fotku → zkopíruj URL obrázku.
          </div>
          <div className="flex gap-2">
            <input
              type="url"
              value={manualUrl}
              onChange={e => setManualUrl(e.target.value)}
              placeholder="https://..."
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
        </div>

        {/* OFF — secondary, with preview */}
        <div className="bg-off rounded-lg p-3">
          <div className="text-xs font-medium text-text mb-1">📦 Z Open Food Facts (fallback)</div>
          <div className="text-[11px] text-text3 mb-2 leading-relaxed">
            14k+ olejů v databázi, ale kvalita fotek kolísá (user-uploaded).
          </div>

          {preview.kind === 'idle' && (
            <button
              type="button"
              onClick={onPreviewOFF}
              disabled={loading}
              className="bg-white border border-off2 rounded-full px-3 py-1.5 text-[12px] font-medium hover:border-olive-light hover:text-olive transition-colors"
            >
              🔍 Zobrazit náhled
            </button>
          )}
          {preview.kind === 'loading' && (
            <div className="text-[12px] text-text3">Načítám náhled...</div>
          )}
          {preview.kind === 'none' && (
            <div className="text-[12px] text-terra">
              OFF nemá fotku pro tento EAN. Použij ruční URL nebo jiný zdroj.
              <button
                onClick={() => setPreview({ kind: 'idle' })}
                className="block mt-1 underline"
              >
                Zkusit znovu
              </button>
            </div>
          )}
          {preview.kind === 'err' && (
            <div className="text-[12px] text-red-600">
              Chyba: {preview.reason}
              <button
                onClick={() => setPreview({ kind: 'idle' })}
                className="block mt-1 underline"
              >
                Zkusit znovu
              </button>
            </div>
          )}
          {preview.kind === 'preview' && (
            <div>
              <div className="w-full h-32 bg-white rounded border border-off2 mb-2 flex items-center justify-center overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={preview.url} alt="Náhled OFF" className="max-w-full max-h-full object-contain" />
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={onAcceptOFF}
                  disabled={loading}
                  className="bg-olive text-white rounded-full px-3 py-1.5 text-[11px] font-medium hover:bg-olive-dark disabled:opacity-40 transition-colors"
                >
                  {loading ? 'Ukládám...' : '✓ Uložit tuto'}
                </button>
                <button
                  type="button"
                  onClick={onRejectPreview}
                  className="bg-white border border-off2 rounded-full px-3 py-1.5 text-[11px] font-medium hover:border-terra hover:text-terra transition-colors"
                >
                  ✕ Zamítnout
                </button>
              </div>
            </div>
          )}
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

      {status && (
        <div className="mt-3 text-xs text-olive-dark bg-olive-bg border border-olive-border rounded-lg px-3 py-2">
          ✓ {status}
        </div>
      )}
      {error && (
        <div className="mt-3 text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          ⚠ {error}
        </div>
      )}
    </div>
  )
}
