import { notFound } from 'next/navigation'
import Link from 'next/link'
import { supabaseAdmin } from '@/lib/supabase'
import { getAllRetailers, getOffersForProduct, getProductsByIds, getProductCustomFAQs } from '@/lib/data'
import { generateProductFAQ } from '@/lib/product-faq'
import { ProductForm } from './product-form'
import { OffersManager } from './offers-manager'
import { ImagePanel } from './image-panel'
import { FactsPanel, type ExtractedFact } from './facts-panel'
import { SourcePanel } from './source-panel'
import { GalleryManager } from './gallery-manager'
import { StatusActions } from './status-actions'
import { FAQPanel } from './faq-panel'
import { ParameterPanel } from './parameter-panel'
import { AdminBlock } from '@/components/admin-block'
import { calculateCompleteness, completenessColor } from '@/lib/completeness'

async function getProductRow(id: string) {
  const { data, error } = await supabaseAdmin
    .from('products')
    .select('*')
    .eq('id', id)
    .maybeSingle()
  if (error) throw error
  return data
}

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const [productRow, retailers] = await Promise.all([
    getProductRow(id),
    getAllRetailers(),
  ])
  if (!productRow) notFound()

  const [offers, productList, customFAQs] = await Promise.all([
    getOffersForProduct(id),
    getProductsByIds([id]),
    getProductCustomFAQs(id),
  ])
  const productTyped = productList[0]
  const autoFAQs = productTyped ? generateProductFAQ(productTyped, offers[0] ?? null) : []

  const status = productRow.status as string
  const publicUrl = `/olej/${productRow.slug as string}`
  const completeness = productTyped ? calculateCompleteness(productTyped) : null

  return (
    <div>
      <div className="text-xs text-text3 mb-4">
        <Link href="/admin" className="text-olive">Admin</Link>
        {' › '}
        <Link href="/admin/products" className="text-olive">Produkty</Link>
        {' › '}
        {productRow.name as string}
      </div>
      <div className="flex items-start justify-between gap-4 mb-6 flex-wrap">
        <div>
          <h1 className="font-[family-name:var(--font-display)] text-3xl text-text">
            {productRow.name as string}
          </h1>
          {completeness && (
            <div className="mt-2 flex items-center gap-2">
              <span className={`text-[11px] ${completenessColor(completeness.weightedPercent).bg} ${completenessColor(completeness.weightedPercent).text} px-2.5 py-0.5 rounded-full font-medium`}>
                Komplet {completeness.weightedPercent}% ({completeness.filled}/{completeness.total} polí)
              </span>
              {completeness.missing.length > 0 && (
                <span className="text-[11px] text-text3">
                  Chybí: {completeness.missing.slice(0, 5).map((m) => m.label).join(', ')}
                  {completeness.missing.length > 5 ? ` +${completeness.missing.length - 5}` : ''}
                </span>
              )}
            </div>
          )}
        </div>
        <StatusActions
          productId={id}
          currentStatus={status}
          publicUrl={publicUrl}
          statusReasonCode={(productRow.status_reason_code as string | null) ?? null}
          statusReasonNote={(productRow.status_reason_note as string | null) ?? null}
          statusChangedBy={(productRow.status_changed_by as 'admin' | 'auto' | null) ?? null}
          statusChangedAt={(productRow.status_changed_at as string | null) ?? null}
        />
      </div>

      <div className="space-y-8">
        <AdminBlock
          number={1}
          icon="🌐"
          title="Zdroj a re-scrape"
          publicLocation="Pouze admin (data prep)"
          description="URL zdroje + raw description. Re-scrape stáhne čerstvá data z webu prodejce."
          variant="header-only"
        >
          <SourcePanel
            productId={id}
            sourceUrl={(productRow.source_url as string | null) ?? null}
            rawDescriptionLength={((productRow.raw_description as string | null) ?? '').length}
          />
        </AdminBlock>

        <AdminBlock
          number={2}
          icon="🖼️"
          title="Hlavní fotka"
          publicLocation="Hero karta produktu — největší obrázek na detailu"
          variant="header-only"
        >
          <ImagePanel
            productId={id}
            currentImageUrl={(productRow.image_url as string) ?? null}
            currentSource={(productRow.image_source as string) ?? null}
            ean={productRow.ean as string}
          />
        </AdminBlock>

        <AdminBlock
          number={3}
          icon="📸"
          title="Galerie fotek"
          publicLocation="Pod hero — thumbnail strip s lightboxem"
          description="Etiketa, lab report, životní fotky. AI alt text při uploadu."
          variant="header-only"
        >
          <GalleryManager productId={id} />
        </AdminBlock>

        <AdminBlock
          number={4}
          icon="📋"
          title="Extracted facts"
          publicLocation="Pouze admin (data prep)"
          description="Strukturovaná fakta extrahovaná ze scrape / lab reportu. Slouží jako zdroj pro Parameter mapping."
          variant="header-only"
        >
          <FactsPanel
            productId={id}
            initialFacts={
              Array.isArray(productRow.extracted_facts)
                ? (productRow.extracted_facts as ExtractedFact[])
                : []
            }
          />
        </AdminBlock>

        <AdminBlock
          number={5}
          icon="🔧"
          title="Mapování parametrů"
          publicLocation='Sekce „Specifikace" + Score breakdown'
          description="Které facts se promítly do strukturovaných polí (kyselost, polyfenoly, …)."
          variant="header-only"
        >
          <ParameterPanel
            extractedFacts={
              Array.isArray(productRow.extracted_facts)
                ? (productRow.extracted_facts as Array<{ key: string; value: string }>)
                : []
            }
          />
        </AdminBlock>

        <AdminBlock
          number={6}
          icon="📝"
          title="Detail produktu"
          publicLocation="Hero meta · Specifikace · Description · Score · SEO"
          description="Hlavní formulář — všechny editovatelné fields produktu."
          variant="header-only"
        >
          <ProductForm
            productRow={productRow}
            cheapestOfferPrice={offers[0]?.price ?? null}
          />
        </AdminBlock>

        <AdminBlock
          number={7}
          icon="❓"
          title="Časté otázky"
          publicLocation="FAQ akordeon dole na detailu produktu"
          description="Auto-generated z dat + custom FAQ. Slouží i pro Google FAQ rich snippet."
          variant="header-only"
        >
          <FAQPanel
            productId={id}
            autoGenerated={autoFAQs}
            initialCustomFAQs={customFAQs}
          />
        </AdminBlock>

        <AdminBlock
          number={8}
          icon="🛒"
          title="Nabídky prodejců"
          publicLocation='Sekce „Kde koupit" — affiliate odkazy + ceny'
          description="Každý prodejce má vlastní cenu, dostupnost a affiliate URL."
          variant="header-only"
        >
          <OffersManager
            productId={id}
            productSlug={productRow.slug as string}
            retailers={retailers}
            initialOffers={offers}
          />
        </AdminBlock>
      </div>
    </div>
  )
}
