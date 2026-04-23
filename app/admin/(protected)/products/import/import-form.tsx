'use client'

import { useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'

interface Scraped {
  url: string
  domain: string
  name: string | null
  ean: string | null
  brand: string | null
  slug: string | null
  type: string | null
  originCountry: string | null
  originRegion: string | null
  volumeMl: number | null
  packaging: string | null
  acidity: number | null
  polyphenols: number | null
  price: number | null
  currency: string | null
  imageUrl: string | null
  descriptionShort: string | null
  rawDescription: string | null
}

export function ImportForm() {
  const router = useRouter()
  const [url, setUrl] = useState('')
  const [scraping, setScraping] = useState(false)
  const [data, setData] = useState<Scraped | null>(null)
  const [saving, setSaving] = useState(false)
  const [savingStage, setSavingStage] = useState<string>('')
  const [error, setError] = useState<string | null>(null)

  async function onScrape(e: FormEvent) {
    e.preventDefault()
    setScraping(true)
    setError(null)
    setData(null)
    try {
      const res = await fetch('/api/admin/products/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url.trim() }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Scraping selhal')
      setData(json.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Chyba sítě')
    } finally {
      setScraping(false)
    }
  }

  async function onUse() {
    if (!data) return
    if (!data.name || !data.slug) {
      setError('Chybí název nebo slug — oprav a spusť znovu')
      return
    }
    // EAN is optional — farm-direct / boutique products often don't have one.
    // Admin can fill it in later if needed.

    setSaving(true)
    setError(null)
    setSavingStage('Vytvářím produkt v databázi...')
    try {
      const body = {
        ean: data.ean,
        name: data.name,
        slug: data.slug,
        nameShort: data.brand || undefined,
        originCountry: data.originCountry,
        originRegion: data.originRegion,
        type: data.type || 'evoo',
        volumeMl: data.volumeMl,
        packaging: data.packaging,
        acidity: data.acidity,
        polyphenols: data.polyphenols,
        descriptionShort: data.descriptionShort,
        descriptionLong: data.rawDescription,
        status: 'draft',
      }
      const res = await fetch('/api/admin/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Uložení selhalo')

      // Await image download so the user lands on a page with the image already set.
      if (data.imageUrl && json.id) {
        setSavingStage('Stahuji a konvertuji fotku (10-20s)...')
        try {
          const controller = new AbortController()
          const timeout = setTimeout(() => controller.abort(), 25_000)
          const imgRes = await fetch(`/api/admin/products/${json.id}/fetch-image`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ manualUrl: data.imageUrl }),
            signal: controller.signal,
          })
          clearTimeout(timeout)
          if (!imgRes.ok) {
            const imgData = await imgRes.json().catch(() => ({}))
            console.warn('Image download failed:', imgData.error)
          }
        } catch (err) {
          console.warn('Image fetch aborted or failed:', err)
        }
      }

      setSavingStage('Přesměrovávám...')
      router.push(`/admin/products/${json.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Chyba sítě')
      setSaving(false)
      setSavingStage('')
    }
  }

  return (
    <div className="max-w-3xl">
      {/* URL input */}
      <form onSubmit={onScrape} className="bg-white border border-off2 rounded-[var(--radius-card)] p-6 mb-4">
        <label className="block text-sm font-semibold text-text mb-2">URL produktu</label>
        <div className="flex gap-2">
          <input
            type="url"
            value={url}
            onChange={e => setUrl(e.target.value)}
            placeholder="https://shop.reckonasbavi.cz/..."
            className="flex-1 px-3 py-2.5 border border-off2 rounded-lg text-sm focus:outline-none focus:border-olive"
            required
          />
          <button
            type="submit"
            disabled={scraping || !url.trim()}
            className="bg-olive text-white rounded-lg px-6 py-2.5 text-sm font-medium hover:bg-olive-dark disabled:opacity-40 transition-colors whitespace-nowrap"
          >
            {scraping ? 'Scrapuji...' : 'Načíst data'}
          </button>
        </div>
      </form>

      {error && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3 mb-4">
          ⚠ {error}
        </div>
      )}

      {/* Preview */}
      {data && (
        <div className="bg-white border border-off2 rounded-[var(--radius-card)] p-6">
          <div className="flex items-start gap-5 mb-5">
            {data.imageUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={data.imageUrl}
                alt={data.name ?? 'Produkt'}
                className="w-32 h-32 object-contain bg-off rounded-lg shrink-0"
              />
            )}
            <div className="flex-1">
              <div className="text-[11px] font-semibold tracking-wider uppercase text-text3 mb-1">
                Zdroj: {data.domain}
              </div>
              <h2 className="text-lg font-medium text-text mb-1">{data.name ?? '—'}</h2>
              <div className="text-sm text-text2 mb-2">
                {data.brand ?? '—'} &middot; {data.originRegion ?? ''} {data.originCountry ?? ''} &middot; {data.volumeMl ? `${data.volumeMl} ml` : '—'}
              </div>
              <div className="text-sm text-text2">
                Cena: <strong>{data.price ? `${data.price} ${data.currency ?? 'CZK'}` : '—'}</strong>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-5">
            <Cell label="EAN" value={data.ean} missing="chybí (OK — farm direct)" />
            <Cell label="Typ" value={data.type} />
            <Cell label="Kyselost" value={data.acidity ? `${data.acidity}%` : null} />
            <Cell label="Polyfenoly" value={data.polyphenols ? `${data.polyphenols} mg/kg` : null} />
            <Cell label="Obal" value={data.packaging} />
            <Cell label="Slug" value={data.slug} mono />
          </div>

          {data.descriptionShort && (
            <div className="mb-3">
              <div className="text-xs font-medium text-text2 mb-1">Popis z e-shopu</div>
              <div className="text-[13px] text-text bg-off rounded-lg p-3 leading-relaxed">
                {data.descriptionShort}
              </div>
            </div>
          )}

          <div className="border-t border-off pt-4 flex items-center justify-between">
            <div className="text-xs text-text3">
              Vytvoří se <strong>draft</strong> — po uložení zkontroluj a vyplň chybějící pole.
              Pak můžeš spustit <strong>✨ Přepsat AI</strong> pro unikátní SEO texty.
            </div>
            <button
              type="button"
              onClick={onUse}
              disabled={saving}
              className="bg-olive text-white rounded-full px-5 py-2.5 text-sm font-medium hover:bg-olive-dark disabled:opacity-40 transition-colors whitespace-nowrap"
            >
              {saving ? (savingStage || 'Ukládám...') : '✓ Použít a vytvořit produkt'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function Cell({
  label,
  value,
  missing,
  mono,
}: {
  label: string
  value: string | null
  missing?: string
  mono?: boolean
}) {
  return (
    <div className="bg-off rounded-lg px-3 py-2">
      <div className="text-[10px] text-text3 uppercase tracking-wider mb-0.5">{label}</div>
      {value ? (
        <div className={`text-sm text-text ${mono ? 'font-mono text-xs' : ''}`}>{value}</div>
      ) : (
        <div className="text-sm text-terra italic">{missing ?? 'chybí'}</div>
      )}
    </div>
  )
}
