// Radar News Widget — homepage sekce "Novinky ze světa"
// Server component: čte radar_items přímo přes supabaseAdmin.
// Zobrazuje 3 nejnovější publikované novinky.

import Link from 'next/link'
import Image from 'next/image'
import { supabaseAdmin } from '@/lib/supabase'

const BADGE_CONFIG: Record<string, { emoji: string; label: string; color: string }> = {
  harvest: { emoji: '🫒', label: 'Sklizeň',  color: 'text-olive bg-olive-bg' },
  price:   { emoji: '💰', label: 'Ceny',     color: 'text-amber-700 bg-amber-50' },
  award:   { emoji: '🏆', label: 'Ocenění',  color: 'text-yellow-700 bg-yellow-50' },
  science: { emoji: '🔬', label: 'Věda',     color: 'text-blue-700 bg-blue-50' },
  quality: { emoji: '✓',  label: 'Kvalita',  color: 'text-emerald-700 bg-emerald-50' },
  news:    { emoji: '📡', label: 'Novinky',  color: 'text-text2 bg-off' },
}

function relativeTime(iso: string | null): string {
  if (!iso) return ''
  const diff = Date.now() - new Date(iso).getTime()
  const h = Math.floor(diff / 3600_000)
  if (h < 1) return 'před chvílí'
  if (h < 24) return `před ${h} h`
  const d = Math.floor(h / 24)
  if (d === 1) return 'včera'
  if (d < 7) return `před ${d} dny`
  return new Date(iso).toLocaleDateString('cs-CZ', { day: 'numeric', month: 'short' })
}

export async function RadarWidget() {
  const { data } = await supabaseAdmin
    .from('radar_items')
    .select('slug, czech_title, badge, published_at, image_url, image_alt')
    .eq('is_published', true)
    .order('published_at', { ascending: false })
    .limit(3)

  if (!data || data.length === 0) return null

  return (
    <section className="px-6 md:px-10 py-14 border-t border-off2">
      <div className="max-w-[1280px] mx-auto">
        {/* Hlavička */}
        <div className="flex items-end justify-between mb-7">
          <div>
            <div className="text-[10px] font-bold tracking-widest uppercase text-text3 mb-1.5">
              — Ze světového tisku
            </div>
            <h2 className="font-[family-name:var(--font-display)] text-3xl md:text-[36px] font-normal text-text leading-tight">
              Novinky olivového světa
            </h2>
          </div>
          <Link
            href="/novinky"
            className="text-[13px] text-olive border-b border-olive-border hover:text-olive2 whitespace-nowrap"
          >
            Všechny novinky →
          </Link>
        </div>

        {/* Karty */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {data.map((item) => {
            const badge = BADGE_CONFIG[item.badge ?? ''] ?? BADGE_CONFIG.news
            return (
              <Link
                key={item.slug}
                href={`/novinky/${item.slug}`}
                className="bg-white border border-off2 rounded-[var(--radius-card)] overflow-hidden flex flex-col hover:border-olive-light hover:shadow-[0_4px_16px_rgba(0,0,0,.06)] transition-all group"
              >
                {/* Obrázek */}
                <div className="aspect-[16/9] bg-off overflow-hidden relative shrink-0">
                  {item.image_url ? (
                    <Image
                      src={item.image_url}
                      alt={item.image_alt ?? item.czech_title ?? ''}
                      fill
                      sizes="(max-width: 768px) 100vw, 33vw"
                      className="object-cover group-hover:scale-[1.02] transition-transform duration-300"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-4xl">
                      {badge.emoji}
                    </div>
                  )}
                </div>

                {/* Text */}
                <div className="p-4 flex flex-col flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${badge.color}`}>
                      {badge.emoji} {badge.label}
                    </span>
                    <span className="text-[10px] text-text3">{relativeTime(item.published_at)}</span>
                  </div>
                  <h3 className="text-[14px] font-semibold text-text leading-snug line-clamp-3 group-hover:text-olive transition-colors">
                    {item.czech_title}
                  </h3>
                </div>
              </Link>
            )
          })}
        </div>
      </div>
    </section>
  )
}
