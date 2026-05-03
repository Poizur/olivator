import { NextResponse } from 'next/server'
import { isAdminAuthenticated } from '@/lib/admin-auth'
import { supabaseAdmin } from '@/lib/supabase'
import { generateRegionContent, generateBrandContent, generateCultivarContent } from '@/lib/entity-content-generator'
import { generateRegionExtras, generateBrandExtras, generateCultivarExtras } from '@/lib/entity-extras-generator'
import { getCheapestOffer } from '@/lib/data'
import { countryName as countryNameLabel } from '@/lib/utils'

// Content generation: ~30-60s per entitu × N entit. Pro bulk regenerate
// (10+ entit) potřebujeme až 10+ minut. Railway nemá limit, Next.js respektuje
// tento export pro serverless platformy.
export const maxDuration = 800

interface ProductRow {
  id: string
  name: string
  slug: string
  olivator_score: number | null
  acidity: string | number | null
  polyphenols: number | null
  certifications: string[] | null
  region_slug: string | null
}

async function getCultivarsForProduct(productId: string): Promise<string[]> {
  const { data } = await supabaseAdmin
    .from('product_cultivars')
    .select('cultivar_slug')
    .eq('product_id', productId)
  return (data ?? []).map((r: { cultivar_slug: string }) => r.cultivar_slug)
}

async function buildTopProducts(products: ProductRow[]) {
  return Promise.all(
    products.slice(0, 6).map(async (p) => {
      const offer = await getCheapestOffer(p.id)
      return {
        name: p.name,
        olivatorScore: p.olivator_score ?? 0,
        acidity: p.acidity != null ? Number(p.acidity) : null,
        polyphenols: p.polyphenols,
        certifications: p.certifications ?? [],
        cheapestPrice: offer?.price ?? null,
        slug: p.slug,
      }
    })
  )
}

export async function POST(req: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json().catch(() => ({}))
  const entityType: string = body.entityType ?? 'all'   // 'regions' | 'brands' | 'cultivars' | 'all'
  const slug: string | null = body.slug ?? null          // konkrétní entita, nebo null = všechny
  // Default: generuj i extras (TL;DR, terroir, FAQs) — chceme kompletní content
  const includeExtras: boolean = body.includeExtras !== false
  // Default: po regeneraci nastav status='active' (publish)
  const setActive: boolean = body.setActive !== false

  const results: Array<{ type: string; slug: string; ok: boolean; error?: string; chars?: number; extras?: boolean; published?: boolean }> = []

  // ── Regions ───────────────────────────────────────────────────────────────
  if (entityType === 'all' || entityType === 'regions') {
    let query = supabaseAdmin.from('regions').select('*')
    if (slug) query = query.eq('slug', slug)
    const { data: regions } = await query

    for (const region of regions ?? []) {
      try {
        // Cleanup: smaž staré FAQ (vyhne se duplikátům po opakovaném gen)
        if (includeExtras) {
          await supabaseAdmin
            .from('entity_faqs')
            .delete()
            .eq('entity_type', 'region')
            .eq('entity_id', region.id)
        }

        const { data: products } = await supabaseAdmin
          .from('products')
          .select('id, name, slug, olivator_score, acidity, polyphenols, certifications, region_slug')
          .eq('region_slug', region.slug)
          .eq('status', 'active')
          .order('olivator_score', { ascending: false })
          .limit(10) as { data: ProductRow[] | null }

        if (!products || products.length === 0) {
          results.push({ type: 'region', slug: region.slug, ok: false, error: 'no active products' })
          continue
        }

        const topProducts = await buildTopProducts(products)

        const cultivarSlugsSet = new Set<string>()
        for (const p of products) {
          const cs = await getCultivarsForProduct(p.id)
          cs.forEach((c) => cultivarSlugsSet.add(c))
        }
        const cultivarNames = [...cultivarSlugsSet]
          .map((s) => s.split('-').map((w) => w[0].toUpperCase() + w.slice(1)).join(' '))

        const countryName = region.country_code === 'GR' ? 'Řecko' : region.country_code === 'IT' ? 'Itálie' : region.country_code

        const description = await generateRegionContent({
          name: region.name,
          countryCode: region.country_code,
          countryName,
          productCount: products.length,
          topProducts,
          commonCultivars: cultivarNames,
        })

        await supabaseAdmin
          .from('regions')
          .update({ description_long: description, updated_at: new Date().toISOString() })
          .eq('slug', region.slug)

        // Volitelně: generuj a auto-apply extras (TL;DR, terroir, FAQs)
        let extrasOk = false
        if (includeExtras) {
          try {
            const extras = await generateRegionExtras({
              type: 'region',
              name: region.name,
              countryName: countryNameLabel(region.country_code),
              descriptionLong: description,
              productCount: products.length,
              topProducts,
            })
            // Save tldr + terroir
            await supabaseAdmin
              .from('regions')
              .update({
                tldr: extras.tldr || null,
                terroir: extras.terroir,
                updated_at: new Date().toISOString(),
              })
              .eq('slug', region.slug)
            // Save FAQs (replace existing)
            if (extras.faqs.length > 0) {
              await supabaseAdmin
                .from('entity_faqs')
                .delete()
                .eq('entity_type', 'region')
                .eq('entity_id', region.id)
              await supabaseAdmin.from('entity_faqs').insert(
                extras.faqs.map((f, i) => ({
                  entity_type: 'region',
                  entity_id: region.id,
                  question: f.question,
                  answer: f.answer,
                  sort_order: i,
                }))
              )
            }
            extrasOk = true
          } catch (extrasErr) {
            // Non-fatal — description už uloženo
            console.warn(`[bulk-regen] region ${region.slug} extras failed:`, extrasErr)
          }
        }

        // Auto-publish (status='active')
        let published = false
        if (setActive) {
          await supabaseAdmin
            .from('regions')
            .update({ status: 'active', updated_at: new Date().toISOString() })
            .eq('slug', region.slug)
          published = true
        }

        results.push({
          type: 'region',
          slug: region.slug,
          ok: true,
          chars: description.length,
          extras: extrasOk,
          published,
        })
      } catch (err) {
        results.push({ type: 'region', slug: region.slug, ok: false, error: String(err) })
      }
    }
  }

  // ── Brands ────────────────────────────────────────────────────────────────
  if (entityType === 'all' || entityType === 'brands') {
    let query = supabaseAdmin.from('brands').select('*')
    if (slug) query = query.eq('slug', slug)
    const { data: brands } = await query

    for (const brand of brands ?? []) {
      try {
        // Cleanup FAQ
        if (includeExtras) {
          await supabaseAdmin
            .from('entity_faqs')
            .delete()
            .eq('entity_type', 'brand')
            .eq('entity_id', brand.id)
        }

        const { data: products } = await supabaseAdmin
          .from('products')
          .select('id, name, slug, olivator_score, acidity, polyphenols, certifications, region_slug')
          .eq('brand_slug', brand.slug)
          .eq('status', 'active')
          .order('olivator_score', { ascending: false })
          .limit(10) as { data: ProductRow[] | null }

        if (!products || products.length === 0) {
          results.push({ type: 'brand', slug: brand.slug, ok: false, error: 'no active products' })
          continue
        }

        const topProducts = await buildTopProducts(products)

        const cultivarSlugsSet = new Set<string>()
        for (const p of products) {
          const cs = await getCultivarsForProduct(p.id)
          cs.forEach((c) => cultivarSlugsSet.add(c))
        }
        const cultivarNames = [...cultivarSlugsSet]
          .map((s) => s.split('-').map((w) => w[0].toUpperCase() + w.slice(1)).join(' '))

        const regionSlugs = products.map((p) => p.region_slug).filter(Boolean) as string[]
        const regionSlug = regionSlugs.length > 0
          ? regionSlugs.sort((a, b) =>
              regionSlugs.filter((v) => v === b).length - regionSlugs.filter((v) => v === a).length
            )[0]
          : null

        let regionName: string | null = null
        if (regionSlug) {
          const { data: r } = await supabaseAdmin.from('regions').select('name').eq('slug', regionSlug).single()
          regionName = r?.name ?? null
        }

        const countryName = brand.country_code === 'GR' ? 'Řecko' : brand.country_code === 'IT' ? 'Itálie' : brand.country_code

        const description = await generateBrandContent({
          name: brand.name,
          countryCode: brand.country_code,
          countryName,
          regionName,
          productCount: products.length,
          topProducts,
          commonCultivars: cultivarNames,
        })

        await supabaseAdmin
          .from('brands')
          .update({ description_long: description, updated_at: new Date().toISOString() })
          .eq('slug', brand.slug)

        // Extras (TL;DR + timeline + FAQs)
        let extrasOk = false
        if (includeExtras) {
          try {
            const extras = await generateBrandExtras({
              type: 'brand',
              name: brand.name,
              countryName,
              descriptionLong: description,
              productCount: products.length,
              topProducts,
              foundedYear: brand.founded_year ?? null,
            })
            await supabaseAdmin
              .from('brands')
              .update({
                tldr: extras.tldr || null,
                timeline: extras.timeline ?? [],
                updated_at: new Date().toISOString(),
              })
              .eq('slug', brand.slug)
            if (extras.faqs.length > 0) {
              await supabaseAdmin.from('entity_faqs').insert(
                extras.faqs.map((f, i) => ({
                  entity_type: 'brand',
                  entity_id: brand.id,
                  question: f.question,
                  answer: f.answer,
                  sort_order: i,
                }))
              )
            }
            extrasOk = true
          } catch (e) {
            console.warn(`[bulk-regen] brand ${brand.slug} extras failed:`, e)
          }
        }

        let published = false
        if (setActive) {
          await supabaseAdmin
            .from('brands')
            .update({ status: 'active', updated_at: new Date().toISOString() })
            .eq('slug', brand.slug)
          published = true
        }

        results.push({
          type: 'brand',
          slug: brand.slug,
          ok: true,
          chars: description.length,
          extras: extrasOk,
          published,
        })
      } catch (err) {
        results.push({ type: 'brand', slug: brand.slug, ok: false, error: String(err) })
      }
    }
  }

  // ── Cultivars ─────────────────────────────────────────────────────────────
  if (entityType === 'all' || entityType === 'cultivars') {
    const CULTIVAR_PROFILES: Record<string, { acidity: string; polyphenols: string; flavor: string }> = {
      koroneiki:      { acidity: '0.1–0.4 %', polyphenols: '400–900 mg/kg', flavor: 'intenzivně ovocný, hořký, štiplavý, bylinkový' },
      manaki:         { acidity: '0.2–0.5 %', polyphenols: '200–500 mg/kg', flavor: 'mírně ovocný, jemná hořkost, mandlové tóny' },
      kalamata:       { acidity: '0.3–0.6 %', polyphenols: '300–600 mg/kg', flavor: 'ovocný, sladší, jemná hořkost' },
      coratina:       { acidity: '0.1–0.3 %', polyphenols: '500–1000 mg/kg', flavor: 'velmi intenzivní, hořký, štiplavý, artičokový' },
      'cima-di-mola': { acidity: '0.2–0.4 %', polyphenols: '300–600 mg/kg', flavor: 'ovocný, elegantní, středně hořký, bylinky' },
    }

    let query = supabaseAdmin.from('cultivars').select('*')
    if (slug) query = query.eq('slug', slug)
    const { data: cultivars } = await query

    for (const cultivar of cultivars ?? []) {
      try {
        // Cleanup FAQ
        if (includeExtras) {
          await supabaseAdmin
            .from('entity_faqs')
            .delete()
            .eq('entity_type', 'cultivar')
            .eq('entity_id', cultivar.id)
        }

        const { data: links } = await supabaseAdmin
          .from('product_cultivars')
          .select('product_id')
          .eq('cultivar_slug', cultivar.slug)

        const productIds = (links ?? []).map((l: { product_id: string }) => l.product_id)
        if (productIds.length === 0) {
          results.push({ type: 'cultivar', slug: cultivar.slug, ok: false, error: 'no products' })
          continue
        }

        const { data: products } = await supabaseAdmin
          .from('products')
          .select('id, name, slug, olivator_score, region_slug')
          .in('id', productIds)
          .eq('status', 'active')
          .order('olivator_score', { ascending: false })
          .limit(10)

        if (!products || products.length === 0) {
          results.push({ type: 'cultivar', slug: cultivar.slug, ok: false, error: 'no active products' })
          continue
        }

        const topProducts = await Promise.all(
          products.slice(0, 5).map(async (p: { id: string; name: string; slug: string; olivator_score: number | null }) => {
            const offer = await getCheapestOffer(p.id)
            return { name: p.name, olivatorScore: p.olivator_score ?? 0, cheapestPrice: offer?.price ?? null, slug: p.slug }
          })
        )

        const regionSlugs = [...new Set(
          products.map((p: { region_slug: string | null }) => p.region_slug).filter(Boolean)
        )] as string[]
        const regionNames: string[] = []
        for (const rs of regionSlugs) {
          const { data: r } = await supabaseAdmin.from('regions').select('name').eq('slug', rs).single()
          if (r?.name) regionNames.push(r.name)
        }

        const profile = CULTIVAR_PROFILES[cultivar.slug] ?? {
          acidity: 'proměnlivá', polyphenols: 'proměnlivé', flavor: 'závisí na oblasti a sklizni',
        }

        const description = await generateCultivarContent({
          name: cultivar.name,
          originRegions: regionNames,
          typicalAcidity: profile.acidity,
          typicalPolyphenols: profile.polyphenols,
          flavorProfile: profile.flavor,
          productCount: products.length,
          topProducts,
        })

        await supabaseAdmin
          .from('cultivars')
          .update({ description_long: description, updated_at: new Date().toISOString() })
          .eq('slug', cultivar.slug)

        let extrasOk = false
        if (includeExtras) {
          try {
            const extras = await generateCultivarExtras({
              type: 'cultivar',
              name: cultivar.name,
              countriesGrown: regionNames,
              descriptionLong: description,
              productCount: products.length,
              avgPolyphenols: null,
              topProducts: [],
            })
            await supabaseAdmin
              .from('cultivars')
              .update({
                tldr: extras.tldr || null,
                nickname: extras.nickname || null,
                primary_use: extras.primary_use || null,
                pairing_pros: extras.pairing_pros ?? [],
                pairing_cons: extras.pairing_cons ?? [],
                updated_at: new Date().toISOString(),
              })
              .eq('slug', cultivar.slug)
            if (extras.faqs.length > 0) {
              await supabaseAdmin.from('entity_faqs').insert(
                extras.faqs.map((f, i) => ({
                  entity_type: 'cultivar',
                  entity_id: cultivar.id,
                  question: f.question,
                  answer: f.answer,
                  sort_order: i,
                }))
              )
            }
            extrasOk = true
          } catch (e) {
            console.warn(`[bulk-regen] cultivar ${cultivar.slug} extras failed:`, e)
          }
        }

        let published = false
        if (setActive) {
          await supabaseAdmin
            .from('cultivars')
            .update({ status: 'active', updated_at: new Date().toISOString() })
            .eq('slug', cultivar.slug)
          published = true
        }

        results.push({
          type: 'cultivar',
          slug: cultivar.slug,
          ok: true,
          chars: description.length,
          extras: extrasOk,
          published,
        })
      } catch (err) {
        results.push({ type: 'cultivar', slug: cultivar.slug, ok: false, error: String(err) })
      }
    }
  }

  const ok = results.filter((r) => r.ok).length
  const failed = results.filter((r) => !r.ok).length
  return NextResponse.json({ ok: true, generated: ok, failed, results })
}
