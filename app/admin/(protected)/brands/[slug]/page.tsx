import { notFound } from 'next/navigation'
import Link from 'next/link'
import { supabaseAdmin } from '@/lib/supabase'
import { EntityEditForm } from '@/components/entity-edit-form'

async function getBrand(slug: string) {
  const { data } = await supabaseAdmin
    .from('brands')
    .select('*')
    .eq('slug', slug)
    .single()
  return data
}

async function getEntityPhotos(entityId: string) {
  const { data } = await supabaseAdmin
    .from('entity_images')
    .select('id, url, alt_text, is_primary, source_attribution')
    .eq('entity_id', entityId)
    .eq('status', 'active')
    .order('sort_order')
  return data ?? []
}

export default async function EditBrandPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const brand = await getBrand(slug)
  if (!brand) notFound()

  const photos = await getEntityPhotos(brand.id)

  return (
    <div className="p-8 max-w-3xl">
      <div className="text-xs text-zinc-500 mb-6">
        <Link href="/admin" className="text-olive">Admin</Link>
        {' › '}
        <Link href="/admin/brands" className="text-olive">Značky</Link>
        {' › '}
        {brand.name}
      </div>

      <h1 className="text-2xl font-semibold text-white mb-2">{brand.name}</h1>
      <p className="text-sm text-zinc-500 mb-8">{brand.slug} · {brand.country_code}</p>

      {photos.length > 0 && (
        <div className="mb-8">
          <h2 className="text-sm font-medium text-zinc-400 mb-3">Fotky ({photos.length})</h2>
          <div className="flex gap-3 flex-wrap">
            {photos.map((p: { id: string; url: string; alt_text: string | null; is_primary: boolean; source_attribution: string | null }) => (
              <div key={p.id} className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={p.url}
                  alt={p.alt_text ?? ''}
                  className="w-40 h-28 object-cover rounded-lg border border-zinc-800"
                />
                {p.is_primary && (
                  <span className="absolute top-1 left-1 bg-olive text-white text-[10px] px-1.5 py-0.5 rounded">
                    hlavní
                  </span>
                )}
                {p.source_attribution && (
                  <p className="text-[10px] text-zinc-500 mt-0.5">{p.source_attribution} / Unsplash</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <EntityEditForm
        entity={{
          entityType: 'brand',
          slug: brand.slug,
          name: brand.name,
          status: brand.status,
          description_long: brand.description_long,
          meta_title: brand.meta_title,
          meta_description: brand.meta_description,
          story: brand.story,
          philosophy: brand.philosophy,
          website_url: brand.website_url,
        }}
        publicUrl={`/znacka/${brand.slug}`}
      />
    </div>
  )
}
