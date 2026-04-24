'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

interface GalleryImage {
  id: string
  url: string
  alt_text: string | null
  is_primary: boolean
  sort_order: number
  source: string // 'scraper_candidate' | 'scraper' | 'manual'
}

export function GalleryManager({ productId }: { productId: string }) {
  const router = useRouter()
  const [images, setImages] = useState<GalleryImage[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [keep, setKeep] = useState<Set<string>>(new Set())
  const [primaryId, setPrimaryId] = useState<string | null>(null)
  const [status, setStatus] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    void loadImages()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId])

  async function loadImages() {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/products/${productId}/gallery`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      const imgs: GalleryImage[] = data.images ?? []
      setImages(imgs)
      // Pre-check already-approved + first candidate
      const initialKeep = new Set<string>()
      for (const img of imgs) {
        if (img.source === 'scraper' || img.source === 'manual') initialKeep.add(img.id)
      }
      // If no approved yet and we have candidates, pre-check first 5 (reasonable default)
      if (initialKeep.size === 0) {
        for (const img of imgs.slice(0, 5)) initialKeep.add(img.id)
      }
      setKeep(initialKeep)
      const existingPrimary = imgs.find(i => i.is_primary)
      setPrimaryId(existingPrimary?.id ?? imgs[0]?.id ?? null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Chyba')
    } finally {
      setLoading(false)
    }
  }

  function toggleKeep(id: string) {
    setKeep(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
    // If removing primary, unset it
    if (primaryId === id && keep.has(id)) setPrimaryId(null)
  }

  async function onSave() {
    setSaving(true)
    setError(null)
    setStatus(null)
    try {
      const res = await fetch(`/api/admin/products/${productId}/gallery`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          keep: Array.from(keep),
          primary: primaryId,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setStatus(`✓ Uloženo: ${data.kept} ponecháno, ${data.deleted} smazáno`)
      await loadImages()
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Chyba')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="bg-white border border-off2 rounded-[var(--radius-card)] p-6 text-sm text-text3 italic">
        Načítám galerii...
      </div>
    )
  }

  if (images.length === 0) {
    return (
      <div className="bg-white border border-off2 rounded-[var(--radius-card)] p-6">
        <div className="text-sm font-semibold text-text mb-1">Galerie fotek</div>
        <div className="text-xs text-text3 italic mt-2 bg-off rounded-lg px-3 py-3 text-center">
          Žádné obrázky. Klikni &ldquo;🔄 Rescrape&rdquo; nahoře, aby se nascrapovaly ze zdrojového e-shopu.
        </div>
      </div>
    )
  }

  const candidates = images.filter(i => i.source === 'scraper_candidate')
  const approved = images.filter(i => i.source !== 'scraper_candidate')

  return (
    <div className="bg-white border border-off2 rounded-[var(--radius-card)] p-6">
      <div className="flex items-start justify-between mb-4 gap-4">
        <div>
          <div className="text-sm font-semibold text-text">
            Galerie fotek ({images.length})
            {candidates.length > 0 && (
              <span className="ml-2 text-[11px] bg-terra-bg text-terra border border-terra/30 rounded px-2 py-0.5">
                {candidates.length} čeká na výběr
              </span>
            )}
          </div>
          <div className="text-xs text-text3 mt-0.5">
            Zaškrtni které fotky chceš zachovat. První s hvězdičkou bude hlavní.
            Ostatní smažeme.
          </div>
        </div>
        <div className="flex gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setKeep(new Set(images.map(i => i.id)))}
            className="text-[11px] text-olive hover:text-olive-dark"
          >
            Vybrat vše
          </button>
          <span className="text-text3">·</span>
          <button
            type="button"
            onClick={() => setKeep(new Set())}
            className="text-[11px] text-text2 hover:text-terra"
          >
            Zrušit vše
          </button>
        </div>
      </div>

      {approved.length > 0 && (
        <>
          <div className="text-[11px] uppercase tracking-wider text-text3 mb-2">
            Schválené ({approved.length})
          </div>
          <div className="grid grid-cols-4 md:grid-cols-6 gap-3 mb-6">
            {approved.map(img => (
              <ImageTile
                key={img.id}
                img={img}
                checked={keep.has(img.id)}
                isPrimary={primaryId === img.id}
                onToggle={() => toggleKeep(img.id)}
                onMakePrimary={() => setPrimaryId(img.id)}
              />
            ))}
          </div>
        </>
      )}

      {candidates.length > 0 && (
        <>
          <div className="text-[11px] uppercase tracking-wider text-text3 mb-2">
            Nově nascrapované kandidáti ({candidates.length})
          </div>
          <div className="grid grid-cols-4 md:grid-cols-6 gap-3">
            {candidates.map(img => (
              <ImageTile
                key={img.id}
                img={img}
                checked={keep.has(img.id)}
                isPrimary={primaryId === img.id}
                onToggle={() => toggleKeep(img.id)}
                onMakePrimary={() => setPrimaryId(img.id)}
              />
            ))}
          </div>
        </>
      )}

      <div className="mt-6 flex items-center gap-3 flex-wrap">
        <button
          type="button"
          onClick={onSave}
          disabled={saving}
          className="bg-olive text-white rounded-full px-5 py-2 text-[13px] font-medium hover:bg-olive-dark disabled:opacity-40 transition-colors"
        >
          {saving ? 'Ukládám...' : `✓ Uložit výběr (${keep.size})`}
        </button>
        <span className="text-[11px] text-text3">
          Nezaškrtnuté se smažou. Hlavní = označená hvězdičkou ★
        </span>
        {status && (
          <span className="text-[11px] text-olive-dark bg-olive-bg border border-olive-border rounded px-2 py-1">
            {status}
          </span>
        )}
        {error && (
          <span className="text-[11px] text-red-600 bg-red-50 border border-red-200 rounded px-2 py-1">
            ⚠ {error}
          </span>
        )}
      </div>
    </div>
  )
}

function ImageTile({
  img,
  checked,
  isPrimary,
  onToggle,
  onMakePrimary,
}: {
  img: GalleryImage
  checked: boolean
  isPrimary: boolean
  onToggle: () => void
  onMakePrimary: () => void
}) {
  return (
    <div className={`relative rounded-lg overflow-hidden border-2 transition-all ${
      checked ? (isPrimary ? 'border-olive ring-2 ring-olive/30' : 'border-olive') : 'border-off2 opacity-50'
    }`}>
      <button
        type="button"
        onClick={onToggle}
        className="block w-full aspect-square bg-off"
        title={checked ? 'Klikni pro odstranění' : 'Klikni pro zachování'}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={img.url}
          alt={img.alt_text ?? ''}
          className="w-full h-full object-contain"
          loading="lazy"
        />
      </button>

      {/* Checkmark top-left */}
      <div className={`absolute top-1.5 left-1.5 w-5 h-5 rounded border-2 flex items-center justify-center text-[10px] font-bold pointer-events-none ${
        checked ? 'bg-olive border-olive text-white' : 'bg-white/80 border-off2 text-transparent'
      }`}>
        ✓
      </div>

      {/* Primary button top-right */}
      {checked && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onMakePrimary() }}
          className={`absolute top-1.5 right-1.5 w-6 h-6 rounded-full text-[12px] font-bold transition-colors ${
            isPrimary ? 'bg-terra text-white' : 'bg-white/90 text-text2 hover:bg-terra hover:text-white'
          }`}
          title={isPrimary ? 'Hlavní fotka' : 'Nastavit jako hlavní'}
        >
          ★
        </button>
      )}
    </div>
  )
}
