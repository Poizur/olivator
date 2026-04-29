import { notFound } from 'next/navigation'
import Link from 'next/link'
import { supabaseAdmin } from '@/lib/supabase'
import { EntityEditForm } from '@/components/entity-edit-form'
import { EntityFaqEditor } from '@/components/entity-faq-editor'

async function getRegion(slug: string) {
  const { data } = await supabaseAdmin.from('regions').select('*').eq('slug', slug).single()
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

async function getFaqs(entityId: string) {
  const { data } = await supabaseAdmin
    .from('entity_faqs')
    .select('id, question, answer, sort_order')
    .eq('entity_type', 'region')
    .eq('entity_id', entityId)
    .order('sort_order')
  return data ?? []
}

export default async function EditRegionPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const region = await getRegion(slug)
  if (!region) notFound()

  const [photos, faqs] = await Promise.all([
    getEntityPhotos(region.id),
    getFaqs(region.id),
  ])

  return (
    <div className="p-8 max-w-3xl">
      <div className="text-xs text-text3 mb-6">
        <Link href="/admin" className="text-olive">Admin</Link>
        {' › '}
        <Link href="/admin/regions" className="text-olive">Regiony</Link>
        {' › '}
        {region.name}
      </div>

      <h1 className="text-2xl font-semibold text-text mb-2">{region.name}</h1>
      <p className="text-sm text-text3 mb-8">{region.slug} · {region.country_code}</p>

      {/* Fotky */}
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
                  <p className="text-[10px] text-text3 mt-0.5">{p.source_attribution}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <EntityEditForm
        entity={{
          entityType: 'region',
          slug: region.slug,
          name: region.name,
          status: region.status,
          description_long: region.description_long,
          meta_title: region.meta_title,
          meta_description: region.meta_description,
          tldr: region.tldr,
          terroir: region.terroir,
        }}
        publicUrl={`/oblast/${region.slug}`}
      />

      <EntityFaqEditor
        entityType="region"
        entityId={region.id}
        initialFaqs={faqs}
      />
    </div>
  )
}
