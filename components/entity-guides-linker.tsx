'use client'

// Multi-select pro propojení průvodců/článků s entitou (oblast/značka/odrůda).
// Reuse stejné recipe_entity_links tabulky — slug průvodce ≠ slug receptu.

import { useState } from 'react'

interface GuideOption {
  slug: string
  title: string
  excerpt: string
  category: string
}

interface Props {
  entityType: 'region' | 'brand' | 'cultivar'
  entitySlug: string
  allGuides: GuideOption[]
  linkedSlugs: string[]
}

const CATEGORY_LABEL: Record<string, string> = {
  pruvodce: 'Průvodce',
  zebricek: 'Žebříček',
  srovnani: 'Srovnání',
  vzdelavani: 'Vzdělávání',
}

export function EntityGuidesLinker({ entityType, entitySlug, allGuides, linkedSlugs }: Props) {
  const [linked, setLinked] = useState<Set<string>>(new Set(linkedSlugs))
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function toggle(guideSlug: string) {
    const isLinked = linked.has(guideSlug)
    setBusy(guideSlug)
    setError(null)

    try {
      if (isLinked) {
        const url = `/api/admin/recipe-entity-links?recipeSlug=${encodeURIComponent(
          guideSlug
        )}&entityType=${entityType}&entitySlug=${encodeURIComponent(entitySlug)}`
        const res = await fetch(url, { method: 'DELETE' })
        const json = await res.json()
        if (!json.ok) throw new Error(json.error)
        const next = new Set(linked)
        next.delete(guideSlug)
        setLinked(next)
      } else {
        const res = await fetch('/api/admin/recipe-entity-links', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ recipeSlug: guideSlug, entityType, entitySlug }),
        })
        const json = await res.json()
        if (!json.ok) throw new Error(json.error)
        const next = new Set(linked)
        next.add(guideSlug)
        setLinked(next)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Chyba')
    } finally {
      setBusy(null)
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-[13px] font-medium text-text">
          📚 Průvodci ({linked.size}/{allGuides.length})
        </h3>
        <p className="text-[11px] text-text3">Vykreslí se max 3 v sekci „Související obsah"</p>
      </div>

      {allGuides.length === 0 && (
        <p className="text-xs text-text3 italic">Žádné průvodce v katalogu.</p>
      )}

      <div className="space-y-2">
        {allGuides.map((g) => {
          const isLinked = linked.has(g.slug)
          const isBusy = busy === g.slug
          return (
            <label
              key={g.slug}
              className={`flex items-start gap-3 border rounded-lg p-3 cursor-pointer transition-colors ${
                isLinked
                  ? 'border-olive-border bg-olive-bg/30'
                  : 'border-off2 hover:border-olive-light bg-white'
              } ${isBusy ? 'opacity-50' : ''}`}
            >
              <input
                type="checkbox"
                checked={isLinked}
                disabled={isBusy}
                onChange={() => toggle(g.slug)}
                className="mt-1 accent-olive"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <p className="text-sm font-medium text-text leading-tight">{g.title}</p>
                  <span className="text-[10px] text-text3 bg-off px-1.5 py-0.5 rounded shrink-0">
                    {CATEGORY_LABEL[g.category] ?? g.category}
                  </span>
                </div>
                <p className="text-xs text-text3 leading-snug line-clamp-2">{g.excerpt}</p>
              </div>
              {isBusy && <span className="text-xs text-text3">⏳</span>}
            </label>
          )
        })}
      </div>

      {error && <p className="text-xs text-terra mt-2">{error}</p>}
    </div>
  )
}
