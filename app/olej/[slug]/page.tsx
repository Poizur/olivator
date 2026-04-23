import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getProducts, getProductBySlug, getOffersForProduct } from '@/lib/data'
import { countryFlag, countryName, typeLabel, certLabel, formatPrice, formatPricePer100ml } from '@/lib/utils'
import { productSchema, breadcrumbSchema } from '@/lib/schema'
import { ScoreSection } from '@/components/score-section'
import { FlavorWheel } from '@/components/flavor-wheel'
import { PriceTable } from '@/components/price-table'
import { AffiliateLink } from '@/components/affiliate-link'
import { ProductImage } from '@/components/product-image'
import { ProductActions } from './product-actions'

export async function generateStaticParams() {
  const products = await getProducts()
  return products.map(p => ({ slug: p.slug }))
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const product = await getProductBySlug(slug)
  if (!product) return { title: 'Nenalezeno' }
  return {
    title: `${product.name} — Score ${product.olivatorScore}`,
    description: product.descriptionShort,
  }
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const product = await getProductBySlug(slug)
  if (!product) notFound()

  const offers = await getOffersForProduct(product.id)
  const cheapest = offers[0]

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
      <div className="max-w-[1040px] mx-auto px-10 py-10">
      <div className="text-xs text-text3 mb-7">
        <Link href="/" className="text-olive cursor-pointer">Olivator</Link>
        {' › '}
        <Link href="/srovnavac" className="text-olive cursor-pointer">Srovnávač</Link>
        {' › '}
        {product.name}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-14 items-start mb-14">
        {/* Left — image */}
        <div className="sticky top-[72px]">
          <div className="bg-off rounded-[var(--radius-card)] h-[380px] flex items-center justify-center relative mb-4 overflow-hidden p-8">
            <ProductImage product={product} fallbackSize="text-[120px]" sizes="(max-width: 768px) 100vw, 500px" />
            <div className="absolute top-4 right-4 bg-terra text-white text-sm font-bold px-4 py-2 rounded-full flex items-center gap-1.5">
              <svg width="13" height="13" fill="#fff" viewBox="0 0 24 24">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
              </svg>
              Score {product.olivatorScore}
            </div>
          </div>
          <div className="flex gap-2">
            {['🫒', '📋', '🌿'].map((e, i) => (
              <div
                key={i}
                className={`w-16 h-16 bg-off rounded-lg border-[1.5px] flex items-center justify-center text-2xl cursor-pointer transition-colors ${
                  i === 0 ? 'border-olive' : 'border-off2 hover:border-olive'
                }`}
              >
                {e}
              </div>
            ))}
          </div>
        </div>

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
            <div className="text-[13px] font-semibold text-text mb-3 tracking-wide">
              Specifikace
            </div>
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
      </div>
    </div>
  )
}
