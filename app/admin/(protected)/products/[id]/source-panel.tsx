'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface ScrapedImage {
  url: string
  alt: string | null
}

interface SourcePanelProps {
  productId: string
  sourceUrl: string | null
  rawDescriptionLength: number
}

export function SourcePanel({ productId, sourceUrl, rawDescriptionLength }: SourcePanelProps) {
  const router = useRouter()
  const [rescraping, setRescraping] = useState(false)
  const [overrideUrl, setOverrideUrl] = useState('')
  const [status, setStatus] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [gallery, setGallery] = useState<ScrapedImage[]>([])

  const effectiveUrl = sourceUrl ?? null

  async function onRescrape() {
    if (!effectiveUrl && !overrideUrl.trim()) {
      setError('Produkt nemá uloženou zdrojovou URL. Zadej ji níže.')
      return
    }
    setRescraping(true)
    setError(null)
    setStatus(null)
    try {
      const res = await fetch(`/api/admin/products/${productId}/rescrape`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(overrideUrl.trim() ? { url: overrideUrl.trim() } : {}),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Rescrape selhal')
      const filledMsg =
        data.filled.length > 0
          ? `Doplněno: ${data.filled.join(', ')}`
          : 'Žádná nová data — existující záznam je kompletní'
      setStatus(
        `✓ ${filledMsg} | raw_description ${data.rawDescriptionLength} znaků | ${data.factsCount} faktů | galerie ${data.galleryCount}`
      )
      setGallery(data.galleryImages ?? [])
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Chyba')
    } finally {
      setRescraping(false)
    }
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text)
    setStatus(`✓ Zkopírováno: ${text.slice(0, 50)}...`)
    setTimeout(() => setStatus(null), 2000)
  }

  return (
    <div className="bg-white border border-off2 rounded-[var(--radius-card)] p-6">
      <div className="flex items-start justify-between mb-3 gap-4">
        <div>
          <div className="text-sm font-semibold text-text">Zdroj produktu</div>
          <div className="text-xs text-text3 mt-0.5">
            Původní URL z e-shopu + původní (ne-AI) scrape text. Rescrape doplňuje pouze prázdná pole.
          </div>
        </div>
      </div>

      {effectiveUrl ? (
        <div className="flex items-center gap-2 mb-3">
          <span className="text-[11px] uppercase tracking-wider text-text3 shrink-0">URL:</span>
          <a
            href={effectiveUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[13px] text-olive hover:text-olive-dark underline decoration-dotted truncate flex-1"
            title={effectiveUrl}
          >
            {effectiveUrl}
          </a>
          <button
            type="button"
            onClick={() => copyToClipboard(effectiveUrl)}
            className="text-[11px] text-text3 hover:text-olive shrink-0"
          >
            📋 Kopírovat
          </button>
        </div>
      ) : (
        <div className="mb-3 text-xs text-text3 italic bg-off rounded-lg px-3 py-2">
          Zdrojová URL není uložena — zadej ji níže pro rescrape.
        </div>
      )}

      {!effectiveUrl && (
        <input
          type="url"
          value={overrideUrl}
          onChange={e => setOverrideUrl(e.target.value)}
          placeholder="https://shop.reckonasbavi.cz/..."
          className="w-full px-3 py-2 border border-off2 rounded-lg text-sm mb-3 focus:outline-none focus:border-olive"
        />
      )}

      <div className="flex items-center gap-3 flex-wrap">
        <button
          type="button"
          onClick={onRescrape}
          disabled={rescraping}
          className="bg-olive-bg text-olive-dark border border-olive-border rounded-full px-4 py-1.5 text-[13px] font-medium hover:bg-olive-border disabled:opacity-40 transition-colors"
        >
          {rescraping ? '🔄 Scrapuji...' : '🔄 Rescrape ze zdroje'}
        </button>
        <span className="text-[11px] text-text3 leading-tight flex-1">
          raw_description: <strong>{rawDescriptionLength}</strong> znaků
          {rawDescriptionLength === 0 && ' — chybí! AI bude mít málo podkladů'}
        </span>
      </div>

      {status && (
        <div className="mt-3 text-xs text-olive-dark bg-olive-bg border border-olive-border rounded-lg px-3 py-2">
          {status}
        </div>
      )}
      {error && (
        <div className="mt-3 text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          ⚠ {error}
        </div>
      )}

      {gallery.length > 0 && (
        <div className="mt-4">
          <div className="text-xs font-medium text-text2 mb-2">
            Galerie z zdroje ({gallery.length}) — klikni pro kopírování URL
          </div>
          <div className="flex gap-2 overflow-x-auto pb-2">
            {gallery.map((img, i) => (
              <button
                key={i}
                type="button"
                onClick={() => copyToClipboard(img.url)}
                className="shrink-0 group relative"
                title={img.alt ?? img.url}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={img.url}
                  alt={img.alt ?? ''}
                  className="w-20 h-20 object-contain bg-off rounded border border-off2 group-hover:border-olive"
                />
                <div className="absolute inset-0 bg-olive/60 text-white text-[10px] font-medium flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded">
                  📋 Zkopírovat URL
                </div>
              </button>
            ))}
          </div>
          <div className="text-[11px] text-text3 mt-1">
            Tip: zkopíruj URL a vlož do &ldquo;Manuální URL&rdquo; v panelu fotka nahoře pro změnu hlavního obrázku.
          </div>
        </div>
      )}
    </div>
  )
}
