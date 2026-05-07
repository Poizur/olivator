// Admin /novinky — manuální trigger Radar Agentu + read-only listing posledních
// radar_items. Cron běží každé 2h v Railway, ale admin může spustit ručně.

import Link from 'next/link'
import { supabaseAdmin } from '@/lib/supabase'
import { RunRadarButton } from './run-button'

export const dynamic = 'force-dynamic'

interface RadarRow {
  id: string
  source: string | null
  original_url: string | null
  czech_title: string
  badge: string | null
  fingerprint: string | null
  published_at: string | null
  is_published: boolean
}

const BADGE_LABEL: Record<string, string> = {
  harvest: '🫒 Sklizeň',
  price: '💰 Ceny',
  award: '🏆 Ocenění',
  science: '🔬 Věda',
  quality: '✓ Kvalita',
  news: '📡 Novinky',
}

function formatDateTime(iso: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (isNaN(d.getTime())) return iso
  return d.toLocaleString('cs-CZ', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}

export default async function AdminNovinkyPage() {
  const { data, error } = await supabaseAdmin
    .from('radar_items')
    .select('id, source, original_url, czech_title, badge, fingerprint, published_at, is_published')
    .order('published_at', { ascending: false })
    .limit(50)

  const items = (data ?? []) as RadarRow[]
  const counts = {
    total: items.length,
    published: items.filter((i) => i.is_published).length,
  }

  return (
    <div>
      <div className="mb-6">
        <div className="text-[10px] font-bold tracking-widest uppercase text-text3 mb-1.5">
          — Obsah
        </div>
        <h1 className="font-[family-name:var(--font-display)] text-3xl text-text">Novinky</h1>
        <p className="text-[13px] text-text2 mt-1 max-w-[640px]">
          RSS scanner pro novinky o olivovém oleji ze světového tisku. Cron běží
          automaticky každé 2 hodiny — nebo spusť ručně tlačítkem níže.
          Veřejná stránka:{' '}
          <Link href="/novinky" className="text-olive">/novinky</Link>.
        </p>
      </div>

      {/* Trigger panel */}
      <div className="bg-olive-bg/30 border border-olive-border rounded-xl p-5 mb-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex-1 min-w-0">
            <div className="text-[13px] font-medium text-olive-dark mb-1">
              Manuální spuštění
            </div>
            <p className="text-[12px] text-olive-dark/80 leading-snug">
              Fetch 5 RSS feedů (Olive Oil Times, IOC, EVOO World, Google News),
              dedup, Claude Haiku překlad. Default: posledních 24 h, max 10 nových.
            </p>
          </div>
          <RunRadarButton />
        </div>
      </div>

      {error && (
        <div className="text-[12px] text-red-700 bg-red-50 border border-red-200 rounded px-3 py-2 mb-4">
          ⚠ Chyba načtení radar_items: {error.message}
        </div>
      )}

      {items.length === 0 ? (
        <div className="bg-white border border-off2 rounded-xl p-10 text-center">
          <div className="text-3xl mb-3">📡</div>
          <h2 className="text-[16px] font-medium text-text mb-1">Zatím žádné zprávy</h2>
          <p className="text-[13px] text-text3 mb-4 max-w-[400px] mx-auto">
            Klikni „📡 Spustit teď" výše. První běh stáhne novinky za posledních 24 h
            ze všech 5 feedů a uloží relevantní s českým překladem.
          </p>
        </div>
      ) : (
        <>
          <div className="text-[12px] text-text3 mb-3">
            {counts.published} z {counts.total} publikovaných (viditelných na webu)
          </div>
          <div className="bg-white border border-off2 rounded-xl divide-y divide-off2 overflow-hidden">
            {items.map((it) => {
              const badgeLabel = BADGE_LABEL[it.badge ?? 'news'] ?? it.badge
              return (
                <div
                  key={it.id}
                  className="px-4 py-3 flex items-start justify-between gap-3 hover:bg-off/40"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 text-[11px] mb-1 flex-wrap">
                      <span className="bg-off rounded-full px-2 py-0.5 text-text2">{badgeLabel}</span>
                      <span className="text-text3">·</span>
                      <span className="text-text3">{it.source}</span>
                      <span className="text-text3">·</span>
                      <span className="text-text3 tabular-nums">{formatDateTime(it.published_at)}</span>
                      {!it.is_published && (
                        <span className="bg-red-50 text-red-700 rounded-full px-2 py-0.5 text-[10px]">
                          skryté
                        </span>
                      )}
                    </div>
                    {it.original_url ? (
                      <a
                        href={it.original_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[14px] text-text font-medium leading-tight line-clamp-2 hover:text-olive-dark hover:underline block"
                      >
                        {it.czech_title}
                      </a>
                    ) : (
                      <div className="text-[14px] text-text font-medium leading-tight line-clamp-2">
                        {it.czech_title}
                      </div>
                    )}
                    {it.fingerprint && (
                      <div className="text-[10px] text-text3 font-mono mt-1">
                        fp: {it.fingerprint}
                      </div>
                    )}
                  </div>
                  {it.original_url && (
                    <a
                      href={it.original_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] text-olive hover:text-olive-dark whitespace-nowrap"
                    >
                      zdroj ↗
                    </a>
                  )}
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
