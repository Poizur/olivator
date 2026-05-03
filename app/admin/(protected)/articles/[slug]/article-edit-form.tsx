'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { AdminBlock } from '@/components/admin-block'
import type { ArticleFull } from '@/lib/articles-db'

const CATEGORY_OPTIONS = [
  { value: 'pruvodce', label: 'Průvodce' },
  { value: 'zebricek', label: 'Žebříček' },
  { value: 'srovnani', label: 'Srovnání' },
  { value: 'vzdelavani', label: 'Vzdělávání' },
]

export function ArticleEditForm({ article }: { article: ArticleFull }) {
  const router = useRouter()
  const [title, setTitle] = useState(article.title)
  const [excerpt, setExcerpt] = useState(article.excerpt ?? '')
  const [emoji, setEmoji] = useState(article.emoji ?? '📖')
  const [readTime, setReadTime] = useState(article.readTime ?? '5 min čtení')
  const [heroImageUrl, setHeroImageUrl] = useState(article.heroImageUrl ?? '')
  const [category, setCategory] = useState(article.category)
  const [bodyMarkdown, setBodyMarkdown] = useState(article.bodyMarkdown ?? '')
  const [metaTitle, setMetaTitle] = useState(article.metaTitle ?? '')
  const [metaDescription, setMetaDescription] = useState(article.metaDescription ?? '')
  const [status, setStatus] = useState(article.status)

  const [saving, setSaving] = useState(false)
  const [feedback, setFeedback] = useState<{ ok: boolean; msg: string } | null>(null)

  function notify(ok: boolean, msg: string) {
    setFeedback({ ok, msg })
    setTimeout(() => setFeedback(null), 4000)
  }

  async function save() {
    setSaving(true)
    try {
      const res = await fetch(`/api/admin/articles/${article.slug}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          excerpt,
          emoji,
          readTime,
          heroImageUrl: heroImageUrl || null,
          category,
          bodyMarkdown: bodyMarkdown || null,
          metaTitle: metaTitle || null,
          metaDescription: metaDescription || null,
          status,
        }),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      notify(true, '✅ Uloženo')
      router.refresh()
    } catch (err) {
      notify(false, err instanceof Error ? err.message : 'Chyba')
    } finally {
      setSaving(false)
    }
  }

  async function deleteArticle() {
    if (!confirm('Smazat článek? Nelze vrátit.')) return
    try {
      const res = await fetch(`/api/admin/articles/${article.slug}`, { method: 'DELETE' })
      if (!res.ok) throw new Error((await res.json()).error)
      router.push('/admin/articles')
    } catch (err) {
      notify(false, err instanceof Error ? err.message : 'Chyba')
    }
  }

  return (
    <div className="space-y-6">
      {/* Sticky toolbar */}
      <div className="sticky top-9 z-30 bg-white border border-off2 rounded-[var(--radius-card)] px-5 py-3 shadow-sm flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 mr-auto">
          <label className="text-[11px] text-text3 uppercase tracking-wider">Status:</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="border border-off2 rounded-md px-2 py-1 text-[13px]"
          >
            <option value="draft">draft</option>
            <option value="active">active</option>
            <option value="archived">archived</option>
          </select>
        </div>
        <a
          href={`/pruvodce/${article.slug}`}
          target="_blank"
          rel="noopener"
          className="px-3 py-1.5 bg-white border border-off2 text-text rounded-lg text-[12px] hover:border-olive"
        >
          🔗 Náhled
        </a>
        <button
          onClick={deleteArticle}
          className="px-3 py-1.5 bg-white border border-off2 text-text3 rounded-lg text-[12px] hover:border-red-300 hover:text-red-700"
        >
          🗑 Smazat
        </button>
        <button
          onClick={save}
          disabled={saving}
          className="px-4 py-1.5 bg-olive text-white rounded-lg text-[13px] font-medium hover:bg-olive-dark disabled:opacity-50"
        >
          {saving ? '⏳ Ukládám…' : '💾 Uložit'}
        </button>
      </div>

      {feedback && (
        <div
          className={`text-[12px] px-3 py-2 rounded-lg ${
            feedback.ok
              ? 'bg-olive-bg text-olive-dark border border-olive-border'
              : 'bg-red-50 text-red-700 border border-red-200'
          }`}
        >
          {feedback.msg}
        </div>
      )}

      <AdminBlock
        number={1}
        icon="📝"
        title="Základní info"
        publicLocation="Hero stránky článku — title, excerpt, emoji"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-[11px] font-medium text-text2 mb-1.5 uppercase tracking-wider">
              Název
            </label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full border border-off2 rounded-lg px-3 py-2 text-[14px] focus:outline-none focus:border-olive"
            />
          </div>
          <div>
            <label className="block text-[11px] font-medium text-text2 mb-1.5 uppercase tracking-wider">
              Excerpt (perex)
            </label>
            <textarea
              value={excerpt}
              onChange={(e) => setExcerpt(e.target.value)}
              rows={2}
              maxLength={250}
              className="w-full border border-off2 rounded-lg px-3 py-2 text-[14px] resize-none focus:outline-none focus:border-olive"
            />
            <p className="text-[10px] text-text3 mt-0.5">{excerpt.length}/250</p>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-medium text-text2 mb-1.5 uppercase tracking-wider">
                Emoji
              </label>
              <input
                value={emoji}
                onChange={(e) => setEmoji(e.target.value)}
                maxLength={4}
                className="w-full border border-off2 rounded-lg px-3 py-2 text-[20px] text-center"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-text2 mb-1.5 uppercase tracking-wider">
                Read time
              </label>
              <input
                value={readTime}
                onChange={(e) => setReadTime(e.target.value)}
                placeholder="5 min čtení"
                className="w-full border border-off2 rounded-lg px-3 py-2 text-[14px]"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-text2 mb-1.5 uppercase tracking-wider">
                Kategorie
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full border border-off2 rounded-lg px-3 py-2 text-[14px]"
              >
                {CATEGORY_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-[11px] font-medium text-text2 mb-1.5 uppercase tracking-wider">
              Hero image URL (volitelné)
            </label>
            <input
              value={heroImageUrl}
              onChange={(e) => setHeroImageUrl(e.target.value)}
              placeholder="https://..."
              className="w-full border border-off2 rounded-lg px-3 py-2 text-[14px]"
            />
          </div>
        </div>
      </AdminBlock>

      <AdminBlock
        number={2}
        icon="📖"
        title="Obsah článku (markdown)"
        publicLocation="Hlavní text článku"
        description="Markdown s ## H2, ### H3, seznamy, tabulkami. Použij {{products.count}}, {{link:srovnavac|odkaz}} pro live data."
      >
        <textarea
          value={bodyMarkdown}
          onChange={(e) => setBodyMarkdown(e.target.value)}
          rows={25}
          placeholder={`## Nadpis sekce\nText...\n\nPři psaní použij tokeny:\n- {{products.count}} → aktuální počet olejů\n- {{link:srovnavac|srovnávač}} → klikatelný odkaz`}
          className="w-full border border-off2 rounded-lg px-3 py-2 text-[13px] font-mono resize-y focus:outline-none focus:border-olive"
        />
        <p className="text-[11px] text-text3 mt-2">{bodyMarkdown.length} znaků</p>
      </AdminBlock>

      <AdminBlock
        number={3}
        icon="🔍"
        title="SEO"
        publicLocation="HTML <title> + meta description"
      >
        <div className="space-y-3">
          <div>
            <label className="block text-[11px] font-medium text-text2 mb-1.5 uppercase tracking-wider">
              Meta title (max 70)
            </label>
            <input
              value={metaTitle}
              onChange={(e) => setMetaTitle(e.target.value)}
              maxLength={70}
              className="w-full border border-off2 rounded-lg px-3 py-2 text-[14px]"
            />
            <p className="text-[10px] text-text3 mt-0.5">{metaTitle.length}/70</p>
          </div>
          <div>
            <label className="block text-[11px] font-medium text-text2 mb-1.5 uppercase tracking-wider">
              Meta description (max 160)
            </label>
            <textarea
              value={metaDescription}
              onChange={(e) => setMetaDescription(e.target.value)}
              maxLength={160}
              rows={2}
              className="w-full border border-off2 rounded-lg px-3 py-2 text-[14px] resize-none"
            />
            <p className="text-[10px] text-text3 mt-0.5">{metaDescription.length}/160</p>
          </div>
        </div>
      </AdminBlock>
    </div>
  )
}
