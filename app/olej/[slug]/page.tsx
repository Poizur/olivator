import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getProducts, getProductBySlug, getOffersForProduct, getProductGallery, getProductCustomFAQs, getActiveGeneralFAQs, getVariantProducts } from '@/lib/data'
import { countryFlag, countryName, typeLabel, certLabel, formatPrice, formatPricePer100ml } from '@/lib/utils'
import { productSchema, breadcrumbSchema, faqSchema } from '@/lib/schema'
import { generateProductFAQ } from '@/lib/product-faq'
import { selectGeneralFAQs } from '@/lib/general-faq'
import { ScoreSection } from '@/components/score-section'
import { FlavorWheel } from '@/components/flavor-wheel'
import { PriceTable } from '@/components/price-table'
import { AffiliateLink } from '@/components/affiliate-link'
import { ProductGallery } from '@/components/product-gallery'
import { ProductActions } from './product-actions'

export async function generateStaticParams() {
  const products = await getProducts()
  return products.map(p => ({ slug: p.slug }))
}

function trimMeta(text: string | null | undefined, max = 155): string {
  const clean = (text ?? '').replace(/\s+/g, ' ').trim()
  if (clean.length <= max) return clean
  return clean.slice(0, max - 1).trim() + '…'
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const product = await getProductBySlug(slug)
  if (!product) return { title: 'Nenalezeno' }

  const title = product.metaTitle || `${product.name} — Score ${product.olivatorScore}/100 · ceny, recenze`
  const description = trimMeta(
    product.metaDescription ||
      product.descriptionShort ||
      `${product.name} — Olivator Score ${product.olivatorScore}/100. Srovnání cen z 18 prodejců.`
  )
  const url = `https://olivator.cz/olej/${product.slug}`

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: 'website',
      locale: 'cs_CZ',
      url,
      siteName: 'Olivator',
      title,
      description,
      // Use product photo for social sharing preview; fallback to site-wide OG
      images: product.imageUrl
        ? [{ url: product.imageUrl, width: 800, height: 800, alt: product.name }]
        : undefined,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: product.imageUrl ? [product.imageUrl] : undefined,
    },
  }
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const product = await getProductBySlug(slug)
  if (!product) notFound()

  const [offers, gallery, customFAQs, dbGeneralFAQs, variants, allProducts] = await Promise.all([
    getOffersForProduct(product.id),
    getProductGallery(product.id),
    getProductCustomFAQs(product.id),
    getActiveGeneralFAQs(),
    getVariantProducts(product.id),
    getProducts(),
  ])
  const cheapest = offers[0]

  // Find 3 similar products for "Porovnat s podobnými" CTA — různá značka,
  // podobné Score/origin/certifikace. Same algorithm as comparator suggestions.
  const similarProducts = (() => {
    const candidates = allProducts.filter(
      (p) => p.id !== product.id && p.nameShort !== product.nameShort
    )
    const scored = candidates.map((p) => {
      let s = 0
      if (p.originCountry === product.originCountry) s += 0.3
      if (p.originRegion && p.originRegion === product.originRegion) s += 0.2
      const scoreDiff = Math.abs(p.olivatorScore - product.olivatorScore)
      s += Math.max(0, (20 - scoreDiff) / 20) * 0.2
      const sharedCerts = p.certifications.filter((c) =>
        product.certifications.includes(c)
      ).length
      s += Math.min(sharedCerts * 0.1, 0.2)
      if (p.type === product.type) s += 0.1
      return { product: p, similarity: s }
    })
    return scored
      .filter((x) => x.similarity >= 0.2)
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, 3)
      .map((x) => x.product)
  })()

  // Transparent spec table — missing data shown as "— nezveřejněno" in italics
  const specs = [
    { key: 'Typ', value: typeLabel(product.type), missing: false },
    {
      key: 'Původ',
      value: product.originRegion
        ? `${product.originRegion}, ${countryName(product.originCountry)}`
        : countryName(product.originCountry) || '— nezveřejněno',
      missing: !product.originCountry,
    },
    {
      key: 'Kyselost',
      value: product.acidity != null ? `${product.acidity} %` : '— data chybí',
      missing: product.acidity == null,
    },
    {
      key: 'Polyfenoly',
      value: product.polyphenols != null ? `${product.polyphenols} mg/kg` : '— data chybí',
      missing: product.polyphenols == null,
    },
    {
      key: 'Rok sklizně',
      value: product.harvestYear ? String(product.harvestYear) : '— nezveřejněno',
      missing: !product.harvestYear,
    },
    {
      key: 'Zpracování',
      value: product.processing === 'cold_pressed' ? 'Za studena lisovaný' : (product.processing || '— nezveřejněno'),
      missing: !product.processing,
    },
    {
      key: 'Certifikace',
      value: product.certifications.length > 0
        ? product.certifications.map(certLabel).join(', ')
        : 'Žádné',
      missing: false,
    },
    {
      key: 'Objem',
      value: product.volumeMl ? `${product.volumeMl} ml` : '— nezveřejněno',
      missing: !product.volumeMl,
    },
    {
      key: 'Obal',
      value: product.packaging === 'dark_glass'
        ? 'Tmavé sklo'
        : product.packaging === 'tin'
        ? 'Plech'
        : (product.packaging || '— nezveřejněno'),
      missing: !product.packaging,
    },
    ...(product.ean
      ? [{ key: 'EAN', value: product.ean, missing: false }]
      : [{ key: 'Původ', value: '🌾 Přímo od výrobce', missing: false }]),
  ]

  // Product-specific FAQs:
  // - If admin saved custom_faqs in DB → use those (admin's edits override defaults)
  // - Otherwise → use auto-generated template ones
  const autoFAQs = generateProductFAQ(product, cheapest ?? null)
  const productFAQs = customFAQs.length > 0
    ? customFAQs.map(f => ({ question: f.question, answer: f.answer }))
    : autoFAQs

  // General FAQs:
  // - If DB has admin-curated entries → use random 5 from those
  // - Otherwise → fall back to hardcoded GENERAL_FAQS (selectGeneralFAQs)
  const generalFAQs = dbGeneralFAQs.length > 0
    ? (() => {
        // Deterministic shuffle by slug to avoid full duplicate content across products
        let hash = 0
        for (let i = 0; i < product.slug.length; i++) hash = ((hash << 5) - hash + product.slug.charCodeAt(i)) | 0
        const start = Math.abs(hash) % dbGeneralFAQs.length
        const out = []
        for (let i = 0; i < Math.min(5, dbGeneralFAQs.length); i++) {
          const f = dbGeneralFAQs[(start + i) % dbGeneralFAQs.length]
          out.push({ question: f.question, answer: f.answer })
        }
        return out
      })()
    : selectGeneralFAQs(product.slug, 5)

  // For Schema.org we combine both — Google rewards comprehensive FAQ pages
  const allFAQs = [...productFAQs, ...generalFAQs]

  return (
    <div>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(productSchema(product, offers)),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(breadcrumbSchema([
            { name: 'Olivator', url: '/' },
            { name: 'Srovnávač', url: '/srovnavac' },
            { name: product.name, url: `/olej/${product.slug}` },
          ])),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(faqSchema(allFAQs)),
        }}
      />
      <div className="max-w-[1040px] mx-auto px-10 py-10">
      <div className="text-xs text-text3 mb-7">
        <Link href="/" className="text-olive cursor-pointer">Olivator</Link>
        {' › '}
        <Link href="/srovnavac" className="text-olive cursor-pointer">Srovnávač</Link>
        {' › '}
        {product.name}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-14 items-start mb-14">
        {/* Left — gallery */}
        <ProductGallery
          productName={product.name}
          fallbackImageUrl={product.imageUrl}
          galleryImages={gallery.map(g => ({
            id: g.id,
            url: g.url,
            altText: g.altText,
            isPrimary: g.isPrimary,
          }))}
          scoreBadge={
            <div className="bg-terra text-white text-sm font-bold px-4 py-2 rounded-full flex items-center gap-1.5 shadow-md">
              <svg width="13" height="13" fill="#fff" viewBox="0 0 24 24">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
              </svg>
              Score {product.olivatorScore}
            </div>
          }
        />

        {/* Right — info */}
        <div>
          <div className="text-[13px] text-text3 mb-1.5">
            {countryFlag(product.originCountry)} {product.originRegion}, {countryName(product.originCountry)} &middot; {typeLabel(product.type)} &middot; {product.volumeMl} ml
          </div>
          <h1 className="font-[family-name:var(--font-display)] text-[34px] font-normal text-text leading-[1.15] mb-2 tracking-tight">
            {product.name}
          </h1>
          <p className="text-[15px] text-text2 leading-relaxed font-light mb-5">
            {product.descriptionShort}
          </p>

          <div className="flex gap-2 flex-wrap mb-6">
            {product.certifications.map(c => (
              <span key={c} className="text-[11px] px-2.5 py-1 rounded-lg font-medium bg-olive-bg text-olive-dark">
                {certLabel(c)}
              </span>
            ))}
            {product.harvestYear && (
              <span className="text-[11px] px-2.5 py-1 rounded-lg font-medium bg-off text-text2">
                Sklizeň {product.harvestYear}
              </span>
            )}
            {product.processing === 'cold_pressed' && (
              <span className="text-[11px] px-2.5 py-1 rounded-lg font-medium bg-off text-text2">
                Za studena lisovaný
              </span>
            )}
            {!product.ean && (
              <span className="text-[11px] px-2.5 py-1 rounded-lg font-medium bg-terra-bg text-terra">
                🌾 Přímo od výrobce
              </span>
            )}
          </div>

          <ScoreSection product={product} />
          <FlavorWheel profile={product.flavorProfile} />
          <PriceTable
            offers={offers}
            volumeMl={product.volumeMl}
            productSlug={product.slug}
            productName={product.name}
          />

          {cheapest && (
            <AffiliateLink
              data={{
                productSlug: product.slug,
                productName: product.name,
                retailerSlug: cheapest.retailer.slug,
                retailerName: cheapest.retailer.name,
                price: cheapest.price,
                source: 'product_page',
              }}
              className="block w-full bg-olive text-white border-none rounded-xl py-3.5 text-[15px] font-medium cursor-pointer text-center transition-colors hover:bg-olive-dark mb-2.5"
            >
              Koupit u {cheapest.retailer.name} — {formatPrice(cheapest.price)}
            </AffiliateLink>
          )}

          <ProductActions product={product} />

          <div className="mt-6">
            <h2 className="text-[13px] font-semibold text-text mb-3 tracking-wide">
              Specifikace
            </h2>
            {specs.map(s => (
              <div key={s.key} className="flex justify-between py-2.5 border-b border-off last:border-b-0">
                <span className="text-[13px] text-text3">{s.key}</span>
                <span className={`text-[13px] ${s.missing ? 'text-text3 italic' : 'font-medium text-text'}`}>
                  {s.value}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Long description — SEO content */}
      {product.descriptionLong && (
        <section className="mt-14 max-w-[720px] mx-auto">
          <h2 className="font-[family-name:var(--font-display)] text-2xl font-normal text-text mb-4">
            O tomto oleji
          </h2>
          <div className="text-[15px] text-text2 leading-relaxed whitespace-pre-line">
            {product.descriptionLong}
          </div>
        </section>
      )}

      {/* Porovnat s podobnými — internal link → /porovnani slug URL */}
      {similarProducts.length >= 2 && (
        <section className="mt-12 max-w-[1040px]">
          <div className="bg-olive-bg/50 border border-olive-border/40 rounded-[var(--radius-card)] p-6">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div className="flex-1 min-w-[280px]">
                <h2 className="font-[family-name:var(--font-display)] text-xl text-text mb-1">
                  Postavit vedle podobných?
                </h2>
                <p className="text-[13px] text-text2 leading-relaxed">
                  Vidíš, jak si {product.nameShort} stojí oproti {similarProducts.length}&nbsp;dalším podobným olejům — Score, kyselost, polyfenoly, cena.
                </p>
              </div>
              <Link
                href={`/porovnani/${[product, ...similarProducts].map((p) => p.slug).join('-vs-')}`}
                className="bg-olive text-white rounded-full px-5 py-2.5 text-[13px] font-medium hover:bg-olive-dark transition-colors whitespace-nowrap"
              >
                Porovnat oleje →
              </Link>
            </div>
            <div className="mt-4 flex gap-2 flex-wrap">
              {similarProducts.map((p) => (
                <Link
                  key={p.id}
                  href={`/olej/${p.slug}`}
                  className="flex items-center gap-2 bg-white border border-off2 rounded-lg px-3 py-2 hover:border-olive-light transition-colors"
                >
                  {p.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.imageUrl} alt={p.name} className="w-7 h-7 object-contain" loading="lazy" />
                  ) : (
                    <span className="text-base">🫒</span>
                  )}
                  <span className="text-[12px] text-text">
                    {countryFlag(p.originCountry)} {p.nameShort}
                  </span>
                  <span className="text-[10px] bg-terra/15 text-terra rounded px-1.5 py-0.5 font-semibold">
                    {p.olivatorScore}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Variants — same brand+region, different sizes */}
      {variants.length > 0 && (
        <section className="mt-12 max-w-[1040px]">
          <h2 className="font-[family-name:var(--font-display)] text-2xl font-normal text-text mb-2">
            Stejný olej v jiných baleních
          </h2>
          <p className="text-[13px] text-text3 mb-4">
            {product.nameShort
              ? `${product.nameShort} z regionu ${product.originRegion ?? ''} v dalších objemech`
              : 'Stejný producent v dalších objemech'}
          </p>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {variants.map(v => (
              <Link
                key={v.id}
                href={`/olej/${v.slug}`}
                className="bg-white border border-off2 rounded-lg p-4 hover:border-olive-light transition-colors group"
              >
                <div className="text-[11px] uppercase tracking-wider text-text3 mb-1">
                  {v.volumeMl ? `${v.volumeMl >= 1000 ? `${v.volumeMl / 1000} l` : `${v.volumeMl} ml`}` : '—'}
                  {v.packaging === 'dark_glass' && ' · sklo'}
                  {v.packaging === 'tin' && ' · plech'}
                </div>
                <div className="text-[13px] font-medium text-text group-hover:text-olive-dark line-clamp-2 mb-2">
                  {v.name}
                </div>
                <div className="flex items-end justify-between">
                  {v.cheapestPrice ? (
                    <div className="text-base font-semibold text-text">
                      {Math.round(v.cheapestPrice)} Kč
                    </div>
                  ) : (
                    <div className="text-[12px] text-text3 italic">Cena chybí</div>
                  )}
                  {v.olivatorScore != null && v.olivatorScore > 0 && (
                    <div className="text-[10px] bg-terra text-white rounded-full px-2 py-0.5 font-bold">
                      {v.olivatorScore}
                    </div>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* FAQ — Two sections, rich snippets in Google */}
      {productFAQs.length > 0 && (
        <section className="mt-14 max-w-[720px] mx-auto mb-6">
          <h2 className="font-[family-name:var(--font-display)] text-2xl font-normal text-text mb-2">
            Často se ptáte na tento olej
          </h2>
          <p className="text-[13px] text-text3 mb-6">
            Konkrétní otázky o {product.nameShort} — odpovědi z našich dat
          </p>
          <div className="space-y-3">
            {productFAQs.map((faq, i) => (
              <details
                key={`p-${i}`}
                className="bg-white border border-off2 rounded-[var(--radius-card)] p-5 group"
              >
                <summary className="cursor-pointer list-none flex items-start justify-between gap-4">
                  <h3 className="text-[15px] font-medium text-text leading-tight">
                    {faq.question}
                  </h3>
                  <span className="text-text3 text-xl shrink-0 group-open:rotate-180 transition-transform">
                    ⌄
                  </span>
                </summary>
                <div className="mt-3 text-[14px] text-text2 leading-relaxed">
                  {faq.answer}
                </div>
              </details>
            ))}
          </div>
        </section>
      )}

      {generalFAQs.length > 0 && (
        <section className="mt-10 max-w-[720px] mx-auto mb-12">
          <h2 className="font-[family-name:var(--font-display)] text-2xl font-normal text-text mb-2">
            Co lidé hledají o olivovém oleji
          </h2>
          <p className="text-[13px] text-text3 mb-6">
            Obecné otázky o výběru, kvalitě a používání — užitečné než si pořídíš svou lahev
          </p>
          <div className="space-y-3">
            {generalFAQs.map((faq, i) => (
              <details
                key={`g-${i}`}
                className="bg-white border border-off2 rounded-[var(--radius-card)] p-5 group"
              >
                <summary className="cursor-pointer list-none flex items-start justify-between gap-4">
                  <h3 className="text-[15px] font-medium text-text leading-tight">
                    {faq.question}
                  </h3>
                  <span className="text-text3 text-xl shrink-0 group-open:rotate-180 transition-transform">
                    ⌄
                  </span>
                </summary>
                <div className="mt-3 text-[14px] text-text2 leading-relaxed">
                  {faq.answer}
                </div>
              </details>
            ))}
          </div>
        </section>
      )}
      </div>
    </div>
  )
}
