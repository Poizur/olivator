import Link from 'next/link'
import { getArticles } from '@/lib/static-content'

export const metadata = {
  title: 'Průvodce olivovými oleji',
  description: 'Články, návody a srovnání — vše co potřebujete vědět o olivových olejích.',
}

export default function PruvodcePage() {
  const articles = getArticles().filter(a => a.category !== 'recept')

  return (
    <div className="max-w-[1080px] mx-auto px-10 py-10">
      <div className="mb-8">
        <h1 className="font-[family-name:var(--font-display)] text-4xl font-normal text-text mb-1.5">
          Průvodce
        </h1>
        <p className="text-[15px] text-text2 font-light">
          Z olivového světa — články, srovnání, návody
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {articles.map(a => (
          <Link
            key={a.slug}
            href={`/pruvodce/${a.slug}`}
            className="bg-white border border-off2 rounded-[var(--radius-card)] overflow-hidden flex transition-all hover:shadow-[0_8px_24px_rgba(0,0,0,.06)] hover:-translate-y-0.5"
          >
            <div className="w-[130px] shrink-0 bg-off flex items-center justify-center text-[44px]">
              {a.emoji}
            </div>
            <div className="p-4">
              <div className="text-[10px] font-semibold tracking-widest uppercase text-olive mb-1.5">
                {a.category === 'pruvodce' ? 'Průvodce' : a.category === 'zebricek' ? 'Žebříček' : a.category === 'srovnani' ? 'Srovnání' : 'Vzdělávání'}
              </div>
              <div className="text-[15px] font-medium text-text leading-snug mb-1 tracking-tight">
                {a.title}
              </div>
              <div className="text-xs text-text3 mb-2">{a.readTime}</div>
              <div className="text-xs text-text2 leading-relaxed">{a.excerpt}</div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
