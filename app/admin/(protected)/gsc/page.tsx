// GSC monitoring dashboard — Google Search Console data.
// Zobrazuje CTR, klíčová slova, pozice, top stránky za posledních 28 dní.
// Vyžaduje GSC_SERVICE_ACCOUNT_KEY + GSC_SITE_URL v env.

import { fetchGscSummary, fetchGscDailyTrend } from '@/lib/gsc'
import type { GscRow } from '@/lib/gsc'

export const dynamic = 'force-dynamic'
export const revalidate = 0

function fmtPct(n: number) {
  return `${(n * 100).toFixed(1)} %`
}

function fmtPos(n: number) {
  return n.toFixed(1)
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('cs-CZ', { day: 'numeric', month: 'long', year: 'numeric' })
}

function pageLabel(url: string) {
  try {
    return new URL(url).pathname || url
  } catch {
    return url
  }
}

function MiniBar({ value, max }: { value: number; max: number }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0
  return (
    <div className="w-24 h-1.5 bg-gray-100 rounded-full overflow-hidden">
      <div className="h-full bg-olive rounded-full" style={{ width: `${pct}%` }} />
    </div>
  )
}

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="bg-white border border-gray-100 rounded-xl p-4">
      <div className="text-xs text-gray-400 uppercase tracking-widest mb-1">{label}</div>
      <div className="text-2xl font-semibold text-gray-900">{value}</div>
      {sub && <div className="text-xs text-gray-400 mt-0.5">{sub}</div>}
    </div>
  )
}

function NotConfigured() {
  return (
    <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 text-sm text-amber-800">
      <p className="font-semibold mb-2">GSC není nakonfigurováno</p>
      <p className="mb-3">Pro zobrazení dat z Google Search Console je potřeba nastavit:</p>
      <ul className="list-disc list-inside space-y-1 font-mono text-xs">
        <li>GSC_SERVICE_ACCOUNT_KEY — JSON string Service Account klíče</li>
        <li>GSC_SITE_URL — např. <code>sc-domain:olivator.cz</code></li>
      </ul>
      <p className="mt-3">
        Service Account musí mít přístup k olivator.cz property v GSC jako &quot;Restricted User&quot;.
      </p>
    </div>
  )
}

export default async function GscPage() {
  const [summary, trend] = await Promise.all([
    fetchGscSummary(28),
    fetchGscDailyTrend(28),
  ])

  const isConfigured = !!(process.env.GSC_SERVICE_ACCOUNT_KEY && process.env.GSC_SITE_URL)

  const maxClicks = Math.max(...(summary?.topQueries.map((r) => r.clicks) ?? [1]))
  const maxPageClicks = Math.max(...(summary?.topPages.map((r) => r.clicks) ?? [1]))

  // Daily trend sparkline data
  const trendData = trend ?? []
  const maxDayClicks = Math.max(...trendData.map((r) => r.clicks), 1)

  return (
    <div className="max-w-5xl mx-auto py-8 px-4 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">GSC Dashboard</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            Google Search Console · posledních 28 dní
            {summary && <> · data k {fmtDate(summary.fetchedAt)}</>}
          </p>
        </div>
        {isConfigured && (
          <span className="text-xs bg-green-50 text-green-700 border border-green-200 px-2.5 py-1 rounded-full font-medium">
            ✓ Připojeno
          </span>
        )}
      </div>

      {!isConfigured && <NotConfigured />}

      {summary ? (
        <>
          {/* KPI Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatCard
              label="Kliky (28 d)"
              value={summary.totalClicks.toLocaleString('cs-CZ')}
              sub="z výsledků hledání"
            />
            <StatCard
              label="Zobrazení"
              value={summary.totalImpressions.toLocaleString('cs-CZ')}
              sub="průměrně za 28 dní"
            />
            <StatCard
              label="Prům. CTR"
              value={fmtPct(summary.avgCtr)}
              sub="kliky / zobrazení"
            />
            <StatCard
              label="Prům. pozice"
              value={fmtPos(summary.avgPosition)}
              sub="TOP 20 dotazů"
            />
          </div>

          {/* Trend sparkline */}
          {trendData.length > 0 && (
            <div className="bg-white border border-gray-100 rounded-xl p-4">
              <div className="text-xs text-gray-400 uppercase tracking-widest mb-3">
                Denní kliky (28 dní)
              </div>
              <div className="flex items-end gap-0.5 h-16">
                {trendData.map((row, i) => {
                  const h = maxDayClicks > 0 ? Math.round((row.clicks / maxDayClicks) * 64) : 0
                  const dateLabel = row.keys[0] ? new Date(row.keys[0]).toLocaleDateString('cs-CZ', { day: 'numeric', month: 'numeric' }) : ''
                  return (
                    <div
                      key={i}
                      className="flex-1 bg-olive/70 rounded-t hover:bg-olive transition-colors"
                      style={{ height: `${Math.max(h, 2)}px` }}
                      title={`${dateLabel}: ${row.clicks} kliků`}
                    />
                  )
                })}
              </div>
              <div className="flex justify-between text-[10px] text-gray-300 mt-1">
                <span>{trendData[0]?.keys[0]?.slice(5) ?? ''}</span>
                <span>{trendData[trendData.length - 1]?.keys[0]?.slice(5) ?? ''}</span>
              </div>
            </div>
          )}

          <div className="grid md:grid-cols-2 gap-4">
            {/* Top Queries */}
            <div className="bg-white border border-gray-100 rounded-xl p-4">
              <div className="text-xs text-gray-400 uppercase tracking-widest mb-3">
                Top dotazy (kliky)
              </div>
              <div className="space-y-2">
                {summary.topQueries.slice(0, 15).map((row, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm">
                    <span className="text-gray-300 text-xs w-4 shrink-0">{i + 1}</span>
                    <span className="flex-1 truncate text-gray-700 min-w-0">{row.keys[0]}</span>
                    <MiniBar value={row.clicks} max={maxClicks} />
                    <span className="text-gray-500 w-8 text-right shrink-0">{row.clicks}</span>
                    <span className="text-gray-300 text-xs w-10 text-right shrink-0">
                      #{fmtPos(row.position)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Top Pages */}
            <div className="bg-white border border-gray-100 rounded-xl p-4">
              <div className="text-xs text-gray-400 uppercase tracking-widest mb-3">
                Top stránky (kliky)
              </div>
              <div className="space-y-2">
                {summary.topPages.slice(0, 15).map((row, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm">
                    <span className="text-gray-300 text-xs w-4 shrink-0">{i + 1}</span>
                    <span className="flex-1 truncate text-gray-700 font-mono text-xs min-w-0">
                      {pageLabel(row.keys[0] ?? '')}
                    </span>
                    <MiniBar value={row.clicks} max={maxPageClicks} />
                    <span className="text-gray-500 w-8 text-right shrink-0">{row.clicks}</span>
                    <span className="text-gray-300 text-xs w-12 text-right shrink-0">
                      {fmtPct(row.ctr)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      ) : isConfigured ? (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
          Nepodařilo se načíst data z GSC. Zkontroluj oprávnění Service Accountu a správnost
          GSC_SITE_URL (musí odpovídat property v Search Console, např.{' '}
          <code>sc-domain:olivator.cz</code>).
        </div>
      ) : null}
    </div>
  )
}
