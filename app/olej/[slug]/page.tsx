import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getProducts, getProductBySlug, getOffersForProduct, getProductGallery, getProductCustomFAQs, getActiveGeneralFAQs, getVariantProducts, getProductEntityLinks } from '@/lib/data'
import { extractBrandSlug, extractRegionSlug } from '@/lib/entity-extractor'
import { countryName, typeLabel, certLabel, formatPrice, formatPricePer100ml } from '@/lib/utils'
import { productSchema, breadcrumbSchema, faqSchema } from '@/lib/schema'
import { generateProductFAQ } from '@/lib/product-faq'
import { selectGeneralFAQs } from '@/lib/general-faq'
import { ScoreSection } from '@/components/score-section'
import { FlavorWheel } from '@/components/flavor-wheel'
import { PriceTable } from '@/components/price-table'
import { AffiliateLink } from '@/components/affiliate-link'
import { ProductGallery } from '@/components/product-gallery'
import { RetailerCard } from '@/components/retailer-card'
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

  const brandSlug = extractBrandSlug(product.name)
  const regionSlug = extractRegionSlug(product.originCountry, product.originRegion)

  const [offers, gallery, customFAQs, dbGeneralFAQs, variants, allProducts, entityLinks] = await Promise.all([
    getOffersForProduct(product.id),
    getProductGallery(product.id),
    getProductCustomFAQs(product.id),
    getActiveGeneralFAQs(),
    getVariantProducts(product.id),
    getProducts(),
    getProductEntityLinks(product.id, brandSlug, regionSlug),
  ])
  const cheapest = offers[0]

  // Find 3 similar products for "Porovnat s podobnými" CTA — různá značka,
  // podobné Score/origin/certifikace + reason (proč jsou podobné)
  const similarProducts = (() => {
    const rawCandidates = allProducts.filter(
      (p) => p.id !== product.id && p.nameShort !== product.nameShort
    )

    // Deduplikuj podle (nameShort + originRegion) — z každé skupiny vezmi
    // jen produkt s nejvyšším Score. Bez toho by se v Vyzkoušíš jiný? ukázaly
    // 3× Orino 1L/3L/5L (varianty stejného oleje). User feedback: "vadí mi
    // že je v nabídce 3 orino — jiná balení".
    const bestPerGroup = new Map<string, (typeof rawCandidates)[number]>()
    for (const p of [...rawCandidates].sort((a, b) => b.olivatorScore - a.olivatorScore)) {
      const key = `${p.nameShort ?? ''}|${p.originRegion ?? ''}`
      if (!bestPerGroup.has(key)) bestPerGroup.set(key, p)
    }
    const candidates = Array.from(bestPerGroup.values())

    const scored = candidates.map((p) => {
      const reasons: string[] = []
      let s = 0
      if (p.originRegion && p.originRegion === product.originRegion) {
        s += 0.5
        reasons.push(`stejná oblast (${p.originRegion})`)
      } else if (p.originCountry === product.originCountry) {
        s += 0.3
        reasons.push(`stejná země`)
      }
      const scoreDiff = Math.abs(p.olivatorScore - product.olivatorScore)
      if (scoreDiff <= 10) {
        s += 0.2
        reasons.push(`Score ±${scoreDiff || 0}`)
      }
      const sharedCerts = p.certifications.filter((c) =>
        product.certifications.includes(c)
      )
      if (sharedCerts.length > 0) {
        s += Math.min(sharedCerts.length * 0.1, 0.2)
        reasons.push(sharedCerts.map((c) => c.toUpperCase()).join(', '))
      }
      if (p.type === product.type) s += 0.1
      return { product: p, similarity: s, reason: reasons[0] ?? 'podobný profil' }
    })
    return scored
      .filter((x) => x.similarity >= 0.2)
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, 6)  // až 6 podobných (predtím 3)
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
      : [{ key: 'Původ', value: 'Přímo od výrobce', missing: false }]),
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
      <div className="max-w-[1280px] mx-auto px-6 md:px-10 py-10">
      <div className="text-xs text-text3 mb-7">
        <Link href="/" className="text-olive cursor-pointer">Olivator</Link>
        {' › '}
        <Link href="/srovnavac" className="text-olive cursor-pointer">Srovnávač</Link>
        {' › '}
        {product.name}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[1.1fr_1fr] gap-10 lg:gap-14 items-start mb-14">
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
          <div className="text-[11px] text-text3 mb-2 uppercase tracking-widest font-medium">
            {product.originRegion ? `${product.originRegion} · ` : ''}{countryName(product.originCountry)} · {typeLabel(product.type)} · {product.volumeMl} ml
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
                Přímo od výrobce
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
                {s.missing && cheapest ? (
                  // Místo "— nezveřejněno" odkaz na prodejce (affiliate /go/...)
                  <Link
                    href={`/go/${cheapest.retailer.slug}/${product.slug}`}
                    target="_blank"
                    rel="noopener sponsored"
                    className="text-[13px] text-olive italic hover:text-olive2 hover:underline inline-flex items-center gap-1"
                    title={`Otevřít detail u ${cheapest.retailer.name}`}
                  >
                    Zjistit u {cheapest.retailer.name}
                    <span className="text-[10px]">↗</span>
                  </Link>
                ) : (
                  <span className={`text-[13px] ${s.missing ? 'text-text3 italic' : 'font-medium text-text'}`}>
                    {s.value}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Variants — stejný brand+region, různé objemy. Posunuto VYŠŠ —
          uživatel hned vidí že existují jiná balení, nemusí scrollovat dolů. */}
      {variants.length > 0 && (
        <section className="mt-10 max-w-[1040px]">
          <div className="text-[10px] font-bold tracking-widest uppercase text-olive mb-1.5">
            — Jiná balení
          </div>
          <h2 className="font-[family-name:var(--font-display)] text-2xl font-normal text-text mb-1">
            Stejný olej v jiných objemech
          </h2>
          <p className="text-[13px] text-text3 mb-5">
            {product.nameShort
              ? `${product.nameShort}${product.originRegion ? ` z regionu ${product.originRegion}` : ''} v dalších balíccích`
              : 'Stejný producent v dalších objemech'}
          </p>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {variants.map((v) => (
              <Link
                key={v.id}
                href={`/olej/${v.slug}`}
                className="group bg-white border border-off2 rounded-[var(--radius-card)] overflow-hidden flex flex-col transition-all hover:shadow-[0_12px_32px_rgba(0,0,0,0.06)] hover:-translate-y-0.5 hover:border-olive-light"
              >
                <div className="relative aspect-[4/5] bg-white overflow-hidden">
                  <span className="absolute top-2.5 left-2.5 z-10 text-[10px] font-bold uppercase tracking-wider bg-white/90 backdrop-blur-sm text-text rounded px-2 py-1 shadow-sm">
                    {v.volumeMl
                      ? v.volumeMl >= 1000
                        ? `${v.volumeMl / 1000} l`
                        : `${v.volumeMl} ml`
                      : '—'}
                    {v.packaging === 'dark_glass' && ' · sklo'}
                    {v.packaging === 'tin' && ' · plech'}
                  </span>
                  {v.olivatorScore != null && v.olivatorScore > 0 && (
                    <span className="absolute top-2.5 right-2.5 z-10 text-[12px] font-bold bg-terra text-white rounded-full w-10 h-10 flex items-center justify-center tabular-nums shadow-sm">
                      {v.olivatorScore}
                    </span>
                  )}
                  <div className="absolute inset-0 transition-transform duration-300 group-hover:scale-105">
                    {v.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={v.imageUrl}
                        alt={v.name}
                        className="w-full h-full object-contain"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <span className="font-[family-name:var(--font-display)] text-[80px] italic text-text3/30 leading-none select-none">
                          {v.name.charAt(0)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="p-3 flex-1 flex flex-col">
                  <div className="text-[12px] font-semibold text-text leading-tight line-clamp-2 mb-2 min-h-[2.4em]">
                    {v.name}
                  </div>
                  <div className="mt-auto">
                    {v.cheapestPrice ? (
                      <div className="text-[15px] font-bold text-text tabular-nums">
                        {Math.round(v.cheapestPrice)} Kč
                      </div>
                    ) : (
                      <div className="text-[12px] text-text3 italic">Cena chybí</div>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Long description — bohatší 2-col layout: text vlevo + key facts vpravo */}
      {product.descriptionLong && (
        <section className="mt-14 max-w-[1040px]">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-10 items-start">
            <div>
              <div className="text-[10px] font-bold tracking-widest uppercase text-olive mb-1.5">
                — Editorial
              </div>
              <h2 className="font-[family-name:var(--font-display)] text-2xl md:text-3xl font-normal text-text mb-5 leading-tight">
                O tomto oleji
              </h2>
              <div className="text-[15px] text-text2 leading-relaxed whitespace-pre-line">
                {product.descriptionLong}
              </div>
            </div>

            {/* Klíčové fakty na boku — sticky, doplňuje text */}
            <aside className="lg:sticky lg:top-[100px] bg-olive-bg/40 border border-olive-border/40 rounded-[var(--radius-card)] p-5">
              <div className="text-[10px] font-bold tracking-widest uppercase text-olive mb-3">
                Rychlé fakty
              </div>
              <div className="space-y-3">
                {product.acidity != null && (
                  <FactRow
                    label="Kyselost"
                    value={`${product.acidity} %`}
                    note={product.acidity <= 0.3 ? 'výrazně pod limitem 0,8 %' : 'pod limitem 0,8 %'}
                  />
                )}
                {product.polyphenols != null && (
                  <FactRow
                    label="Polyfenoly"
                    value={`${product.polyphenols} mg/kg`}
                    note={
                      product.polyphenols >= 500
                        ? 'splňuje EU health claim (≥250)'
                        : product.polyphenols >= 250
                        ? 'splňuje EU health claim'
                        : 'nižší obsah'
                    }
                  />
                )}
                {product.harvestYear && (
                  <FactRow label="Sklizeň" value={String(product.harvestYear)} />
                )}
                <FactRow
                  label="Score"
                  value={`${product.olivatorScore}/100`}
                  note={
                    product.olivatorScore >= 80
                      ? 'výjimečná kvalita'
                      : product.olivatorScore >= 60
                      ? 'kvalitní EVOO'
                      : 'standardní'
                  }
                />
                {product.certifications.length > 0 && (
                  <FactRow
                    label="Certifikace"
                    value={product.certifications.map(certLabel).join(', ')}
                  />
                )}
              </div>
            </aside>
          </div>
        </section>
      )}

      {/* O eshopu — krátká prezentace prodejce (jen pokud má tagline/story/founders) */}
      {cheapest && (
        <RetailerCard
          retailer={cheapest.retailer}
          productSlug={product.slug}
          price={cheapest.price}
        />
      )}

      {/* Podobné oleje — menší karty 6 v řadě s "Proč podobné" badge */}
      {similarProducts.length >= 2 && (
        <section className="mt-12 max-w-[1040px]">
          <div className="flex items-end justify-between mb-5 flex-wrap gap-4">
            <div>
              <div className="text-[10px] font-bold tracking-widest uppercase text-olive mb-1.5">
                — Podobné oleje
              </div>
              <h2 className="font-[family-name:var(--font-display)] text-2xl font-normal text-text leading-tight">
                Vyzkoušíš jiný?
              </h2>
              <p className="text-[13px] text-text2 mt-1">
                {similarProducts.length} olejů s podobným profilem — region, score nebo certifikace.
              </p>
            </div>
            <Link
              href={`/porovnani/${[product, ...similarProducts.map((s) => s.product)].map((p) => p.slug).join('-vs-')}`}
              className="bg-olive text-white rounded-full px-5 py-2.5 text-[13px] font-medium hover:bg-olive-dark transition-colors whitespace-nowrap shadow-sm"
            >
              Srovnat všechny →
            </Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5">
            {similarProducts.map(({ product: p, reason }) => (
              <Link
                key={p.id}
                href={`/olej/${p.slug}`}
                className="group bg-white border border-off2 rounded-[var(--radius-card)] overflow-hidden flex flex-col transition-all hover:shadow-[0_8px_24px_rgba(0,0,0,0.06)] hover:-translate-y-0.5 hover:border-olive-light"
              >
                <div className="relative aspect-[4/5] bg-white overflow-hidden">
                  <span className="absolute top-1.5 right-1.5 z-10 text-[10px] font-bold bg-terra text-white rounded-full w-7 h-7 flex items-center justify-center tabular-nums">
                    {p.olivatorScore}
                  </span>
                  <div className="absolute inset-0 transition-transform duration-300 group-hover:scale-105">
                    {p.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={p.imageUrl}
                        alt={p.name}
                        className="w-full h-full object-contain"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <span className="font-[family-name:var(--font-display)] text-[56px] italic text-text3/30 leading-none select-none">
                          {p.name.charAt(0)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="p-2.5 flex-1 flex flex-col">
                  <div className="text-[11px] font-semibold text-text leading-tight line-clamp-2 mb-1.5">
                    {p.name}
                  </div>
                  {/* Reason chip — proč je podobný */}
                  <div className="mt-auto">
                    <span className="inline-block text-[9px] font-medium text-olive-dark bg-olive-bg px-1.5 py-0.5 rounded tracking-tight">
                      ✓ {reason}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* FAQ — sjednocené side-by-side: tento olej vs obecné otázky.
          Místo dvou protáhlých sekcí pod sebou je to teď 2-col grid. */}
      {(productFAQs.length > 0 || generalFAQs.length > 0) && (
        <section className="mt-14 max-w-[1040px] mb-12">
          <div className="text-[10px] font-bold tracking-widest uppercase text-olive mb-1.5">
            — FAQ
          </div>
          <h2 className="font-[family-name:var(--font-display)] text-2xl md:text-3xl font-normal text-text mb-6 leading-tight">
            Časté otázky
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {productFAQs.length > 0 && (
              <div>
                <h3 className="text-[13px] font-semibold text-text mb-3">
                  O tomto oleji
                </h3>
                <div className="space-y-2">
                  {productFAQs.map((faq, i) => (
                    <details
                      key={`p-${i}`}
                      className="bg-white border border-off2 rounded-[var(--radius-card)] group"
                    >
                      <summary className="cursor-pointer list-none flex items-start justify-between gap-3 px-4 py-3 [&::-webkit-details-marker]:hidden">
                        <h4 className="text-[14px] font-medium text-text leading-snug">
                          {faq.question}
                        </h4>
                        <span className="text-text3 text-sm shrink-0 group-open:rotate-180 transition-transform">
                          ▾
                        </span>
                      </summary>
                      <div className="px-4 pb-4 pt-0 text-[13px] text-text2 leading-relaxed">
                        {faq.answer}
                      </div>
                    </details>
                  ))}
                </div>
              </div>
            )}

            {generalFAQs.length > 0 && (
              <div>
                <h3 className="text-[13px] font-semibold text-text mb-3">
                  O olivovém oleji obecně
                </h3>
                <div className="space-y-2">
                  {generalFAQs.map((faq, i) => (
                    <details
                      key={`g-${i}`}
                      className="bg-white border border-off2 rounded-[var(--radius-card)] group"
                    >
                      <summary className="cursor-pointer list-none flex items-start justify-between gap-3 px-4 py-3 [&::-webkit-details-marker]:hidden">
                        <h4 className="text-[14px] font-medium text-text leading-snug">
                          {faq.question}
                        </h4>
                        <span className="text-text3 text-sm shrink-0 group-open:rotate-180 transition-transform">
                          ▾
                        </span>
                      </summary>
                      <div className="px-4 pb-4 pt-0 text-[13px] text-text2 leading-relaxed">
                        {faq.answer}
                      </div>
                    </details>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>
      )}
      {/* Cross-linky — region / značka / odrůda */}
      {(entityLinks.region || entityLinks.brand || entityLinks.cultivars.length > 0) && (
        <section className="mt-8 max-w-[720px] mx-auto mb-8">
          <h2 className="font-[family-name:var(--font-display)] text-xl font-normal text-text mb-4">
            Prozkoumejte více
          </h2>
          <div className="flex flex-wrap gap-2">
            {entityLinks.region && (
              <Link
                href={`/oblast/${entityLinks.region.slug}`}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-olive4 border border-olive5 rounded-full text-sm text-olive hover:bg-olive5 transition-colors"
              >
                <span className="text-[10px] uppercase tracking-widest font-semibold text-olive/60">Region</span>
                <span>{entityLinks.region.name}</span>
              </Link>
            )}
            {entityLinks.brand && (
              <Link
                href={`/znacka/${entityLinks.brand.slug}`}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-olive4 border border-olive5 rounded-full text-sm text-olive hover:bg-olive5 transition-colors"
              >
                <span className="text-[10px] uppercase tracking-widest font-semibold text-olive/60">Značka</span>
                <span>{entityLinks.brand.name}</span>
              </Link>
            )}
            {entityLinks.cultivars.map((c) => (
              <Link
                key={c.slug}
                href={`/odruda/${c.slug}`}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-olive4 border border-olive5 rounded-full text-sm text-olive hover:bg-olive5 transition-colors"
              >
                <span className="text-[10px] uppercase tracking-widest font-semibold text-olive/60">Odrůda</span>
                <span>{c.name}</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      </div>
    </div>
  )
}

// Inline fact řádek pro "O tomto oleji" sidebar.
function FactRow({
  label,
  value,
  note,
}: {
  label: string
  value: string
  note?: string
}) {
  return (
    <div>
      <div className="text-[11px] font-medium text-text3 uppercase tracking-wider mb-0.5">
        {label}
      </div>
      <div className="text-[14px] font-semibold text-text leading-tight">{value}</div>
      {note && <div className="text-[11px] text-text2 mt-0.5">{note}</div>}
    </div>
  )
}
