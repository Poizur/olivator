import { notFound } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'
import { supabaseAdmin } from '@/lib/supabase'
import { getProductsByIds, getCheapestOffer } from '@/lib/data'
import { ListCard } from '@/components/list-card'
import { countryName } from '@/lib/utils'

export const revalidate = 3600

interface BrandRow {
  id: string
  slug: string
  name: string
  country_code: string
  description_long: string | null
  meta_title: string | null
  meta_description: string | null
}

async function getBrand(slug: string): Promise<BrandRow | null> {
  const { data } = await supabaseAdmin
    .from('brands')
    .select('id, slug, name, country_code, description_long, meta_title, meta_description')
    .eq('slug', slug)
    .single()
  return data ?? null
}

interface EntityPhoto {
  url: string
  alt_text: string | null
  source_attribution: string | null
  is_primary: boolean
}

async function getEntityPhotos(entityId: string): Promise<EntityPhoto[]> {
  const { data } = await supabaseAdmin
    .from('entity_images')
    .select('url, alt_text, source_attribution, is_primary, sort_order')
    .eq('entity_id', entityId)
    .eq('status', 'active')
    .order('is_primary', { ascending: false })
    .order('sort_order')
  return (data ?? []) as EntityPhoto[]
}

async function getBrandProductIds(slug: string): Promise<string[]> {
  const { data } = await supabaseAdmin
    .from('products')
    .select('id')
    .eq('brand_slug', slug)
    .eq('status', 'active')
    .order('olivator_score', { ascending: false })
  return (data ?? []).map((r: { id: string }) => r.id)
}

export async function generateStaticParams() {
  const { data } = await supabaseAdmin.from('brands').select('slug')
  return (data ?? []).map((r: { slug: string }) => ({ slug: r.slug }))
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const brand = await getBrand(slug)
  if (!brand) return { title: 'Nenalezeno' }

  const rawTitle = brand.meta_title ?? `${brand.name} — olivový olej`
  const title = rawTitle.replace(/\s*\|\s*Olivator\s*$/i, '')
  const description = brand.meta_description ?? `${brand.name}: srovnání produktů, Olivator Score a nejlepší ceny.`
  const url = `https://olivator.cz/znacka/${slug}`

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { type: 'website', locale: 'cs_CZ', url, siteName: 'Olivator', title, description },
  }
}

function renderDescription(text: string) {
  return text.split('\n').map((line, i) => {
    if (line.startsWith('## ')) {
      return <h2 key={i} className="font-[family-name:var(--font-display)] text-2xl font-normal text-text mt-10 mb-3">{line.slice(3)}</h2>
    }
    if (line.startsWith('### ')) {
      return <h3 key={i} className="text-lg font-medium text-text mt-6 mb-2">{line.slice(4)}</h3>
    }
    if (line.trim() === '') return <div key={i} className="h-3" />
    return <p key={i} className="text-[15px] text-text2 font-light leading-relaxed">{line}</p>
  })
}

export default async function BrandPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const brand = await getBrand(slug)
  if (!brand) notFound()

  const [productIds, photos] = await Promise.all([
    getBrandProductIds(slug),
    getEntityPhotos(brand.id),
  ])
  const heroPhoto = photos[0] ?? null
  const galleryPhotos = photos.slice(1)
  const products = await getProductsByIds(productIds)
  const offers = await Promise.all(products.map((p) => getCheapestOffer(p.id)))

  const country = countryName(brand.country_code)

  return (
    <div className="max-w-[1080px] mx-auto px-10 py-10">
      {/* Breadcrumb */}
      <div className="text-xs text-text3 mb-7">
        <Link href="/" className="text-olive">Olivator</Link>
        {' › '}
        <Link href="/srovnavac" className="text-olive">Srovnávač</Link>
        {' › '}
        {brand.name}
      </div>

      {/* Hero */}
      {heroPhoto ? (
        <div className="mb-10 relative rounded-2xl overflow-hidden h-56">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={heroPhoto.url}
            alt={heroPhoto.alt_text ?? brand.name}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
          <div className="absolute bottom-0 left-0 p-6">
            <h1 className="font-[family-name:var(--font-display)] text-4xl font-normal text-white mb-1">
              {brand.name}
            </h1>
            <p className="text-sm text-white/80">{country} · {products.length} produktů v katalogu</p>
          </div>
          {heroPhoto.source_attribution && (
            <p className="absolute bottom-2 right-3 text-[10px] text-white/50">
              © {heroPhoto.source_attribution} / Unsplash
            </p>
          )}
        </div>
      ) : (
        <div className="mb-10">
          <div className="text-[10px] font-bold tracking-widest uppercase text-olive mb-2">
            — {country}
          </div>
          <h1 className="font-[family-name:var(--font-display)] text-4xl font-normal text-text mb-2">
            {brand.name}
          </h1>
          <p className="text-sm text-text3">{products.length} produktů v katalogu</p>
        </div>
      )}

      {/* Photo gallery */}
      {galleryPhotos.length > 0 && (
        <div className="mb-12 grid grid-cols-2 md:grid-cols-3 gap-3">
          {galleryPhotos.map((p, i) => (
            <div key={i} className="relative aspect-[4/3] rounded-xl overflow-hidden bg-off">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={p.url}
                alt={p.alt_text ?? `${brand.name} ${i + 2}`}
                className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
                loading="lazy"
              />
              {p.source_attribution && (
                <p className="absolute bottom-1.5 right-2 text-[9px] text-white/70 bg-black/30 backdrop-blur-sm rounded px-1.5 py-0.5">
                  © {p.source_attribution}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-12">
        {/* Editorial content */}
        <div className="min-w-0">
          {brand.description_long ? (
            <div>{renderDescription(brand.description_long)}</div>
          ) : (
            <p className="text-text2 font-light italic">Popis značky se připravuje…</p>
          )}
        </div>

        {/* Sidebar — produkty */}
        <aside className="lg:border-l lg:border-off2 lg:pl-8">
          <h2 className="font-[family-name:var(--font-display)] text-xl font-normal text-text mb-4">
            Produkty {brand.name}
          </h2>
          {products.length === 0 ? (
            <p className="text-sm text-text3">Žádné aktivní produkty.</p>
          ) : (
            <div className="flex flex-col gap-3">
              {products.map((p, i) => (
                <ListCard key={p.id} product={p} offer={offers[i] ?? undefined} rank={i + 1} compact />
              ))}
            </div>
          )}
        </aside>
      </div>
    </div>
  )
}
