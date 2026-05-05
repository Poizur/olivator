'use client'

import { useState, useMemo, useCallback, type ChangeEvent, type DragEvent } from 'react'
import { useRouter } from 'next/navigation'

interface ExistingPhoto {
  id: string
  url: string
  alt_text: string | null
  caption: string | null
  image_role: string
  sort_order: number
  width: number | null
  height: number | null
  status: string
}

interface SectionSpec {
  key: string // unique slot ID — 'logo' | 'hero' | 'editorial-0' | 'gallery'
  section: 'logo' | 'hero' | 'editorial' | 'gallery'
  index: number | null // editorial index, jinak null
  title: string
  bodyPreview: string | null
  hint: string
  isMulti?: boolean // gallery má víc fotek
}

interface Props {
  brandId: string
  brandSlug: string
  brandName: string
  descriptionLong: string | null
  initialPhotos: ExistingPhoto[]
}

// Re-implement simple section splitter (not import server-only fn)
function parseSections(text: string | null): Array<{ title: string; body: string }> {
  if (!text) return []
  const trimmed = text.trim()
  if (!trimmed.includes('## ')) {
    return [{ title: 'Detail', body: trimmed }]
  }
  const lines = text.split('\n')
  const sections: Array<{ title: string; body: string }> = []
  let currentTitle: string | null = null
  let currentBody: string[] = []
  const flush = () => {
    if (currentTitle && currentBody.length > 0) {
      sections.push({ title: currentTitle, body: currentBody.join('\n').trim() })
    }
  }
  for (const line of lines) {
    if (line.startsWith('## ')) {
      flush()
      currentTitle = line.slice(3).trim()
      currentBody = []
    } else if (currentTitle) {
      currentBody.push(line)
    }
  }
  flush()
  return sections.filter((s) => s.body.length > 0)
}

export function BrandPhotoSections({
  brandId,
  brandSlug,
  brandName,
  descriptionLong,
  initialPhotos,
}: Props) {
  const router = useRouter()
  const [photos, setPhotos] = useState<ExistingPhoto[]>(() =>
    initialPhotos.filter((p) => p.status === 'active')
  )
  const [uploading, setUploading] = useState<Record<string, boolean>>({})
  const [errors, setErrors] = useState<Record<string, string | null>>({})
  const [success, setSuccess] = useState<Record<string, string | null>>({})

  const sections = useMemo(() => parseSections(descriptionLong), [descriptionLong])

  const slotSpecs = useMemo<SectionSpec[]>(() => {
    const specs: SectionSpec[] = [
      {
        key: 'logo',
        section: 'logo',
        index: null,
        title: 'Logo značky',
        bodyPreview: null,
        hint: 'PNG / SVG / WebP. Render na bílém pozadí (object-contain).',
      },
      {
        key: 'hero',
        section: 'hero',
        index: null,
        title: 'Hero — top of page',
        bodyPreview: null,
        hint: 'Wide landscape (16:9). Atmosférický snímek nahoře.',
      },
    ]
    sections.forEach((s, i) => {
      specs.push({
        key: `editorial-${i}`,
        section: 'editorial',
        index: i,
        title: s.title,
        bodyPreview: s.body.slice(0, 280),
        hint: 'Vložená do textu této sekce. Ideálně portrait nebo medium shot.',
      })
    })
    specs.push({
      key: 'gallery',
      section: 'gallery',
      index: null,
      title: 'Galerie atmosféry',
      bodyPreview: null,
      hint: 'Více fotek v gridu dole. Atmosféra, výroba, lidé, místa.',
      isMulti: true,
    })
    return specs
  }, [sections])

  const photosBySlot = useMemo(() => {
    const map = new Map<string, ExistingPhoto[]>()
    for (const p of photos) {
      let key: string | null = null
      if (p.image_role === 'logo') key = 'logo'
      else if (p.image_role === 'hero') key = 'hero'
      else if (p.image_role === 'editorial') {
        const idx = p.sort_order - 10
        if (idx >= 0 && idx < sections.length) key = `editorial-${idx}`
      } else if (p.image_role === 'gallery') key = 'gallery'
      if (!key) continue
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(p)
    }
    return map
  }, [photos, sections])

  const upload = useCallback(
    async (slot: SectionSpec, file: File) => {
      const key = slot.key
      setUploading((p) => ({ ...p, [key]: true }))
      setErrors((p) => ({ ...p, [key]: null }))
      setSuccess((p) => ({ ...p, [key]: null }))
      try {
        const fd = new FormData()
        fd.append('file', file)
        fd.append('section', slot.section)
        if (slot.index !== null) fd.append('sectionIndex', String(slot.index))
        if (slot.bodyPreview) fd.append('sectionTitle', slot.title)
        const res = await fetch(`/api/admin/brands/${brandSlug}/photo-upload`, {
          method: 'POST',
          body: fd,
        })
        const data = await res.json()
        if (!res.ok || !data.ok) throw new Error(data.error ?? 'Upload selhal')
        const newPhoto = data.photo as ExistingPhoto
        // Pro unique sekce odstraň starou (deactivováno serverem už, ale UI taky)
        setPhotos((prev) => {
          const filtered =
            slot.section === 'gallery'
              ? prev
              : prev.filter((p) => {
                  if (slot.section === 'logo' && p.image_role === 'logo') return false
                  if (slot.section === 'hero' && p.image_role === 'hero') return false
                  if (
                    slot.section === 'editorial' &&
                    p.image_role === 'editorial' &&
                    p.sort_order === 10 + (slot.index ?? 0)
                  ) {
                    return false
                  }
                  return true
                })
          return [...filtered, newPhoto]
        })
        const dbg = data.debug as
          | { compressionRatio?: number; finalBytes?: number; width?: number; height?: number }
          | undefined
        const sizeKb = dbg?.finalBytes ? Math.round(dbg.finalBytes / 1024) : 0
        setSuccess((p) => ({
          ...p,
          [key]: `✓ Nahráno (${sizeKb} KB, ${dbg?.width}×${dbg?.height}, -${dbg?.compressionRatio ?? 0}%)`,
        }))
        router.refresh()
      } catch (e) {
        setErrors((p) => ({ ...p, [key]: e instanceof Error ? e.message : 'Chyba' }))
      } finally {
        setUploading((p) => ({ ...p, [key]: false }))
        // Auto-clear success po 5s
        setTimeout(() => setSuccess((p) => ({ ...p, [key]: null })), 5000)
      }
    },
    [brandSlug, router]
  )

  const onDelete = useCallback(
    async (photoId: string, slotKey: string) => {
      if (!confirm('Odstranit tuto fotku?')) return
      try {
        const res = await fetch(`/api/admin/brands/${brandSlug}/photo-upload?id=${photoId}`, {
          method: 'DELETE',
        })
        const data = await res.json()
        if (!res.ok || !data.ok) throw new Error(data.error ?? 'Delete selhal')
        setPhotos((prev) => prev.filter((p) => p.id !== photoId))
        router.refresh()
      } catch (e) {
        setErrors((p) => ({ ...p, [slotKey]: e instanceof Error ? e.message : 'Chyba' }))
      }
    },
    [brandSlug, router]
  )

  return (
    <div className="space-y-4">
      <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-[12px] text-amber-900">
        <strong>📸 Jak to funguje:</strong> Každá sekce vlevo má text, vpravo jsou fotky. Nahraješ fotku z disku, server udělá WebP, alt z Vision a uloží. Logo a Hero jsou vždy 1 fotka, editorial 1 per ## sekci, galerie kolik chceš.
      </div>

      {slotSpecs.map((slot) => {
        const slotPhotos = photosBySlot.get(slot.key) ?? []
        return (
          <SectionRow
            key={slot.key}
            slot={slot}
            photos={slotPhotos}
            uploading={uploading[slot.key] ?? false}
            error={errors[slot.key] ?? null}
            success={success[slot.key] ?? null}
            brandName={brandName}
            brandId={brandId}
            onUpload={(file) => upload(slot, file)}
            onDelete={(photoId) => onDelete(photoId, slot.key)}
          />
        )
      })}
    </div>
  )
}

function SectionRow({
  slot,
  photos,
  uploading,
  error,
  success,
  onUpload,
  onDelete,
}: {
  slot: SectionSpec
  photos: ExistingPhoto[]
  uploading: boolean
  error: string | null
  success: string | null
  brandName: string
  brandId: string
  onUpload: (file: File) => void
  onDelete: (photoId: string) => void
}) {
  const sectionColors: Record<string, string> = {
    logo: 'border-l-olive',
    hero: 'border-l-terra',
    editorial: 'border-l-olive-light',
    gallery: 'border-l-text3',
  }
  return (
    <div
      className={`bg-white border border-off2 border-l-4 ${
        sectionColors[slot.section]
      } rounded-xl overflow-hidden`}
    >
      <div className="grid md:grid-cols-2 gap-0">
        {/* LEVÁ — text */}
        <div className="p-5 bg-off/30">
          <div className="text-[10px] font-bold tracking-widest uppercase text-text3 mb-1">
            {slot.section === 'logo' && 'LOGO'}
            {slot.section === 'hero' && 'HERO'}
            {slot.section === 'editorial' && `EDITORIAL #${(slot.index ?? 0) + 1}`}
            {slot.section === 'gallery' && 'GALERIE'}
          </div>
          <h4 className="text-[15px] font-semibold text-text leading-snug mb-2">{slot.title}</h4>
          {slot.bodyPreview && (
            <p className="text-[12px] text-text2 leading-relaxed whitespace-pre-line">
              {slot.bodyPreview}
              {slot.bodyPreview.length >= 280 && '…'}
            </p>
          )}
          <div className="text-[11px] text-text3 mt-2 italic">💡 {slot.hint}</div>
        </div>

        {/* PRAVÁ — fotka(y) */}
        <div className="p-5">
          {slot.isMulti ? (
            <MultiPhotoSlot
              photos={photos}
              uploading={uploading}
              error={error}
              success={success}
              onUpload={onUpload}
              onDelete={onDelete}
            />
          ) : (
            <SinglePhotoSlot
              slot={slot}
              photo={photos[0] ?? null}
              uploading={uploading}
              error={error}
              success={success}
              onUpload={onUpload}
              onDelete={onDelete}
            />
          )}
        </div>
      </div>
    </div>
  )
}

function SinglePhotoSlot({
  slot,
  photo,
  uploading,
  error,
  success,
  onUpload,
  onDelete,
}: {
  slot: SectionSpec
  photo: ExistingPhoto | null
  uploading: boolean
  error: string | null
  success: string | null
  onUpload: (file: File) => void
  onDelete: (photoId: string) => void
}) {
  const [dragActive, setDragActive] = useState(false)

  const onChange = (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (f) onUpload(f)
    e.target.value = ''
  }

  const onDrop = (e: DragEvent<HTMLLabelElement>) => {
    e.preventDefault()
    setDragActive(false)
    const f = e.dataTransfer.files?.[0]
    if (f) onUpload(f)
  }

  return (
    <div>
      {photo ? (
        <div className="space-y-2">
          <div className={`relative bg-off rounded-lg overflow-hidden ${slot.section === 'logo' ? 'aspect-[4/3]' : 'aspect-video'}`}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={photo.url}
              alt={photo.alt_text ?? ''}
              className={`absolute inset-0 w-full h-full ${slot.section === 'logo' ? 'object-contain p-4' : 'object-cover'}`}
            />
          </div>
          {photo.alt_text && (
            <p className="text-[11px] text-text2 leading-snug">
              <span className="text-text3">alt:</span> {photo.alt_text}
            </p>
          )}
          <div className="text-[10px] text-text3">
            {photo.width}×{photo.height}
          </div>
          <div className="flex gap-2">
            <label className="flex-1 cursor-pointer text-center text-[11px] bg-white border border-off2 rounded-md px-3 py-1.5 hover:border-olive hover:text-olive transition-colors">
              <input type="file" accept="image/*" className="hidden" onChange={onChange} disabled={uploading} />
              {uploading ? '⏳ Nahrávám…' : '🔄 Vyměnit'}
            </label>
            <button
              type="button"
              onClick={() => onDelete(photo.id)}
              disabled={uploading}
              className="text-[11px] bg-white border border-off2 rounded-md px-3 py-1.5 text-red-700 hover:border-red-700 transition-colors"
            >
              🗑️
            </button>
          </div>
        </div>
      ) : (
        <label
          onDragOver={(e) => {
            e.preventDefault()
            setDragActive(true)
          }}
          onDragLeave={() => setDragActive(false)}
          onDrop={onDrop}
          className={`block cursor-pointer border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
            dragActive ? 'border-olive bg-olive-bg/30' : 'border-off2 hover:border-olive bg-off/40'
          } ${uploading ? 'opacity-50 cursor-wait' : ''}`}
        >
          <input type="file" accept="image/*" className="hidden" onChange={onChange} disabled={uploading} />
          <div className="text-3xl mb-2">{uploading ? '⏳' : '📤'}</div>
          <div className="text-[13px] font-medium text-text mb-1">
            {uploading ? 'Nahrávám…' : 'Klikni nebo přetáhni fotku'}
          </div>
          <div className="text-[11px] text-text3">JPG / PNG / WebP / HEIC, max 10 MB</div>
        </label>
      )}
      {error && <div className="text-[11px] text-red-700 bg-red-50 border border-red-200 rounded px-2 py-1 mt-2">⚠ {error}</div>}
      {success && <div className="text-[11px] text-olive bg-olive-bg/40 rounded px-2 py-1 mt-2">{success}</div>}
    </div>
  )
}

function MultiPhotoSlot({
  photos,
  uploading,
  error,
  success,
  onUpload,
  onDelete,
}: {
  photos: ExistingPhoto[]
  uploading: boolean
  error: string | null
  success: string | null
  onUpload: (file: File) => void
  onDelete: (photoId: string) => void
}) {
  const [dragActive, setDragActive] = useState(false)

  const onChange = (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files) return
    Array.from(files).forEach(onUpload)
    e.target.value = ''
  }

  const onDrop = (e: DragEvent<HTMLLabelElement>) => {
    e.preventDefault()
    setDragActive(false)
    const files = e.dataTransfer.files
    if (!files) return
    Array.from(files).forEach(onUpload)
  }

  return (
    <div className="space-y-3">
      {photos.length > 0 && (
        <div className="grid grid-cols-2 gap-2">
          {photos.map((p) => (
            <div key={p.id} className="relative aspect-square bg-off rounded-md overflow-hidden group">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.url} alt={p.alt_text ?? ''} className="absolute inset-0 w-full h-full object-cover" />
              <button
                type="button"
                onClick={() => onDelete(p.id)}
                className="absolute top-1 right-1 w-6 h-6 rounded-full bg-white/90 text-red-700 hover:bg-red-50 text-[12px] leading-6 text-center opacity-0 group-hover:opacity-100 transition-opacity"
                title="Smazat"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
      <label
        onDragOver={(e) => {
          e.preventDefault()
          setDragActive(true)
        }}
        onDragLeave={() => setDragActive(false)}
        onDrop={onDrop}
        className={`block cursor-pointer border-2 border-dashed rounded-lg p-4 text-center transition-colors ${
          dragActive ? 'border-olive bg-olive-bg/30' : 'border-off2 hover:border-olive bg-off/40'
        } ${uploading ? 'opacity-50 cursor-wait' : ''}`}
      >
        <input type="file" accept="image/*" multiple className="hidden" onChange={onChange} disabled={uploading} />
        <div className="text-2xl mb-1">{uploading ? '⏳' : '📤'}</div>
        <div className="text-[12px] font-medium text-text">
          {uploading ? 'Nahrávám…' : `+ Přidat fotky (${photos.length} už nahráno)`}
        </div>
        <div className="text-[11px] text-text3 mt-0.5">Můžeš vybrat víc najednou</div>
      </label>
      {error && <div className="text-[11px] text-red-700 bg-red-50 border border-red-200 rounded px-2 py-1">⚠ {error}</div>}
      {success && <div className="text-[11px] text-olive bg-olive-bg/40 rounded px-2 py-1">{success}</div>}
    </div>
  )
}
