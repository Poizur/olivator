'use client'

import { useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import type { RetailerFull } from '@/lib/data'

export function RetailerForm({ initial }: { initial?: RetailerFull }) {
  const router = useRouter()
  const isEdit = !!initial
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [name, setName] = useState(initial?.name ?? '')
  const [slug, setSlug] = useState(initial?.slug ?? '')
  const [domain, setDomain] = useState(initial?.domain ?? '')
  const [affiliateNetwork, setAffiliateNetwork] = useState(initial?.affiliateNetwork ?? '')
  const [baseTrackingUrl, setBaseTrackingUrl] = useState(initial?.baseTrackingUrl ?? '')
  const [commissionPct, setCommissionPct] = useState(String(initial?.defaultCommissionPct ?? ''))
  const [isActive, setIsActive] = useState(initial?.isActive ?? true)
  const [market, setMarket] = useState(initial?.market ?? 'CZ')
  const [rating, setRating] = useState(String(initial?.rating ?? ''))
  const [ratingCount, setRatingCount] = useState(String(initial?.ratingCount ?? ''))
  const [ratingSource, setRatingSource] = useState(initial?.ratingSource ?? '')
  // Presentation fields — public product page "O eshopu" sekce
  const [tagline, setTagline] = useState(initial?.tagline ?? '')
  const [story, setStory] = useState(initial?.story ?? '')
  const [foundedYear, setFoundedYear] = useState(String(initial?.foundedYear ?? ''))
  const [founders, setFounders] = useState(initial?.founders ?? '')
  const [headquarters, setHeadquarters] = useState(initial?.headquarters ?? '')
  const [specialization, setSpecialization] = useState(initial?.specialization ?? '')
  const [logoUrl, setLogoUrl] = useState(initial?.logoUrl ?? '')

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      const body = {
        name,
        slug,
        domain,
        affiliateNetwork,
        baseTrackingUrl: baseTrackingUrl || null,
        defaultCommissionPct: Number(commissionPct) || 0,
        isActive,
        market,
        rating: rating ? Number(rating) : null,
        ratingCount: ratingCount ? Number(ratingCount) : 0,
        ratingSource: ratingSource || null,
        // Presentation
        tagline: tagline || null,
        story: story || null,
        foundedYear: foundedYear ? Number(foundedYear) : null,
        founders: founders || null,
        headquarters: headquarters || null,
        specialization: specialization || null,
        logoUrl: logoUrl || null,
      }
      const res = await fetch(
        isEdit ? `/api/admin/retailers/${initial!.id}` : '/api/admin/retailers',
        {
          method: isEdit ? 'PUT' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        }
      )
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Uložení selhalo')
      }
      router.push('/admin/retailers')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Uložení selhalo')
    } finally {
      setSaving(false)
    }
  }

  async function onDelete() {
    if (!initial) return
    if (!confirm(`Opravdu smazat prodejce "${initial.name}"? Všechny jeho nabídky budou také smazány.`)) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/admin/retailers/${initial.id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Smazání selhalo')
      router.push('/admin/retailers')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Smazání selhalo')
      setDeleting(false)
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6 max-w-2xl">
      <div className="bg-white border border-off2 rounded-[var(--radius-card)] p-6 space-y-4">
        <div>
          <Label>Jméno</Label>
          <Input value={name} onChange={setName} required placeholder="Rohlík.cz" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Slug (URL)</Label>
            <Input value={slug} onChange={setSlug} required placeholder="rohlik" />
            <Help>Používá se v /go/<b>slug</b>/... Nezapisuj mezery ani diakritiku.</Help>
          </div>
          <div>
            <Label>Doména</Label>
            <Input value={domain} onChange={setDomain} required placeholder="rohlik.cz" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Affiliate síť</Label>
            <select
              value={affiliateNetwork}
              onChange={e => setAffiliateNetwork(e.target.value)}
              className="w-full px-3 py-2 border border-off2 rounded-lg text-sm focus:outline-none focus:border-olive"
            >
              <option value="">— Žádná —</option>
              <option value="Dognet">Dognet</option>
              <option value="eHUB">eHUB</option>
              <option value="Heureka">Heureka Affiliate</option>
              <option value="CJ">CJ Affiliate</option>
              <option value="Amazon">Amazon Associates</option>
              <option value="direct">Přímá (bez sítě)</option>
            </select>
          </div>
          <div>
            <Label>Komise (%)</Label>
            <Input value={commissionPct} onChange={setCommissionPct} type="number" step="0.1" placeholder="10.00" />
          </div>
        </div>
        <div>
          <Label>Market</Label>
          <select
            value={market}
            onChange={e => setMarket(e.target.value)}
            className="w-full px-3 py-2 border border-off2 rounded-lg text-sm focus:outline-none focus:border-olive"
          >
            <option value="CZ">Česko</option>
            <option value="SK">Slovensko</option>
          </select>
        </div>
        <div className="flex items-center gap-2 pt-2">
          <input
            id="isActive"
            type="checkbox"
            checked={isActive}
            onChange={e => setIsActive(e.target.checked)}
            className="w-4 h-4 accent-olive"
          />
          <label htmlFor="isActive" className="text-sm text-text cursor-pointer">
            Aktivní — zobrazí se jako zdroj nabídek na webu
          </label>
        </div>
      </div>

      <div className="bg-white border border-off2 rounded-[var(--radius-card)] p-6 space-y-4">
        <div>
          <div className="text-sm font-semibold text-text">Hodnocení e-shopu (hvězdičky)</div>
          <div className="text-xs text-text2 mt-0.5">
            Zobrazí se pod tlačítkem &ldquo;Koupit&rdquo; na produktové kartě jako trust signal.
            Můžeš zadat ručně z Heureka stránky e-shopu (např. „98% spokojenost, 4.7/5 z 523 hodnocení").
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <Label>Rating (0–5)</Label>
            <Input value={rating} onChange={setRating} type="number" step="0.1" placeholder="4.7" />
          </div>
          <div>
            <Label>Počet hodnocení</Label>
            <Input value={ratingCount} onChange={setRatingCount} type="number" placeholder="523" />
          </div>
          <div>
            <Label>Zdroj</Label>
            <select
              value={ratingSource}
              onChange={e => setRatingSource(e.target.value)}
              className="w-full px-3 py-2 border border-off2 rounded-lg text-sm focus:outline-none focus:border-olive"
            >
              <option value="">— Žádný —</option>
              <option value="heureka">Heureka</option>
              <option value="google">Google Reviews</option>
              <option value="manual">Ručně</option>
            </select>
          </div>
        </div>
      </div>

      <div className="bg-white border border-off2 rounded-[var(--radius-card)] p-6 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-semibold text-text">Affiliate šablona URL</div>
            <div className="text-xs text-text2 mt-0.5">
              Jakmile vyplníš, všechny existující nabídky tohoto prodejce automaticky
              používají affiliate routing — žádný batch update nepotřeba.
            </div>
          </div>
        </div>
        <textarea
          value={baseTrackingUrl}
          onChange={e => setBaseTrackingUrl(e.target.value)}
          placeholder="https://ehub.cz/click/u12345?url={product_url}"
          rows={3}
          className="w-full px-3 py-2 border border-off2 rounded-lg text-sm font-mono focus:outline-none focus:border-olive"
        />
        <Help>
          Placeholder <code className="bg-off px-1 rounded">{'{product_url}'}</code> bude
          nahrazen URL konkrétního produktu (URL-encoded).
          <br />
          Nech prázdné pokud ještě nemáš schválené partnerství — odkazy pak vedou přímo na prodejce.
        </Help>
      </div>

      {/* Presentation — info o eshopu pro public produktovou stránku */}
      <div className="bg-white border border-off2 rounded-[var(--radius-card)] p-6 space-y-4">
        <div>
          <div className="text-sm font-semibold text-text">Prezentace e-shopu</div>
          <div className="text-xs text-text2 mt-0.5">
            Jak se eshop představí pod offers tabulkou na produktové stránce.
            Aby uživatel věděl koho podporuje + eshop měl radost z hezké prezentace.
          </div>
        </div>
        <div>
          <Label>Tagline (1 věta)</Label>
          <Input
            value={tagline}
            onChange={setTagline}
            placeholder="Specialisté na řecké oleje od cestovatelů Zdeňka a Marcelky"
          />
          <Help>Krátký hook pod jménem eshopu — max 160 znaků.</Help>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Zakladatelé</Label>
            <Input
              value={founders}
              onChange={setFounders}
              placeholder="Zdeněk a Marcelka"
            />
          </div>
          <div>
            <Label>Sídlo</Label>
            <Input
              value={headquarters}
              onChange={setHeadquarters}
              placeholder="Praha"
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Rok založení</Label>
            <Input
              value={foundedYear}
              onChange={setFoundedYear}
              type="number"
              placeholder="2018"
            />
          </div>
          <div>
            <Label>Specializace</Label>
            <Input
              value={specialization}
              onChange={setSpecialization}
              placeholder="Řecké oleje, gourmet"
            />
          </div>
        </div>
        <div>
          <Label>Příběh (delší popis)</Label>
          <textarea
            value={story}
            onChange={(e) => setStory(e.target.value)}
            rows={4}
            placeholder="Vášniví cestovatelé z Řecka, kteří se specializují na olivové oleje z malých ostrovních farem. Eshop spravují Zdeněk a Marcelka..."
            className="w-full px-3 py-2 border border-off2 rounded-lg text-sm focus:outline-none focus:border-olive resize-y"
          />
          <Help>2-4 věty. Zobrazí se v sekci „O eshopu" pod offers tabulkou.</Help>
        </div>
        <div>
          <Label>Logo URL (volitelně)</Label>
          <Input
            value={logoUrl}
            onChange={setLogoUrl}
            placeholder="https://eshop.cz/logo.svg"
          />
        </div>
      </div>

      {error && (
        <div className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {error}
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={saving}
            className="bg-olive text-white rounded-lg px-5 py-2.5 text-sm font-medium hover:bg-olive-dark disabled:opacity-40 transition-colors"
          >
            {saving ? 'Ukládám...' : isEdit ? 'Uložit změny' : 'Vytvořit prodejce'}
          </button>
          <button
            type="button"
            onClick={() => router.push('/admin/retailers')}
            className="bg-off text-text rounded-lg px-5 py-2.5 text-sm font-medium hover:bg-off2 transition-colors"
          >
            Zrušit
          </button>
        </div>
        {isEdit && (
          <button
            type="button"
            onClick={onDelete}
            disabled={deleting}
            className="text-xs text-red-700 hover:underline disabled:opacity-40"
          >
            {deleting ? 'Mažu...' : 'Smazat prodejce'}
          </button>
        )}
      </div>
    </form>
  )
}

function Label({ children }: { children: React.ReactNode }) {
  return <div className="text-xs font-medium text-text2 mb-1">{children}</div>
}
function Input({
  value,
  onChange,
  type = 'text',
  required,
  placeholder,
  step,
}: {
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
      className="w-full px-3 py-2 border border-off2 rounded-lg text-sm focus:outline-none focus:border-olive"
    />
  )
}
function Help({ children }: { children: React.ReactNode }) {
  return <div className="text-[11px] text-text3 mt-1 leading-relaxed">{children}</div>
}
