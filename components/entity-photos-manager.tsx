'use client'

// Správa fotek entity (region/brand/cultivar) v admin.
// Umožňuje přidat URL, nastavit hlavní, editovat alt text, odebrat.

import { useState, useTransition } from 'react'
import { Star, Trash2, Pencil, Check, X, Plus, Loader2 } from 'lucide-react'

interface Photo {
  id: string
  url: string
  alt_text: string | null
  is_primary: boolean
  sort_order: number
  source: string | null
  source_attribution: string | null
  width: number | null
  height: number | null
}

interface Props {
  entityId: string
  entityType: 'region' | 'brand' | 'cultivar'
  initialPhotos: Photo[]
}

export function EntityPhotosManager({ entityId, entityType, initialPhotos }: Props) {
  const [photos, setPhotos] = useState<Photo[]>(initialPhotos)
  const [addUrl, setAddUrl] = useState('')
  const [addAlt, setAddAlt] = useState('')
  const [addError, setAddError] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editAlt, setEditAlt] = useState('')
  const [isPending, startTransition] = useTransition()
  const [busyId, setBusyId] = useState<string | null>(null)

  async function addPhoto() {
    if (!addUrl.trim()) return
    setAddError(null)
    startTransition(async () => {
      const res = await fetch('/api/admin/entity-images', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entityId, entityType, url: addUrl.trim(), altText: addAlt.trim() || undefined }),
      })
      const json = await res.json()
      if (!json.ok) { setAddError(json.error ?? 'Chyba'); return }
      setPhotos((prev) => [...prev, json.photo as Photo])
      setAddUrl('')
      setAddAlt('')
    })
  }

  async function setPrimary(id: string) {
    setBusyId(id)
    const res = await fetch(`/api/admin/entity-images/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isPrimary: true }),
    })
    const json = await res.json()
    if (json.ok) {
      setPhotos((prev) => prev.map((p) => ({ ...p, is_primary: p.id === id })))
    }
    setBusyId(null)
  }

  async function saveAlt(id: string) {
    setBusyId(id)
    const res = await fetch(`/api/admin/entity-images/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ altText: editAlt }),
    })
    const json = await res.json()
    if (json.ok) {
      setPhotos((prev) => prev.map((p) => p.id === id ? { ...p, alt_text: editAlt } : p))
      setEditingId(null)
    }
    setBusyId(null)
  }

  async function removePhoto(id: string) {
    if (!confirm('Odebrat fotku?')) return
    setBusyId(id)
    const res = await fetch(`/api/admin/entity-images/${id}`, { method: 'DELETE' })
    const json = await res.json()
    if (json.ok) setPhotos((prev) => prev.filter((p) => p.id !== id))
    setBusyId(null)
  }

  return (
    <div className="border-t border-off2 pt-6 mt-8 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-text">Fotky ({photos.length})</h3>
        <p className="text-xs text-text3">★ = hlavní fotka (zobrazí se v kartě)</p>
      </div>

      {/* Grid fotek */}
      {photos.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {photos.map((p) => (
            <div
              key={p.id}
              className={`relative rounded-xl border overflow-hidden group ${
                p.is_primary ? 'border-olive ring-1 ring-olive' : 'border-off2'
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={p.url}
                alt={p.alt_text ?? ''}
                className="w-full aspect-video object-cover"
              />

              {p.is_primary && (
                <span className="absolute top-1.5 left-1.5 bg-olive text-white text-[10px] font-bold px-1.5 py-0.5 rounded flex items-center gap-1">
                  <Star size={9} strokeWidth={2.5} />
                  Hlavní
                </span>
              )}

              {/* Akce — viditelné na hover */}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-end gap-1.5 p-2">
                {!p.is_primary && (
                  <button
                    onClick={() => setPrimary(p.id)}
                    disabled={busyId === p.id}
                    title="Nastavit jako hlavní"
                    className="w-7 h-7 bg-white rounded-full flex items-center justify-center hover:bg-olive hover:text-white transition-colors"
                  >
                    <Star size={13} strokeWidth={2} />
                  </button>
                )}
                <button
                  onClick={() => { setEditingId(p.id); setEditAlt(p.alt_text ?? '') }}
                  title="Editovat alt text"
                  className="w-7 h-7 bg-white rounded-full flex items-center justify-center hover:bg-olive hover:text-white transition-colors"
                >
                  <Pencil size={12} strokeWidth={2} />
                </button>
                <button
                  onClick={() => removePhoto(p.id)}
                  disabled={busyId === p.id}
                  title="Odebrat"
                  className="w-7 h-7 bg-white rounded-full flex items-center justify-center hover:bg-terra hover:text-white transition-colors"
                >
                  {busyId === p.id ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} strokeWidth={2} />}
                </button>
              </div>

              {/* Editace alt textu */}
              {editingId === p.id && (
                <div className="absolute inset-0 bg-white/95 p-2 flex flex-col gap-1.5">
                  <label className="text-[10px] font-medium text-text2">Alt text (SEO)</label>
                  <input
                    value={editAlt}
                    onChange={(e) => setEditAlt(e.target.value)}
                    className="border border-off2 rounded px-2 py-1 text-xs flex-1 outline-none focus:border-olive"
                    placeholder="Popis fotky…"
                    autoFocus
                  />
                  <div className="flex gap-1.5">
                    <button
                      onClick={() => saveAlt(p.id)}
                      disabled={busyId === p.id}
                      className="flex-1 bg-olive text-white rounded text-[11px] py-1 flex items-center justify-center gap-1"
                    >
                      {busyId === p.id ? <Loader2 size={11} className="animate-spin" /> : <Check size={11} />}
                      Uložit
                    </button>
                    <button
                      onClick={() => setEditingId(null)}
                      className="w-7 bg-off rounded flex items-center justify-center"
                    >
                      <X size={12} />
                    </button>
                  </div>
                </div>
              )}

              {/* Alt text label */}
              {editingId !== p.id && p.alt_text && (
                <div className="px-2 py-1 bg-off text-[10px] text-text3 truncate">
                  {p.alt_text}
                </div>
              )}
              {editingId !== p.id && !p.alt_text && (
                <div className="px-2 py-1 bg-terra-bg text-[10px] text-terra truncate">
                  ⚠ Chybí alt text
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-text3 italic py-4 text-center border border-dashed border-off2 rounded-xl">
          Žádné fotky. Přidej URL níže nebo spusť Unsplash import.
        </p>
      )}

      {/* Přidat novou fotku */}
      <div className="border border-off2 rounded-xl p-4 space-y-2.5 bg-off/30">
        <p className="text-xs font-medium text-text2">Přidat fotku podle URL</p>
        <input
          value={addUrl}
          onChange={(e) => setAddUrl(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && addPhoto()}
          className="w-full border border-off2 rounded-lg px-3 py-2 text-sm text-text outline-none focus:border-olive"
          placeholder="https://images.unsplash.com/... nebo Wikimedia URL"
        />
        <input
          value={addAlt}
          onChange={(e) => setAddAlt(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && addPhoto()}
          className="w-full border border-off2 rounded-lg px-3 py-2 text-sm text-text outline-none focus:border-olive"
          placeholder="Alt text (volitelné, ale doporučené pro SEO)"
        />
        {addError && <p className="text-xs text-terra">{addError}</p>}
        <button
          onClick={addPhoto}
          disabled={!addUrl.trim() || isPending}
          className="flex items-center gap-1.5 bg-olive text-white rounded-full px-4 py-1.5 text-sm font-medium disabled:opacity-40 hover:bg-olive-dark transition-colors"
        >
          {isPending ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
          Přidat fotku
        </button>
      </div>
    </div>
  )
}
