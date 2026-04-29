import { notFound } from 'next/navigation'
import Link from 'next/link'
import { supabaseAdmin } from '@/lib/supabase'
import { EntityEditForm } from '@/components/entity-edit-form'

async function getCultivar(slug: string) {
  const { data } = await supabaseAdmin
    .from('cultivars')
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

async function getCultivarProductCount(slug: string): Promise<number> {
  const { count } = await supabaseAdmin
    .from('product_cultivars')
    .select('*', { count: 'exact', head: true })
    .eq('cultivar_slug', slug)
  return count ?? 0
}

export default async function EditCultivarPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const cultivar = await getCultivar(slug)
  if (!cultivar) notFound()

  const [photos, productCount] = await Promise.all([
    getEntityPhotos(cultivar.id),
    getCultivarProductCount(slug),
  ])

  return (
    <div className="p-8 max-w-3xl">
      <div className="text-xs text-text3 mb-6">
        <Link href="/admin" className="text-olive">Admin</Link>
        {' › '}
        <Link href="/admin/cultivars" className="text-olive">Odrůdy</Link>
        {' › '}
        {cultivar.name}
      </div>

      <h1 className="text-2xl font-semibold text-text mb-2">{cultivar.name}</h1>
      <p className="text-sm text-text3 mb-8">{cultivar.slug} · {productCount} produktů</p>

      {photos.length > 0 && (
        <div className="mb-8">
          <h2 className="text-sm font-medium text-text2 mb-3">Fotky ({photos.length})</h2>
          <div className="flex gap-3 flex-wrap">
            {photos.map((p: { id: string; url: string; alt_text: string | null; is_primary: boolean; source_attribution: string | null }) => (
              <div key={p.id} className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={p.url}
                  alt={p.alt_text ?? ''}
                  className="w-40 h-28 object-cover rounded-lg border border-off2"
                />
                {p.is_primary && (
                  <span className="absolute top-1 left-1 bg-olive text-white text-[10px] px-1.5 py-0.5 rounded">
                    hlavní
                  </span>
                )}
                {p.source_attribution && (
                  <p className="text-[10px] text-text3 mt-0.5">{p.source_attribution} / Unsplash</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <EntityEditForm
        entity={{
          entityType: 'cultivar',
          slug: cultivar.slug,
          name: cultivar.name,
          status: cultivar.status,
          description_long: cultivar.description_long,
          meta_title: cultivar.meta_title,
          meta_description: cultivar.meta_description,
        }}
        publicUrl={`/odruda/${cultivar.slug}`}
      />
    </div>
  )
}
