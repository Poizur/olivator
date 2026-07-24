import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params
  const { data } = await supabaseAdmin
    .from('products')
    .select('name, name_short')
    .eq('slug', slug)
    .eq('status', 'active')
    .maybeSingle()

  if (!data) return NextResponse.json(null, { status: 404 })
  return NextResponse.json({ name: data.name as string, nameShort: (data.name_short as string | null) ?? null })
}
