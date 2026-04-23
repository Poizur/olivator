'use client'

import { useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { calculateScore } from '@/lib/score'

const ORIGIN_OPTIONS = ['GR', 'IT', 'ES', 'HR', 'PT', 'TR', 'MA', 'TN', 'IL', 'US']
const TYPE_OPTIONS = [
  { value: 'evoo', label: 'Extra panenský (EVOO)' },
  { value: 'virgin', label: 'Panenský' },
  { value: 'refined', label: 'Rafinovaný' },
  { value: 'olive_oil', label: 'Olivový olej' },
  { value: 'pomace', label: 'Pokrutinový' },
]
const CERT_OPTIONS: { value: string; label: string }[] = [
  { value: 'dop', label: 'DOP' },                // Chráněné označení původu
  { value: 'pgp', label: 'PGP' },                // Chráněné zeměpisné ozn.
  { value: 'bio', label: 'BIO' },
  { value: 'organic', label: 'Organické' },      // Non-EU ekvivalent BIO
  { value: 'nyiooc', label: 'NYIOOC' },          // New York Oil Competition
  { value: 'demeter', label: 'Demeter' },        // Biodynamické
]
const USE_OPTIONS: { value: string; label: string }[] = [
  { value: 'salad', label: 'Salát' },
  { value: 'cooking', label: 'Vaření' },
  { value: 'frying', label: 'Smažení' },
  { value: 'dipping', label: 'Máčení / dipping' },
  { value: 'fish', label: 'Ryby' },
  { value: 'meat', label: 'Maso' },
  { value: 'health', label: 'Zdraví' },
  { value: 'gift', label: 'Dárek' },
]
const FLAVOR_AXES = ['fruity', 'herbal', 'bitter', 'spicy', 'mild', 'nutty', 'buttery'] as const
const FLAVOR_LABELS: Record<typeof FLAVOR_AXES[number], string> = {
  fruity: 'Ovocnost',
  herbal: 'Byliny',
  bitter: 'Hořkost',
  spicy: 'Pálivost',
  mild: 'Jemnost',
  nutty: 'Oříšky',
  buttery: 'Máslový',
}

export function ProductForm({
  productRow,
  cheapestOfferPrice,
}: {
  productRow: Record<string, unknown>
  cheapestOfferPrice?: number | null
}) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  // Basic
  const [ean, setEan] = useState(String(productRow.ean ?? ''))
  const [name, setName] = useState(String(productRow.name ?? ''))
  const [slug, setSlug] = useState(String(productRow.slug ?? ''))
  const [nameShort, setNameShort] = useState(String(productRow.name_short ?? ''))
  const [status, setStatus] = useState(String(productRow.status ?? 'draft'))
  const [descriptionShort, setDescShort] = useState(String(productRow.description_short ?? ''))
  const [descriptionLong, setDescLong] = useState(String(productRow.description_long ?? ''))

  // Origin / type
  const [originCountry, setOriginCountry] = useState(String(productRow.origin_country ?? ''))
  const [originRegion, setOriginRegion] = useState(String(productRow.origin_region ?? ''))
  const [type, setType] = useState(String(productRow.type ?? 'evoo'))
  const [processing, setProcessing] = useState(String(productRow.processing ?? ''))
  const [harvestYear, setHarvestYear] = useState(String(productRow.harvest_year ?? ''))
  const [volumeMl, setVolumeMl] = useState(String(productRow.volume_ml ?? ''))
  const [packaging, setPackaging] = useState(String(productRow.packaging ?? ''))

  // Chemistry
  const [acidity, setAcidity] = useState(String(productRow.acidity ?? ''))
  const [polyphenols, setPolyphenols] = useState(String(productRow.polyphenols ?? ''))
  const [peroxideValue, setPeroxide] = useState(String(productRow.peroxide_value ?? ''))
  const [oleicAcid, setOleic] = useState(String(productRow.oleic_acid_pct ?? ''))

  // Score
  const [olivatorScore, setScore] = useState(String(productRow.olivator_score ?? ''))
  const breakdown = (productRow.score_breakdown as Record<string, number>) ?? {}
  const [scoreAcidity, setSbA] = useState(String(breakdown.acidity ?? ''))
  const [scoreCerts, setSbC] = useState(String(breakdown.certifications ?? ''))
  const [scoreQuality, setSbQ] = useState(String(breakdown.quality ?? ''))
  const [scoreValue, setSbV] = useState(String(breakdown.value ?? ''))

  // Flavor
  const flavor = (productRow.flavor_profile as Record<string, number>) ?? {}
  const [flavorState, setFlavorState] = useState<Record<string, number>>(
    Object.fromEntries(FLAVOR_AXES.map(k => [k, flavor[k] ?? 0]))
  )

  // Certs / use cases
  const [certs, setCerts] = useState<string[]>(
    (productRow.certifications as string[] | null) ?? []
  )
  const [uses, setUses] = useState<string[]>(
    (productRow.use_cases as string[] | null) ?? []
  )

  function toggle(arr: string[], setArr: (v: string[]) => void, value: string) {
    if (arr.includes(value)) setArr(arr.filter(v => v !== value))
    else setArr([...arr, value])
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    setSuccess(false)
    try {
      const body = {
        ean,
        name,
        slug,
        nameShort: nameShort || undefined,
        status,
        descriptionShort: descriptionShort || undefined,
        descriptionLong: descriptionLong || undefined,
        originCountry: originCountry || undefined,
        originRegion: originRegion || undefined,
        type,
        processing: processing || undefined,
        harvestYear: harvestYear ? Number(harvestYear) : undefined,
        volumeMl: volumeMl ? Number(volumeMl) : undefined,
        packaging: packaging || undefined,
        acidity: acidity ? Number(acidity) : undefined,
        polyphenols: polyphenols ? Number(polyphenols) : undefined,
        peroxideValue: peroxideValue ? Number(peroxideValue) : undefined,
        oleicAcidPct: oleicAcid ? Number(oleicAcid) : undefined,
        olivatorScore: olivatorScore ? Number(olivatorScore) : undefined,
        scoreBreakdown: {
          acidity: Number(scoreAcidity) || 0,
          certifications: Number(scoreCerts) || 0,
          quality: Number(scoreQuality) || 0,
          value: Number(scoreValue) || 0,
        },
        flavorProfile: flavorState,
        certifications: certs,
        useCases: uses,
      }
      const res = await fetch(`/api/admin/products/${productRow.id as string}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Uložení selhalo')
      }
      setSuccess(true)
      router.refresh()
      setTimeout(() => setSuccess(false), 2500)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Uložení selhalo')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {/* Basic */}
      <Section title="Základní údaje">
        <div className="grid grid-cols-3 gap-4">
          <Field label="EAN (volitelné)">
            <Input value={ean} onChange={setEan} placeholder="8012345678901 nebo prázdné" />
            <div className="text-[10px] text-text3 mt-0.5">
              Nemají ho malí farmáři a boutique produkty — nech prázdné
            </div>
          </Field>
          <Field label="Status">
            <select value={status} onChange={e => setStatus(e.target.value)} className={inputCls}>
              <option value="draft">Draft (ke schválení)</option>
              <option value="active">Aktivní (na webu)</option>
              <option value="inactive">Neaktivní</option>
            </select>
          </Field>
          <Field label="Olivator Score">
            <Input value={olivatorScore} onChange={setScore} type="number" />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Název" required>
            <Input value={name} onChange={setName} required />
          </Field>
          <Field label="Slug (URL)" required>
            <Input value={slug} onChange={setSlug} required />
          </Field>
        </div>
        <Field label="Krátký název (compare bar)">
          <Input value={nameShort} onChange={setNameShort} placeholder="Gaea Fresh" />
        </Field>
        <Field label="Krátký popis (hero + produkt detail)">
          <textarea
            value={descriptionShort}
            onChange={e => setDescShort(e.target.value)}
            rows={3}
            className={inputCls}
          />
        </Field>
        <Field label="Dlouhý popis (SEO, FAQ, produkt detail)">
          <textarea
            value={descriptionLong}
            onChange={e => setDescLong(e.target.value)}
            rows={5}
            className={inputCls}
          />
        </Field>
        <RewriteButton
          productId={productRow.id as string}
          onResult={(short, long) => {
            setDescShort(short)
            setDescLong(long)
          }}
          rawSource={descriptionShort || descriptionLong}
        />
      </Section>

      {/* Origin */}
      <Section title="Původ a zpracování">
        <div className="grid grid-cols-3 gap-4">
          <Field label="Země původu">
            <select value={originCountry} onChange={e => setOriginCountry(e.target.value)} className={inputCls}>
              <option value="">—</option>
              {ORIGIN_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </Field>
          <Field label="Region">
            <Input value={originRegion} onChange={setOriginRegion} placeholder="Kréta" />
          </Field>
          <Field label="Typ">
            <select value={type} onChange={e => setType(e.target.value)} className={inputCls}>
              {TYPE_OPTIONS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </Field>
        </div>
        <div className="grid grid-cols-4 gap-4">
          <Field label="Zpracování">
            <Input value={processing} onChange={setProcessing} placeholder="cold_pressed" />
          </Field>
          <Field label="Sklizeň (rok)">
            <Input value={harvestYear} onChange={setHarvestYear} type="number" placeholder="2024" />
          </Field>
          <Field label="Objem (ml)">
            <Input value={volumeMl} onChange={setVolumeMl} type="number" placeholder="500" />
          </Field>
          <Field label="Obal">
            <Input value={packaging} onChange={setPackaging} placeholder="dark_glass" />
          </Field>
        </div>
      </Section>

      {/* Chemistry */}
      <Section title="Chemické parametry">
        <div className="grid grid-cols-4 gap-4">
          <Field label="Kyselost (%)">
            <Input value={acidity} onChange={setAcidity} type="number" step="0.01" placeholder="0.20" />
          </Field>
          <Field label="Polyfenoly (mg/kg)">
            <Input value={polyphenols} onChange={setPolyphenols} type="number" placeholder="312" />
          </Field>
          <Field label="Peroxidové číslo">
            <Input value={peroxideValue} onChange={setPeroxide} type="number" step="0.1" />
          </Field>
          <Field label="Kys. olejová (%)">
            <Input value={oleicAcid} onChange={setOleic} type="number" step="0.1" />
          </Field>
        </div>
      </Section>

      {/* Certifications + Use cases */}
      <Section title="Certifikace a použití">
        <Field label="Certifikace">
          <div className="flex flex-wrap gap-2">
            {CERT_OPTIONS.map(c => (
              <Chip
                key={c.value}
                active={certs.includes(c.value)}
                onClick={() => toggle(certs, setCerts, c.value)}
              >
                {c.label}
              </Chip>
            ))}
          </div>
        </Field>
        <Field label="Použití">
          <div className="flex flex-wrap gap-2">
            {USE_OPTIONS.map(u => (
              <Chip
                key={u.value}
                active={uses.includes(u.value)}
                onClick={() => toggle(uses, setUses, u.value)}
              >
                {u.label}
              </Chip>
            ))}
          </div>
        </Field>
      </Section>

      {/* Score breakdown */}
      <Section
        title="Rozložení Score"
        subtitle="Součet dá celkové Score (0–100). Můžeš nechat spočítat automaticky z vyplněných parametrů."
      >
        <div className="flex items-center gap-3 mb-2">
          <button
            type="button"
            onClick={() => {
              const pricePer100ml =
                cheapestOfferPrice && volumeMl
                  ? (cheapestOfferPrice / Number(volumeMl)) * 100
                  : null
              const result = calculateScore({
                acidity: acidity ? Number(acidity) : null,
                certifications: certs,
                polyphenols: polyphenols ? Number(polyphenols) : null,
                peroxideValue: peroxideValue ? Number(peroxideValue) : null,
                pricePer100ml,
              })
              setSbA(String(result.breakdown.acidity))
              setSbC(String(result.breakdown.certifications))
              setSbQ(String(result.breakdown.quality))
              setSbV(String(result.breakdown.value))
              setScore(String(result.total))
            }}
            className="bg-olive text-white rounded-full px-4 py-1.5 text-[13px] font-medium hover:bg-olive-dark transition-colors"
          >
            ✨ Spočítat automaticky
          </button>
          <span className="text-[11px] text-text3 leading-tight">
            Použije kyselost, certifikace, polyfenoly + peroxidové číslo a cenu
            z nejlevnější nabídky ({cheapestOfferPrice ? `${cheapestOfferPrice} Kč` : 'chybí'}).
          </span>
        </div>
        <div className="grid grid-cols-4 gap-4">
          <Field label="Kyselost (max 35)">
            <Input value={scoreAcidity} onChange={setSbA} type="number" />
          </Field>
          <Field label="Certifikace (max 25)">
            <Input value={scoreCerts} onChange={setSbC} type="number" />
          </Field>
          <Field label="Kvalita (max 25)">
            <Input value={scoreQuality} onChange={setSbQ} type="number" />
          </Field>
          <Field label="Hodnota (max 15)">
            <Input value={scoreValue} onChange={setSbV} type="number" />
          </Field>
        </div>
      </Section>

      {/* Flavor profile */}
      <Section title="Chuťový profil (0–100)">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {FLAVOR_AXES.map(axis => (
            <Field key={axis} label={FLAVOR_LABELS[axis]}>
              <Input
                value={String(flavorState[axis])}
                onChange={v => setFlavorState({ ...flavorState, [axis]: Number(v) || 0 })}
                type="number"
                step="5"
              />
            </Field>
          ))}
        </div>
      </Section>

      {error && (
        <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {error}
        </div>
      )}
      {success && (
        <div className="text-xs text-olive-dark bg-olive-bg border border-olive-border rounded-lg px-3 py-2">
          ✓ Uloženo
        </div>
      )}

      <div className="flex gap-2 sticky bottom-4 bg-white border border-off2 rounded-[var(--radius-card)] p-4 shadow-sm">
        <button
          type="submit"
          disabled={saving}
          className="bg-olive text-white rounded-lg px-5 py-2.5 text-sm font-medium hover:bg-olive-dark disabled:opacity-40 transition-colors"
        >
          {saving ? 'Ukládám...' : 'Uložit změny'}
        </button>
        <button
          type="button"
          onClick={() => router.push('/admin/products')}
          className="bg-off text-text rounded-lg px-5 py-2.5 text-sm font-medium hover:bg-off2 transition-colors"
        >
          Zpět na seznam
        </button>
      </div>
    </form>
  )
}

const inputCls = 'w-full px-3 py-2 border border-off2 rounded-lg text-sm focus:outline-none focus:border-olive'

function Section({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-off2 rounded-[var(--radius-card)] p-6 space-y-4">
      <div>
        <div className="text-sm font-semibold text-text">{title}</div>
        {subtitle && <div className="text-xs text-text3 mt-0.5">{subtitle}</div>}
      </div>
      {children}
    </div>
  )
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs font-medium text-text2 mb-1">
        {label}{required && <span className="text-terra ml-0.5">*</span>}
      </div>
      {children}
    </div>
  )
}

function Input({ value, onChange, type = 'text', required, placeholder, step }: {
  value: string
  onChange: (v: string) => void
  type?: string
  required?: boolean
  placeholder?: string
  step?: string
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={e => onChange(e.target.value)}
      required={required}
      placeholder={placeholder}
      step={step}
      className={inputCls}
    />
  )
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`text-xs px-3 py-1 rounded-full border transition-colors cursor-pointer ${
        active
          ? 'bg-olive text-white border-olive'
          : 'bg-white border-off2 text-text2 hover:border-olive-light hover:text-olive'
      }`}
    >
      {children}
    </button>
  )
}

interface ValidationIssue {
  severity: 'error' | 'warning' | 'info'
  category: string
  message: string
  matched?: string
}
interface ValidationResult {
  ok: boolean
  errors: number
  warnings: number
  infos: number
  wordCount: number
  charCount: number
  issues: ValidationIssue[]
}

function RewriteButton({
  productId,
  rawSource,
  onResult,
}: {
  productId: string
  rawSource: string
  onResult: (short: string, long: string) => void
}) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [validation, setValidation] = useState<ValidationResult | null>(null)

  async function onClick() {
    if (!confirm(
      'AI přepíše popisy v Olivator tónu (~300 slov, unikátní pro SEO). Uloží se teprve po tvém Save. Pokračovat?'
    )) return
    setLoading(true)
    setError(null)
    setValidation(null)
    try {
      const res = await fetch(`/api/admin/products/${productId}/rewrite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rawDescription: rawSource }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'AI rewrite failed')
      onResult(data.shortDescription, data.longDescription)
      if (data.validation) setValidation(data.validation)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Chyba')
    } finally {
      setLoading(false)
    }
  }

  const badgeClass = (() => {
    if (!validation) return ''
    if (validation.errors > 0) return 'bg-red-50 border-red-200 text-red-700'
    if (validation.warnings > 0) return 'bg-terra-bg border-terra/30 text-terra'
    return 'bg-olive-bg border-olive-border text-olive-dark'
  })()

  return (
    <div className="pt-1 space-y-2">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onClick}
          disabled={loading}
          className="bg-olive-bg text-olive-dark border border-olive-border rounded-full px-4 py-1.5 text-[13px] font-medium hover:bg-olive-border disabled:opacity-40 transition-colors"
        >
          {loading ? '✨ Přepisuji... (~5-10s)' : '✨ Přepsat AI'}
        </button>
        <span className="text-[11px] text-text3 leading-tight flex-1">
          Claude vygeneruje unikátní SEO popis. Po generování systém automaticky
          zkontroluje banned fráze a halucinace.
        </span>
        {error && (
          <span className="text-[11px] text-red-600 bg-red-50 border border-red-200 rounded px-2 py-0.5">
            ⚠ {error}
          </span>
        )}
      </div>

      {validation && (
        <div className={`border rounded-lg p-3 ${badgeClass}`}>
          <div className="flex items-center gap-3 mb-2 text-[13px] font-medium">
            {validation.errors > 0 ? (
              <span>🔴 {validation.errors} chyb — text je nutné přepsat</span>
            ) : validation.warnings > 0 ? (
              <span>🟡 {validation.warnings} varování — zkontroluj</span>
            ) : (
              <span>🟢 Text prošel všemi kontrolami</span>
            )}
            <span className="text-[11px] font-normal opacity-70">
              {validation.wordCount} slov &middot; krátký popis {validation.charCount} znaků
            </span>
          </div>

          {validation.issues.length > 0 && (
            <ul className="space-y-1">
              {validation.issues.map((issue, i) => (
                <li key={i} className="text-[12px] flex items-start gap-2">
                  <span className="shrink-0 mt-0.5">
                    {issue.severity === 'error' ? '🔴' : issue.severity === 'warning' ? '🟡' : '🔵'}
                  </span>
                  <span>
                    {issue.message}
                    {issue.matched && (
                      <span className="opacity-70 italic"> — &ldquo;{issue.matched}&rdquo;</span>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          )}

          {validation.errors > 0 && (
            <div className="mt-2 pt-2 border-t border-current/20 text-[11px]">
              <strong>Doporučení:</strong> klikni znovu na &ldquo;✨ Přepsat AI&rdquo;.
              Claude občas vrátí zakázané fráze — druhý pokus je často lepší.
              Nebo uprav text ručně před uložením.
            </div>
          )}
        </div>
      )}
    </div>
  )
}
