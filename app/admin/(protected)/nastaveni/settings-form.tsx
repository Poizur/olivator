'use client'

import { useState } from 'react'

interface SettingsFormProps {
  initialValues: Record<string, unknown>
  defs: Record<string, { description: string }>
}

const KNOWN_SHOPS = [
  { slug: 'reckonasbavi', label: 'Řecko nás baví (shop.reckonasbavi.cz)' },
  { slug: 'olivio', label: 'Olivio.cz' },
  { slug: 'gaea', label: 'Gaea.cz' },
  { slug: 'mujbio', label: 'MujBio.cz' },
  { slug: 'zdravasila', label: 'Zdravasila.cz' },
  { slug: 'olivovyolej', label: 'Olivovyolej.cz' },
  { slug: 'rohlik', label: 'Rohlík.cz' },
  { slug: 'kosik', label: 'Košík.cz' },
  { slug: 'mall', label: 'Mall.cz' },
]

export function SettingsForm({ initialValues, defs }: SettingsFormProps) {
  const [values, setValues] = useState<Record<string, unknown>>(initialValues)
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  function update(key: string, value: unknown) {
    setValues(prev => ({ ...prev, [key]: value }))
  }

  async function onSave() {
    setSaving(true)
    setError(null)
    setStatus(null)
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setStatus(`✓ Uloženo: ${data.updated?.length ?? 0} nastavení`)
      setTimeout(() => setStatus(null), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Chyba')
    } finally {
      setSaving(false)
    }
  }

  const enabledShops = Array.isArray(values.discovery_enabled_shops)
    ? (values.discovery_enabled_shops as string[])
    : []

  function toggleShop(slug: string) {
    if (enabledShops.includes(slug)) {
      update('discovery_enabled_shops', enabledShops.filter(s => s !== slug))
    } else {
      update('discovery_enabled_shops', [...enabledShops, slug])
    }
  }

  return (
    <div className="space-y-6">
      {/* Notifications */}
      <Section title="📧 Notifikace" subtitle="E-maily z agentů (souhrny, alerty)">
        <Field label="E-mail příjemce" desc={defs.notification_email?.description}>
          <input
            type="email"
            value={values.notification_email as string ?? ''}
            onChange={e => update('notification_email', e.target.value)}
            placeholder="admin@example.com"
            className={inputCls}
          />
        </Field>
      </Section>

      {/* Discovery */}
      <Section title="🔍 Hledání nových olejů" subtitle="Agent procházející e-shopy">
        <Field label="Maximální počet nálezů za 1 běh" desc={defs.discovery_daily_limit?.description}>
          <input
            type="number"
            min={1}
            max={50}
            value={Number(values.discovery_daily_limit ?? 5)}
            onChange={e => update('discovery_daily_limit', Number(e.target.value) || 5)}
            className={`${inputCls} w-24`}
          />
        </Field>

        <Field
          label="Automaticky publikovat olej když má kompletní data"
          desc={defs.discovery_auto_publish?.description}
        >
          <label className="inline-flex items-center gap-2">
            <input
              type="checkbox"
              checked={values.discovery_auto_publish === true || values.discovery_auto_publish === 'true'}
              onChange={e => update('discovery_auto_publish', e.target.checked)}
            />
            <span className="text-[13px] text-text2">
              {values.discovery_auto_publish ? 'Zapnuto — nálezy se publikují automaticky' : 'Vypnuto — vše čeká na schválení'}
            </span>
          </label>
        </Field>

        <Field label="Aktivní e-shopy" desc={defs.discovery_enabled_shops?.description}>
          <div className="flex flex-wrap gap-2">
            {KNOWN_SHOPS.map(s => (
              <button
                key={s.slug}
                type="button"
                onClick={() => toggleShop(s.slug)}
                className={`text-xs px-3 py-1.5 rounded-full border transition-colors cursor-pointer ${
                  enabledShops.includes(s.slug)
                    ? 'bg-olive text-white border-olive'
                    : 'bg-white border-off2 text-text2 hover:border-olive-light hover:text-olive'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </Field>

        <Field label="Cron schedule" desc={defs.discovery_schedule_cron?.description}>
          <input
            type="text"
            value={values.discovery_schedule_cron as string ?? '0 4 * * 1'}
            onChange={e => update('discovery_schedule_cron', e.target.value)}
            className={`${inputCls} font-mono w-48`}
          />
          <span className="text-[11px] text-text3 ml-2">
            Default <code className="bg-off px-1 rounded">0 4 * * 1</code> = pondělí 4:00 UTC
          </span>
        </Field>
      </Section>

      {/* Sticky save bar */}
      <div className="sticky bottom-4 bg-white border border-off2 rounded-[var(--radius-card)] p-4 shadow-sm flex items-center gap-3 flex-wrap">
        <button
          type="button"
          onClick={onSave}
          disabled={saving}
          className="bg-olive text-white rounded-lg px-5 py-2.5 text-sm font-medium hover:bg-olive-dark disabled:opacity-40 transition-colors"
        >
          {saving ? '💾 Ukládám...' : '💾 Uložit nastavení'}
        </button>
        {status && (
          <span className="text-[12px] text-olive-dark bg-olive-bg border border-olive-border rounded px-2 py-1">
            {status}
          </span>
        )}
        {error && (
          <span className="text-[12px] text-red-600 bg-red-50 border border-red-200 rounded px-2 py-1">
            ⚠ {error}
          </span>
        )}
      </div>
    </div>
  )
}

const inputCls =
  'px-3 py-2 border border-off2 rounded-lg text-sm focus:outline-none focus:border-olive'

function Section({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-off2 rounded-[var(--radius-card)] p-6 space-y-4">
      <div>
        <div className="text-base font-semibold text-text">{title}</div>
        {subtitle && <div className="text-xs text-text3 mt-0.5">{subtitle}</div>}
      </div>
      {children}
    </div>
  )
}

function Field({
  label,
  desc,
  children,
}: {
  label: string
  desc?: string
  children: React.ReactNode
}) {
  return (
    <div>
      <div className="text-sm font-medium text-text2 mb-1">{label}</div>
      {desc && <div className="text-[11px] text-text3 mb-2 leading-relaxed">{desc}</div>}
      {children}
    </div>
  )
}
