// Admin toolbar — sticky bar across the whole site (Wordpress / Shoptet style).
// Shows ONLY for authenticated admin. Provides quick navigation grouped into
// 5 top-level entries with hover dropdowns; mobile collapses to a <details>
// hamburger so we don't need any client JS.
//
// Renders as <AdminBar /> in root layout. Uses `headers()` to read pathname.

import { headers } from 'next/headers'
import Link from 'next/link'
import { isAdminAuthenticated } from '@/lib/admin-auth'
import { supabaseAdmin } from '@/lib/supabase'
import { AdminBarLogout } from './admin-bar-logout'

type NavLink = { href: string; label: string }
type NavGroup = { label: string; items: NavLink[] }
type NavEntry = NavLink | NavGroup

const NAV: NavEntry[] = [
  { href: '/admin', label: 'Přehled' },
  {
    label: 'Katalog',
    items: [
      { href: '/admin/products', label: 'Produkty' },
      { href: '/admin/retailers', label: 'Prodejci' },
      { href: '/admin/faq', label: 'FAQ' },
    ],
  },
  {
    label: 'Discovery',
    items: [
      { href: '/admin/discovery', label: 'Návrhy' },
      { href: '/admin/discovery/sources', label: 'E-shopy' },
      { href: '/admin/bulk-jobs', label: 'Historie' },
    ],
  },
  {
    label: 'Kontrola',
    items: [
      { href: '/admin/quality', label: 'Kvalita' },
      { href: '/admin/manager', label: '📊 Manager' },
      { href: '/admin/newsletter', label: '📬 Newsletter' },
    ],
  },
  {
    label: 'Content',
    items: [
      { href: '/admin/regions', label: '🌍 Regiony' },
      { href: '/admin/brands', label: '🫒 Značky' },
      { href: '/admin/cultivars', label: '🌿 Odrůdy' },
    ],
  },
  { href: '/admin/nastaveni', label: '⚙ Nastavení' },
]

const isGroup = (e: NavEntry): e is NavGroup => 'items' in e

/** Longest-prefix-match across all hrefs. Picks `/admin/discovery/sources`
 *  over `/admin/discovery` over `/admin`. Returns null if nothing matches. */
function findActive(pathname: string): NavLink | null {
  const all: NavLink[] = NAV.flatMap((e) => (isGroup(e) ? e.items : [e]))
  const matches = all
    .filter((l) => pathname === l.href || pathname.startsWith(l.href + '/'))
    .sort((a, b) => b.href.length - a.href.length)
  return matches[0] ?? null
}

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
  return null
}

export async function AdminBar() {
  const isAdmin = await isAdminAuthenticated()
  if (!isAdmin) return null

  const headersList = await headers()
  const pathname = headersList.get('x-pathname') || headersList.get('next-url') || ''

  const active = findActive(pathname)
  const edit = await getEditLink(pathname)

  const baseTab =
    'px-2 py-0.5 rounded transition-colors hover:bg-white/10 whitespace-nowrap'
  const activeTab = 'bg-white/15 text-white'
  const inactiveTab = 'text-white/90'

  return (
    <>
      {/* Spacer so the fixed bar doesn't cover content below */}
      <div aria-hidden className="h-9" />
      <div className="fixed top-0 left-0 right-0 z-[60] bg-text text-white text-[12px] font-medium border-b border-black/20 shadow-sm">
        <div className="max-w-[1280px] mx-auto px-5 h-9 flex items-center gap-1">
          <span className="text-[13px] mr-2 shrink-0">🌿 Olivator Admin</span>
          <span className="opacity-30 shrink-0">|</span>

          {/* DESKTOP NAV */}
          <nav className="hidden md:flex items-center gap-1">
            {NAV.map((entry) => {
              if (!isGroup(entry)) {
                const isActive = active?.href === entry.href
                return (
                  <Link
                    key={entry.href}
                    href={entry.href}
                    className={`${baseTab} ${isActive ? activeTab : inactiveTab}`}
                  >
                    {entry.label}
                  </Link>
                )
              }
              const activeChild = entry.items.find((i) => i.href === active?.href)
              const isActive = !!activeChild
              return (
                <div key={entry.label} className="group relative">
                  <Link
                    href={entry.items[0].href}
                    className={`${baseTab} flex items-center gap-1 ${
                      isActive ? activeTab : inactiveTab
                    }`}
                  >
                    <span>{entry.label}</span>
                    {activeChild && (
                      <span className="opacity-60">· {activeChild.label}</span>
                    )}
                    <span className="opacity-50 text-[10px]">▾</span>
                  </Link>
                  {/* Dropdown panel */}
                  <div
                    className="absolute left-0 top-full pt-1 hidden group-hover:block z-[70]"
                    role="menu"
                  >
                    <div className="min-w-[180px] bg-[#2a2a2d] border border-white/10 rounded shadow-lg py-1">
                      {entry.items.map((item) => {
                        const itemActive = active?.href === item.href
                        return (
                          <Link
                            key={item.href}
                            href={item.href}
                            className={`block px-3 py-1.5 text-[12px] transition-colors hover:bg-white/10 ${
                              itemActive ? 'bg-white/15 text-white' : 'text-white/90'
                            }`}
                          >
                            {item.label}
                          </Link>
                        )
                      })}
                    </div>
                  </div>
                </div>
              )
            })}
            <span className="opacity-30 mx-1">|</span>
            <Link
              href="/"
              className={`${baseTab} ${inactiveTab} flex items-center gap-1`}
              title="Otevřít veřejnou homepage"
            >
              🌐 Zobrazit web
            </Link>
            {edit && (
              <>
                <span className="opacity-30 mx-1">|</span>
                <Link
                  href={edit.href}
                  className="px-2 py-0.5 bg-terra/80 hover:bg-terra rounded transition-colors whitespace-nowrap"
                >
                  {edit.label}
                </Link>
              </>
            )}
          </nav>

          {/* MOBILE: hamburger via <details> — no client JS needed */}
          <details className="md:hidden relative">
            <summary
              className={`${baseTab} ${inactiveTab} list-none cursor-pointer flex items-center gap-1 [&::-webkit-details-marker]:hidden`}
            >
              <span>☰</span>
              {active && <span className="opacity-80">{active.label}</span>}
            </summary>
            <div className="absolute left-0 top-full mt-1 min-w-[200px] bg-[#2a2a2d] border border-white/10 rounded shadow-lg py-1 z-[70]">
              {NAV.map((entry) => {
                if (!isGroup(entry)) {
                  const isActive = active?.href === entry.href
                  return (
                    <Link
                      key={entry.href}
                      href={entry.href}
                      className={`block px-3 py-1.5 text-[12px] hover:bg-white/10 ${
                        isActive ? 'bg-white/15 text-white' : 'text-white/90'
                      }`}
                    >
                      {entry.label}
                    </Link>
                  )
                }
                return (
                  <div key={entry.label} className="border-t border-white/10 first:border-t-0 mt-1 first:mt-0 pt-1 first:pt-0">
                    <div className="px-3 py-1 text-[10px] uppercase tracking-wide text-white/50">
                      {entry.label}
                    </div>
                    {entry.items.map((item) => {
                      const isActive = active?.href === item.href
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          className={`block px-3 py-1.5 text-[12px] hover:bg-white/10 ${
                            isActive ? 'bg-white/15 text-white' : 'text-white/90'
                          }`}
                        >
                          {item.label}
                        </Link>
                      )
                    })}
                  </div>
                )
              })}
              <div className="border-t border-white/10 mt-1 pt-1">
                <Link href="/" className="block px-3 py-1.5 text-[12px] hover:bg-white/10 text-white/90">
                  🌐 Zobrazit web
                </Link>
                {edit && (
                  <Link
                    href={edit.href}
                    className="block px-3 py-1.5 text-[12px] hover:bg-white/10 text-terra"
                  >
                    {edit.label}
                  </Link>
                )}
              </div>
            </div>
          </details>

          <div className="ml-auto flex items-center gap-1 shrink-0">
            <span className="opacity-50 text-[11px] hidden lg:inline">vidíš jen ty (admin)</span>
            <AdminBarLogout />
          </div>
        </div>
      </div>
    </>
  )
}
