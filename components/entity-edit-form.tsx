'use client'

import { useState } from 'react'
import { EntityExtrasModal } from './entity-extras-modal'
import { AdminBlock } from './admin-block'

export interface TimelineMilestone {
  year: number
  label: string
  description?: string
}

export interface RegionTerroir {
  climate?: string
  soil?: string
  tradition?: string
}

export interface EntityEditData {
  entityType: 'region' | 'brand' | 'cultivar'
  slug: string
  name: string
  status: string
  description_long: string | null
  meta_title: string | null
  meta_description: string | null
  /** TL;DR pro info pásek + Trust blok — všechny typy */
  tldr?: string | null
  // brand-only
  story?: string | null
  philosophy?: string | null
  website_url?: string | null
  founded_year?: number | null
  generation?: number | null
  hectares?: number | null
  headquarters?: string | null
  timeline?: TimelineMilestone[] | null
  // region-only
  terroir?: RegionTerroir | null
  map_image_url?: string | null
  // cultivar-only
  nickname?: string | null
  intensity_score?: number | null
  primary_use?: string | null
  pairing_pros?: string[] | null
  pairing_cons?: string[] | null
  flavor_profile?: Record<string, number> | null
  auto_filled_at?: string | null
}

interface Props {
  entity: EntityEditData
  publicUrl: string
  /** UUID entity — použito pro AI extras modal (při create FAQ). */
  entityId?: string
}

const ENTITY_LABEL: Record<EntityEditData['entityType'], { single: string; possessive: string; specificBlockTitle: string; specificBlockIcon: string }> = {
  region: {
    single: 'oblast',
    possessive: 'oblasti',
    specificBlockTitle: 'Terroir (klima, půda, tradice)',
    specificBlockIcon: '🗺️',
  },
  brand: {
    single: 'značka',
    possessive: 'značky',
    specificBlockTitle: 'Příběh značky',
    specificBlockIcon: '🏷️',
  },
  cultivar: {
    single: 'odrůda',
    possessive: 'odrůdy',
    specificBlockTitle: 'Vlastnosti odrůdy',
    specificBlockIcon: '🌿',
  },
}

export function EntityEditForm({ entity, publicUrl, entityId }: Props) {
  const labels = ENTITY_LABEL[entity.entityType]
  const [extrasOpen, setExtrasOpen] = useState(false)

  const [data, setData] = useState({
    name: entity.name,
    status: entity.status,
    description_long: entity.description_long ?? '',
    meta_title: entity.meta_title ?? '',
    meta_description: entity.meta_description ?? '',
    tldr: entity.tldr ?? '',
    story: entity.story ?? '',
    philosophy: entity.philosophy ?? '',
    website_url: entity.website_url ?? '',
    founded_year: entity.founded_year ?? '',
    generation: entity.generation ?? '',
    hectares: entity.hectares ?? '',
    headquarters: entity.headquarters ?? '',
    nickname: entity.nickname ?? '',
    intensity_score: entity.intensity_score ?? '',
    primary_use: entity.primary_use ?? '',
    map_image_url: entity.map_image_url ?? '',
  })

  const [terroir, setTerroir] = useState<RegionTerroir>({
    climate: entity.terroir?.climate ?? '',
    soil: entity.terroir?.soil ?? '',
    tradition: entity.terroir?.tradition ?? '',
  })

  const [timeline, setTimeline] = useState<TimelineMilestone[]>(entity.timeline ?? [])
  const [pairingPros, setPairingPros] = useState<string[]>(entity.pairing_pros ?? [])
  const [pairingCons, setPairingCons] = useState<string[]>(entity.pairing_cons ?? [])
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
      const payload: Record<string, unknown> = {
        name: data.name,
        status: data.status,
        description_long: data.description_long || null,
        meta_title: data.meta_title || null,
        meta_description: data.meta_description || null,
        tldr: data.tldr || null,
      }

      if (entity.entityType === 'brand') {
        payload.story = data.story || null
        payload.philosophy = data.philosophy || null
        payload.website_url = data.website_url || null
        payload.headquarters = data.headquarters || null
        payload.founded_year = data.founded_year === '' ? null : Number(data.founded_year)
        payload.generation = data.generation === '' ? null : Number(data.generation)
        payload.hectares = data.hectares === '' ? null : Number(data.hectares)
        payload.timeline = timeline
      }

      if (entity.entityType === 'region') {
        const cleanTerroir: Record<string, string> = {}
        if (terroir.climate) cleanTerroir.climate = terroir.climate
        if (terroir.soil) cleanTerroir.soil = terroir.soil
        if (terroir.tradition) cleanTerroir.tradition = terroir.tradition
        payload.terroir = cleanTerroir
        payload.map_image_url = data.map_image_url || null
      }

      if (entity.entityType === 'cultivar') {
        payload.nickname = data.nickname || null
        payload.intensity_score = data.intensity_score === '' ? null : Number(data.intensity_score)
        payload.primary_use = data.primary_use || null
        payload.pairing_pros = pairingPros
        payload.pairing_cons = pairingCons
      }

      const res = await fetch('/api/admin/entities', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entityType: entity.entityType, slug: entity.slug, data: payload }),
      })
      const json = await res.json()
      if (!json.ok) throw new Error(json.error)
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
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

  const aiButton = (
    <button
      onClick={generateContent}
      disabled={generating}
      className="px-3 py-1.5 bg-olive text-white rounded-lg text-[12px] font-medium hover:bg-olive2 disabled:opacity-50"
    >
      {generating ? '⏳ Generuji…' : '✨ Generovat AI'}
    </button>
  )

  return (
    <div className="space-y-6">
      {/* Sticky horní toolbar — status, akce, save */}
      <div className="sticky top-9 z-30 -mx-4 md:-mx-0 bg-white border border-off2 rounded-[var(--radius-card)] px-5 py-3 shadow-sm flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 mr-auto">
          <label className="text-[11px] text-text3 uppercase tracking-wider font-medium">Status:</label>
          <select
            value={data.status}
            onChange={(e) => set('status', e.target.value)}
            className="border border-off2 rounded-md px-2 py-1 text-[13px] text-text"
          >
            <option value="draft">draft</option>
            <option value="active">active</option>
            <option value="inactive">inactive</option>
          </select>
        </div>

        {entityId && (
          <button
            onClick={() => setExtrasOpen(true)}
            className="px-3 py-1.5 bg-white border border-olive-border text-olive rounded-lg text-[12px] hover:bg-olive-bg"
          >
            ✨ Doplňky AI
          </button>
        )}
        <button
          onClick={importPhotos}
          disabled={importing}
          className="px-3 py-1.5 bg-white border border-off2 text-text rounded-lg text-[12px] hover:border-olive disabled:opacity-50"
        >
          {importing ? '⏳ Importuji…' : '📷 Import fotek'}
        </button>
        <a
          href={publicUrl}
          target="_blank"
          className="px-3 py-1.5 bg-white border border-off2 text-text rounded-lg text-[12px] hover:border-olive"
        >
          🔗 Náhled
        </a>
        <button
          onClick={save}
          disabled={saving}
          className={`px-4 py-1.5 rounded-lg text-[13px] font-medium transition-colors ${
            saved
              ? 'bg-olive-bg text-olive-dark border border-olive-border'
              : 'bg-olive text-white hover:bg-olive2 disabled:opacity-50'
          }`}
        >
          {saving ? '⏳ Ukládám…' : saved ? '✓ Uloženo' : '💾 Uložit změny'}
        </button>
      </div>

      {(genResult || photoResult || error) && (
        <div className="text-[12px] space-y-1">
          {genResult && <p className="text-text2">{genResult}</p>}
          {photoResult && <p className="text-text2">{photoResult}</p>}
          {error && <p className="text-red-600">⚠ {error}</p>}
        </div>
      )}

      {/* BLOK 1 — TL;DR (Trust row) */}
      <AdminBlock
        number={1}
        icon="✨"
        title="Stručně (TL;DR)"
        publicLocation='Sekce „Pohled redakce" v Trust řádku'
        description="2-3 věty které dají uživateli rychlou odpověď bez čtení článku."
      >
        <textarea
          value={data.tldr}
          onChange={(e) => set('tldr', e.target.value)}
          maxLength={280}
          rows={3}
          className="w-full border border-off2 rounded-lg px-3 py-2 text-[14px] text-text resize-none focus:outline-none focus:border-olive"
          placeholder={`${labels.possessive[0].toUpperCase() + labels.possessive.slice(1)} stručně — co je výjimečné a pro koho.`}
        />
        <p className="text-[11px] text-text3 mt-1">{data.tldr.length}/280</p>
      </AdminBlock>

      {/* BLOK 2 — Editorial obsah */}
      <AdminBlock
        number={2}
        icon="📖"
        title="Editorial obsah"
        publicLocation='Sekce „Editorial story" — text alternuje s fotkami'
        description="Markdown: ## H2 = sekce s vlastní fotkou, ### H3 = podnadpis. Text před první ## se použije jako úvodní lead."
        actions={aiButton}
      >
        <textarea
          value={data.description_long}
          onChange={(e) => set('description_long', e.target.value)}
          rows={20}
          className="w-full border border-off2 rounded-lg px-3 py-2 text-[13px] text-text font-mono resize-y focus:outline-none focus:border-olive"
          placeholder={`Lead odstavec na úvod (bez ##)…\n\n## První sekce\nText sekce…\n\n## Druhá sekce\nText sekce…`}
        />
        <p className="text-[11px] text-text3 mt-1">{data.description_long.length} znaků</p>
      </AdminBlock>

      {/* BLOK 3 — Specific (Terroir / Příběh / Vlastnosti) */}
      <AdminBlock
        number={3}
        icon={labels.specificBlockIcon}
        title={labels.specificBlockTitle}
        publicLocation={
          entity.entityType === 'region'
            ? 'Sekce „Co je pro X typické" — 3 sloupce'
            : entity.entityType === 'cultivar'
            ? 'Sekce „Profil odrůdy"'
            : 'Sekce „Příběh značky" — timeline + portfolio'
        }
      >
        {entity.entityType === 'region' && (
          <div className="space-y-4">
            <div>
              <label className="block text-[11px] font-medium text-text2 mb-1.5 uppercase tracking-wider">
                ☀️ Klima
              </label>
              <textarea
                value={terroir.climate ?? ''}
                onChange={(e) => {
                  setTerroir({ ...terroir, climate: e.target.value })
                  setSaved(false)
                }}
                rows={2}
                className="w-full border border-off2 rounded-lg px-3 py-2 text-[14px] text-text resize-y focus:outline-none focus:border-olive"
                placeholder="Suché, slunečné, mírné zimy s občasnými bouřemi…"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-text2 mb-1.5 uppercase tracking-wider">
                🪨 Půda
              </label>
              <textarea
                value={terroir.soil ?? ''}
                onChange={(e) => {
                  setTerroir({ ...terroir, soil: e.target.value })
                  setSaved(false)
                }}
                rows={2}
                className="w-full border border-off2 rounded-lg px-3 py-2 text-[14px] text-text resize-y focus:outline-none focus:border-olive"
                placeholder="Vápencová, dobré odvodnění, místy červenice…"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-text2 mb-1.5 uppercase tracking-wider">
                🌿 Tradice
              </label>
              <textarea
                value={terroir.tradition ?? ''}
                onChange={(e) => {
                  setTerroir({ ...terroir, tradition: e.target.value })
                  setSaved(false)
                }}
                rows={2}
                className="w-full border border-off2 rounded-lg px-3 py-2 text-[14px] text-text resize-y focus:outline-none focus:border-olive"
                placeholder="Tisícileté olivovníky, ruční sklizeň, lokální lisovny…"
              />
            </div>

            {/* Mapa regionu — URL */}
            <div className="pt-3 border-t border-off2">
              <label className="block text-[11px] font-medium text-text2 mb-1.5 uppercase tracking-wider">
                🗺️ Mapa regionu — URL obrázku
              </label>
              <input
                value={data.map_image_url}
                onChange={(e) => set('map_image_url', e.target.value)}
                className="w-full border border-off2 rounded-lg px-3 py-2 text-[14px] text-text focus:outline-none focus:border-olive"
                placeholder="https://upload.wikimedia.org/.../Apulia.svg"
              />
              <p className="text-[11px] text-text3 mt-1">
                Nepovinné — bez URL se použije zjednodušený SVG outline. Doporučeno:{' '}
                <a
                  href="https://commons.wikimedia.org/wiki/Category:SVG_maps_of_regions_of_Italy"
                  target="_blank"
                  rel="noopener"
                  className="text-olive border-b border-olive-border"
                >
                  Wikimedia SVG mapy
                </a>
              </p>
              {data.map_image_url && (
                <div className="mt-2 inline-block bg-white border border-off2 rounded-lg p-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={data.map_image_url} alt="Náhled mapy" className="w-32 h-32 object-contain" />
                </div>
              )}
            </div>
          </div>
        )}

        {entity.entityType === 'brand' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-text2 mb-1.5 uppercase tracking-wider">
                  Pěstuje od
                </label>
                <input
                  type="number"
                  value={data.founded_year}
                  onChange={(e) => set('founded_year', e.target.value)}
                  className="w-full border border-off2 rounded-lg px-3 py-2 text-[14px] text-text focus:outline-none focus:border-olive"
                  placeholder="1860"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-text2 mb-1.5 uppercase tracking-wider">
                  Generace
                </label>
                <input
                  type="number"
                  value={data.generation}
                  onChange={(e) => set('generation', e.target.value)}
                  className="w-full border border-off2 rounded-lg px-3 py-2 text-[14px] text-text focus:outline-none focus:border-olive"
                  placeholder="4"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-text2 mb-1.5 uppercase tracking-wider">
                  Hektary
                </label>
                <input
                  type="number"
                  value={data.hectares}
                  onChange={(e) => set('hectares', e.target.value)}
                  className="w-full border border-off2 rounded-lg px-3 py-2 text-[14px] text-text focus:outline-none focus:border-olive"
                  placeholder="50"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-text2 mb-1.5 uppercase tracking-wider">
                  Sídlo
                </label>
                <input
                  value={data.headquarters}
                  onChange={(e) => set('headquarters', e.target.value)}
                  className="w-full border border-off2 rounded-lg px-3 py-2 text-[14px] text-text focus:outline-none focus:border-olive"
                  placeholder="Alberobello"
                />
              </div>
            </div>
            <div>
              <label className="block text-[11px] font-medium text-text2 mb-1.5 uppercase tracking-wider">
                Příběh značky
              </label>
              <textarea
                value={data.story}
                onChange={(e) => set('story', e.target.value)}
                rows={5}
                className="w-full border border-off2 rounded-lg px-3 py-2 text-[14px] text-text resize-y focus:outline-none focus:border-olive"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-text2 mb-1.5 uppercase tracking-wider">
                Filozofie
              </label>
              <textarea
                value={data.philosophy}
                onChange={(e) => set('philosophy', e.target.value)}
                rows={3}
                className="w-full border border-off2 rounded-lg px-3 py-2 text-[14px] text-text resize-y focus:outline-none focus:border-olive"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-text2 mb-1.5 uppercase tracking-wider">
                Web značky
              </label>
              <input
                value={data.website_url}
                onChange={(e) => set('website_url', e.target.value)}
                className="w-full border border-off2 rounded-lg px-3 py-2 text-[14px] text-text focus:outline-none focus:border-olive"
                placeholder="https://…"
              />
            </div>

            {/* Časová osa */}
            <div className="pt-3 border-t border-off2">
              <label className="block text-[11px] font-medium text-text2 mb-2 uppercase tracking-wider">
                📅 Časová osa
              </label>
              {timeline.length === 0 && (
                <p className="text-[12px] text-text3 italic mb-2">Žádné milníky. Přidejte rok + popisek.</p>
              )}
              {timeline.map((m, i) => (
                <div key={i} className="flex gap-2 mb-2 items-start">
                  <input
                    type="number"
                    value={m.year}
                    onChange={(e) => {
                      const next = [...timeline]
                      next[i] = { ...next[i], year: Number(e.target.value) }
                      setTimeline(next)
                      setSaved(false)
                    }}
                    className="w-20 border border-off2 rounded-lg px-2 py-1.5 text-[13px] text-text tabular-nums focus:outline-none focus:border-olive"
                    placeholder="1860"
                  />
                  <input
                    value={m.label}
                    onChange={(e) => {
                      const next = [...timeline]
                      next[i] = { ...next[i], label: e.target.value }
                      setTimeline(next)
                      setSaved(false)
                    }}
                    className="flex-1 border border-off2 rounded-lg px-2 py-1.5 text-[13px] text-text focus:outline-none focus:border-olive"
                    placeholder="založení rodinné olivárny"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setTimeline(timeline.filter((_, j) => j !== i))
                      setSaved(false)
                    }}
                    className="text-text3 hover:text-terra px-2 text-[13px]"
                  >
                    ✕
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => {
                  setTimeline([...timeline, { year: new Date().getFullYear(), label: '' }])
                  setSaved(false)
                }}
                className="text-[12px] text-olive border border-olive-border rounded-md px-3 py-1.5 hover:bg-olive-bg"
              >
                + Přidat milník
              </button>
            </div>
          </div>
        )}

        {entity.entityType === 'cultivar' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-text2 mb-1.5 uppercase tracking-wider">
                  Přezdívka
                </label>
                <input
                  value={data.nickname}
                  onChange={(e) => set('nickname', e.target.value)}
                  className="w-full border border-off2 rounded-lg px-3 py-2 text-[14px] text-text focus:outline-none focus:border-olive"
                  placeholder="apulijský punch"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-text2 mb-1.5 uppercase tracking-wider">
                  Intenzita 1–10
                </label>
                <input
                  type="number"
                  min={1}
                  max={10}
                  value={data.intensity_score}
                  onChange={(e) => set('intensity_score', e.target.value)}
                  className="w-full border border-off2 rounded-lg px-3 py-2 text-[14px] text-text focus:outline-none focus:border-olive"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-text2 mb-1.5 uppercase tracking-wider">
                  Typ použití
                </label>
                <select
                  value={data.primary_use}
                  onChange={(e) => set('primary_use', e.target.value)}
                  className="w-full border border-off2 rounded-lg px-3 py-2 text-[14px] text-text focus:outline-none focus:border-olive"
                >
                  <option value="">— vyberte —</option>
                  <option value="finishing">na dochucení</option>
                  <option value="dipping">k máčení</option>
                  <option value="cooking">do vaření</option>
                  <option value="frying">na smažení</option>
                  <option value="universal">univerzální</option>
                </select>
              </div>
            </div>

            {entity.flavor_profile && Object.keys(entity.flavor_profile).length > 0 && (
              <div className="bg-olive-bg border border-olive-border rounded-lg px-3 py-2 text-[12px] text-olive-dark">
                <strong>Chuťový profil</strong>{' '}
                {entity.auto_filled_at ? '(auto-fill ze produktů)' : '(ručně)'}:{' '}
                {Object.entries(entity.flavor_profile)
                  .filter(([, v]) => typeof v === 'number' && v > 0)
                  .map(([k, v]) => `${k} ${v}`)
                  .join(' · ')}
              </div>
            )}

            <ChipListEditor
              label="✓ Hodí se k"
              values={pairingPros}
              onChange={(v) => {
                setPairingPros(v)
                setSaved(false)
              }}
              placeholder="steaky"
            />
            <ChipListEditor
              label="✗ Spíš ne k"
              values={pairingCons}
              onChange={(v) => {
                setPairingCons(v)
                setSaved(false)
              }}
              placeholder="dezerty"
            />
          </div>
        )}
      </AdminBlock>

      {/* BLOK SEO (poslední) */}
      <AdminBlock
        number={9}
        icon="🔍"
        title="SEO meta tagy"
        publicLocation="HTML <title> + meta description (Google výsledky)"
        description="Doporučeno: title 50-60 znaků, description 140-160 znaků."
      >
        <div className="space-y-4">
          <div>
            <label className="block text-[11px] font-medium text-text2 mb-1.5 uppercase tracking-wider">
              Meta title (max 70 znaků)
            </label>
            <input
              value={data.meta_title}
              onChange={(e) => set('meta_title', e.target.value)}
              maxLength={70}
              className="w-full border border-off2 rounded-lg px-3 py-2 text-[14px] text-text focus:outline-none focus:border-olive"
            />
            <p className="text-[11px] text-text3 mt-1">{data.meta_title.length}/70</p>
          </div>
          <div>
            <label className="block text-[11px] font-medium text-text2 mb-1.5 uppercase tracking-wider">
              Meta description (max 160 znaků)
            </label>
            <textarea
              value={data.meta_description}
              onChange={(e) => set('meta_description', e.target.value)}
              maxLength={160}
              rows={3}
              className="w-full border border-off2 rounded-lg px-3 py-2 text-[14px] text-text resize-none focus:outline-none focus:border-olive"
            />
            <p className="text-[11px] text-text3 mt-1">{data.meta_description.length}/160</p>
          </div>
        </div>
      </AdminBlock>

      {/* AI extras modal */}
      {entityId && (
        <EntityExtrasModal
          entityType={entity.entityType}
          slug={entity.slug}
          entityId={entityId}
          isOpen={extrasOpen}
          onClose={() => setExtrasOpen(false)}
        />
      )}
    </div>
  )
}

// Inline chip-list editor
function ChipListEditor({
  label,
  values,
  onChange,
  placeholder,
}: {
  label: string
  values: string[]
  onChange: (next: string[]) => void
  placeholder: string
}) {
  const [draft, setDraft] = useState('')

  const add = () => {
    const v = draft.trim()
    if (!v) return
    if (values.includes(v)) {
      setDraft('')
      return
    }
    onChange([...values, v])
    setDraft('')
  }

  return (
    <div>
      <label className="block text-[11px] font-medium text-text2 mb-1.5 uppercase tracking-wider">{label}</label>
      <div className="flex flex-wrap gap-1.5 mb-2">
        {values.map((v, i) => (
          <span
            key={i}
            className="inline-flex items-center gap-1 text-[12px] px-2 py-1 rounded-full bg-off border border-off2 text-text2"
          >
            {v}
            <button
              type="button"
              onClick={() => onChange(values.filter((_, j) => j !== i))}
              className="text-text3 hover:text-terra"
            >
              ×
            </button>
          </span>
        ))}
        {values.length === 0 && <span className="text-[12px] text-text3 italic">Zatím prázdné.</span>}
      </div>
      <div className="flex gap-2">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              add()
            }
          }}
          placeholder={placeholder}
          className="flex-1 border border-off2 rounded-lg px-3 py-1.5 text-[13px] text-text focus:outline-none focus:border-olive"
        />
        <button
          type="button"
          onClick={add}
          className="text-[12px] text-olive border border-olive-border rounded-md px-3 py-1.5 hover:bg-olive-bg"
        >
          Přidat
        </button>
      </div>
    </div>
  )
}
