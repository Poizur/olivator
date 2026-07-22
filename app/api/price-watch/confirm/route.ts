import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://olivator.cz'

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token')
  if (!token) {
    return new NextResponse('Neplatný odkaz.', { status: 400 })
  }

  const { data: watch } = await supabaseAdmin
    .from('price_watches')
    .select('id, product_id, products(slug)')
    .eq('confirmation_token', token)
    .eq('confirmed', false)
    .maybeSingle()

  if (!watch) {
    return new NextResponse(
      'Odkaz je neplatný nebo byl již použit. Hlídání je pravděpodobně již aktivní.',
      { status: 404 }
    )
  }

  await supabaseAdmin
    .from('price_watches')
    .update({ confirmed: true, confirmation_token: null })
    .eq('id', watch.id)

  const slug = (watch.products as unknown as { slug: string } | null)?.slug
  const redirectPath = slug ? `/olej/${slug}?watch=confirmed` : '/?watch=confirmed'
  return NextResponse.redirect(new URL(redirectPath, SITE), { status: 302 })
}
