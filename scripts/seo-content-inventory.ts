import { supabaseAdmin } from '@/lib/supabase'

async function main() {
  const [arts, recipes, rankings, products, brands, regions, cultivars] = await Promise.all([
    supabaseAdmin.from('articles').select('slug, title, status').order('slug'),
    supabaseAdmin.from('recipes').select('slug, title, status').order('slug'),
    supabaseAdmin.from('rankings').select('slug, title, status').order('slug'),
    supabaseAdmin
      .from('products')
      .select('slug, name, meta_title, meta_description, description_long, status')
      .eq('status', 'active'),
    supabaseAdmin.from('brands').select('slug, name, status, description_long'),
    supabaseAdmin.from('regions').select('slug, name, status, description_long'),
    supabaseAdmin.from('cultivars').select('slug, name, status, description_long'),
  ])

  console.log('=== CONTENT INVENTORY ===\n')

  console.log(`ARTICLES (${arts.data?.length ?? 0}):`)
  ;(arts.data ?? []).forEach((x: { slug: string; title: string; status: string }) =>
    console.log(' ', x.status.padEnd(8), x.slug)
  )

  console.log(`\nRECIPES (${recipes.data?.length ?? 0}):`)
  ;(recipes.data ?? []).forEach((x: { slug: string; title: string; status: string }) =>
    console.log(' ', x.status.padEnd(8), x.slug)
  )

  console.log(`\nRANKINGS (${rankings.data?.length ?? 0}):`)
  ;(rankings.data ?? []).forEach((x: { slug: string; title: string; status: string }) =>
    console.log(' ', x.status.padEnd(8), x.slug)
  )

  const ps = products.data ?? []
  console.log(`\nPRODUCTS active: ${ps.length}`)
  console.log(
    `  s meta_title:`,
    ps.filter((p: { meta_title: string | null }) => p.meta_title).length
  )
  console.log(
    `  s meta_desc:`,
    ps.filter((p: { meta_description: string | null }) => p.meta_description).length
  )
  console.log(
    `  s desc_long >500ch:`,
    ps.filter(
      (p: { description_long: string | null }) =>
        p.description_long && p.description_long.length > 500
    ).length
  )

  const bs = brands.data ?? []
  console.log(`\nBRANDS (${bs.length}):`)
  console.log(
    `  active:`,
    bs.filter((x: { status: string }) => x.status === 'active').length
  )
  console.log(
    `  with content:`,
    bs.filter((x: { description_long: string | null }) => x.description_long).length
  )

  const rs = regions.data ?? []
  console.log(`\nREGIONS (${rs.length}):`)
  console.log(
    `  active:`,
    rs.filter((x: { status: string }) => x.status === 'active').length
  )
  console.log(
    `  with content:`,
    rs.filter((x: { description_long: string | null }) => x.description_long).length
  )

  const cs = cultivars.data ?? []
  console.log(`\nCULTIVARS (${cs.length}):`)
  console.log(
    `  active:`,
    cs.filter((x: { status: string }) => x.status === 'active').length
  )
  console.log(
    `  with content:`,
    cs.filter((x: { description_long: string | null }) => x.description_long).length
  )
}

main().catch(console.error)
