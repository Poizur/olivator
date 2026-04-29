'use client'

// Modal s AI návrhem doplňků pro entity stránku.
// Admin vidí preview, vybere co použít (checkboxy), klikne Apply.
// Apply zavolá:
//   - PATCH /api/admin/entities pro pole (tldr, terroir, timeline, nickname, ...)
//   - POST /api/admin/entity-faqs pro FAQ
//
// Po Apply se page refreshne (router.refresh()).

import { useState } from 'react'
import { useRouter } from 'next/navigation'

type EntityType = 'region' | 'brand' | 'cultivar'

interface FaqItem {
  question: string
  answer: string
}

interface RegionExtras {
  tldr: string
  terroir: { climate: string; soil: string; tradition: string }
  faqs: FaqItem[]
}

interface BrandExtras {
  tldr: string
  timeline: Array<{ year: number; label: string; description?: string }>
  faqs: FaqItem[]
}

interface CultivarExtras {
  tldr: string
  nickname: string
  primary_use: string
  pairing_pros: string[]
  pairing_cons: string[]
  faqs: FaqItem[]
}

type ExtrasUnion = RegionExtras | BrandExtras | CultivarExtras

interface Props {
  entityType: EntityType
  slug: string
  entityId: string
  isOpen: boolean
  onClose: () => void
}

export function EntityExtrasModal({ entityType, slug, entityId, isOpen, onClose }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [extras, setExtras] = useState<ExtrasUnion | null>(null)

  // Selection state — admin si zaškrtá co chce použít
  const [useTldr, setUseTldr] = useState(true)
  const [useTerroir, setUseTerroir] = useState(true)
  const [useTimeline, setUseTimeline] = useState(true)
  const [useNickname, setUseNickname] = useState(true)
  const [usePrimaryUse, setUsePrimaryUse] = useState(true)
  const [usePairing, setUsePairing] = useState(true)
  const [selectedFaqs, setSelectedFaqs] = useState<Set<number>>(new Set())

  const [applying, setApplying] = useState(false)
  const [applyResult, setApplyResult] = useState<string | null>(null)

  async function generate() {
    setLoading(true)
    setError(null)
    setExtras(null)
    try {
      const res = await fetch('/api/admin/generate-entity-extras', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entityType, slug }),
      })
      const json = await res.json()
      if (!json.ok) throw new Error(json.error)
      setExtras(json.extras as ExtrasUnion)
      // All FAQs selected by default
      setSelectedFaqs(new Set((json.extras.faqs ?? []).map((_: unknown, i: number) => i)))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Chyba')
    } finally {
      setLoading(false)
    }
  }

  async function apply() {
    if (!extras) return
    setApplying(true)
    setApplyResult(null)
    setError(null)

    try {
      // 1) Sestavit data pro PATCH /api/admin/entities
      const payload: Record<string, unknown> = {}
      if (useTldr && extras.tldr) payload.tldr = extras.tldr

      if (entityType === 'region') {
        const r = extras as RegionExtras
        if (useTerroir) {
          const t: Record<string, string> = {}
          if (r.terroir.climate) t.climate = r.terroir.climate
          if (r.terroir.soil) t.soil = r.terroir.soil
          if (r.terroir.tradition) t.tradition = r.terroir.tradition
          payload.terroir = t
        }
      }

      if (entityType === 'brand') {
        const b = extras as BrandExtras
        if (useTimeline) payload.timeline = b.timeline
      }

      if (entityType === 'cultivar') {
        const c = extras as CultivarExtras
        if (useNickname && c.nickname) payload.nickname = c.nickname
        if (usePrimaryUse && c.primary_use) payload.primary_use = c.primary_use
        if (usePairing) {
          payload.pairing_pros = c.pairing_pros
          payload.pairing_cons = c.pairing_cons
        }
      }

      // 2) Uložit pole entity (jen pokud je co)
      if (Object.keys(payload).length > 0) {
        const r = await fetch('/api/admin/entities', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ entityType, slug, data: payload }),
        })
        const j = await r.json()
        if (!j.ok) throw new Error(j.error || 'PATCH entities failed')
      }

      // 3) Uložit FAQ (per item)
      let faqsAdded = 0
      const selectedFaqList = (extras.faqs ?? []).filter((_, i) => selectedFaqs.has(i))
      for (let i = 0; i < selectedFaqList.length; i++) {
        const f = selectedFaqList[i]
        const r = await fetch('/api/admin/entity-faqs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            entityType,
            entityId,
            question: f.question,
            answer: f.answer,
            sortOrder: i,
          }),
        })
        const j = await r.json()
        if (j.ok) faqsAdded++
      }

      setApplyResult(
        `✓ Aplikováno. ${Object.keys(payload).length} pole + ${faqsAdded} FAQ. Stránka se obnoví.`
      )
      // Refresh page po 1s
      setTimeout(() => {
        router.refresh()
        onClose()
      }, 1000)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Chyba')
    } finally {
      setApplying(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[100] bg-black/50 flex items-center justify-center p-4 overflow-y-auto">
      <div
        className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 border-b border-off2 flex items-center justify-between sticky top-0 bg-white z-10">
          <div>
            <h2 className="text-lg font-semibold text-text">AI návrh doplňků</h2>
            <p className="text-xs text-text3">
              {entityType} · {slug}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-text3 hover:text-text text-xl px-2"
            aria-label="Zavřít"
          >
            ×
          </button>
        </div>

        <div className="p-6">
          {!extras && !loading && (
            <div className="text-center py-8">
              <p className="text-sm text-text2 mb-4">
                Claude vygeneruje TL;DR, {entityType === 'region' ? 'terroir' : entityType === 'brand' ? 'časovou osu' : 'pairing + přezdívku'} a 4-6 FAQ.
                <br />
                Ty pak vybereš co použít a klikneš Aplikovat.
              </p>
              <button
                onClick={generate}
                className="px-5 py-2.5 bg-olive text-white rounded-lg text-sm font-medium hover:bg-olive-dark"
              >
                ✨ Vygenerovat návrh
              </button>
            </div>
          )}

          {loading && (
            <div className="text-center py-12">
              <p className="text-sm text-text3">⏳ Claude přemýšlí (15-30 s)…</p>
            </div>
          )}

          {error && (
            <div className="bg-terra-bg border border-terra/30 rounded-lg p-3 mb-4">
              <p className="text-sm text-terra">{error}</p>
            </div>
          )}

          {extras && (
            <div className="space-y-5">
              {/* TL;DR */}
              {extras.tldr && (
                <Section
                  title="TL;DR"
                  selected={useTldr}
                  onToggle={() => setUseTldr(!useTldr)}
                >
                  <p className="text-sm text-text leading-relaxed">{extras.tldr}</p>
                </Section>
              )}

              {/* Region: terroir */}
              {entityType === 'region' && (extras as RegionExtras).terroir && (
                <Section
                  title="Terroir"
                  selected={useTerroir}
                  onToggle={() => setUseTerroir(!useTerroir)}
                >
                  <div className="space-y-2 text-sm text-text">
                    {(extras as RegionExtras).terroir.climate && (
                      <div>
                        <strong className="text-text2">Klima:</strong>{' '}
                        {(extras as RegionExtras).terroir.climate}
                      </div>
                    )}
                    {(extras as RegionExtras).terroir.soil && (
                      <div>
                        <strong className="text-text2">Půda:</strong>{' '}
                        {(extras as RegionExtras).terroir.soil}
                      </div>
                    )}
                    {(extras as RegionExtras).terroir.tradition && (
                      <div>
                        <strong className="text-text2">Tradice:</strong>{' '}
                        {(extras as RegionExtras).terroir.tradition}
                      </div>
                    )}
                  </div>
                </Section>
              )}

              {/* Brand: timeline */}
              {entityType === 'brand' && (extras as BrandExtras).timeline.length > 0 && (
                <Section
                  title={`Časová osa (${(extras as BrandExtras).timeline.length} milníků)`}
                  selected={useTimeline}
                  onToggle={() => setUseTimeline(!useTimeline)}
                >
                  <ul className="space-y-1.5 text-sm">
                    {(extras as BrandExtras).timeline.map((m, i) => (
                      <li key={i} className="flex gap-3">
                        <span className="text-olive font-bold tabular-nums w-12 shrink-0">
                          {m.year}
                        </span>
                        <span className="text-text">
                          {m.label}
                          {m.description && (
                            <span className="text-text3 italic">
                              {' '}
                              — {m.description}
                            </span>
                          )}
                        </span>
                      </li>
                    ))}
                  </ul>
                </Section>
              )}

              {/* Cultivar: nickname + primary_use */}
              {entityType === 'cultivar' && (
                <>
                  {(extras as CultivarExtras).nickname && (
                    <Section
                      title="Přezdívka"
                      selected={useNickname}
                      onToggle={() => setUseNickname(!useNickname)}
                    >
                      <p className="text-sm text-text italic">
                        „{(extras as CultivarExtras).nickname}"
                      </p>
                    </Section>
                  )}
                  {(extras as CultivarExtras).primary_use && (
                    <Section
                      title="Typ použití"
                      selected={usePrimaryUse}
                      onToggle={() => setUsePrimaryUse(!usePrimaryUse)}
                    >
                      <code className="text-sm text-olive bg-olive-bg px-2 py-0.5 rounded">
                        {(extras as CultivarExtras).primary_use}
                      </code>
                    </Section>
                  )}
                  {((extras as CultivarExtras).pairing_pros.length > 0 ||
                    (extras as CultivarExtras).pairing_cons.length > 0) && (
                    <Section
                      title="Pairing — kam se hodí / spíš ne"
                      selected={usePairing}
                      onToggle={() => setUsePairing(!usePairing)}
                    >
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <strong className="text-olive text-xs uppercase tracking-wider">
                            Hodí se k
                          </strong>
                          <ul className="mt-1.5 space-y-0.5">
                            {(extras as CultivarExtras).pairing_pros.map((p, i) => (
                              <li key={i} className="text-text">
                                + {p}
                              </li>
                            ))}
                          </ul>
                        </div>
                        <div>
                          <strong className="text-terra text-xs uppercase tracking-wider">
                            Spíš ne k
                          </strong>
                          <ul className="mt-1.5 space-y-0.5">
                            {(extras as CultivarExtras).pairing_cons.map((p, i) => (
                              <li key={i} className="text-text">
                                − {p}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </Section>
                  )}
                </>
              )}

              {/* FAQs */}
              {extras.faqs.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-medium text-text">FAQ ({extras.faqs.length})</h3>
                    <div className="flex gap-2 text-xs">
                      <button
                        onClick={() =>
                          setSelectedFaqs(new Set(extras.faqs.map((_, i) => i)))
                        }
                        className="text-olive hover:underline"
                      >
                        vybrat vše
                      </button>
                      <span className="text-text3">·</span>
                      <button
                        onClick={() => setSelectedFaqs(new Set())}
                        className="text-text3 hover:text-text"
                      >
                        zrušit vše
                      </button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    {extras.faqs.map((f, i) => (
                      <FaqRow
                        key={i}
                        faq={f}
                        selected={selectedFaqs.has(i)}
                        onToggle={() => {
                          const next = new Set(selectedFaqs)
                          if (next.has(i)) next.delete(i)
                          else next.add(i)
                          setSelectedFaqs(next)
                        }}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Apply button */}
              <div className="border-t border-off2 pt-5 flex items-center gap-3">
                <button
                  onClick={apply}
                  disabled={applying}
                  className="px-5 py-2.5 bg-olive text-white rounded-lg text-sm font-medium hover:bg-olive-dark disabled:opacity-50"
                >
                  {applying ? 'Ukládám…' : 'Aplikovat vybrané'}
                </button>
                <button
                  onClick={generate}
                  disabled={applying}
                  className="px-3 py-2.5 bg-white border border-off2 text-text2 rounded-lg text-xs hover:border-olive-light"
                >
                  Vygenerovat znovu
                </button>
                {applyResult && (
                  <span className="text-sm text-olive-dark">{applyResult}</span>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function Section({
  title,
  selected,
  onToggle,
  children,
}: {
  title: string
  selected: boolean
  onToggle: () => void
  children: React.ReactNode
}) {
  return (
    <div
      className={`border rounded-lg p-3 transition-colors ${
        selected ? 'border-olive-border bg-olive-bg/30' : 'border-off2 bg-off/30 opacity-60'
      }`}
    >
      <label className="flex items-start gap-3 cursor-pointer">
        <input
          type="checkbox"
          checked={selected}
          onChange={onToggle}
          className="mt-1 accent-olive"
        />
        <div className="flex-1 min-w-0">
          <div className="text-xs font-semibold text-text2 uppercase tracking-wider mb-2">
            {title}
          </div>
          {children}
        </div>
      </label>
    </div>
  )
}

function FaqRow({
  faq,
  selected,
  onToggle,
}: {
  faq: FaqItem
  selected: boolean
  onToggle: () => void
}) {
  return (
    <label
      className={`flex items-start gap-3 border rounded-lg p-3 cursor-pointer transition-colors ${
        selected ? 'border-olive-border bg-olive-bg/30' : 'border-off2 bg-off/30 opacity-60'
      }`}
    >
      <input
        type="checkbox"
        checked={selected}
        onChange={onToggle}
        className="mt-1 accent-olive"
      />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-text mb-1">{faq.question}</p>
        <p className="text-xs text-text2 leading-snug">{faq.answer}</p>
      </div>
    </label>
  )
}
