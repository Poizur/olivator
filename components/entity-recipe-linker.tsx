'use client'

// Multi-select pro propojení receptů s entitou (oblast/značka/odrůda).
// Embedded v admin entity edit stránce.
// Zobrazí všechny dostupné recepty s checkboxy. Toggle = okamžité POST/DELETE.

import { useState } from 'react'

interface RecipeOption {
  slug: string
  title: string
  excerpt: string
}

interface Props {
  entityType: 'region' | 'brand' | 'cultivar'
  entitySlug: string
  /** Všechny dostupné recepty (z lib/static-content). */
  allRecipes: RecipeOption[]
  /** Slugy receptů, které jsou už linkované. */
  linkedSlugs: string[]
}

export function EntityRecipeLinker({ entityType, entitySlug, allRecipes, linkedSlugs }: Props) {
  const [linked, setLinked] = useState<Set<string>>(new Set(linkedSlugs))
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function toggle(recipeSlug: string) {
    const isLinked = linked.has(recipeSlug)
    setBusy(recipeSlug)
    setError(null)

    try {
      if (isLinked) {
        const url = `/api/admin/recipe-entity-links?recipeSlug=${encodeURIComponent(
          recipeSlug
        )}&entityType=${entityType}&entitySlug=${encodeURIComponent(entitySlug)}`
        const res = await fetch(url, { method: 'DELETE' })
        const json = await res.json()
        if (!json.ok) throw new Error(json.error)
        const next = new Set(linked)
        next.delete(recipeSlug)
        setLinked(next)
      } else {
        const res = await fetch('/api/admin/recipe-entity-links', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ recipeSlug, entityType, entitySlug }),
        })
        const json = await res.json()
        if (!json.ok) throw new Error(json.error)
        const next = new Set(linked)
        next.add(recipeSlug)
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
          🍅 Recepty ({linked.size}/{allRecipes.length})
        </h3>
        <p className="text-[11px] text-text3">Vykreslí se max 3 v sekci „Související obsah"</p>
      </div>

      {allRecipes.length === 0 && (
        <p className="text-xs text-text3 italic">Žádné recepty v katalogu.</p>
      )}

      <div className="space-y-2">
        {allRecipes.map((r) => {
          const isLinked = linked.has(r.slug)
          const isBusy = busy === r.slug
          return (
            <label
              key={r.slug}
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
                onChange={() => toggle(r.slug)}
                className="mt-1 accent-olive"
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-text leading-tight">{r.title}</p>
                <p className="text-xs text-text3 leading-snug mt-0.5 line-clamp-2">{r.excerpt}</p>
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
