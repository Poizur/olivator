'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface ResearchResult {
  descriptionShort: string | null
  descriptionLong: string | null
  story: string | null
  philosophy: string | null
  foundedYear: number | null
  headquarters: string | null
  familyOwned: boolean | null
  certifications: string[]
  websiteUrl: string | null
  logoUrl: string | null
  pagesScanned: string[]
  warnings: string[]
}

interface Props {
  slug: string
  brandName: string
  currentWebsiteUrl: string | null
  /** True pokud brand už má primary logo v entity_images. */
  hasPrimaryLogo: boolean
}

type FieldKey =
  | 'description_short'
  | 'description_long'
  | 'story'
  | 'philosophy'
  | 'founded_year'
  | 'headquarters'
  | 'website_url'

export function BrandAutoResearchPanel({ slug, brandName, currentWebsiteUrl, hasPrimaryLogo }: Props) {
  const router = useRouter()
  const [url, setUrl] = useState(currentWebsiteUrl ?? '')
  const [researching, setResearching] = useState(false)
  const [result, setResult] = useState<ResearchResult | null>(null)
  const [logoSavedNow, setLogoSavedNow] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [applying, setApplying] = useState<FieldKey | 'all' | null>(null)
  const [applied, setApplied] = useState<Set<FieldKey>>(new Set())

  async function onResearch() {
    if (!url.trim()) {
      setError('Zadej URL výrobce — např. https://oliointini.it')
      return
    }
    setResearching(true)
    setError(null)
    setResult(null)
    setLogoSavedNow(false)
    setApplied(new Set())
    try {
      const res = await fetch(`/api/admin/brands/${slug}/auto-research`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url.trim() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Auto-research selhal')
      setResult(data.result as ResearchResult)
      setLogoSavedNow(Boolean(data.logoSaved))
      if (data.logoSaved) router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Chyba')
    } finally {
      setResearching(false)
    }
  }

  function buildPatch(fields: FieldKey[]): Record<string, unknown> | null {
    if (!result) return null
    const patch: Record<string, unknown> = {}
    for (const f of fields) {
      switch (f) {
        case 'description_short':
          if (result.descriptionShort) patch.description_short = result.descriptionShort
          break
        case 'description_long':
          if (result.descriptionLong) patch.description_long = result.descriptionLong
          break
        case 'story':
          if (result.story) patch.story = result.story
          break
        case 'philosophy':
          if (result.philosophy) patch.philosophy = result.philosophy
          break
        case 'founded_year':
          if (result.foundedYear) patch.founded_year = result.foundedYear
          break
        case 'headquarters':
          if (result.headquarters) patch.headquarters = result.headquarters
          break
        case 'website_url':
          if (result.websiteUrl) patch.website_url = result.websiteUrl
          break
      }
    }
    return Object.keys(patch).length > 0 ? patch : null
  }

  async function applyFields(fields: FieldKey[], scope: FieldKey | 'all') {
    const patch = buildPatch(fields)
    if (!patch) return
    setApplying(scope)
    setError(null)
    try {
      const res = await fetch('/api/admin/entities', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entityType: 'brand', slug, data: patch }),
      })
      const json = await res.json()
      if (!json.ok) throw new Error(json.error ?? 'Uložení selhalo')
      setApplied((prev) => {
        const next = new Set(prev)
        for (const f of fields) next.add(f)
        return next
      })
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Chyba')
    } finally {
      setApplying(null)
    }
  }

  const allFields: FieldKey[] = [
    'description_short',
    'description_long',
    'story',
    'philosophy',
    'founded_year',
    'headquarters',
    'website_url',
  ]

  return (
    <div className="bg-olive-bg/40 border border-olive-border rounded-xl p-5">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="min-w-0">
          <h3 className="text-[14px] font-semibold text-olive-dark">
            ✨ Auto-research z webu výrobce
          </h3>
          <p className="text-[12px] text-olive-dark/80 mt-0.5">
            Claude Haiku načte web výrobce + „o nás“ stránky a navrhne příběh, sídlo, rok založení a logo pro značku <strong>{brandName}</strong>. ~10–20 s, ~$0,01.
          </p>
        </div>
      </div>

      <div className="flex gap-2 mb-2">
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://oliointini.it"
          className="flex-1 px-3 py-2 border border-olive-border rounded-lg text-[13px] bg-white focus:outline-none focus:border-olive"
          disabled={researching}
        />
        <button
          type="button"
          onClick={onResearch}
          disabled={researching || !url.trim()}
          className="bg-olive text-white rounded-full px-4 py-2 text-[12px] font-medium hover:bg-olive2 disabled:opacity-40 transition-colors shrink-0"
        >
          {researching ? 'Načítám…' : 'Spustit'}
        </button>
      </div>

      {error && (
        <div className="mt-2 text-[12px] text-red-700 bg-red-50 border border-red-200 rounded px-2 py-1.5">
          ⚠ {error}
        </div>
      )}

      {result && (
        <div className="mt-4 space-y-3 border-t border-olive-border pt-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="text-[11px] text-olive-dark">
              Načteno {result.pagesScanned.length} stránek
              {logoSavedNow && (
                <span className="ml-2 text-olive">· logo uloženo do galerie</span>
              )}
              {!logoSavedNow && hasPrimaryLogo && (
                <span className="ml-2 text-text3">· logo už v galerii máš</span>
              )}
              {!result.logoUrl && (
                <span className="ml-2 text-amber-700">· logo nenalezeno</span>
              )}
            </div>
            <button
              type="button"
              onClick={() => applyFields(allFields, 'all')}
              disabled={applying !== null}
              className="text-[11px] bg-olive text-white rounded-full px-3 py-1 hover:bg-olive2 disabled:opacity-40 transition-colors"
            >
              {applying === 'all' ? 'Ukládám…' : 'Použít vše ↓'}
            </button>
          </div>

          <SuggestionRow
            label="Krátký popis"
            value={result.descriptionShort}
            applied={applied.has('description_short')}
            applying={applying === 'description_short'}
            onApply={() => applyFields(['description_short'], 'description_short')}
          />
          <SuggestionRow
            label="Dlouhý popis (markdown)"
            value={result.descriptionLong}
            preview
            applied={applied.has('description_long')}
            applying={applying === 'description_long'}
            onApply={() => applyFields(['description_long'], 'description_long')}
          />
          <SuggestionRow
            label="Příběh značky"
            value={result.story}
            preview
            applied={applied.has('story')}
            applying={applying === 'story'}
            onApply={() => applyFields(['story'], 'story')}
          />
          <SuggestionRow
            label="Filozofie"
            value={result.philosophy}
            preview
            applied={applied.has('philosophy')}
            applying={applying === 'philosophy'}
            onApply={() => applyFields(['philosophy'], 'philosophy')}
          />
          <SuggestionRow
            label="Rok založení"
            value={result.foundedYear?.toString() ?? null}
            applied={applied.has('founded_year')}
            applying={applying === 'founded_year'}
            onApply={() => applyFields(['founded_year'], 'founded_year')}
          />
          <SuggestionRow
            label="Sídlo"
            value={result.headquarters}
            applied={applied.has('headquarters')}
            applying={applying === 'headquarters'}
            onApply={() => applyFields(['headquarters'], 'headquarters')}
          />
          <SuggestionRow
            label="Web značky"
            value={result.websiteUrl}
            applied={applied.has('website_url')}
            applying={applying === 'website_url'}
            onApply={() => applyFields(['website_url'], 'website_url')}
          />

          {(result.familyOwned !== null || result.certifications.length > 0) && (
            <div className="text-[11px] text-text3 leading-snug border-t border-olive-border/60 pt-2">
              {result.familyOwned !== null && (
                <div>Rodinný podnik: <strong className="text-text2">{result.familyOwned ? 'ano' : 'ne'}</strong> (info, není v formuláři)</div>
              )}
              {result.certifications.length > 0 && (
                <div>Certifikace: <strong className="text-text2">{result.certifications.join(', ')}</strong> (info, není v formuláři)</div>
              )}
            </div>
          )}

          {result.warnings.length > 0 && (
            <div className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1.5">
              ⚠ {result.warnings.join(' · ')}
            </div>
          )}

          <div className="text-[10px] text-text3 leading-tight">
            Po kliknutí „Použít“ se hodnota zapíše do DB. Stránka se obnoví — uvidíš výsledek ve formuláři níže.
          </div>
        </div>
      )}
    </div>
  )
}

function SuggestionRow({
  label,
  value,
  preview = false,
  applied,
  applying,
  onApply,
}: {
  label: string
  value: string | null
  preview?: boolean
  applied: boolean
  applying: boolean
  onApply: () => void
}) {
  const display = value
    ? preview && value.length > 200
      ? value.slice(0, 200) + '…'
      : value
    : null
  return (
    <div className="flex items-start justify-between gap-3 text-[12px]">
      <div className="min-w-0 flex-1">
        <div className="text-[10px] uppercase tracking-wider text-text3 mb-0.5">{label}</div>
        <div className={`leading-snug whitespace-pre-wrap ${value ? 'text-text' : 'text-text3 italic'}`}>
          {display ?? '(nenalezeno)'}
        </div>
      </div>
      {value && (
        <button
          type="button"
          onClick={onApply}
          disabled={applying || applied}
          className={`text-[11px] rounded-full px-2.5 py-0.5 shrink-0 transition-colors border ${
            applied
              ? 'text-olive-dark bg-olive-bg border-olive-border'
              : 'text-olive border-olive-border hover:bg-olive-bg disabled:opacity-40'
          }`}
        >
          {applied ? '✓ Uloženo' : applying ? '…' : 'Použít'}
        </button>
      )}
    </div>
  )
}
