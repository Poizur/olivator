import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getArticleBySlug as getArticleFromDb, getActiveArticles } from '@/lib/articles-db'
import { getArticles, getArticleBySlug as getStaticArticle } from '@/lib/static-content'
import { supabaseAdmin } from '@/lib/supabase'
import { ArticleBody } from '@/components/article-body'
import { resolveTemplateVars, resolveProductTokens } from '@/lib/template-vars'
import { getProductsWithOffers } from '@/lib/data'
import { diverseTopProducts } from '@/lib/product-selection'
import { formatPrice } from '@/lib/utils'
import { ProductImage } from '@/components/product-image'
import { breadcrumbSchema } from '@/lib/schema'
import { AuthorByline } from '@/components/article/author-byline'
import { OlikAuthorBox } from '@/components/article/olik-author-box'
import { LeadMagnetCta } from '@/components/lead-magnet-cta'

// force-dynamic: obsah článků se mění v DB — vždy fetchuj čerstvá data.
// ISR by mohlo servírovat zastaralý obsah až 1 hodinu po DB editaci.
export const dynamic = 'force-dynamic'

export async function generateStaticParams() {
  // DB articles — primární zdroj (pre-build všech aktivních DB článků)
  const { data: dbArticles } = await supabaseAdmin
    .from('articles')
    .select('slug')
    .eq('status', 'active')

  const dbSlugs = new Set((dbArticles ?? []).map((a: { slug: string }) => a.slug))

  const staticSlugs = getArticles()
    .filter((a) => a.category !== 'recept' && !dbSlugs.has(a.slug))
    .map((a) => ({ slug: a.slug }))

  return [...(dbArticles ?? []).map((a: { slug: string }) => ({ slug: a.slug })), ...staticSlugs]
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  // Primárně DB, fallback static
  const dbArticle = await getArticleFromDb(slug)
  const staticArticle = !dbArticle ? getStaticArticle(slug) : null
  if (!dbArticle && !staticArticle) return { title: 'Článek nenalezen' }
  const title = dbArticle?.metaTitle || dbArticle?.title || staticArticle?.title || ''
  const description =
    dbArticle?.metaDescription || dbArticle?.excerpt || staticArticle?.excerpt || ''
  return {
    title,
    description,
    alternates: { canonical: `https://olivator.cz/pruvodce/${slug}` },
    openGraph: {
      type: 'article',
      url: `https://olivator.cz/pruvodce/${slug}`,
      title,
      description,
    },
  }
}

const CATEGORY_LABEL = {
  pruvodce: 'Průvodce',
  zebricek: 'Žebříček',
  srovnani: 'Srovnání',
  vzdelavani: 'Vzdělávání',
} as const

export default async function ArticleDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params

  // Primárně DB, fallback static
  const dbArticle = await getArticleFromDb(slug)
  if (dbArticle && dbArticle.status !== 'active') notFound()

  let article: {
    slug: string
    title: string
    excerpt: string | null
    emoji: string | null
    readTime: string | null
    category: string
    body: string | null
    publishedAt: string | null
    updatedAt: string | null
    heroImageUrl: string | null
  } | null = null

  if (dbArticle) {
    article = {
      slug: dbArticle.slug,
      title: dbArticle.title,
      excerpt: dbArticle.excerpt,
      emoji: dbArticle.emoji,
      readTime: dbArticle.readTime,
      category: dbArticle.category,
      body: dbArticle.bodyMarkdown,
      publishedAt: dbArticle.publishedAt,
      updatedAt: dbArticle.updatedAt,
      heroImageUrl: dbArticle.heroImageUrl,
    }
  } else {
    const sa = getStaticArticle(slug)
    if (!sa || sa.category === 'recept') notFound()
    article = {
      slug: sa.slug,
      title: sa.title,
      excerpt: sa.excerpt,
      emoji: sa.emoji,
      readTime: sa.readTime,
      category: sa.category,
      body: sa.body ?? null,
      publishedAt: null,
      updatedAt: null,
      heroImageUrl: sa.imageUrl ?? null,
    }
  }

  if (!article) notFound()

  // Resolve template variables: nejdřív produktové karty ({{product:slug}} → markery
  // + productMap), pak stat/link tokeny ({{products.count}}, {{link:...}}).
  // Pořadí je důležité: resolveTemplateVars nesmí viděte neodřešené {{product:...}}.
  const rawBody = article.body ?? ''
  const { processedBody, productMap } = await resolveProductTokens(rawBody)
  const resolvedBody = processedBody ? await resolveTemplateVars(processedBody, 'markdown') : ''

  // Sidebar data — top oleje + related články (DB) + recepty
  const [allProducts, dbArticles] = await Promise.all([
    getProductsWithOffers(),
    getActiveArticles(),
  ])
  const topProducts = diverseTopProducts(
    allProducts.filter((p) => p.olivatorScore != null),
    5,
    2,
  )

  // Related články: DB-first, fallback static
  const otherArticles =
    dbArticles.length > 0
      ? dbArticles.filter((a) => a.slug !== article!.slug).slice(0, 3)
      : getArticles()
          .filter((a) => a.category !== 'recept' && a.slug !== article!.slug)
          .slice(0, 3)
          .map((a) => ({
            slug: a.slug,
            title: a.title,
            emoji: a.emoji,
            readTime: a.readTime,
            category: a.category,
          }))

  const recipeArticles =
    dbArticles.filter((a) => a.category === 'recept').slice(0, 2).length > 0
      ? dbArticles.filter((a) => a.category === 'recept').slice(0, 2)
      : getArticles().filter((a) => a.category === 'recept').slice(0, 2).map((r) => ({
          slug: r.slug, title: r.title, emoji: r.emoji, readTime: r.readTime,
          category: r.category, heroImageUrl: (r as { imageUrl?: string }).imageUrl ?? null,
          excerpt: '', body: null, bodyMarkdown: null, publishedAt: null, updatedAt: null,
        }))

  // Schema.org Article — datePublished/dateModified povinné pro Google rich
  // results (article snippet s autorem + datem). Bez nich Google nezobrazí.
  // Static články dostanou aktuální build time jako fallback.
  const buildTime = new Date().toISOString()
  const articleSchema = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: article.title,
    description: article.excerpt,
    inLanguage: 'cs-CZ',
    datePublished: article.publishedAt ?? buildTime,
    dateModified: article.publishedAt ?? buildTime,
    // image — Google Article rich snippet vyžaduje image pole (1200×675 ideálně).
    // Static články bez heroImageUrl: padají do fallback bez image (Google
    // pak Article rich result nezobrazí, ale zbytek schémy stále funguje).
    ...(article.heroImageUrl
      ? {
          image: {
            '@type': 'ImageObject',
            url: article.heroImageUrl,
          },
        }
      : {}),
    author: {
      '@type': 'Person',
      name: 'Olík',
      url: 'https://olivator.cz/autor/olik',
    },
    publisher: {
      '@type': 'Organization',
      name: 'Olivátor',
      url: 'https://olivator.cz',
      logo: {
        '@type': 'ImageObject',
        url: 'https://olivator.cz/logo-wordmark.png',
      },
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': `https://olivator.cz/pruvodce/${article.slug}`,
    },
  }

  const breadcrumbs = breadcrumbSchema([
    { name: 'Olivátor', url: '/' },
    { name: 'Průvodce', url: '/pruvodce' },
    { name: article.title, url: `/pruvodce/${article.slug}` },
  ])

  // FAQPage schema — parsuje sekci ## FAQ / ## Časté dotazy z body_markdown.
  // Google zobrazí FAQ rich snippet pokud stránka obsahuje platné Q&A.
  // Formát v textu: **Otázka?** následovaná odpovědí (jeden nebo více odstavců
  // než přijde další tučná otázka nebo konec sekce).
  const faqSchema = (() => {
    if (!resolvedBody) return null
    const faqSectionMatch = resolvedBody.match(
      /#{1,3}\s*(?:FAQ|Časté dotazy|Nejčastější dotazy|Otázky a odpovědi)[^\n]*\n([\s\S]*?)(?=\n#{1,3} |\s*$)/i
    )
    if (!faqSectionMatch) return null
    const faqText = faqSectionMatch[1]
    // Pattern: **Question?** (newline) answer text (until next ** or end)
    const qaPattern = /\*\*([^*]+\?[^*]*)\*\*\s*\n([\s\S]*?)(?=\*\*[^*]+\?|\s*$)/g
    const items: { question: string; answer: string }[] = []
    let match
    while ((match = qaPattern.exec(faqText)) !== null) {
      const question = match[1].trim()
      const answer = match[2].replace(/\*\*/g, '').replace(/\n+/g, ' ').trim()
      if (question && answer && answer.length > 20) {
        items.push({ question, answer })
      }
    }
    if (items.length === 0) return null
    return {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: items.map((item) => ({
        '@type': 'Question',
        name: item.question,
        acceptedAnswer: {
          '@type': 'Answer',
          text: item.answer,
        },
      })),
    }
  })()

  return (
    <div className="max-w-[1280px] mx-auto px-6 md:px-10 py-8 md:py-10">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbs) }}
      />
      {faqSchema && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
        />
      )}

      <div className="text-xs text-text3 mb-6">
        <Link href="/" className="text-olive">Olivátor</Link>
        {' › '}
        <Link href="/pruvodce" className="text-olive">Průvodce</Link>
        {' › '}
        {article.title}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-8 lg:gap-12 items-start relative">
        {/* Main article column */}
        <article className="min-w-0 max-w-[720px]">
          <div className="text-[10px] font-semibold tracking-widest uppercase text-olive mb-3">
            {CATEGORY_LABEL[article.category as keyof typeof CATEGORY_LABEL] ?? 'Článek'}
          </div>

          <h1 className="font-[family-name:var(--font-display)] text-3xl md:text-4xl font-normal text-text mb-3 leading-tight">
            {article.title}
          </h1>

          <p className="text-[15px] text-text2 leading-relaxed mb-4">{article.excerpt}</p>

          <AuthorByline
            publishedAt={article.publishedAt}
            updatedAt={article.updatedAt}
            readTime={article.readTime}
          />

          <div className="rounded-[var(--radius-card)] aspect-[16/9] overflow-hidden mb-8 relative bg-olive-bg/40">
            {article.heroImageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={article.heroImageUrl}
                alt={article.title}
                className="absolute inset-0 w-full h-full object-cover"
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-6xl md:text-7xl">
                {article.emoji}
              </div>
            )}
          </div>

          {resolvedBody ? (
            <ArticleBody body={resolvedBody} productMap={productMap} />
          ) : (
            <div className="space-y-4 text-text2">
              <p className="text-base leading-relaxed">{article.excerpt}</p>
              <p className="text-base leading-relaxed text-text3 italic">
                Plný obsah článku se připravuje.
              </p>
            </div>
          )}

          <LeadMagnetCta variant="compact" source="leadmagnet_article" />

          <OlikAuthorBox />

          {/* Inline CTA — důvěryhodnost */}
          <div className="bg-off/60 border border-off2 rounded-[var(--radius-card)] p-5 mt-10">
            <p className="text-[13px] text-text2 leading-relaxed">
              <strong className="text-text">Olivátor</strong> je největší srovnávač olivových
              olejů v ČR. Sledujeme reálné ceny u 18 prodejců a hodnotíme oleje podle
              objektivního Olivator Score.{' '}
              <Link href="/metodika" className="text-olive border-b border-olive-border">
                Jak hodnotíme →
              </Link>
            </p>
          </div>

          <div className="mt-10 pt-6 border-t border-off">
            <Link href="/pruvodce" className="text-sm text-olive">
              ← Zpět na průvodce
            </Link>
          </div>
        </article>

        {/* Sidebar */}
        <aside className="space-y-5">
          {/* Top oleje */}
          {topProducts.length > 0 && (
            <div className="bg-white border border-off2 rounded-[var(--radius-card)] p-4">
              <div className="text-[10px] font-bold tracking-widest uppercase text-olive mb-3">
                🏆 Top oleje
              </div>
              <ul className="space-y-3">
                {topProducts.map((p, i) => (
                  <li key={p.id}>
                    <Link
                      href={`/olej/${p.slug}`}
                      className="flex items-center gap-2.5 group"
                    >
                      <span className="shrink-0 w-4 text-[11px] text-text3 font-mono tabular-nums">
                        {i + 1}.
                      </span>
                      <div className="w-10 h-10 bg-white border border-off2 rounded shrink-0 overflow-hidden p-0.5">
                        <ProductImage product={p} fallbackSize="text-lg" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[13px] text-text font-medium leading-tight line-clamp-1 group-hover:text-olive">
                          {p.nameShort || p.name}
                        </div>
                        <div className="text-[11px] text-text3 mt-0.5 flex items-center gap-2">
                          {p.type === 'flavored' ? (
                            <span className="text-terra font-bold uppercase tracking-wider text-[9px]">Aroma</span>
                          ) : p.olivatorScore != null && p.olivatorScore > 0 ? (
                            <span className="text-terra font-semibold">{p.olivatorScore}</span>
                          ) : (
                            <span className="text-text3">—</span>
                          )}
                          {p.cheapestOffer && (
                            <span>· {formatPrice(p.cheapestOffer.price)}</span>
                          )}
                        </div>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
              <Link
                href="/srovnavac"
                className="block text-center text-[12px] text-olive font-medium mt-3 pt-3 border-t border-off2 hover:text-olive-dark"
              >
                Srovnat všechny oleje →
              </Link>
            </div>
          )}

          {/* Related guides */}
          {otherArticles.length > 0 && (
            <div className="bg-white border border-off2 rounded-[var(--radius-card)] p-4">
              <div className="text-[10px] font-bold tracking-widest uppercase text-olive mb-3">
                📚 Další průvodci
              </div>
              <ul className="space-y-2.5">
                {otherArticles.map((a) => (
                  <li key={a.slug}>
                    <Link
                      href={`/pruvodce/${a.slug}`}
                      className="flex items-start gap-2.5 group"
                    >
                      {'heroImageUrl' in a && a.heroImageUrl ? (
                        <div className="w-12 h-12 shrink-0 rounded overflow-hidden bg-olive-bg/40">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={a.heroImageUrl} alt="" className="w-full h-full object-cover" loading="lazy" />
                        </div>
                      ) : (
                        <span className="text-base shrink-0 leading-none mt-0.5">{a.emoji}</span>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="text-[13px] text-text font-medium leading-tight line-clamp-2 group-hover:text-olive">
                          {a.title}
                        </div>
                        <div className="text-[11px] text-text3 mt-0.5">{a.readTime}</div>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Recepty */}
          {recipeArticles.length > 0 && (
            <div className="bg-olive-bg/40 border border-olive-border/60 rounded-[var(--radius-card)] p-4">
              <div className="text-[10px] font-bold tracking-widest uppercase text-olive-dark mb-3">
                🍅 Recepty s olejem
              </div>
              <ul className="space-y-2.5">
                {recipeArticles.map((r) => (
                  <li key={r.slug}>
                    <Link
                      href={`/recept/${r.slug}`}
                      className="flex items-start gap-2.5 group"
                    >
                      {'heroImageUrl' in r && r.heroImageUrl ? (
                        <div className="w-12 h-12 shrink-0 rounded overflow-hidden bg-olive-bg/40">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={r.heroImageUrl} alt="" className="w-full h-full object-cover" loading="lazy" />
                        </div>
                      ) : (
                        <span className="text-base shrink-0 leading-none mt-0.5">{r.emoji}</span>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="text-[13px] text-olive-dark font-medium leading-tight line-clamp-2 group-hover:text-olive">
                          {r.title}
                        </div>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
              <Link
                href="/recept"
                className="block text-center text-[12px] text-olive-dark font-medium mt-3 pt-3 border-t border-olive-border/40"
              >
                Všechny recepty →
              </Link>
            </div>
          )}

          {/* Trust signal */}
          <div className="bg-white border border-off2 rounded-[var(--radius-card)] p-4">
            <div className="text-[10px] font-bold tracking-widest uppercase text-text3 mb-2">
              💡 Jak hodnotíme
            </div>
            <p className="text-[12px] text-text2 leading-relaxed mb-3">
              Olivator Score (0-100) kombinuje kyselost, polyfenoly, certifikace a poměr
              cena/kvalita. Žádné placené pozice, žádné dotazníky producentů.
            </p>
            <Link
              href="/metodika"
              className="text-[12px] text-olive font-medium hover:text-olive-dark"
            >
              Plná metodika →
            </Link>
          </div>
        </aside>
      </div>
    </div>
  )
}
