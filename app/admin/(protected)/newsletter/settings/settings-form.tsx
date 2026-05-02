'use client'

import { useState } from 'react'
import { AdminBlock } from '@/components/admin-block'

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
