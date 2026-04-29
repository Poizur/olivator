import { NextResponse } from 'next/server'
import { isAdminAuthenticated } from '@/lib/admin-auth'
import { importRegionPhotos, importBrandPhotos, importCultivarPhotos } from '@/lib/entity-photos'

export const maxDuration = 120

export async function POST(req: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json().catch(() => ({}))
  const entityType: string = body.entityType ?? 'all'
  const slug: string | undefined = body.slug

  try {
    const allResults = []

    if (entityType === 'all' || entityType === 'regions') {
      const r = await importRegionPhotos(slug)
      allResults.push(...r.results.map((x) => ({ ...x, type: 'region' })))
    }
    if (entityType === 'all' || entityType === 'brands') {
      const r = await importBrandPhotos(slug)
      allResults.push(...r.results.map((x) => ({ ...x, type: 'brand' })))
    }
    if (entityType === 'all' || entityType === 'cultivars') {
      const r = await importCultivarPhotos(slug)
      allResults.push(...r.results.map((x) => ({ ...x, type: 'cultivar' })))
    }

    const totalInserted = allResults.reduce((s, r) => s + r.inserted, 0)
    const totalErrors = allResults.filter((r) => r.error).length

    return NextResponse.json({ ok: true, totalInserted, totalErrors, results: allResults })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    )
  }
}
