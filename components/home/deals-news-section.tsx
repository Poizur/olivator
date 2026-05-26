// Sekce Slevy + Novinky — 2-sloupcový layout dle mockupu
// Server component: fetchuje oba zdroje paralelně.

import Link from 'next/link'
import { countryFlag } from '@/lib/utils'
import { getSlevyDeals } from '@/lib/welcome-series'
import { supabaseAdmin } from '@/lib/supabase'

const BADGE: Record<string, { emoji: string; label: string }> = {
  harvest: { emoji: '🫒', label: 'Sklizeň' },
  price:   { emoji: '💰', label: 'Ceny' },
  award:   { emoji: '🏆', label: 'Ocenění' },
  science: { emoji: '🔬', label: 'Věda' },
  quality: { emoji: '✅', label: 'Kvalita' },
  news:    { emoji: '📡', label: 'Novinky' },
}

function relativeTime(iso: string | null): string {
  if (!iso) return ''
  const diff = Date.now() - new Date(iso).getTime()
  const h = Math.floor(diff / 3_600_000)
  if (h < 1) return 'před chvílí'
  if (h < 24) return `před ${h} h`
  const d = Math.floor(h / 24)
  if (d === 1) return 'včera'
  if (d < 7) return `před ${d} dny`
  return new Date(iso).toLocaleDateString('cs-CZ', { day: 'numeric', month: 'short' })
}

export async function DealsNewsSection() {
  const [slevyData, { data: radarData }] = await Promise.all([
    getSlevyDeals(4),
    supabaseAdmin
      .from('radar_items')
      .select('slug, czech_title, badge, published_at, source, country_code')
      .eq('is_published', true)
      .order('published_at', { ascending: false })
      .limit(4),
  ])

  const deals = slevyData.deals.slice(0, 4)
  const news = radarData ?? []

  if (deals.length === 0 && news.length === 0) return null

  return (
    <section className="px-6 md:px-10 py-9 border-t border-off2">
      <div className="max-w-[1280px] mx-auto grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-16">

        {/* ── Slevy ── */}
        {deals.length > 0 && (
          <div>
            <div className="flex items-end justify-between mb-[18px]">
              <div>
                <div className="text-[12px] font-medium tracking-[0.05em] uppercase text-terra mb-[6px]">— Slevy</div>
                <h2 className="font-[family-name:var(--font-display)] text-[30px] font-medium text-text leading-[1.1]">
                  Reálné slevy <em className="italic text-olive-light">tento týden</em>
                </h2>
                <p className="text-[14px] text-text2 mt-[6px]">Cena nižší než 30denní maximum</p>
              </div>
              <Link
                href="/slevy"
                className="text-[13px] text-olive font-medium border-b border-olive-border hover:text-olive2 whitespace-nowrap"
              >
                Všech {slevyData.stats.totalDeals} →
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {deals.map((d) => (
                <Link
                  key={d.productId}
                  href={`/olej/${d.slug}`}
                  className="bg-white border border-off2 rounded-xl p-3 flex items-center gap-3 hover:border-olive-light hover:shadow-sm transition-all group"
                >
                  <div className="w-10 h-10 shrink-0 rounded-lg overflow-hidden bg-off flex items-center justify-center">
                    {d.imageUrl ? (
                      <img src={d.imageUrl} alt={d.name} className="w-full h-full object-contain" />
                    ) : (
                      <span className="text-xl">🫒</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[11px] text-text3 leading-tight truncate">{d.brandName}</div>
                    <div className="text-[12px] font-semibold text-text leading-tight line-clamp-2">{d.name}</div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-[10px] font-bold bg-[#A32D2D] text-white rounded px-1.5 py-0.5 mb-0.5 text-center">
                      -{d.dropPct}%
                    </div>
                    <div className="text-[13px] font-bold text-text tabular-nums">{Math.round(d.currentPrice)} Kč</div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* ── Novinky ── */}
        {news.length > 0 && (
          <div>
            <div className="flex items-end justify-between mb-[18px]">
              <div>
                <div className="text-[12px] font-medium tracking-[0.05em] uppercase text-text3 mb-[6px]">— Novinky</div>
                <h2 className="font-[family-name:var(--font-display)] text-[30px] font-medium text-text leading-[1.1]">
                  Ze <em className="italic text-olive-light">světového</em> tisku
                </h2>
                <p className="text-[14px] text-text2 mt-[6px]">Sklizně, ocenění, věda</p>
              </div>
              <Link
                href="/novinky"
                className="text-[13px] text-olive font-medium border-b border-olive-border hover:text-olive2 whitespace-nowrap"
              >
                Všechny novinky →
              </Link>
            </div>

            <div className="space-y-2">
              {news.map((item) => {
                const b = BADGE[item.badge ?? ''] ?? BADGE.news
                return (
                  <Link
                    key={item.slug}
                    href={`/novinky/${item.slug}`}
                    className="bg-white border border-off2 rounded-xl p-3.5 flex items-start gap-3 hover:border-olive-light hover:shadow-sm transition-all group"
                  >
                    <div className="text-[28px] leading-none shrink-0 mt-0.5">{b.emoji}</div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[11px] font-semibold uppercase tracking-[0.05em] text-text2 mb-1">
                        {b.label}
                        {item.country_code && (
                          <span className="ml-1.5 font-normal not-italic">{countryFlag(item.country_code)}</span>
                        )}
                      </div>
                      <div className="text-[13px] font-semibold text-text leading-snug line-clamp-2 group-hover:text-olive transition-colors">
                        {item.czech_title}
                      </div>
                      <div className="text-[11px] text-text3 mt-0.5">
                        {relativeTime(item.published_at)}
                        {item.source && <> · {item.source}</>}
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>
          </div>
        )}

      </div>
    </section>
  )
}
