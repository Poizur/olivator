import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

interface RadarItem {
  id: string
  slug: string | null
  source: string | null
  original_url: string | null
  original_title: string | null
  czech_title: string
  czech_summary: string | null
  czech_article: string | null
  cz_context: string | null
  badge: string | null
  published_at: string | null
  image_url: string | null
  image_alt: string | null
  image_attribution: string | null
  image_source_url: string | null
  meta_title: string | null
  meta_description: string | null
}

const BADGE_CONFIG: Record<string, { emoji: string; label: string; bg: string; text: string }> = {
  harvest: { emoji: '🫒', label: 'Sklizeň',  bg: 'bg-olive-bg',   text: 'text-olive-dark' },
  price:   { emoji: '💰', label: 'Ceny',     bg: 'bg-amber-50',   text: 'text-amber-800' },
  award:   { emoji: '🏆', label: 'Ocenění',  bg: 'bg-yellow-50',  text: 'text-yellow-800' },
  science: { emoji: '🔬', label: 'Věda',     bg: 'bg-blue-50',    text: 'text-blue-700' },
  quality: { emoji: '✓',  label: 'Kvalita',  bg: 'bg-emerald-50', text: 'text-emerald-700' },
  news:    { emoji: '📡', label: 'Novinky',  bg: 'bg-off',        text: 'text-text2' },
}

const SOURCE_LABEL: Record<string, string> = {
  oliveoiltimes:    'Olive Oil Times',
  ioc:              'International Olive Council',
  evooworld:        'EVOO World',
  certifiedorigins: 'Certified Origins',
  googlenews_olive: 'Google News',
  googlenews_cz:    'Google News',
}

async function loadItem(slugOrId: string): Promise<RadarItem | null> {
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(slugOrId)

  const { data: bySlug } = await supabaseAdmin
    .from('radar_items')
    .select('*')
    .eq('slug', slugOrId)
    .maybeSingle()
  if (bySlug) return bySlug as unknown as RadarItem

  if (isUuid) {
    const { data: byId } = await supabaseAdmin
      .from('radar_items')
      .select('*')
      .eq('id', slugOrId)
      .maybeSingle()
    if (byId) return byId as unknown as RadarItem
  }

  return null
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const item = await loadItem(slug)
  if (!item) return { title: 'Novinka | Olivátor' }

  const title = item.meta_title || item.czech_title
  const description = item.meta_description || item.czech_summary || undefined
  const canonical = item.slug ? `https://olivator.cz/novinky/${item.slug}` : undefined

  return {
    title: `${title} | Olivátor`,
    description,
    alternates: canonical ? { canonical } : undefined,
    openGraph: {
      title,
      description,
      type: 'article',
      url: canonical,
      images: item.image_url ? [{ url: item.image_url }] : undefined,
      publishedTime: item.published_at ?? undefined,
    },
  }
}

export default async function NovinkaDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const item = await loadItem(slug)
  if (!item) notFound()

  const badge = BADGE_CONFIG[item.badge ?? 'news'] ?? BADGE_CONFIG.news
  const sourceLabel = SOURCE_LABEL[item.source ?? ''] ?? item.source ?? 'Zdroj'
  const date = item.published_at
    ? new Date(item.published_at).toLocaleDateString('cs-CZ', { day: 'numeric', month: 'long', year: 'numeric' })
    : null

  const paragraphs = (item.czech_article ?? '')
    .split(/\n{2,}/)
    .map(p => p.trim())
    .filter(Boolean)

  return (
    <article className="max-w-[760px] mx-auto px-5 md:px-8 py-10 md:py-14">
      <div className="text-xs text-text3 mb-6">
        <Link href="/" className="text-olive">Olivátor</Link>
        {' › '}
        <Link href="/novinky" className="text-olive">Novinky</Link>
        {' › '}
        <span>{item.czech_title.slice(0, 50)}{item.czech_title.length > 50 ? '…' : ''}</span>
      </div>

      <div className="flex items-center gap-2 mb-4 flex-wrap text-[12px]">
        <span className={`${badge.bg} ${badge.text} rounded-full px-2.5 py-0.5 font-semibold inline-flex items-center gap-1`}>
          <span>{badge.emoji}</span>
          {badge.label}
        </span>
        {date && <span className="text-text3">{date}</span>}
        {item.source && <span className="text-text3">· zdroj: {sourceLabel}</span>}
      </div>

      <h1 className="font-[family-name:var(--font-display)] text-3xl md:text-4xl text-text leading-[1.15] mb-5">
        {item.czech_title}
      </h1>

      {item.czech_summary && (
        <p className="text-[17px] text-text leading-relaxed mb-7 font-medium">
          {item.czech_summary}
        </p>
      )}

      {item.image_url && (
        <figure className="mb-8 -mx-5 md:mx-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={item.image_url}
            alt={item.image_alt ?? item.czech_title}
            className="w-full md:rounded-xl aspect-[16/9] object-cover"
          />
          {item.image_attribution && item.image_source_url && (
            <figcaption className="text-[11px] text-text3 mt-2 px-5 md:px-0">
              Foto:{' '}
              <a
                href={item.image_source_url}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-olive-dark underline"
              >
                {item.image_attribution} / Unsplash
              </a>
            </figcaption>
          )}
        </figure>
      )}

      {paragraphs.length > 0 ? (
        <div className="space-y-5 text-[16px] text-text leading-[1.75] mb-8">
          {paragraphs.map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </div>
      ) : (
        <p className="text-[14px] text-text3 italic mb-8">
          Detailní článek se právě připravuje. Zatím přečti shrnutí výše a originál ve zdroji.
        </p>
      )}

      {item.cz_context && (
        <div className="bg-olive-bg/40 border border-olive-border rounded-xl px-5 py-4 mb-8">
          <div className="text-[11px] font-semibold text-olive-dark uppercase tracking-wider mb-1.5">
            Kontext pro český trh
          </div>
          <p className="text-[15px] text-text leading-relaxed">
            {item.cz_context}
          </p>
        </div>
      )}

      {item.original_url && (
        <div className="border-t border-off2 pt-6 mt-10">
          <div className="text-[11px] font-semibold text-text3 uppercase tracking-wider mb-2">
            Originální zdroj
          </div>
          <a
            href={item.original_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-[14px] text-olive hover:text-olive-dark"
          >
            {item.original_title || sourceLabel} ↗
          </a>
          <p className="text-[12px] text-text3 mt-1">
            Otevře se v novém okně. Český článek výše vznikl redakčním zpracováním zdroje.
          </p>
        </div>
      )}

      <div className="mt-12 pt-6 border-t border-off2">
        <Link href="/novinky" className="text-[13px] text-olive hover:text-olive-dark">
          ← Všechny novinky
        </Link>
      </div>
    </article>
  )
}
