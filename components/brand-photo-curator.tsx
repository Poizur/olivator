'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'

export interface CuratorPhoto {
  id: string
  url: string
  alt_text: string | null
  caption: string | null
  subject: string | null
  suggested_role: string | null
  image_role: string // 'logo' | 'hero' | 'editorial' | 'gallery'
  sort_order: number
  status: string // 'active' | 'inactive'
}

interface Props {
  entityId: string
  entityType: 'brand'
  initialPhotos: CuratorPhoto[]
}

type RoleSlot = 'logo' | 'hero' | 'editorial' | 'gallery' | 'hidden'

const ROLE_LABELS: Record<RoleSlot, string> = {
  logo: '🏷️ Logo',
  hero: '🌅 Hero (top)',
  editorial: '📖 Editorial',
  gallery: '🖼️ Galerie',
  hidden: '🚫 Skrýt',
}

const ROLE_HINTS: Record<RoleSlot, string> = {
  logo: 'Značkové logo, render contain',
  hero: 'Velká fotka úplně nahoře (1×)',
  editorial: 'Vložená do textu článku po sekcích (## H2)',
  gallery: 'Atmosférická galerie dole',
  hidden: 'Soft-smazat — nezobrazí se',
}

function photoToSlot(p: CuratorPhoto): RoleSlot {
  if (p.status !== 'active') return 'hidden'
  if (p.image_role === 'logo') return 'logo'
  if (p.image_role === 'hero') return 'hero'
  if (p.image_role === 'editorial') return 'editorial'
  return 'gallery'
}

interface PhotoEdit {
  role: RoleSlot
  sortOrder: number
  caption: string
}

export function BrandPhotoCurator({ entityId, entityType, initialPhotos }: Props) {
  const router = useRouter()
  const [edits, setEdits] = useState<Record<string, PhotoEdit>>(() => {
    const map: Record<string, PhotoEdit> = {}
    for (const p of initialPhotos) {
      map[p.id] = { role: photoToSlot(p), sortOrder: p.sort_order, caption: p.caption ?? '' }
    }
    return map
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  const grouped = useMemo(() => {
    const out: Record<RoleSlot, CuratorPhoto[]> = {
      logo: [],
      hero: [],
      editorial: [],
      gallery: [],
      hidden: [],
    }
    const byId = new Map(initialPhotos.map((p) => [p.id, p]))
    for (const [id, edit] of Object.entries(edits)) {
      const p = byId.get(id)
      if (p) out[edit.role].push(p)
    }
    // Sort within slot by current sort_order
    for (const k of Object.keys(out) as RoleSlot[]) {
      out[k].sort((a, b) => (edits[a.id]?.sortOrder ?? 0) - (edits[b.id]?.sortOrder ?? 0))
    }
    return out
  }, [edits, initialPhotos])

  function setRole(id: string, role: RoleSlot) {
    setEdits((prev) => ({ ...prev, [id]: { ...prev[id], role } }))
    setSaved(false)
  }

  function setCaption(id: string, caption: string) {
    setEdits((prev) => ({ ...prev, [id]: { ...prev[id], caption } }))
    setSaved(false)
  }

  function moveUp(id: string, slot: RoleSlot) {
    const photosInSlot = grouped[slot]
    const idx = photosInSlot.findIndex((p) => p.id === id)
    if (idx <= 0) return
    const above = photosInSlot[idx - 1]
    const myOrder = edits[id].sortOrder
    const aboveOrder = edits[above.id].sortOrder
    setEdits((prev) => ({
      ...prev,
      [id]: { ...prev[id], sortOrder: aboveOrder },
      [above.id]: { ...prev[above.id], sortOrder: myOrder },
    }))
    setSaved(false)
  }

  function moveDown(id: string, slot: RoleSlot) {
    const photosInSlot = grouped[slot]
    const idx = photosInSlot.findIndex((p) => p.id === id)
    if (idx === -1 || idx >= photosInSlot.length - 1) return
    const below = photosInSlot[idx + 1]
    const myOrder = edits[id].sortOrder
    const belowOrder = edits[below.id].sortOrder
    setEdits((prev) => ({
      ...prev,
      [id]: { ...prev[id], sortOrder: belowOrder },
      [below.id]: { ...prev[below.id], sortOrder: myOrder },
    }))
    setSaved(false)
  }

  async function save() {
    setSaving(true)
    setError(null)
    try {
      // Normalizace sort_order — přepočítáme do bloků: hero=1, editorial=10..19, gallery=20+
      const blockBase: Record<RoleSlot, number> = { logo: 0, hero: 1, editorial: 10, gallery: 20, hidden: 0 }
      const counters: Record<RoleSlot, number> = { logo: 0, hero: 0, editorial: 0, gallery: 0, hidden: 0 }
      const updates = Object.entries(edits)
        .map(([id, e]) => {
          const sort_order = blockBase[e.role] + counters[e.role]++
          return {
            id,
            image_role: e.role === 'hidden' ? 'gallery' : e.role,
            status: e.role === 'hidden' ? 'inactive' : 'active',
            sort_order,
            caption: e.caption || null,
          }
        })
        .sort((a, b) => a.sort_order - b.sort_order)

      const res = await fetch(`/api/admin/${entityType}s/${entityId}/photos`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ updates }),
      })
      const json = await res.json()
      if (!res.ok || !json.ok) throw new Error(json.error ?? 'Save selhal')
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Chyba')
    } finally {
      setSaving(false)
    }
  }

  const totalActive = Object.entries(edits).filter(([, e]) => e.role !== 'hidden').length

  return (
    <div className="bg-white border border-off2 rounded-xl p-5">
      <div className="flex items-start justify-between gap-3 flex-wrap mb-4">
        <div>
          <h3 className="text-[14px] font-semibold text-text">🎨 Curator: galerie z webu výrobce</h3>
          <p className="text-[12px] text-text2 mt-0.5">
            AI popisla a roztřídila {initialPhotos.length} fotek. Uprav role + pořadí. Aktivních: <strong>{totalActive}</strong>.
          </p>
        </div>
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className={`px-4 py-2 rounded-full text-[12px] font-medium transition-colors ${
            saved
              ? 'bg-olive-bg text-olive-dark border border-olive-border'
              : 'bg-olive text-white hover:bg-olive2 disabled:opacity-50'
          }`}
        >
          {saving ? '⏳ Ukládám…' : saved ? '✓ Uloženo' : '💾 Uložit změny'}
        </button>
      </div>

      {error && (
        <div className="text-[12px] text-red-700 bg-red-50 border border-red-200 rounded px-2 py-1.5 mb-3">
          ⚠ {error}
        </div>
      )}

      {(['hero', 'editorial', 'gallery', 'logo', 'hidden'] as RoleSlot[]).map((slot) => {
        const photos = grouped[slot]
        if (photos.length === 0 && slot !== 'hero' && slot !== 'editorial') return null
        return (
          <div key={slot} className="mb-5">
            <div className="flex items-baseline gap-2 mb-2">
              <h4 className="text-[12px] font-semibold text-text uppercase tracking-wider">
                {ROLE_LABELS[slot]} <span className="text-text3 font-normal">· {photos.length}</span>
              </h4>
              <span className="text-[10px] text-text3">{ROLE_HINTS[slot]}</span>
            </div>
            {photos.length === 0 ? (
              <p className="text-[11px] text-text3 italic px-1">— prázdné —</p>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {photos.map((p, idx) => (
                  <PhotoCard
                    key={p.id}
                    photo={p}
                    edit={edits[p.id]}
                    isFirst={idx === 0}
                    isLast={idx === photos.length - 1}
                    onChangeRole={(r) => setRole(p.id, r)}
                    onChangeCaption={(c) => setCaption(p.id, c)}
                    onMoveUp={() => moveUp(p.id, slot)}
                    onMoveDown={() => moveDown(p.id, slot)}
                  />
                ))}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

function PhotoCard({
  photo,
  edit,
  isFirst,
  isLast,
  onChangeRole,
  onChangeCaption,
  onMoveUp,
  onMoveDown,
}: {
  photo: CuratorPhoto
  edit: PhotoEdit
  isFirst: boolean
  isLast: boolean
  onChangeRole: (role: RoleSlot) => void
  onChangeCaption: (caption: string) => void
  onMoveUp: () => void
  onMoveDown: () => void
}) {
  const role = edit.role
  return (
    <div className={`bg-off rounded-lg overflow-hidden border ${role === 'hidden' ? 'border-off2 opacity-60' : 'border-off2'}`}>
      <div className="aspect-[4/3] relative bg-white">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={photo.url}
          alt={edit.caption || photo.alt_text || ''}
          className={`absolute inset-0 w-full h-full ${role === 'logo' ? 'object-contain p-3' : 'object-cover'}`}
        />
        {(role === 'editorial' || role === 'hero' || role === 'gallery') && (
          <div className="absolute top-1 right-1 flex gap-1">
            <button
              type="button"
              onClick={onMoveUp}
              disabled={isFirst}
              title="Posunout výš"
              className="w-6 h-6 rounded-full bg-white/90 text-text2 hover:text-olive disabled:opacity-30 text-[12px] leading-6 text-center"
            >
              ↑
            </button>
            <button
              type="button"
              onClick={onMoveDown}
              disabled={isLast}
              title="Posunout níž"
              className="w-6 h-6 rounded-full bg-white/90 text-text2 hover:text-olive disabled:opacity-30 text-[12px] leading-6 text-center"
            >
              ↓
            </button>
          </div>
        )}
      </div>
      <div className="p-2">
        <input
          value={edit.caption}
          onChange={(e) => onChangeCaption(e.target.value)}
          placeholder="popisek (1 věta)"
          className="w-full text-[11px] text-text leading-snug bg-transparent border-0 px-0 py-1 focus:outline-none focus:ring-0"
        />
        <select
          value={role}
          onChange={(e) => onChangeRole(e.target.value as RoleSlot)}
          className="w-full text-[11px] text-text2 bg-white border border-off2 rounded px-1.5 py-1 mt-1 focus:outline-none focus:border-olive"
        >
          <option value="hero">🌅 Hero</option>
          <option value="editorial">📖 Editorial</option>
          <option value="gallery">🖼️ Galerie</option>
          <option value="logo">🏷️ Logo</option>
          <option value="hidden">🚫 Skrýt</option>
        </select>
        {photo.subject && (
          <div className="text-[9px] text-text3 mt-1">AI tag: {photo.subject}</div>
        )}
      </div>
    </div>
  )
}
