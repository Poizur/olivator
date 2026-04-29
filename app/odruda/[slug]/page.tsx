import { notFound } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'
import { supabaseAdmin } from '@/lib/supabase'
import { getProductsByIds, getCheapestOffer } from '@/lib/data'
import { ListCard } from '@/components/list-card'

export const revalidate = 3600

interface CultivarRow {
  id: string
  slug: string
  name: string
  description_long: string | null
  meta_title: string | null
  meta_description: string | null
}

async function getCultivar(slug: string): Promise<CultivarRow | null> {
  const { data } = await supabaseAdmin
    .from('cultivars')
    .select('id, slug, name, description_long, meta_title, meta_description')
    .eq('slug', slug)
    .single()
  return data ?? null
}

async function getEntityHeroPhoto(entityId: string): Promise<{ url: string; alt_text: string | null; source_attribution: string | null } | null> {
  const { data } = await supabaseAdmin
    .from('entity_images')
    .select('url, alt_text, source_attribution')
    .eq('entity_id', entityId)
    .eq('status', 'active')
    .eq('is_primary', true)
    .single()
  return data ?? null
}

async function getCultivarProductIds(slug: string): Promise<string[]> {
  const { data } = await supabaseAdmin
    .from('product_cultivars')
    .select('product_id')
    .eq('cultivar_slug', slug)
  const productIds = (data ?? []).map((r: { product_id: string }) => r.product_id)
  if (productIds.length === 0) return []

  // Filter to active, sort by score
  const { data: products } = await supabaseAdmin
    .from('products')
    .select('id')
    .in('id', productIds)
    .eq('status', 'active')
    .order('olivator_score', { ascending: false })
  return (products ?? []).map((r: { id: string }) => r.id)
}

export async function generateStaticParams() {
  const { data } = await supabaseAdmin.from('cultivars').select('slug')
  return (data ?? []).map((r: { slug: string }) => ({ slug: r.slug }))
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const cultivar = await getCultivar(slug)
  if (!cultivar) return { title: 'Nenalezeno' }

  const rawTitle = cultivar.meta_title ?? `Odrůda ${cultivar.name} — olivový olej`
  const title = rawTitle.replace(/\s*\|\s*Olivator\s*$/i, '')
  const description = cultivar.meta_description ?? `${cultivar.name}: chuťový profil, polyfenoly a nejlepší produkty v ČR.`
  const url = `https://olivator.cz/odruda/${slug}`

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

export default async function CultivarPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const cultivar = await getCultivar(slug)
  if (!cultivar) notFound()

  const [productIds, heroPhoto] = await Promise.all([
    getCultivarProductIds(slug),
    getEntityHeroPhoto(cultivar.id),
  ])
  const products = await getProductsByIds(productIds)
  const offers = await Promise.all(products.map((p) => getCheapestOffer(p.id)))

  return (
    <div className="max-w-[1080px] mx-auto px-10 py-10">
      {/* Breadcrumb */}
      <div className="text-xs text-text3 mb-7">
        <Link href="/" className="text-olive">Olivator</Link>
        {' › '}
        <Link href="/srovnavac" className="text-olive">Srovnávač</Link>
        {' › '}
        Odrůda {cultivar.name}
      </div>

      {/* Hero */}
      {heroPhoto ? (
        <div className="mb-10 relative rounded-2xl overflow-hidden h-56">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={heroPhoto.url}
            alt={heroPhoto.alt_text ?? cultivar.name}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
          <div className="absolute bottom-0 left-0 p-6">
            <h1 className="font-[family-name:var(--font-display)] text-4xl font-normal text-white mb-1">
              Odrůda {cultivar.name}
            </h1>
            <p className="text-sm text-white/80">{products.length} produktů s touto odrůdou v katalogu</p>
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
            — Odrůda
          </div>
          <h1 className="font-[family-name:var(--font-display)] text-4xl font-normal text-text mb-2">
            {cultivar.name}
          </h1>
          <p className="text-sm text-text3">{products.length} produktů s touto odrůdou v katalogu</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-12">
        {/* Editorial content */}
        <div className="min-w-0">
          {cultivar.description_long ? (
            <div>{renderDescription(cultivar.description_long)}</div>
          ) : (
            <p className="text-text2 font-light italic">Popis odrůdy se připravuje…</p>
          )}
        </div>

        {/* Sidebar — produkty */}
        <aside className="lg:border-l lg:border-off2 lg:pl-8">
          <h2 className="font-[family-name:var(--font-display)] text-xl font-normal text-text mb-4">
            Olivové oleje odrůdy {cultivar.name}
          </h2>
          {products.length === 0 ? (
            <p className="text-sm text-text3">Žádné aktivní produkty.</p>
          ) : (
            <div className="flex flex-col gap-3">
              {products.slice(0, 8).map((p, i) => (
                <ListCard key={p.id} product={p} offer={offers[i] ?? undefined} rank={i + 1} />
              ))}
            </div>
          )}
        </aside>
      </div>
    </div>
  )
}
