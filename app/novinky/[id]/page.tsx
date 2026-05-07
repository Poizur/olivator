import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

interface RadarItem {
  id: string
  source: string | null
  original_url: string | null
  original_title: string | null
  czech_title: string
  czech_summary: string | null
  cz_context: string | null
  badge: string | null
  published_at: string | null
}

const BADGE_CONFIG: Record<string, { emoji: string; label: string }> = {
  harvest: { emoji: '🫒', label: 'Sklizeň' },
  price:   { emoji: '💰', label: 'Ceny' },
  award:   { emoji: '🏆', label: 'Ocenění' },
  science: { emoji: '🔬', label: 'Věda' },
  quality: { emoji: '✓',  label: 'Kvalita' },
  news:    { emoji: '📡', label: 'Novinky' },
}

const SOURCE_LABEL: Record<string, string> = {
  oliveoiltimes: 'Olive Oil Times',
  ioc:           'International Olive Council',
  evooworld:     'EVOO World',
  googlenews:    'Google News',
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params
  const { data } = await supabaseAdmin
    .from('radar_items')
    .select('czech_title, czech_summary')
    .eq('id', id)
    .single()
  if (!data) return { title: 'Novinka | Olivátor' }
  return {
    title: `${data.czech_title} | Olivátor`,
    description: data.czech_summary ?? undefined,
  }
}

export default async function NovinkaDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { data } = await supabaseAdmin
    .from('radar_items')
    .select('id, source, original_url, original_title, czech_title, czech_summary, cz_context, badge, published_at')
    .eq('id', id)
    .single()

  if (!data) notFound()

  const item = data as unknown as RadarItem
  const badge = BADGE_CONFIG[item.badge ?? 'news'] ?? BADGE_CONFIG.news
  const sourceLabel = SOURCE_LABEL[item.source ?? ''] ?? item.source ?? 'Zdroj'
  const date = item.published_at
    ? new Date(item.published_at).toLocaleDateString('cs-CZ', { day: 'numeric', month: 'long', year: 'numeric' })
    : null

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <Link href="/novinky" className="text-[13px] text-olive hover:text-olive-dark mb-6 inline-block">
        ← Všechny novinky
      </Link>

      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <span className="text-[11px] bg-off text-text2 rounded-full px-2.5 py-1">
          {badge.emoji} {badge.label}
        </span>
        {date && <span className="text-[12px] text-text3">{date}</span>}
        {item.source && (
          <span className="text-[12px] text-text3">{sourceLabel}</span>
        )}
      </div>

      <h1 className="font-[family-name:var(--font-display)] text-2xl md:text-3xl text-text leading-snug mb-5">
        {item.czech_title}
      </h1>

      {item.czech_summary && (
        <p className="text-[15px] text-text leading-relaxed mb-6">
          {item.czech_summary}
        </p>
      )}

      {item.cz_context && (
        <div className="bg-olive-bg/40 border border-olive-border rounded-xl px-5 py-4 mb-6">
          <div className="text-[11px] font-semibold text-olive-dark uppercase tracking-wider mb-1.5">
            Kontext pro ČR
          </div>
          <p className="text-[14px] text-text leading-relaxed">
            {item.cz_context}
          </p>
        </div>
      )}

      {item.original_url && (
        <a
          href={item.original_url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-[13px] text-olive hover:text-olive-dark border border-olive-border rounded-lg px-4 py-2 hover:bg-olive-bg transition-colors"
        >
          Číst originál ({sourceLabel}) ↗
        </a>
      )}
    </div>
  )
}
