'use client'

import { useState } from 'react'

interface SourcePanelProps {
  productId: string
  sourceUrl: string | null
  rawDescriptionLength: number
}

interface RescrapeResult {
  steps: string[]
  failures: string[]
  scoreTotal: number
  descriptionsGenerated: boolean
  validationWarnings: number
  galleryCount: number
  flavorReasoning: string | null
  factsCount: number
  rawDescriptionLength: number
}

export function SourcePanel({ productId, sourceUrl, rawDescriptionLength }: SourcePanelProps) {
  const [rescraping, setRescraping] = useState(false)
  const [overrideUrl, setOverrideUrl] = useState('')
  const [status, setStatus] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<RescrapeResult | null>(null)

  const effectiveUrl = sourceUrl ?? null

  async function onRescrape() {
    if (!effectiveUrl && !overrideUrl.trim()) {
      setError('Produkt nemá uloženou zdrojovou URL. Zadej ji níže.')
      return
    }
    setRescraping(true)
    setError(null)
    setStatus(null)
    setResult(null)
    try {
      const res = await fetch(`/api/admin/products/${productId}/rescrape`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(overrideUrl.trim() ? { url: overrideUrl.trim() } : {}),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Rescrape selhal')
      setResult({
        steps: data.steps ?? [],
        failures: data.failures ?? [],
        scoreTotal: data.scoreTotal ?? 0,
        descriptionsGenerated: !!data.descriptionsGenerated,
        validationWarnings: data.validationWarnings ?? 0,
        galleryCount: data.galleryCount ?? 0,
        flavorReasoning: data.flavorReasoning ?? null,
        factsCount: data.factsCount ?? 0,
        rawDescriptionLength: data.rawDescriptionLength ?? 0,
      })
      // Hard reload — client-side components (ProductForm, GalleryManager) cache
      // their initial props in useState, so router.refresh() alone doesn't update them.
      // Wait 2s so the result panel is visible with Score/steps before reload.
      setTimeout(() => {
        window.location.reload()
      }, 2000)
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
          className="bg-olive text-white rounded-full px-5 py-2 text-[13px] font-medium hover:bg-olive-dark disabled:opacity-40 transition-colors"
        >
          {rescraping ? '🔄 Zpracovávám... (30-45s)' : '🔄 Rescrape — zaktualizuj vše'}
        </button>
        <span className="text-[11px] text-text3 leading-tight flex-1">
          <strong>Stáhne text, fakta, Score, chuť, popisy i galerii</strong> — jedním kliknutím.
          Poté si jen vybereš fotky z galerie. Trvá ~30-45 s.
        </span>
      </div>

      {status && (
        <div className="mt-3 text-xs text-olive-dark bg-olive-bg border border-olive-border rounded-lg px-3 py-2">
          {status}
        </div>
      )}

      {result && (
        <div className="mt-4 border border-olive-border bg-olive-bg/50 rounded-lg p-4 space-y-3">
          <div className="flex items-center justify-between gap-4">
            <div className="text-[13px] font-semibold text-olive-dark">
              ✓ Rescrape dokončen
            </div>
            <div className="text-[11px] text-text3">
              Score: <strong className="text-text">{result.scoreTotal}/100</strong>
              {' · '}
              raw: <strong className="text-text">{result.rawDescriptionLength}</strong> znaků
              {' · '}
              fakta: <strong className="text-text">{result.factsCount}</strong>
              {' · '}
              galerie: <strong className="text-text">{result.galleryCount}</strong>
            </div>
          </div>

          {result.steps.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {result.steps.map((step, i) => (
                <span
                  key={i}
                  className="text-[11px] bg-white border border-olive-border text-olive-dark rounded px-2 py-0.5"
                >
                  ✓ {step}
                </span>
              ))}
            </div>
          )}

          {result.flavorReasoning && (
            <div className="text-[12px] text-text2 bg-white rounded border border-off2 px-3 py-2">
              <strong className="text-text">Chuť (AI odhad):</strong> {result.flavorReasoning}
            </div>
          )}

          {result.descriptionsGenerated && (
            <div className="text-[12px]">
              {result.validationWarnings === 0 ? (
                <span className="text-olive-dark">
                  ✓ AI popisy vygenerovány čistě (žádné vata-fráze)
                </span>
              ) : (
                <span className="text-terra">
                  ⚠ AI popisy vygenerovány, ale obsahují {result.validationWarnings} vata-frází —
                  zkontroluj v sekci &ldquo;Základní údaje&rdquo; níže.
                </span>
              )}
            </div>
          )}

          {result.failures.length > 0 && (
            <div className="text-[12px] text-red-700 bg-red-50 border border-red-200 rounded px-3 py-2">
              <strong>Některé kroky selhaly:</strong>
              <ul className="mt-1 list-disc list-inside">
                {result.failures.map((f, i) => (
                  <li key={i}>{f}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="text-[11px] text-text3 pt-2 border-t border-olive-border">
            <strong>Další krok:</strong> sjeď dolů do sekce &ldquo;Galerie fotek&rdquo;
            a zaškrtni které fotky chceš zachovat. Nezaškrtnuté se po uložení smažou.
          </div>
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
