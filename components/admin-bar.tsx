// Admin toolbar — zobrazuje se na veřejném webu jen přihlášenému adminovi.
// Minimalistický: jen kontextové "Upravit X" + tlačítko do admin menu.

import { headers } from 'next/headers'
import Link from 'next/link'
import { isAdminAuthenticated } from '@/lib/admin-auth'
import { supabaseAdmin } from '@/lib/supabase'

async function getEditLink(pathname: string): Promise<{ href: string; label: string } | null> {
  // Product: /olej/[slug]
  const productMatch = pathname.match(/^\/olej\/([^/]+)\/?$/)
  if (productMatch) {
    const { data } = await supabaseAdmin
      .from('products')
      .select('id')
      .eq('slug', productMatch[1])
      .maybeSingle()
    if (data?.id) return { href: `/admin/products/${data.id as string}`, label: 'Upravit olej' }
  }

  // Region: /oblast/[slug]
  const regionMatch = pathname.match(/^\/oblast\/([^/]+)\/?$/)
  if (regionMatch) return { href: `/admin/regions/${regionMatch[1]}`, label: 'Upravit oblast' }

  // Brand: /znacka/[slug]
  const brandMatch = pathname.match(/^\/znacka\/([^/]+)\/?$/)
  if (brandMatch) return { href: `/admin/brands/${brandMatch[1]}`, label: 'Upravit značku' }

  // Cultivar: /odruda/[slug]
  const cultivarMatch = pathname.match(/^\/odruda\/([^/]+)\/?$/)
  if (cultivarMatch) return { href: `/admin/cultivars/${cultivarMatch[1]}`, label: 'Upravit odrůdu' }

  // Recipe / article — static content, link to overview
  if (pathname.match(/^\/recept\/[^/]+\/?$/)) return { href: '/admin/recipes', label: 'Recepty v adminu' }
  if (pathname.match(/^\/pruvodce\/[^/]+\/?$/) || pathname.match(/^\/zebricek\/[^/]+\/?$/)) {
    return { href: '/admin/faq', label: 'Obsah v adminu' }
  }

  return null
}

export async function AdminBar() {
  const isAdmin = await isAdminAuthenticated()
  if (!isAdmin) return null

  const headersList = await headers()
  const pathname = headersList.get('x-pathname') || headersList.get('next-url') || ''
  if (pathname.startsWith('/admin')) return null

  const edit = await getEditLink(pathname)

  return (
    <>
      <div aria-hidden className="h-9" />
      <div className="fixed top-0 left-0 right-0 z-[60] bg-text/95 backdrop-blur-sm text-white text-[12px] font-medium border-b border-black/20 shadow-sm">
        <div className="max-w-[1280px] mx-auto px-5 h-9 flex items-center gap-2">
          {/* Contextual edit button — only when on an editable page */}
          {edit ? (
            <Link
              href={edit.href}
              className="px-3 py-1 bg-terra/80 hover:bg-terra rounded transition-colors whitespace-nowrap text-[12px]"
            >
              ✎ {edit.label}
            </Link>
          ) : (
            <span className="text-white/40 text-[11px]">Admin</span>
          )}

          <div className="ml-auto">
            <Link
              href="/admin"
              className="px-3 py-1 border border-white/20 hover:border-white/40 hover:bg-white/10 rounded transition-colors whitespace-nowrap text-[12px] text-white/80 hover:text-white"
            >
              Admin menu →
            </Link>
          </div>
        </div>
      </div>
    </>
  )
}
