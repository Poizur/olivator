import Link from 'next/link'
import { getProductsWithOffers } from '@/lib/data'
import { getArticles } from '@/lib/static-content'
import { OilCard } from '@/components/oil-card'

const CATEGORIES = [
  { emoji: '🇬🇷', name: 'Řecké oleje', count: 3, href: '/srovnavac?origin=GR' },
  { emoji: '🇮🇹', name: 'Italské oleje', count: 2, href: '/srovnavac?origin=IT' },
  { emoji: '🇪🇸', name: 'Španělské oleje', count: 2, href: '/srovnavac?origin=ES' },
  { emoji: '🌿', name: 'Bio & organické', count: 4, href: '/srovnavac?cert=bio' },
  { emoji: '🏆', name: 'Oceněné oleje', count: 3, href: '/srovnavac?cert=nyiooc' },
  { emoji: '💰', name: 'Do 200 Kč', count: 3, href: '/srovnavac?maxPrice=200' },
]

export default async function Home() {
  const allProducts = await getProductsWithOffers()
  const products = allProducts.slice(0, 3)
  const articles = getArticles().slice(0, 4)

  return (
    <>
      {/* Hero */}
      <section className="px-10 pt-22 pb-20 text-center bg-white">
        <div className="inline-flex items-center gap-1.5 text-xs font-medium text-olive bg-olive-bg px-3.5 py-1 rounded-full mb-6 tracking-wide">
          <svg width="11" height="11" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
          </svg>
          {products.length * 100}+ olejů &middot; 18 prodejců &middot; aktualizováno dnes
        </div>
        <h1 className="font-[family-name:var(--font-display)] text-5xl md:text-[64px] font-normal leading-[1.05] tracking-tight text-text mb-5">
          Najdi svůj dokonalý<br />
          <em className="text-olive italic">olivový olej</em>
        </h1>
        <p className="text-lg text-text2 font-light leading-relaxed max-w-[520px] mx-auto mb-10">
          Objektivní Olivator Score, aktuální ceny ze 18 prodejců a expertní průvodce.
        </p>

        {/* Search */}
        <div className="max-w-[560px] mx-auto flex items-center bg-off rounded-[14px] px-5 pr-1.5 py-1.5 border-[1.5px] border-transparent focus-within:bg-white focus-within:border-olive transition-all mb-6">
          <svg width="15" height="15" fill="none" stroke="#aaa" strokeWidth="2" viewBox="0 0 24 24" className="shrink-0 mr-2.5">
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
          </svg>
          <input
            placeholder={'Hledat nebo zkus \u201Elehk\u00FD \u0159eck\u00FD do 200 K\u010D\u201C\u2026'}
            className="flex-1 border-none outline-none text-[15px] bg-transparent text-text placeholder:text-text3"
          />
          <Link
            href="/srovnavac"
            className="bg-olive text-white border-none rounded-[10px] px-5 py-2.5 text-[13px] font-medium"
          >
            Hledat
          </Link>
        </div>

        {/* Tags */}
        <div className="flex gap-2 justify-center flex-wrap">
          {['Extra panenský', 'Bio certifikát', 'Do 200 Kč', 'Nová sklizeň 2024', 'Na salát', 'Porovnat oleje', 'Jak funguje Score?'].map(tag => (
            <Link
              key={tag}
              href={tag === 'Porovnat oleje' ? '/porovnani' : tag === 'Jak funguje Score?' ? '/metodika' : '/srovnavac'}
              className="text-xs text-text2 bg-off rounded-full px-3.5 py-1.5 cursor-pointer transition-all border border-transparent hover:bg-olive-bg hover:text-olive hover:border-olive-border"
            >
              {tag}
            </Link>
          ))}
        </div>
      </section>

      {/* Stats */}
      <div className="bg-off px-10 py-5 flex justify-center gap-14">
        {[
          { n: '582', l: 'olejů v databázi' },
          { n: '18', l: 'srovnaných prodejců' },
          { n: '24h', l: 'aktualizace cen' },
          { n: '100%', l: 'nezávislé hodnocení' },
        ].map(s => (
          <div key={s.l} className="text-center">
            <div className="text-[22px] font-semibold text-text tracking-tight">{s.n}</div>
            <div className="text-[11px] text-text3 mt-0.5">{s.l}</div>
          </div>
        ))}
      </div>

      {/* Top rated */}
      <section className="px-10 py-16 max-w-[1080px] mx-auto">
        <div className="flex items-end justify-between mb-8">
          <div>
            <div className="text-[11px] font-semibold tracking-widest uppercase text-olive mb-1.5">
              Doporučujeme
            </div>
            <div className="font-[family-name:var(--font-display)] text-[32px] font-normal text-text tracking-tight">
              Nejlépe hodnocené
            </div>
          </div>
          <Link href="/srovnavac" className="text-[13px] text-olive border-b border-olive-border hover:text-olive-dark">
            Zobrazit všechny →
          </Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {products.map((p, i) => (
            <OilCard
              key={p.id}
              product={p}
              offer={p.cheapestOffer ?? undefined}
              isTop={i === 0}
            />
          ))}
        </div>
      </section>

      {/* Categories */}
      <section className="px-10 max-w-[1080px] mx-auto">
        <div className="flex items-end justify-between mb-8">
          <div>
            <div className="text-[11px] font-semibold tracking-widest uppercase text-olive mb-1.5">
              Kategorie
            </div>
            <div className="font-[family-name:var(--font-display)] text-[32px] font-normal text-text tracking-tight">
              Procházet podle původu
            </div>
          </div>
          <Link href="/srovnavac" className="text-[13px] text-olive border-b border-olive-border hover:text-olive-dark">
            Vše →
          </Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {CATEGORIES.map(cat => (
            <Link
              key={cat.name}
              href={cat.href}
              className="bg-off rounded-[var(--radius-card)] px-5 py-5 flex items-center gap-3.5 border border-transparent transition-all hover:bg-olive-bg hover:border-olive-border hover:translate-x-1"
            >
              <span className="text-[26px] shrink-0">{cat.emoji}</span>
              <div>
                <div className="text-sm font-medium text-text">{cat.name}</div>
                <div className="text-xs text-text3 mt-0.5">{cat.count * 47} produktů</div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Quiz CTA */}
      <section className="px-10 py-16 max-w-[1080px] mx-auto">
        <div className="bg-olive-dark rounded-[var(--radius-card)] px-10 md:px-13 py-11 flex flex-col md:flex-row items-center gap-12">
          <div className="flex-1">
            <div className="text-[11px] font-medium tracking-widest uppercase text-white/50 mb-2.5">
              AI průvodce
            </div>
            <div className="font-[family-name:var(--font-display)] text-[32px] text-white font-normal leading-[1.15] mb-2.5">
              Nevíš který<br />olej vybrat?
            </div>
            <p className="text-[15px] text-white/65 font-light leading-relaxed max-w-[380px]">
              3 otázky a doporučíme ti přesně ten pravý — podle chuti, použití a rozpočtu.
            </p>
          </div>
          <button className="bg-white text-olive-dark border-none rounded-full px-7 py-3.5 text-sm font-semibold cursor-pointer shrink-0 transition-all hover:bg-off hover:scale-[1.02]">
            Spustit průvodce →
          </button>
        </div>
      </section>

      {/* Articles */}
      <section className="px-10 max-w-[1080px] mx-auto pb-8">
        <div className="flex items-end justify-between mb-8">
          <div>
            <div className="text-[11px] font-semibold tracking-widest uppercase text-olive mb-1.5">
              Průvodce
            </div>
            <div className="font-[family-name:var(--font-display)] text-[32px] font-normal text-text tracking-tight">
              Z olivového světa
            </div>
          </div>
          <Link href="/pruvodce" className="text-[13px] text-olive border-b border-olive-border hover:text-olive-dark">
            Všechny články →
          </Link>
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
                <div className="text-xs text-text3">{a.readTime}</div>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </>
  )
}
