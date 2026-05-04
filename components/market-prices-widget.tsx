// Cenový widget na homepage — velkoobchodní ceny EVOO ze tří hlavních trhů
// (Španělsko, Itálie, Řecko). Data z IOC měsíčního reportu, manuálně
// aktualizováno adminem 1× týdně.

import { supabaseAdmin } from '@/lib/supabase'

interface MarketPriceRow {
  market: string
  price_eur: number
  change_pct: number | null
  week_of: string
  source: string | null
  source_url: string | null
}

function formatEur(n: number): string {
  return `€${n.toLocaleString('cs-CZ', { maximumFractionDigits: 0 })}`
}

function formatChange(pct: number | null): { text: string; color: string; arrow: string } {
  if (pct == null) return { text: '—', color: 'text-text3', arrow: '' }
  const arrow = pct > 0 ? '↑' : pct < 0 ? '↓' : '→'
  const color = pct > 0 ? 'text-amber-700' : pct < 0 ? 'text-olive-dark' : 'text-text3'
  const sign = pct > 0 ? '+' : ''
  return { text: `${sign}${pct.toFixed(1)} %`, color, arrow }
}

function formatWeek(iso: string): string {
  const d = new Date(iso)
  if (isNaN(d.getTime())) return iso
  return d.toLocaleDateString('cs-CZ', { day: 'numeric', month: 'long', year: 'numeric' })
}

export async function MarketPricesWidget() {
  // Načti nejnovější týden + všechny řádky pro něj.
  const { data: latestRow } = await supabaseAdmin
    .from('market_prices')
    .select('week_of')
    .eq('is_published', true)
    .order('week_of', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!latestRow) return null

  const { data, error } = await supabaseAdmin
    .from('market_prices')
    .select('market, price_eur, change_pct, week_of, source, source_url')
    .eq('is_published', true)
    .eq('week_of', latestRow.week_of as string)
    .order('sort_order', { ascending: true })
    .limit(5)

  if (error || !data || data.length === 0) return null

  const rows = data as MarketPriceRow[]
  const firstSource = rows[0]?.source_url

  return (
    <section className="max-w-[1080px] mx-auto px-6 md:px-10 mt-10 mb-12">
      <div className="bg-white border border-off2 rounded-[var(--radius-card)] p-5 md:p-7">
        <div className="flex items-end justify-between mb-4 flex-wrap gap-2">
          <div>
            <div className="text-[10px] font-bold tracking-widest uppercase text-olive mb-1">
              🫒 Velkoobchodní ceny
            </div>
            <h2 className="font-[family-name:var(--font-display)] text-xl md:text-2xl text-text leading-tight">
              EVOO tento týden
            </h2>
          </div>
          <div className="text-[11px] text-text3">
            Zdroj: {rows[0]?.source ?? 'IOC'} · {formatWeek(rows[0].week_of)}
          </div>
        </div>

        <ul className="divide-y divide-off">
          {rows.map((r) => {
            const change = formatChange(r.change_pct)
            return (
              <li
                key={r.market}
                className="grid grid-cols-[1fr_auto_auto] gap-4 py-2.5 items-baseline text-[14px]"
              >
                <span className="text-text font-medium">{r.market}</span>
                <span className="text-text2 tabular-nums whitespace-nowrap">
                  {formatEur(r.price_eur)} <span className="text-text3 text-[12px]">/ 100 kg</span>
                </span>
                <span className={`tabular-nums whitespace-nowrap font-medium ${change.color}`}>
                  {change.arrow} {change.text}
                </span>
              </li>
            )
          })}
        </ul>

        {firstSource && (
          <div className="mt-3 pt-3 border-t border-off">
            <a
              href={firstSource}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[11px] text-text3 hover:text-olive"
            >
              Plná data IOC ↗
            </a>
          </div>
        )}
      </div>
    </section>
  )
}
