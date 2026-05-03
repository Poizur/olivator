// POST /api/admin/publish-all
// Body: { entityTypes?: ('regions'|'brands'|'cultivars'|'recipes'|'articles')[] }
// Default: všechny.
// Flipne status='active' pro všechny entity, které mají vyplněný obsah.

import { NextRequest, NextResponse } from 'next/server'
import { isAdminAuthenticated } from '@/lib/admin-auth'
import { supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

const ALL_TYPES = ['regions', 'brands', 'cultivars', 'recipes', 'articles'] as const
type EntityType = (typeof ALL_TYPES)[number]

export async function POST(request: NextRequest) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json().catch(() => ({}))
  const types: EntityType[] = Array.isArray(body.entityTypes)
    ? body.entityTypes.filter((t: string) => (ALL_TYPES as readonly string[]).includes(t))
    : [...ALL_TYPES]

  const results: Record<string, { published: number; total: number }> = {}

  for (const type of types) {
    try {
      // Pravidlo: publikujeme jen když má entitita description_long / body
      const contentField =
        type === 'recipes' || type === 'articles' ? 'body_markdown' : 'description_long'

      // Total
      const totalRes = await supabaseAdmin.from(type).select('*', { count: 'exact', head: true })
      const total = totalRes.count ?? 0

      // Update všechny draft → active kde je content
      const updateRes = await supabaseAdmin
        .from(type)
        .update({ status: 'active', updated_at: new Date().toISOString() })
        .eq('status', 'draft')
        .not(contentField, 'is', null)
        .neq(contentField, '')
        .select('slug')

      results[type] = {
        published: updateRes.data?.length ?? 0,
        total,
      }
    } catch (err) {
      console.warn(`[publish-all] ${type} failed:`, err)
      results[type] = { published: 0, total: 0 }
    }
  }

  return NextResponse.json({ ok: true, results })
}
