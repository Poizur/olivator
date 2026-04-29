// Blok 7: Křížení — recepty + chip linky na druhé typy stránek.
// Brief.md: každá stránka odkazuje na obě další.

import Link from 'next/link'
import type { RelatedRecipeCard, EntityChipLink } from './types'

interface Props {
  recipes: RelatedRecipeCard[]
  /** Sekce chip linků — např. "Odrůdy z této oblasti", "Značky z této oblasti" */
  chipSections: Array<{
    title: string
    chips: EntityChipLink[]
  }>
}

export function EntityRelatedContent({ recipes, chipSections }: Props) {
  const hasRecipes = recipes.length > 0
  const hasChips = chipSections.some((s) => s.chips.length > 0)
  if (!hasRecipes && !hasChips) return null

  return (
    <section className="px-6 md:px-10">
      <div className="max-w-[1280px] mx-auto space-y-8">
        {hasRecipes && (
          <div>
            <h2 className="font-[family-name:var(--font-display)] text-2xl font-normal text-text mb-4">
              Recepty
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {recipes.slice(0, 3).map((r) => {
                const initial = r.title.charAt(0).toUpperCase()
                return (
                  <Link
                    key={r.slug}
                    href={`/recept/${r.slug}`}
                    className="bg-white border border-off2 rounded-[var(--radius-card)] overflow-hidden flex flex-col transition-all hover:border-terra/30 hover:shadow-md hover:-translate-y-0.5"
                  >
                    <div className="aspect-[16/9] bg-[#7a3b1e] flex items-center justify-center relative overflow-hidden">
                      <div className="font-[family-name:var(--font-display)] text-[100px] font-normal italic text-white/15 leading-none select-none">
                        {initial}
                      </div>
                      <div className="absolute top-3 left-3 text-[9px] font-bold tracking-widest uppercase text-white/70">
                        Recept
                      </div>
                    </div>
                    <div className="p-4 flex-1 flex flex-col">
                      <h3 className="font-[family-name:var(--font-display)] text-lg text-text leading-tight mb-2 line-clamp-2">
                        {r.title}
                      </h3>
                      <p className="text-[12px] text-text2 leading-snug line-clamp-2 mb-2 flex-1">
                        {r.excerpt}
                      </p>
                      <div className="text-[11px] text-terra">{r.readTime}</div>
                    </div>
                  </Link>
                )
              })}
            </div>
          </div>
        )}

        {hasChips && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {chipSections.map((section, i) => {
              if (section.chips.length === 0) return null
              return (
                <div key={i}>
                  <h3 className="text-[13px] font-medium text-text2 uppercase tracking-wider mb-3">
                    {section.title}
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {section.chips.map((chip) => (
                      <Link
                        key={chip.href}
                        href={chip.href}
                        className="text-[13px] px-3 py-1.5 rounded-full bg-white border border-off2 text-text hover:border-olive-light hover:bg-olive-bg transition-colors"
                      >
                        {chip.label}
                      </Link>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </section>
  )
}
