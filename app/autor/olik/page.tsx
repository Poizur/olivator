import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import Script from 'next/script'
import { getAuthorBySlug, getArticlesByAuthor } from '@/lib/authors-db'
import { breadcrumbSchema } from '@/lib/schema'
import { getSiteStats } from '@/lib/data'

export const revalidate = 3600

export async function generateMetadata(): Promise<Metadata> {
  const stats = await getSiteStats()
  const desc = `Olík nesnáší dvě věci: marketingové bláboly a olej s kyselostí nad 0,5 %. Provází katalogem ${stats.activeProducts} olejů od ${stats.activeRetailers} partnerských e-shopů.`
  return {
    title: 'Olík — datový průvodce Olivátoru | Olivator',
    description: desc,
    alternates: { canonical: 'https://olivator.cz/autor/olik' },
    openGraph: {
      type: 'profile',
      url: 'https://olivator.cz/autor/olik',
      title: 'Olík — datový průvodce Olivátoru',
      description: desc,
      images: [{ url: 'https://olivator.cz/olik.png', width: 400, height: 400, alt: 'Olík' }],
    },
  }
}

const OLIK_STATIC = {
  name: 'Olík',
  bioShort: null as string | null, // přepsáno dynamicky v rendereru
  bioFull: `Datový průvodce Olivátoru. Číslům věří víc než marketingovým sloganům.

Olík je maskot a průvodce Olivátoru — obsah připravuje redakce podle veřejné metodiky.

Olík nesnáší dvě věci: marketingové bláboly a olej s kyselostí nad 0,5 %. Ostatní mu nevadí.

Olivátor sleduje deklarovaná data výrobců — certifikáty, kyselost z protokolů, polyfenoly tam kde jsou dostupné — a počítá transparentní Score, které lze přepočítat. Metodika je veřejná na /metodika.

Žádný výrobce mu neplatí. Naopak: čím dráž olej stojí, tím víc ho štve, když data neodpovídají ceně.`,
  schemaMetadata: {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: 'Olík',
    jobTitle: 'datový průvodce Olivátoru',
    url: 'https://olivator.cz/autor/olik',
    image: 'https://olivator.cz/olik.png',
    worksFor: { '@type': 'Organization', name: 'Olivátor', url: 'https://olivator.cz' },
    knowsAbout: [
      'olivový olej',
      'Olivator Score',
      'DOP certifikace',
      'polyfenoly',
      'Mediterranean diet',
    ],
    knowsLanguage: ['cs', 'en'],
  },
}

const CATEGORY_LABEL: Record<string, string> = {
  pruvodce: 'Průvodce',
  zebricek: 'Žebříček',
  srovnani: 'Srovnání',
  vzdelavani: 'Vzdělávání',
  recept: 'Recept',
}

const TOPICS: { label: string; href: string; flag?: string }[] = [
  { label: 'DOP certifikované oleje', href: '/srovnavac?certifikace=DOP' },
  { label: 'Polyfenoly a zdraví', href: '/pruvodce/polyfenoly-kolik-je-dost' },
  { label: 'Early harvest sezóna', href: '/pruvodce/sklizen-oliv-early-vs-late-harvest' },
  { flag: '🇬🇷', label: 'Řecko — Kalamata, Sitia', href: '/srovnavac?origin=GR' },
  { flag: '🇮🇹', label: 'Itálie — Apulie, Umbrie', href: '/srovnavac?origin=IT' },
  { flag: '🇪🇸', label: 'Španělsko — Andalusie', href: '/srovnavac?origin=ES' },
  { label: 'Cena vs. kvalita', href: '/pruvodce/premium-olivovy-olej-ma-smysl' },
  { label: 'Olivator Score metodika', href: '/metodika' },
]

export default async function OlikAuthorPage() {
  const [dbAuthor, articles, siteStats] = await Promise.all([
    getAuthorBySlug('olik'),
    getArticlesByAuthor('olik', { limit: 12 }),
    getSiteStats(),
  ])

  const author = dbAuthor ?? OLIK_STATIC
  const schema = dbAuthor?.schemaMetadata ?? OLIK_STATIC.schemaMetadata

  const dynamicBioShort = dbAuthor?.bioShort
    ?? `Olík nesnáší dvě věci: marketingové bláboly a olej s kyselostí nad 0,5 %. Provází katalogem ${siteStats.activeProducts} olejů od ${siteStats.activeRetailers} partnerských e-shopů a vysvětluje, jak číst deklarovaná data. Score počítá Olivátor podle veřejné metodiky.`

  const STATS = [
    { value: '847', label: 'olejů ochutnaných' },
    { value: '12', label: 'olivových hájů' },
    { value: String(siteStats.activeRetailers), label: 'partnerských e-shopů' },
    { value: '100', label: 'bodů Olivator Score' },
  ]

  const breadcrumbs = breadcrumbSchema([
    { name: 'Olivátor', url: '/' },
    { name: 'Olík', url: '/autor/olik' },
  ])

  return (
    <div className="max-w-[1080px] mx-auto px-6 md:px-10 py-8 md:py-12">
      <Script
        id="olik-schema"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />
      <Script
        id="olik-breadcrumbs"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbs) }}
      />

      {/* Breadcrumb */}
      <div className="text-xs text-text3 mb-8">
        <Link href="/" className="text-olive">Olivátor</Link>
        {' › '}
        Olík
      </div>

      {/* Hero */}
      <div className="flex flex-col md:flex-row items-start gap-8 mb-10 pb-10 border-b border-off2">
        <div className="shrink-0">
          <Image
            src="/olik.png"
            alt="Olík"
            width={120}
            height={120}
            className="rounded-full"
            priority
          />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[10px] font-bold tracking-widest uppercase text-olive mb-2">
            datový průvodce
          </div>
          <h1 className="font-[family-name:var(--font-display)] text-4xl font-normal text-text mb-3">
            Olík
          </h1>
          <p className="text-[15px] text-text2 leading-relaxed mb-4 max-w-[600px]">
            {dynamicBioShort}
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
        {STATS.map((s) => (
          <div
            key={s.label}
            className="bg-white border border-off2 rounded-[var(--radius-card)] p-4 text-center"
          >
            <div className="font-[family-name:var(--font-display)] text-3xl text-olive mb-1">
              {s.value}
            </div>
            <div className="text-[11px] text-text3">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Bio full */}
      <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-8 mb-12">
        <div className="space-y-4">
          <h2 className="font-[family-name:var(--font-display)] text-2xl font-normal text-text">
            O Olíkovi
          </h2>
          {(author.bioFull ?? OLIK_STATIC.bioFull)
            .split('\n\n')
            .filter(Boolean)
            .map((para, i) => (
              <p key={i} className="text-[15px] text-text2 leading-relaxed">
                {para}
              </p>
            ))}
        </div>

        {/* Topics */}
        <div className="bg-off rounded-[var(--radius-card)] p-5">
          <h3 className="text-[10px] font-bold tracking-widest uppercase text-text3 mb-3">
            Oblíbená témata
          </h3>
          <nav className="space-y-1.5">
            {TOPICS.map((topic) => (
              <Link
                key={topic.href}
                href={topic.href}
                className="flex items-center gap-2 text-[13px] text-text2 hover:text-olive py-0.5 transition-colors"
              >
                {topic.flag && <span>{topic.flag}</span>}
                {topic.label}
              </Link>
            ))}
          </nav>
        </div>
      </div>

      {/* Articles */}
      {articles.length > 0 && (
        <div>
          <h2 className="font-[family-name:var(--font-display)] text-2xl font-normal text-text mb-5">
            Olíkovy články
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {articles.map((a) => (
              <Link
                key={a.slug}
                href={`/${a.category === 'recept' ? 'recept' : 'pruvodce'}/${a.slug}`}
                className="bg-white border border-off2 rounded-[var(--radius-card)] p-4 flex gap-3 hover:shadow-[0_4px_16px_rgba(0,0,0,.06)] hover:-translate-y-0.5 transition-all"
              >
                <div className="shrink-0 w-14 h-14 rounded-md overflow-hidden bg-[#d8f3dc]">
                  {a.heroImageUrl && (
                    <Image
                      src={a.heroImageUrl}
                      alt={a.title}
                      width={56}
                      height={56}
                      className="object-cover w-full h-full"
                    />
                  )}
                </div>
                <div className="min-w-0">
                  <div className="text-[10px] font-semibold tracking-widest uppercase text-olive mb-1">
                    {CATEGORY_LABEL[a.category] ?? 'Článek'}
                  </div>
                  <div className="text-[13px] font-medium text-text leading-tight line-clamp-2">
                    {a.title}
                  </div>
                  {a.readTime && (
                    <div className="text-[11px] text-text3 mt-1">{a.readTime}</div>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
