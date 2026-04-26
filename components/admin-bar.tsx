// Admin toolbar — sticky bar across the whole site (Wordpress / Shoptet style).
// Shows ONLY for authenticated admin. Provides quick navigation to admin sections
// + context-aware "Edit" link when viewing a public product/article page.
//
// Renders as <AdminBar /> in root layout. Uses `headers()` to read pathname.

import { headers } from 'next/headers'
import Link from 'next/link'
import { isAdminAuthenticated } from '@/lib/admin-auth'
import { supabaseAdmin } from '@/lib/supabase'
import { AdminBarLogout } from './admin-bar-logout'

async function getEditLink(pathname: string): Promise<{ href: string; label: string } | null> {
  // Product detail: /olej/[slug] → admin editor
  const productMatch = pathname.match(/^\/olej\/([^/]+)\/?$/)
  if (productMatch) {
    const slug = productMatch[1]
    const { data } = await supabaseAdmin
      .from('products')
      .select('id, name')
      .eq('slug', slug)
      .maybeSingle()
    if (data?.id) {
      return {
        href: `/admin/products/${data.id as string}`,
        label: '✏ Upravit tento olej',
      }
    }
  }
  // Could add: /pruvodce/[slug], /recept/[slug], /zebricek/[slug] when they get DB editing
  return null
}

export async function AdminBar() {
  const isAdmin = await isAdminAuthenticated()
  if (!isAdmin) return null

  // Read pathname from x-pathname header (set by middleware) or from referer fallback
  const headersList = await headers()
  const pathname = headersList.get('x-pathname') || headersList.get('next-url') || ''

  // Don't render on /admin pages (they have their own nav)
  if (pathname.startsWith('/admin')) return null

  const edit = await getEditLink(pathname)

  return (
    <>
      {/* Push sticky Nav and any sticky elements below the admin bar.
          AdminBar is fixed (out of flow) so a manual offset is needed.
          Targets Nav (sticky top-0 z-50) and product page sticky panels. */}
      <style dangerouslySetInnerHTML={{ __html: `
        nav.sticky { top: 2.25rem !important; }
        .sticky.top-\\[72px\\] { top: 6.5rem !important; }
      ` }} />
      {/* Spacer so content isn't hidden behind fixed bar */}
      <div aria-hidden className="h-9" />
      <div className="fixed top-0 left-0 right-0 z-[60] bg-text text-white text-[12px] font-medium border-b border-black/20 shadow-sm">
        <div className="max-w-[1280px] mx-auto px-5 h-9 flex items-center gap-1 overflow-x-auto whitespace-nowrap">
          <span className="text-[13px] mr-2">🌿 Olivator Admin</span>
          <span className="opacity-30">|</span>
          <Link href="/admin" className="px-2 py-0.5 hover:bg-white/10 rounded transition-colors">
            Přehled
          </Link>
          <Link href="/admin/products" className="px-2 py-0.5 hover:bg-white/10 rounded transition-colors">
            Produkty
          </Link>
          <Link href="/admin/retailers" className="px-2 py-0.5 hover:bg-white/10 rounded transition-colors">
            Prodejci
          </Link>
          <Link href="/admin/faq" className="px-2 py-0.5 hover:bg-white/10 rounded transition-colors">
            FAQ
          </Link>
          {edit && (
            <>
              <span className="opacity-30 mx-1">|</span>
              <Link
                href={edit.href}
                className="px-2 py-0.5 bg-terra/80 hover:bg-terra rounded transition-colors"
              >
                {edit.label}
              </Link>
            </>
          )}
          <div className="ml-auto flex items-center gap-1">
            <span className="opacity-50 text-[11px] hidden md:inline">vidíš jen ty (admin)</span>
            <AdminBarLogout />
          </div>
        </div>
      </div>
    </>
  )
}
