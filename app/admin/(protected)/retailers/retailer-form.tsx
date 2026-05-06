'use client'

import { useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import type { RetailerFull } from '@/lib/data'
import { AdminBlock } from '@/components/admin-block'
import { EntityPhotosManager } from '@/components/entity-photos-manager'

interface RetailerPhoto {
  id: string
  url: string
  alt_text: string | null
  is_primary: boolean
  sort_order: number
  source: string | null
  source_attribution: string | null
  width: number | null
  height: number | null
}

export function RetailerForm({ initial, initialPhotos = [] }: { initial?: RetailerFull; initialPhotos?: RetailerPhoto[] }) {
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
  // XML feed (volitelný)
  const [xmlFeedUrl, setXmlFeedUrl] = useState(initial?.xmlFeedUrl ?? '')
  const [xmlFeedFormat, setXmlFeedFormat] = useState(initial?.xmlFeedFormat ?? '')

  // Auto-research (z domény eshopu)
  const [researching, setResearching] = useState(false)
  const [researchError, setResearchError] = useState<string | null>(null)
  const [researchResult, setResearchResult] = useState<{
    tagline: string | null
    story: string | null
    founders: string | null
    headquarters: string | null
    foundedYear: number | null
    specialization: string | null
    logoUrl: string | null
    pagesScanned: string[]
    warnings: string[]
  } | null>(null)

  async function onAutoResearch() {
    if (!initial) {
      setResearchError('Nejdřív ulož prodejce s vyplněnou doménou.')
      return
    }
    if (!domain.trim()) {
      setResearchError('Nejdřív vyplň doménu nahoře v sekci 1.')
      return
    }
    setResearching(true)
    setResearchError(null)
    setResearchResult(null)
    try {
      const res = await fetch(`/api/admin/retailers/${initial.id}/auto-research`, {
        method: 'POST',
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Auto-research selhal')
      setResearchResult(data.result)
    } catch (err) {
      setResearchError(err instanceof Error ? err.message : 'Chyba')
    } finally {
      setResearching(false)
    }
  }

  function applyResearch(fields: ('tagline' | 'story' | 'founders' | 'headquarters' | 'foundedYear' | 'specialization' | 'logoUrl')[]) {
    if (!researchResult) return
    if (fields.includes('tagline') && researchResult.tagline) setTagline(researchResult.tagline)
    if (fields.includes('story') && researchResult.story) setStory(researchResult.story)
    if (fields.includes('founders') && researchResult.founders) setFounders(researchResult.founders)
    if (fields.includes('headquarters') && researchResult.headquarters) setHeadquarters(researchResult.headquarters)
    if (fields.includes('foundedYear') && researchResult.foundedYear) setFoundedYear(String(researchResult.foundedYear))
    if (fields.includes('specialization') && researchResult.specialization) setSpecialization(researchResult.specialization)
    if (fields.includes('logoUrl') && researchResult.logoUrl) setLogoUrl(researchResult.logoUrl)
  }

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
        xmlFeedUrl: xmlFeedUrl || null,
        xmlFeedFormat: xmlFeedFormat || null,
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
    <form onSubmit={onSubmit} className="space-y-6 max-w-3xl">
      <AdminBlock
        number={1}
        icon="🔧"
        title="Základní údaje"
        publicLocation="Pouze admin (identifikace + affiliate routing)"
        description="Identita, doména, affiliate síť a komise. Slug se používá v /go/[slug]/..."
      >
        <div className="space-y-4">
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
      </AdminBlock>

      <AdminBlock
        number={2}
        icon="⭐"
        title="Hodnocení e-shopu"
        publicLocation='Trust signál pod tlačítkem „Koupit" na produktové kartě'
        description='Z Heureka stránky e-shopu — např. „98 % spokojenost, 4.7/5 z 523 hodnocení".'
      >
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
      </AdminBlock>

      <AdminBlock
        number={3}
        icon="🔗"
        title="Affiliate šablona URL"
        publicLocation="Pouze admin (routing /go/[slug]/...)"
        description="Jakmile vyplníš, všechny existující nabídky tohoto prodejce automaticky používají affiliate routing — žádný batch update nepotřeba."
      >
        <div className="space-y-3">
        <textarea
          value={baseTrackingUrl}
          onChange={e => setBaseTrackingUrl(e.target.value)}
          placeholder="https://ehub.cz/system/scripts/click.php?a_aid=XXX&a_bid=YYY&data1={product_slug}&desturl={product_url}"
          rows={3}
          className="w-full px-3 py-2 border border-off2 rounded-lg text-sm font-mono focus:outline-none focus:border-olive"
        />
        <Help>
          Placeholdery (URL-encoded při substituci):
          <br />
          <code className="bg-off px-1 rounded">{'{product_url}'}</code> → URL konkrétního produktu na eshopu
          <br />
          <code className="bg-off px-1 rounded">{'{product_slug}'}</code> → slug produktu na Olivator (užitečné pro eHUB <code className="bg-off px-1 rounded">data1</code>)
          <br />
          <code className="bg-off px-1 rounded">{'{ean}'}</code> → EAN produktu, pokud existuje
          <br />
          Nech prázdné pokud ještě nemáš schválené partnerství — odkazy pak vedou přímo na prodejce.
        </Help>
        </div>
      </AdminBlock>

      <AdminBlock
        number={5}
        icon="📦"
        title="XML produktový feed (volitelný)"
        publicLocation='Pouze admin (hromadný import produktů + cen z feedu)'
        description='Pokud eshop poskytuje Heureka XML nebo jiný feed, vyplň URL zde. Pak v sekci „Synchronizace" nahoře stačí jeden klik a produkty + ceny se naimportují / aktualizují. Bez feedu spoléháme na per-URL Playwright scrape.'
      >
        <div className="space-y-4">
          <div>
            <Label>URL feedu</Label>
            <textarea
              value={xmlFeedUrl}
              onChange={e => setXmlFeedUrl(e.target.value)}
              rows={2}
              placeholder="https://shop.priklad.cz/heureka/export/products.xml?hash=..."
              className="w-full px-3 py-2 border border-off2 rounded-lg text-sm font-mono focus:outline-none focus:border-olive"
            />
            <Help>
              U eHUBu je často přístupný v sekci „Feedy" partnerského programu.
              Heureka XML, Google Shopping, custom — formát říká dropdown níže.
            </Help>
          </div>
          <div>
            <Label>Formát feedu</Label>
            <select
              value={xmlFeedFormat}
              onChange={e => setXmlFeedFormat(e.target.value)}
              className="w-full px-3 py-2 border border-off2 rounded-lg text-sm focus:outline-none focus:border-olive"
            >
              <option value="">— Žádný (feed nepoužíváme) —</option>
              <option value="heureka">Heureka XML</option>
              <option value="google_shopping">Google Shopping (zatím nepodporováno)</option>
              <option value="custom">Custom (zatím nepodporováno)</option>
            </select>
            <Help>
              Aktuálně plně podporovaný: <strong>Heureka XML</strong> (formát českých eshopů).
              Ostatní budeme přidávat podle potřeby.
            </Help>
          </div>
        </div>
      </AdminBlock>

      <AdminBlock
        number={4}
        icon="📝"
        title="Prezentace e-shopu"
        publicLocation='Sekce „O eshopu" pod offers tabulkou na detailu produktu'
        description="Jak se eshop představí — tagline, zakladatelé, příběh. Aby uživatel věděl koho podporuje."
      >
        <div className="space-y-4">
        {/* Auto-research — jeden klik, Claude Haiku z webu eshopu vytáhne tagline,
            story, zakladatele, sídlo, rok založení, specializaci a logo URL.
            User pak per-pole rozhodne co převzít / co napsat ručně. */}
        {isEdit && (
          <div className="bg-olive-bg/40 border border-olive-border rounded-lg p-4">
            <div className="flex items-center justify-between gap-3 mb-2">
              <div>
                <div className="text-[13px] font-medium text-olive-dark">
                  ✨ Vyplnit prezentaci automaticky
                </div>
                <div className="text-[11px] text-olive-dark/80 mt-0.5">
                  Claude Haiku načte web {domain || '(doplň doménu)'} + „o nás" stránky, ~10–15 s, ~$0.005.
                </div>
              </div>
              <button
                type="button"
                onClick={onAutoResearch}
                disabled={researching || !domain.trim()}
                className="bg-olive text-white rounded-full px-4 py-1.5 text-[12px] font-medium hover:bg-olive2 disabled:opacity-40 transition-colors shrink-0"
              >
                {researching ? 'Načítám…' : 'Spustit'}
              </button>
            </div>
            {researchError && (
              <div className="mt-2 text-[11px] text-red-700 bg-red-50 border border-red-200 rounded px-2 py-1">
                ⚠ {researchError}
              </div>
            )}
            {researchResult && (
              <div className="mt-3 space-y-2 border-t border-olive-border pt-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-[11px] font-medium text-olive-dark">
                    Návrh z webu — {researchResult.pagesScanned.length} stránek načteno
                  </div>
                  <button
                    type="button"
                    onClick={() => applyResearch(['tagline', 'story', 'founders', 'headquarters', 'foundedYear', 'specialization', 'logoUrl'])}
                    className="text-[11px] bg-olive text-white rounded-full px-3 py-1 hover:bg-olive2 transition-colors"
                  >
                    Použít vše ↓
                  </button>
                </div>
                <SuggestionRow label="Tagline" value={researchResult.tagline} onApply={() => applyResearch(['tagline'])} />
                <SuggestionRow label="Příběh" value={researchResult.story ? researchResult.story.slice(0, 120) + '…' : null} onApply={() => applyResearch(['story'])} />
                <SuggestionRow label="Zakladatelé" value={researchResult.founders} onApply={() => applyResearch(['founders'])} />
                <SuggestionRow label="Sídlo" value={researchResult.headquarters} onApply={() => applyResearch(['headquarters'])} />
                <SuggestionRow label="Rok založení" value={researchResult.foundedYear?.toString() ?? null} onApply={() => applyResearch(['foundedYear'])} />
                <SuggestionRow label="Specializace" value={researchResult.specialization} onApply={() => applyResearch(['specialization'])} />
                <SuggestionRow label="Logo URL" value={researchResult.logoUrl} onApply={() => applyResearch(['logoUrl'])} />
                {researchResult.warnings.length > 0 && (
                  <div className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1">
                    ⚠ {researchResult.warnings.join(' · ')}
                  </div>
                )}
                <div className="text-[10px] text-text3 leading-tight pt-1">
                  Po kliknutí „Použít" se hodnota vloží do pole — formulář NEUKLÁDÁ automaticky, klikni Uložit dole.
                </div>
              </div>
            )}
          </div>
        )}

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
      </AdminBlock>

      {/* BLOK 6 — Galerie eshopu (pod logem na detailu produktu) */}
      {isEdit && (
        <AdminBlock
          number={6}
          icon="🖼️"
          title="Galerie fotek eshopu"
          publicLocation='2 fotky pod logem v sekci „O eshopu" na detailu produktu'
          description="Atmosférické fotky — sklad, balení, lidé, prodejna. První 2 nahrané se zobrazí pod logem. Pokud nahraješ víc, ostatní zatím skryté (rozšíříme později)."
        >
          <EntityPhotosManager
            entityId={initial!.id}
            entityType="retailer"
            initialPhotos={initialPhotos}
          />
        </AdminBlock>
      )}

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
function SuggestionRow({
  label,
  value,
  onApply,
}: {
  label: string
  value: string | null
  onApply: () => void
}) {
  return (
    <div className="flex items-start justify-between gap-3 text-[12px]">
      <div className="min-w-0 flex-1">
        <div className="text-[10px] uppercase tracking-wider text-text3 mb-0.5">{label}</div>
        <div className={`leading-snug ${value ? 'text-text' : 'text-text3 italic'}`}>
          {value ?? '(nenalezeno)'}
        </div>
      </div>
      {value && (
        <button
          type="button"
          onClick={onApply}
          className="text-[11px] text-olive hover:text-olive-dark border border-olive-border rounded-full px-2.5 py-0.5 shrink-0 transition-colors"
        >
          Použít
        </button>
      )}
    </div>
  )
}
