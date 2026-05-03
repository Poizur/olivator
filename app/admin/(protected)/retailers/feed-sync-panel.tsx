'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface FeedSyncResult {
  total: number
  oilsInFeed: number
  productsCreated: number
  productsExisting: number
  offersUpserted: number
  skipped: number
  errors: { ean: string; name: string; reason: string }[]
  startedAt: string
  finishedAt: string
}

interface FeedSyncPanelProps {
  retailerId: string
  retailerName: string
  xmlFeedUrl: string | null
  xmlFeedFormat: string | null
  xmlFeedLastSynced: string | null
  xmlFeedLastResult: Record<string, unknown> | null
}

export function FeedSyncPanel({
  retailerId,
  retailerName,
  xmlFeedUrl,
  xmlFeedFormat,
  xmlFeedLastSynced,
  xmlFeedLastResult,
}: FeedSyncPanelProps) {
  const router = useRouter()
  const [syncing, setSyncing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<FeedSyncResult | null>(
    (xmlFeedLastResult as FeedSyncResult | null) ?? null
  )

  const enabled = !!xmlFeedUrl && !!xmlFeedFormat
  const lastSyncedFormatted = xmlFeedLastSynced
    ? new Date(xmlFeedLastSynced).toLocaleString('cs-CZ')
    : null

  async function onSync() {
    setSyncing(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/retailers/${retailerId}/sync-feed`, {
        method: 'POST',
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Sync selhal')
      setResult(data.result as FeedSyncResult)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sync selhal')
    } finally {
      setSyncing(false)
    }
  }

  return (
    <div className="bg-white border border-off2 rounded-[var(--radius-card)] p-6 mb-6">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <div className="text-[10px] font-bold tracking-widest uppercase text-text3 mb-1">— Synchronizace</div>
          <h2 className="text-lg font-semibold text-text">Import z XML feedu</h2>
          <p className="text-[13px] text-text2 mt-1 max-w-2xl">
            Stáhne feed eshopu, naparsuje produkty (filtr na olivové oleje) a uloží
            do DB. <strong>Nové</strong> oleje vytvoří jako draft. <strong>Existující</strong>
            (match přes EAN) jen aktualizuje cenu a dostupnost — vlastní edity v adminu zůstanou.
          </p>
        </div>
        <div className="text-right shrink-0">
          {lastSyncedFormatted && (
            <div className="text-[11px] text-text3">
              Poslední sync: <strong className="text-text2">{lastSyncedFormatted}</strong>
            </div>
          )}
        </div>
      </div>

      {!enabled && (
        <div className="text-[12px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-4">
          ⚠ Vyplň <strong>XML feed URL</strong> a <strong>formát</strong> v sekci 5
          formuláře níže, ulož a vrať se sem.
        </div>
      )}

      <div className="flex items-center gap-3 flex-wrap">
        <button
          type="button"
          onClick={onSync}
          disabled={!enabled || syncing}
          className="bg-olive text-white rounded-full px-5 py-2 text-[13px] font-medium hover:bg-olive2 disabled:opacity-40 transition-colors"
        >
          {syncing ? '🔄 Synchronizuji... (až 5 min)' : `🔄 Synchronizovat XML feed pro ${retailerName}`}
        </button>
        <span className="text-[11px] text-text3 leading-tight">
          Trvá zhruba 1–5 minut podle velikosti feedu.
        </span>
      </div>

      {error && (
        <div className="mt-4 text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          ⚠ {error}
        </div>
      )}

      {result && (
        <div className="mt-4 border border-olive-border bg-olive-bg/40 rounded-lg p-4 space-y-3">
          <div className="flex items-center justify-between gap-4">
            <div className="text-[13px] font-semibold text-olive-dark">
              ✓ Sync dokončen
            </div>
            <div className="text-[11px] text-text3 tabular-nums">
              {new Date(result.finishedAt).toLocaleString('cs-CZ')}
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-[12px]">
            <Stat label="Položek ve feedu" value={result.total} />
            <Stat label="Filtr: oleje" value={result.oilsInFeed} accent="olive" />
            <Stat label="Vytvořeno" value={result.productsCreated} accent="olive" />
            <Stat label="Existujících" value={result.productsExisting} />
            <Stat label="Nabídek upsertnuto" value={result.offersUpserted} accent="olive" />
          </div>

          {result.skipped > 0 && (
            <div className="text-[12px] text-amber-700 bg-amber-50 border border-amber-200 rounded px-3 py-2">
              ⚠ Přeskočeno: <strong>{result.skipped}</strong>
              {' — '}rozbal pro detaily.
              {result.errors.length > 0 && (
                <details className="mt-2">
                  <summary className="cursor-pointer text-[11px] font-medium">
                    {result.errors.length} chyb
                  </summary>
                  <ul className="mt-2 space-y-1 max-h-60 overflow-y-auto">
                    {result.errors.slice(0, 50).map((e, i) => (
                      <li key={i} className="text-[11px] font-mono">
                        <span className="text-text3">EAN {e.ean}</span> · {e.name} ·{' '}
                        <span className="text-amber-700">{e.reason}</span>
                      </li>
                    ))}
                    {result.errors.length > 50 && (
                      <li className="text-[11px] text-text3 italic">
                        … a dalších {result.errors.length - 50}
                      </li>
                    )}
                  </ul>
                </details>
              )}
            </div>
          )}

          {result.productsCreated > 0 && (
            <div className="text-[11px] text-text3 pt-2 border-t border-olive-border">
              <strong>Další krok:</strong> Jdi do{' '}
              <a href="/admin/products?status=draft" className="text-olive underline">
                Produkty → Drafty
              </a>{' '}
              a u nově vytvořených zkontroluj data + spusť rescrape (galerie + AI popis +
              Score). Až budou OK, změň status na „active".
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string
  value: number
  accent?: 'olive'
}) {
  return (
    <div className="bg-white border border-off2 rounded px-3 py-2">
      <div className="text-[10px] uppercase tracking-wider text-text3 mb-0.5">{label}</div>
      <div
        className={`text-lg font-semibold tabular-nums ${
          accent === 'olive' ? 'text-olive-dark' : 'text-text'
        }`}
      >
        {value}
      </div>
    </div>
  )
}
