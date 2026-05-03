'use client'

// Recipe editor — bloky AdminBlock pattern. Auto-save? Ne, manual save.
// Status, basic, ingredients (array), instructions (array), body MD,
// pairing (regions/cultivars), SEO.

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { AdminBlock } from '@/components/admin-block'
import type {
  RecipeFull,
  RecipeIngredient,
  RecipeInstruction,
} from '@/lib/recipes-db'

interface Props {
  recipe: RecipeFull
  availableRegions: string[]
  availableCultivars: string[]
}

const CUISINE_OPTIONS = [
  { value: '', label: '— vyberte —' },
  { value: 'italian', label: 'italská' },
  { value: 'greek', label: 'řecká' },
  { value: 'spanish', label: 'španělská' },
  { value: 'czech', label: 'česká' },
  { value: 'french', label: 'francouzská' },
  { value: 'mediterranean', label: 'středomořská' },
]

const DIFFICULTY_OPTIONS = [
  { value: '', label: '— neudáno —' },
  { value: 'easy', label: 'snadné' },
  { value: 'medium', label: 'střední' },
  { value: 'hard', label: 'náročnější' },
]

export function RecipeEditForm({ recipe, availableRegions, availableCultivars }: Props) {
  const router = useRouter()
  const [title, setTitle] = useState(recipe.title)
  const [excerpt, setExcerpt] = useState(recipe.excerpt ?? '')
  const [emoji, setEmoji] = useState(recipe.emoji ?? '🍽')
  const [readTime, setReadTime] = useState(recipe.readTime ?? '5 min čtení')
  const [heroImageUrl, setHeroImageUrl] = useState(recipe.heroImageUrl ?? '')
  const [cuisine, setCuisine] = useState(recipe.cuisine ?? '')
  const [difficulty, setDifficulty] = useState(recipe.difficulty ?? '')
  const [prepTimeMin, setPrepTimeMin] = useState(recipe.prepTimeMin?.toString() ?? '')
  const [cookTimeMin, setCookTimeMin] = useState(recipe.cookTimeMin?.toString() ?? '')
  const [servings, setServings] = useState(recipe.servings?.toString() ?? '')
  const [ingredients, setIngredients] = useState<RecipeIngredient[]>(recipe.ingredients)
  const [instructions, setInstructions] = useState<RecipeInstruction[]>(recipe.instructions)
  const [bodyMarkdown, setBodyMarkdown] = useState(recipe.bodyMarkdown ?? '')
  const [recommendedRegions, setRecommendedRegions] = useState<string[]>(recipe.recommendedRegions)
  const [recommendedCultivars, setRecommendedCultivars] = useState<string[]>(recipe.recommendedCultivars)
  const [metaTitle, setMetaTitle] = useState(recipe.metaTitle ?? '')
  const [metaDescription, setMetaDescription] = useState(recipe.metaDescription ?? '')
  const [status, setStatus] = useState(recipe.status)

  const [saving, setSaving] = useState(false)
  const [feedback, setFeedback] = useState<{ ok: boolean; msg: string } | null>(null)

  function notify(ok: boolean, msg: string) {
    setFeedback({ ok, msg })
    setTimeout(() => setFeedback(null), 4000)
  }

  async function save() {
    setSaving(true)
    try {
      const res = await fetch(`/api/admin/recipes/${recipe.slug}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          excerpt,
          emoji,
          readTime,
          heroImageUrl: heroImageUrl || null,
          cuisine: cuisine || null,
          difficulty: difficulty || null,
          prepTimeMin: prepTimeMin ? Number(prepTimeMin) : null,
          cookTimeMin: cookTimeMin ? Number(cookTimeMin) : null,
          servings: servings ? Number(servings) : null,
          ingredients,
          instructions,
          bodyMarkdown: bodyMarkdown || null,
          recommendedRegions,
          recommendedCultivars,
          metaTitle: metaTitle || null,
          metaDescription: metaDescription || null,
          status,
        }),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      notify(true, '✅ Uloženo')
      router.refresh()
    } catch (err) {
      notify(false, err instanceof Error ? err.message : 'Chyba')
    } finally {
      setSaving(false)
    }
  }

  async function deleteRecipe() {
    if (!confirm('Opravdu smazat tento recept? Nelze vrátit.')) return
    try {
      const res = await fetch(`/api/admin/recipes/${recipe.slug}`, { method: 'DELETE' })
      if (!res.ok) throw new Error((await res.json()).error)
      router.push('/admin/recipes')
    } catch (err) {
      notify(false, err instanceof Error ? err.message : 'Chyba')
    }
  }

  function addIngredient() {
    setIngredients([...ingredients, { name: '', amount: null, unit: '' }])
  }
  function updateIngredient(i: number, patch: Partial<RecipeIngredient>) {
    const next = [...ingredients]
    next[i] = { ...next[i], ...patch }
    setIngredients(next)
  }
  function removeIngredient(i: number) {
    setIngredients(ingredients.filter((_, idx) => idx !== i))
  }

  function addInstruction() {
    setInstructions([...instructions, { step: '' }])
  }
  function updateInstruction(i: number, patch: Partial<RecipeInstruction>) {
    const next = [...instructions]
    next[i] = { ...next[i], ...patch }
    setInstructions(next)
  }
  function removeInstruction(i: number) {
    setInstructions(instructions.filter((_, idx) => idx !== i))
  }

  function toggleRegion(slug: string) {
    setRecommendedRegions(
      recommendedRegions.includes(slug)
        ? recommendedRegions.filter((s) => s !== slug)
        : [...recommendedRegions, slug]
    )
  }
  function toggleCultivar(slug: string) {
    setRecommendedCultivars(
      recommendedCultivars.includes(slug)
        ? recommendedCultivars.filter((s) => s !== slug)
        : [...recommendedCultivars, slug]
    )
  }

  return (
    <div className="space-y-6">
      {/* Sticky toolbar */}
      <div className="sticky top-9 z-30 bg-white border border-off2 rounded-[var(--radius-card)] px-5 py-3 shadow-sm flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 mr-auto">
          <label className="text-[11px] text-text3 uppercase tracking-wider">Status:</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="border border-off2 rounded-md px-2 py-1 text-[13px]"
          >
            <option value="draft">draft</option>
            <option value="active">active</option>
            <option value="archived">archived</option>
          </select>
        </div>
        <a
          href={`/recept/${recipe.slug}`}
          target="_blank"
          rel="noopener"
          className="px-3 py-1.5 bg-white border border-off2 text-text rounded-lg text-[12px] hover:border-olive"
        >
          🔗 Náhled
        </a>
        <button
          onClick={deleteRecipe}
          className="px-3 py-1.5 bg-white border border-off2 text-text3 rounded-lg text-[12px] hover:border-red-300 hover:text-red-700"
        >
          🗑 Smazat
        </button>
        <button
          onClick={save}
          disabled={saving}
          className="px-4 py-1.5 bg-olive text-white rounded-lg text-[13px] font-medium hover:bg-olive-dark disabled:opacity-50"
        >
          {saving ? '⏳ Ukládám…' : '💾 Uložit'}
        </button>
      </div>

      {feedback && (
        <div
          className={`text-[12px] px-3 py-2 rounded-lg ${
            feedback.ok
              ? 'bg-olive-bg text-olive-dark border border-olive-border'
              : 'bg-red-50 text-red-700 border border-red-200'
          }`}
        >
          {feedback.msg}
        </div>
      )}

      {/* BLOK 1 — Základní info */}
      <AdminBlock
        number={1}
        icon="📝"
        title="Základní info"
        publicLocation="Hero stránky receptu — title, perex, emoji, fotka"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-[11px] font-medium text-text2 mb-1.5 uppercase tracking-wider">
              Název receptu
            </label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full border border-off2 rounded-lg px-3 py-2 text-[14px] focus:outline-none focus:border-olive"
            />
          </div>
          <div>
            <label className="block text-[11px] font-medium text-text2 mb-1.5 uppercase tracking-wider">
              Perex (krátký popis pod nadpisem)
            </label>
            <textarea
              value={excerpt}
              onChange={(e) => setExcerpt(e.target.value)}
              rows={2}
              maxLength={200}
              className="w-full border border-off2 rounded-lg px-3 py-2 text-[14px] resize-none focus:outline-none focus:border-olive"
            />
            <p className="text-[10px] text-text3 mt-0.5">{excerpt.length}/200</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <label className="block text-[11px] font-medium text-text2 mb-1.5 uppercase tracking-wider">
                Emoji
              </label>
              <input
                value={emoji}
                onChange={(e) => setEmoji(e.target.value)}
                className="w-full border border-off2 rounded-lg px-3 py-2 text-[20px] text-center"
                maxLength={4}
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-text2 mb-1.5 uppercase tracking-wider">
                Read time
              </label>
              <input
                value={readTime}
                onChange={(e) => setReadTime(e.target.value)}
                placeholder="5 min čtení"
                className="w-full border border-off2 rounded-lg px-3 py-2 text-[14px]"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-text2 mb-1.5 uppercase tracking-wider">
                Kuchyně
              </label>
              <select
                value={cuisine}
                onChange={(e) => setCuisine(e.target.value)}
                className="w-full border border-off2 rounded-lg px-3 py-2 text-[14px]"
              >
                {CUISINE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-medium text-text2 mb-1.5 uppercase tracking-wider">
                Náročnost
              </label>
              <select
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value)}
                className="w-full border border-off2 rounded-lg px-3 py-2 text-[14px]"
              >
                {DIFFICULTY_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-medium text-text2 mb-1.5 uppercase tracking-wider">
                Příprava (min)
              </label>
              <input
                type="number"
                value={prepTimeMin}
                onChange={(e) => setPrepTimeMin(e.target.value)}
                className="w-full border border-off2 rounded-lg px-3 py-2 text-[14px]"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-text2 mb-1.5 uppercase tracking-wider">
                Vaření (min)
              </label>
              <input
                type="number"
                value={cookTimeMin}
                onChange={(e) => setCookTimeMin(e.target.value)}
                className="w-full border border-off2 rounded-lg px-3 py-2 text-[14px]"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-text2 mb-1.5 uppercase tracking-wider">
                Porce
              </label>
              <input
                type="number"
                value={servings}
                onChange={(e) => setServings(e.target.value)}
                className="w-full border border-off2 rounded-lg px-3 py-2 text-[14px]"
              />
            </div>
          </div>
          <div>
            <label className="block text-[11px] font-medium text-text2 mb-1.5 uppercase tracking-wider">
              Hero image URL (volitelné)
            </label>
            <input
              value={heroImageUrl}
              onChange={(e) => setHeroImageUrl(e.target.value)}
              placeholder="https://..."
              className="w-full border border-off2 rounded-lg px-3 py-2 text-[14px]"
            />
          </div>
        </div>
      </AdminBlock>

      {/* BLOK 2 — Ingredience */}
      <AdminBlock
        number={2}
        icon="🥗"
        title="Suroviny"
        description="Strukturovaná data — Schema.org Recipe rich snippet eligible. Množství může být null pro 'podle chuti'."
      >
        <div className="space-y-2">
          {ingredients.map((ing, i) => (
            <div key={i} className="flex items-start gap-2">
              <input
                type="number"
                value={ing.amount ?? ''}
                onChange={(e) =>
                  updateIngredient(i, { amount: e.target.value ? Number(e.target.value) : null })
                }
                placeholder="—"
                className="w-20 border border-off2 rounded-lg px-2 py-1.5 text-[13px] text-center"
                step="0.1"
              />
              <input
                value={ing.unit}
                onChange={(e) => updateIngredient(i, { unit: e.target.value })}
                placeholder="ks / g / lžíce / podle chuti"
                className="w-32 border border-off2 rounded-lg px-2 py-1.5 text-[13px]"
              />
              <input
                value={ing.name}
                onChange={(e) => updateIngredient(i, { name: e.target.value })}
                placeholder="surovina"
                className="flex-1 border border-off2 rounded-lg px-2 py-1.5 text-[13px]"
              />
              <input
                value={ing.note ?? ''}
                onChange={(e) => updateIngredient(i, { note: e.target.value || undefined })}
                placeholder="poznámka (volitelné)"
                className="w-40 border border-off2 rounded-lg px-2 py-1.5 text-[12px] text-text3 italic"
              />
              <button
                onClick={() => removeIngredient(i)}
                className="text-text3 hover:text-red-600 px-2"
              >
                ✕
              </button>
            </div>
          ))}
          <button
            onClick={addIngredient}
            className="text-[12px] text-olive border border-olive-border rounded-md px-3 py-1.5 hover:bg-olive-bg/40"
          >
            + Přidat surovinu
          </button>
        </div>
      </AdminBlock>

      {/* BLOK 3 — Postup */}
      <AdminBlock
        number={3}
        icon="🔢"
        title="Postup"
        description="Krok po kroku. Doba (min) a poznámka jsou volitelné."
      >
        <div className="space-y-3">
          {instructions.map((inst, i) => (
            <div key={i} className="flex items-start gap-2">
              <span className="shrink-0 w-7 h-7 rounded-full bg-olive text-white text-[12px] font-bold flex items-center justify-center mt-0.5">
                {i + 1}
              </span>
              <div className="flex-1 space-y-1.5">
                <textarea
                  value={inst.step}
                  onChange={(e) => updateInstruction(i, { step: e.target.value })}
                  rows={2}
                  placeholder="Co udělat v tomto kroku…"
                  className="w-full border border-off2 rounded-lg px-3 py-2 text-[13px] resize-none focus:outline-none focus:border-olive"
                />
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={inst.duration_min ?? ''}
                    onChange={(e) =>
                      updateInstruction(i, {
                        duration_min: e.target.value ? Number(e.target.value) : undefined,
                      })
                    }
                    placeholder="min"
                    className="w-20 border border-off2 rounded-lg px-2 py-1 text-[12px]"
                  />
                  <input
                    value={inst.note ?? ''}
                    onChange={(e) =>
                      updateInstruction(i, { note: e.target.value || undefined })
                    }
                    placeholder="tip / poznámka"
                    className="flex-1 border border-off2 rounded-lg px-2 py-1 text-[12px] italic"
                  />
                </div>
              </div>
              <button
                onClick={() => removeInstruction(i)}
                className="text-text3 hover:text-red-600 px-2 mt-1"
              >
                ✕
              </button>
            </div>
          ))}
          <button
            onClick={addInstruction}
            className="text-[12px] text-olive border border-olive-border rounded-md px-3 py-1.5 hover:bg-olive-bg/40"
          >
            + Přidat krok
          </button>
        </div>
      </AdminBlock>

      {/* BLOK 4 — Editorial body */}
      <AdminBlock
        number={4}
        icon="📖"
        title="Editorial obsah (volitelný)"
        publicLocation="Pod postupem — tipy, kontext, doporučení"
        description="Markdown s ## H2, ### H3. Místo pro 'Tipy', 'Doporučené oleje', 'Variace'."
      >
        <textarea
          value={bodyMarkdown}
          onChange={(e) => setBodyMarkdown(e.target.value)}
          rows={15}
          placeholder={`## Tipy\nProč tenhle recept?...\n\n## Doporučené oleje\nProč právě apulský Coratina...`}
          className="w-full border border-off2 rounded-lg px-3 py-2 text-[13px] font-mono resize-y focus:outline-none focus:border-olive"
        />
      </AdminBlock>

      {/* BLOK 5 — Pairing */}
      <AdminBlock
        number={5}
        icon="🔗"
        title="Doporučené oleje (pairing)"
        publicLocation="Sekce 'Doporučené oleje k tomuto receptu' + newsletter"
        description="Vyber regiony a odrůdy ke kterým se recept hodí. Public stránka pak najde produkty z těchto regionů/odrůd a zobrazí je jako paired oils."
      >
        <div className="space-y-4">
          <div>
            <label className="block text-[11px] font-medium text-text2 mb-2 uppercase tracking-wider">
              🗺️ Regiony ({recommendedRegions.length} vybráno)
            </label>
            <div className="flex flex-wrap gap-1.5">
              {availableRegions.map((slug) => {
                const active = recommendedRegions.includes(slug)
                return (
                  <button
                    key={slug}
                    onClick={() => toggleRegion(slug)}
                    className={`text-[11px] px-2.5 py-1 rounded-full border transition-colors ${
                      active
                        ? 'bg-olive text-white border-olive'
                        : 'bg-white text-text2 border-off2 hover:border-olive-light'
                    }`}
                  >
                    {slug}
                  </button>
                )
              })}
            </div>
          </div>
          <div>
            <label className="block text-[11px] font-medium text-text2 mb-2 uppercase tracking-wider">
              🌿 Odrůdy ({recommendedCultivars.length} vybráno)
            </label>
            <div className="flex flex-wrap gap-1.5">
              {availableCultivars.map((slug) => {
                const active = recommendedCultivars.includes(slug)
                return (
                  <button
                    key={slug}
                    onClick={() => toggleCultivar(slug)}
                    className={`text-[11px] px-2.5 py-1 rounded-full border transition-colors ${
                      active
                        ? 'bg-olive text-white border-olive'
                        : 'bg-white text-text2 border-off2 hover:border-olive-light'
                    }`}
                  >
                    {slug}
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      </AdminBlock>

      {/* BLOK 6 — SEO */}
      <AdminBlock
        number={6}
        icon="🔍"
        title="SEO"
        publicLocation="HTML <title> + meta description (Google výsledky)"
      >
        <div className="space-y-3">
          <div>
            <label className="block text-[11px] font-medium text-text2 mb-1.5 uppercase tracking-wider">
              Meta title (max 70)
            </label>
            <input
              value={metaTitle}
              onChange={(e) => setMetaTitle(e.target.value)}
              maxLength={70}
              className="w-full border border-off2 rounded-lg px-3 py-2 text-[14px]"
            />
            <p className="text-[10px] text-text3 mt-0.5">{metaTitle.length}/70</p>
          </div>
          <div>
            <label className="block text-[11px] font-medium text-text2 mb-1.5 uppercase tracking-wider">
              Meta description (max 160)
            </label>
            <textarea
              value={metaDescription}
              onChange={(e) => setMetaDescription(e.target.value)}
              maxLength={160}
              rows={2}
              className="w-full border border-off2 rounded-lg px-3 py-2 text-[14px] resize-none"
            />
            <p className="text-[10px] text-text3 mt-0.5">{metaDescription.length}/160</p>
          </div>
        </div>
      </AdminBlock>
    </div>
  )
}
