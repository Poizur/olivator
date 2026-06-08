'use client'

import { useState, useEffect, useRef } from 'react'
import { AdminBlock } from '@/components/admin-block'

interface ProductHit {
  id: string
  slug: string
  name: string
  name_short: string | null
  image_url: string | null
  olivator_score: number | null
  origin_country: string | null
}

function TipPicker({
  selectedSlug,
  selectedName,
  message,
  onSelect,
  onMessageChange,
  onClear,
  saving,
  onSave,
}: {
  selectedSlug: string
  selectedName: string
  message: string
  onSelect: (slug: string, name: string) => void
  onMessageChange: (v: string) => void
  onClear: () => void
  saving: boolean
  onSave: () => void
}) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<ProductHit[]>([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null)
  const wrapperRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  function search(q: string) {
    setQuery(q)
    if (debounce.current) clearTimeout(debounce.current)
    if (q.length < 2) { setResults([]); setOpen(false); return }
    debounce.current = setTimeout(async () => {
      setLoading(true)
      try {
        const res = await fetch(`/api/admin/newsletter/product-search?q=${encodeURIComponent(q)}&limit=8`)
        const data = await res.json()
        setResults(Array.isArray(data) ? data : [])
        setOpen(true)
      } finally {
        setLoading(false)
      }
    }, 300)
  }

  function pick(hit: ProductHit) {
    onSelect(hit.slug, hit.name_short ?? hit.name)
    setQuery('')
    setResults([])
    setOpen(false)
  }

  return (
    <div className="py-2 space-y-3">
      {selectedSlug ? (
        <div className="flex items-center gap-3 bg-olive4 border border-olive5 rounded-xl px-4 py-3">
          <span className="text-olive text-[18px]">💡</span>
          <div className="flex-1 min-w-0">
            <div className="text-[13px] font-semibold text-olive2 truncate">{selectedName}</div>
            <div className="text-[11px] text-olive font-mono">{selectedSlug}</div>
          </div>
          <button onClick={onClear} className="text-text3 hover:text-red-500 shrink-0 text-[18px] leading-none">×</button>
        </div>
      ) : (
        <div ref={wrapperRef} className="relative">
          <input
            type="text"
            value={query}
            onChange={(e) => search(e.target.value)}
            onFocus={() => results.length > 0 && setOpen(true)}
            placeholder="Hledat produkt podle názvu…"
            className="w-full border border-off2 rounded-xl px-3 py-2 text-[13px] focus:outline-none focus:border-olive"
          />
          {loading && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-text3 text-[11px]">…</span>
          )}
          {open && results.length > 0 && (
            <div className="absolute z-50 left-0 right-0 top-full mt-1 bg-white border border-off2 rounded-xl shadow-lg overflow-hidden">
              {results.map((hit) => (
                <button
                  key={hit.slug}
                  onClick={() => pick(hit)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-off text-left"
                >
                  {hit.image_url && (
                    <img src={hit.image_url} alt="" className="w-8 h-8 object-contain rounded shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] font-medium text-text truncate">
                      {hit.name_short ?? hit.name}
                    </div>
                    <div className="text-[11px] text-text3 font-mono truncate">{hit.slug}</div>
                  </div>
                  {hit.olivator_score && (
                    <span className="shrink-0 text-[11px] font-bold text-white bg-terra rounded-full px-2 py-0.5">
                      {hit.olivator_score}
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <div>
        <label className="block text-[11px] font-medium text-text2 uppercase tracking-wider mb-1">
          Tvůj vzkaz (proč doporučuješ — zobrazí se v emailu)
        </label>
        <textarea
          value={message}
          onChange={(e) => onMessageChange(e.target.value.slice(0, 200))}
          placeholder="Např: Tento týden jsme domluvili výjimečné podmínky s Olivio.cz — výborná kyselost pod 0,2 % za skvělou cenu."
          rows={3}
          className="w-full border border-off2 rounded-xl px-3 py-2 text-[13px] focus:outline-none focus:border-olive resize-none"
        />
        <div className="text-[10px] text-text3 mt-0.5">{message.length}/200</div>
      </div>

      {selectedSlug && (
        <button
          onClick={onSave}
          disabled={saving}
          className="text-[12px] bg-olive text-white rounded-full px-4 py-1.5 font-medium disabled:opacity-40"
        >
          {saving ? 'Ukládám…' : '💾 Uložit tip pro příští newsletter'}
        </button>
      )}
    </div>
  )
}

interface Props {
  initial: Record<string, unknown>
}

const DAYS = ['', 'Pondělí', 'Úterý', 'Středa', 'Čtvrtek', 'Pátek', 'Sobota', 'Neděle']

export function SettingsForm({ initial }: Props) {
  const [values, setValues] = useState<Record<string, unknown>>(initial)
  const [saving, setSaving] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<string | null>(null)

  function set<T>(key: string, value: T) {
    setValues((v) => ({ ...v, [key]: value }))
  }

  async function save(key: string, value: unknown) {
    setSaving(key)
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [key]: value }),
      })
      if (!res.ok) throw new Error('Save failed')
      setFeedback('✅ Uloženo')
      setTimeout(() => setFeedback(null), 2000)
    } catch {
      setFeedback('⚠ Chyba')
      setTimeout(() => setFeedback(null), 3000)
    } finally {
      setSaving(null)
    }
  }

  function Toggle({ k, label, description }: { k: string; label: string; description: string }) {
    const checked = !!values[k]
    return (
      <label className="flex items-start gap-3 py-2 cursor-pointer">
        <button
          type="button"
          onClick={() => {
            const next = !checked
            set(k, next)
            save(k, next)
          }}
          disabled={saving === k}
          className={`relative w-10 h-6 rounded-full transition-colors mt-0.5 shrink-0 ${
            checked ? 'bg-olive' : 'bg-off2'
          } disabled:opacity-50`}
        >
          <span
            className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${
              checked ? 'translate-x-4' : ''
            }`}
          />
        </button>
        <div className="flex-1 min-w-0">
          <div className="text-[14px] font-medium text-text leading-tight">{label}</div>
          <div className="text-[12px] text-text3 mt-0.5 leading-snug">{description}</div>
        </div>
      </label>
    )
  }

  return (
    <div className="space-y-6">
      {feedback && (
        <div className="text-[12px] text-text2 bg-olive-bg border border-olive-border rounded-lg px-3 py-2">
          {feedback}
        </div>
      )}

      <AdminBlock
        number={1}
        icon="🎚"
        title="Master switch"
        description="Pokud vypneš, žádné newsletter automatizace neběží — ani test, ani cron."
      >
        <Toggle
          k="newsletter_enabled"
          label="Newsletter systém aktivní"
          description="Top-level switch. Cron joby tohle kontrolují jako první."
        />
      </AdminBlock>

      <AdminBlock
        number={2}
        icon="📅"
        title="Týdenní souhrn"
        description="Hlavní kampaň — Olej týdne, slevy, recept, fact."
      >
        <Toggle
          k="newsletter_weekly_enabled"
          label="Vytvářet a posílat týdenní souhrn"
          description="Středa 18:00 generuje draft, čtvrtek 8:00 se odesílá (po schválení)."
        />
        <div className="grid grid-cols-2 gap-3 mt-3">
          <div>
            <label className="block text-[11px] font-medium text-text2 mb-1.5 uppercase tracking-wider">
              Den odesílání
            </label>
            <select
              value={(values.newsletter_weekly_day as number) ?? 4}
              onChange={(e) => {
                const v = Number(e.target.value)
                set('newsletter_weekly_day', v)
                save('newsletter_weekly_day', v)
              }}
              disabled={saving === 'newsletter_weekly_day'}
              className="w-full border border-off2 rounded-lg px-3 py-2 text-[13px]"
            >
              {[1, 2, 3, 4, 5, 6, 7].map((d) => (
                <option key={d} value={d}>{DAYS[d]}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-medium text-text2 mb-1.5 uppercase tracking-wider">
              Hodina odesílání (UTC)
            </label>
            <input
              type="number"
              min={0}
              max={23}
              value={(values.newsletter_weekly_send_hour as number) ?? 8}
              onChange={(e) => set('newsletter_weekly_send_hour', Number(e.target.value))}
              onBlur={(e) => save('newsletter_weekly_send_hour', Number(e.target.value))}
              className="w-full border border-off2 rounded-lg px-3 py-2 text-[13px]"
            />
          </div>
        </div>
      </AdminBlock>

      <AdminBlock
        number={3}
        icon="📉"
        title="Slevové kampaně"
        description="Ad hoc — když systém najde výrazné poklesy cen."
      >
        <Toggle
          k="newsletter_deals_enabled"
          label="Aktivní"
          description="Detekuje drops nad threshold a vytváří draft (zatím manual review)."
        />
        <div className="mt-3">
          <label className="block text-[11px] font-medium text-text2 mb-1.5 uppercase tracking-wider">
            Minimální drop pro zařazení (%)
          </label>
          <input
            type="number"
            min={5}
            max={50}
            value={(values.newsletter_deals_min_drop_pct as number) ?? 15}
            onChange={(e) => set('newsletter_deals_min_drop_pct', Number(e.target.value))}
            onBlur={(e) => save('newsletter_deals_min_drop_pct', Number(e.target.value))}
            className="w-32 border border-off2 rounded-lg px-3 py-2 text-[13px]"
          />
          <p className="text-[11px] text-text3 mt-1">
            Default 15 % — nižší = víc kampaní, vyšší = jen reálně výrazné slevy
          </p>
        </div>
      </AdminBlock>

      <AdminBlock
        number={4}
        icon="🔔"
        title="Cenové alerty"
        description="Per-user trigger emaily — uživatel sleduje konkrétní olej."
      >
        <Toggle
          k="newsletter_alerts_enabled"
          label="Aktivní"
          description="Cron 1× denně zkontroluje aktivní alerty a pošle email pokud cena klesla pod threshold."
        />
      </AdminBlock>

      <AdminBlock
        number={5}
        icon="📌"
        title="Preferovaný produkt pro příští newsletter"
        description="Vlož slug produktu — ten bude použit jako Olej týdne místo automatického výběru. Po vygenerování draftu se pole automaticky smaže."
      >
        <div className="py-2 space-y-2">
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={(values['newsletter_pinned_product'] as string) ?? ''}
              onChange={(e) => set('newsletter_pinned_product', e.target.value)}
              placeholder="např. corinto-pelopones-manaki-5l"
              className="flex-1 border border-off2 rounded-lg px-3 py-2 text-[13px] font-mono focus:outline-none focus:border-olive"
            />
            <button
              onClick={() => save('newsletter_pinned_product', values['newsletter_pinned_product'] ?? '')}
              disabled={saving === 'newsletter_pinned_product'}
              className="text-[12px] bg-olive text-white rounded-full px-4 py-2 font-medium disabled:opacity-40 shrink-0"
            >
              {saving === 'newsletter_pinned_product' ? 'Ukládám…' : 'Uložit'}
            </button>
            {(values['newsletter_pinned_product'] as string) && (
              <button
                onClick={() => { set('newsletter_pinned_product', ''); save('newsletter_pinned_product', '') }}
                className="text-[12px] text-text3 hover:text-red-600 shrink-0"
                title="Smazat"
              >
                ✕
              </button>
            )}
          </div>
          <p className="text-[11px] text-text3">
            Slug najdeš v URL produktu: olivator.cz/olej/<strong>tento-slug</strong>
          </p>
          {(values['newsletter_pinned_product'] as string) && (
            <div className="text-[11px] bg-amber-50 border border-amber-200 text-amber-800 rounded-lg px-3 py-2">
              📌 Aktivní pin: <strong>{values['newsletter_pinned_product'] as string}</strong> — použije se v příštím draftu
            </div>
          )}
        </div>
      </AdminBlock>

      <AdminBlock
        number={6}
        icon="💡"
        title="Náš tip — doporučení pro příští newsletter"
        description="Vyber produkt který chceš tento týden doporučit. Zobrazí se jako samostatný blok v emailu. Po vygenerování draftu se automaticky smaže."
      >
        <TipPicker
          selectedSlug={(values['newsletter_tip_product'] as string) ?? ''}
          selectedName={((values['_tip_name'] as string) || (values['newsletter_tip_product'] as string)) ?? ''}
          message={(values['newsletter_tip_message'] as string) ?? ''}
          onSelect={(slug, name) => {
            set('newsletter_tip_product', slug)
            set('_tip_name', name)
          }}
          onMessageChange={(v) => set('newsletter_tip_message', v)}
          onClear={() => {
            set('newsletter_tip_product', '')
            set('_tip_name', '')
            set('newsletter_tip_message', '')
            save('newsletter_tip_product', '')
            save('newsletter_tip_message', '')
          }}
          saving={saving === 'newsletter_tip_product'}
          onSave={() => {
            save('newsletter_tip_product', values['newsletter_tip_product'] ?? '')
            save('newsletter_tip_message', values['newsletter_tip_message'] ?? '')
          }}
        />
      </AdminBlock>

      <AdminBlock
        number={7}
        icon="⚠️"
        title="Pokročilé"
        description="Pozor — používej s rozvahou."
      >
        <Toggle
          k="newsletter_auto_send"
          label="Auto-send bez schválení"
          description="POZOR: pokud true, drafty se odešlou bez tvého schválení. Doporučuji nechat false a vždy ručně schválit."
        />
        <div className="mt-2">
          <Toggle
            k="newsletter_test_mode"
            label="Test mode"
            description="Pokud true, všechny kampaně jdou pouze na admin email (notification_email). Subscribers nic nedostanou."
          />
        </div>
      </AdminBlock>
    </div>
  )
}
