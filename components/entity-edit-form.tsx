'use client'

import { useState } from 'react'

export interface EntityEditData {
  entityType: 'region' | 'brand' | 'cultivar'
  slug: string
  name: string
  status: string
  description_long: string | null
  meta_title: string | null
  meta_description: string | null
  // brand-only
  story?: string | null
  philosophy?: string | null
  website_url?: string | null
}

interface Props {
  entity: EntityEditData
  publicUrl: string
}

export function EntityEditForm({ entity, publicUrl }: Props) {
  const [data, setData] = useState({
    name: entity.name,
    status: entity.status,
    description_long: entity.description_long ?? '',
    meta_title: entity.meta_title ?? '',
    meta_description: entity.meta_description ?? '',
    story: entity.story ?? '',
    philosophy: entity.philosophy ?? '',
    website_url: entity.website_url ?? '',
  })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Content generation state
  const [generating, setGenerating] = useState(false)
  const [genResult, setGenResult] = useState<string | null>(null)

  // Photo import state
  const [importing, setImporting] = useState(false)
  const [photoResult, setPhotoResult] = useState<string | null>(null)

  function set(field: string, value: string) {
    setData((d) => ({ ...d, [field]: value }))
    setSaved(false)
  }

  async function save() {
    setSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/entities', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entityType: entity.entityType, slug: entity.slug, data }),
      })
      const json = await res.json()
      if (!json.ok) throw new Error(json.error)
      setSaved(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Chyba')
    } finally {
      setSaving(false)
    }
  }

  async function generateContent() {
    setGenerating(true)
    setGenResult(null)
    try {
      const res = await fetch('/api/admin/generate-entity-content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entityType: entity.entityType + 's', slug: entity.slug }),
      })
      const json = await res.json()
      const result = json.results?.[0]
      if (result?.ok) {
        setGenResult(`✅ Vygenerováno ${result.chars} znaků — obnovte stránku`)
      } else {
        setGenResult(`❌ ${result?.error ?? 'Chyba'}`)
      }
    } catch (e) {
      setGenResult(`❌ ${e instanceof Error ? e.message : 'Chyba'}`)
    } finally {
      setGenerating(false)
    }
  }

  async function importPhotos() {
    setImporting(true)
    setPhotoResult(null)
    try {
      const res = await fetch('/api/admin/entity-photos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entityType: entity.entityType + 's', slug: entity.slug }),
      })
      const json = await res.json()
      if (json.totalInserted != null) {
        setPhotoResult(`✅ Importováno ${json.totalInserted} fotek`)
      } else {
        setPhotoResult(`❌ ${json.error ?? 'Chyba'}`)
      }
    } catch (e) {
      setPhotoResult(`❌ ${e instanceof Error ? e.message : 'Chyba'}`)
    } finally {
      setImporting(false)
    }
  }

  return (
    <div className="space-y-8">
      {/* Akce */}
      <div className="flex flex-wrap gap-2 p-4 bg-off rounded-xl">
        <button
          onClick={generateContent}
          disabled={generating}
          className="px-4 py-2 bg-olive text-white rounded-lg text-sm font-medium hover:bg-olive2 disabled:opacity-50"
        >
          {generating ? '⏳ Generuji text…' : '✨ Generovat text (AI)'}
        </button>
        <button
          onClick={importPhotos}
          disabled={importing}
          className="px-4 py-2 bg-white border border-off2 text-text rounded-lg text-sm hover:border-olive disabled:opacity-50"
        >
          {importing ? '⏳ Importuji…' : '📷 Import fotek (Unsplash)'}
        </button>
        <a
          href={publicUrl}
          target="_blank"
          className="px-4 py-2 bg-white border border-off2 text-text rounded-lg text-sm hover:border-olive"
        >
          🔗 Náhled
        </a>
      </div>
      {genResult && <p className="text-sm">{genResult}</p>}
      {photoResult && <p className="text-sm">{photoResult}</p>}

      {/* Status */}
      <div>
        <label className="block text-xs font-medium text-text2 mb-1">Status</label>
        <select
          value={data.status}
          onChange={(e) => set('status', e.target.value)}
          className="border border-off2 rounded-lg px-3 py-2 text-sm text-text"
        >
          <option value="draft">draft</option>
          <option value="active">active</option>
          <option value="inactive">inactive</option>
        </select>
      </div>

      {/* Description */}
      <div>
        <label className="block text-xs font-medium text-text2 mb-1">
          Popis (description_long) — markdown: ## H2, ### H3
        </label>
        <textarea
          value={data.description_long}
          onChange={(e) => set('description_long', e.target.value)}
          rows={20}
          className="w-full border border-off2 rounded-lg px-3 py-2 text-sm text-text font-mono resize-y"
          placeholder="Popis se vygeneruje AI nebo vložte ručně…"
        />
        <p className="text-xs text-text3 mt-1">{data.description_long.length} znaků</p>
      </div>

      {/* Brand-only fields */}
      {entity.entityType === 'brand' && (
        <>
          <div>
            <label className="block text-xs font-medium text-text2 mb-1">Příběh značky (story)</label>
            <textarea
              value={data.story}
              onChange={(e) => set('story', e.target.value)}
              rows={5}
              className="w-full border border-off2 rounded-lg px-3 py-2 text-sm text-text resize-y"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-text2 mb-1">Filozofie (philosophy)</label>
            <textarea
              value={data.philosophy}
              onChange={(e) => set('philosophy', e.target.value)}
              rows={3}
              className="w-full border border-off2 rounded-lg px-3 py-2 text-sm text-text resize-y"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-text2 mb-1">Web značky</label>
            <input
              value={data.website_url}
              onChange={(e) => set('website_url', e.target.value)}
              className="w-full border border-off2 rounded-lg px-3 py-2 text-sm text-text"
              placeholder="https://…"
            />
          </div>
        </>
      )}

      {/* SEO */}
      <div className="space-y-4 border-t border-off2 pt-6">
        <h3 className="text-sm font-medium text-text">SEO</h3>
        <div>
          <label className="block text-xs font-medium text-text2 mb-1">Meta title (max 60 znaků)</label>
          <input
            value={data.meta_title}
            onChange={(e) => set('meta_title', e.target.value)}
            maxLength={70}
            className="w-full border border-off2 rounded-lg px-3 py-2 text-sm text-text"
          />
          <p className="text-xs text-text3 mt-1">{data.meta_title.length}/70</p>
        </div>
        <div>
          <label className="block text-xs font-medium text-text2 mb-1">Meta description (max 160 znaků)</label>
          <textarea
            value={data.meta_description}
            onChange={(e) => set('meta_description', e.target.value)}
            maxLength={160}
            rows={3}
            className="w-full border border-off2 rounded-lg px-3 py-2 text-sm text-text resize-none"
          />
          <p className="text-xs text-text3 mt-1">{data.meta_description.length}/160</p>
        </div>
      </div>

      {/* Save */}
      <div className="flex items-center gap-3">
        <button
          onClick={save}
          disabled={saving}
          className="px-6 py-2.5 bg-olive text-white rounded-lg text-sm font-medium hover:bg-olive2 disabled:opacity-50"
        >
          {saving ? 'Ukládám…' : 'Uložit'}
        </button>
        {saved && <span className="text-sm text-green-600">✓ Uloženo</span>}
        {error && <span className="text-sm text-red-500">{error}</span>}
      </div>
    </div>
  )
}
