'use client'

import { useState } from 'react'
import { Trophy } from 'lucide-react'

interface Props {
  slug: string
  isFeatured: boolean
  featuredOrder: number | null
}

export function BrandFeaturedToggle({ slug, isFeatured, featuredOrder }: Props) {
  const [featured, setFeatured] = useState(isFeatured)
  const [order, setOrder] = useState(featuredOrder ?? '')
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  async function save(newFeatured: boolean, newOrder: number | null) {
    setSaving(true)
    setMsg(null)
    const res = await fetch(`/api/admin/brands/${slug}/featured`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_featured: newFeatured, featured_order: newOrder }),
    })
    setSaving(false)
    if (res.ok) {
      setFeatured(newFeatured)
      setMsg(newFeatured ? '✅ Přidáno na homepage' : '✅ Odebráno z homepage')
      setTimeout(() => setMsg(null), 3000)
    } else {
      setMsg('❌ Chyba uložení')
    }
  }

  return (
    <div className="bg-white border border-off2 rounded-xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <Trophy size={15} className={featured ? 'text-terra' : 'text-text3'} />
        <h3 className="text-[13px] font-semibold text-text">
          Featured na homepage
        </h3>
        {featured && (
          <span className="text-[10px] font-bold bg-terra text-white px-2 py-0.5 rounded-full">
            #{featuredOrder ?? order}
          </span>
        )}
      </div>

      <p className="text-[12px] text-text2 mb-4">
        Featured značky se zobrazují v sekci <em>Top značky olivového oleje</em> na hlavní stránce.
      </p>

      <div className="flex items-center gap-3 flex-wrap">
        {/* Toggle */}
        <button
          onClick={() => save(!featured, featured ? null : (Number(order) || null))}
          disabled={saving}
          className={`px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-colors ${
            featured
              ? 'bg-terra/10 text-terra border border-terra/30 hover:bg-terra/20'
              : 'bg-olive text-white hover:bg-olive2'
          }`}
        >
          {saving ? '...' : featured ? 'Odebrat z homepage' : 'Přidat na homepage'}
        </button>

        {/* Order input */}
        {featured && (
          <div className="flex items-center gap-1.5">
            <label className="text-[11px] text-text3">Pořadí:</label>
            <input
              type="number"
              min={1}
              max={20}
              value={order}
              onChange={(e) => setOrder(e.target.value)}
              className="w-14 border border-off2 rounded px-2 py-1 text-[12px] text-center"
            />
            <button
              onClick={() => save(true, Number(order) || null)}
              disabled={saving}
              className="text-[11px] text-olive font-semibold hover:underline"
            >
              Uložit
            </button>
          </div>
        )}

        {msg && <span className="text-[11px] text-text2">{msg}</span>}
      </div>
    </div>
  )
}
