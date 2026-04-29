// Sticky left sidebar for admin pages — replaces the top AdminBar nav inside
// admin. AdminBar still renders on public pages (provides "Upravit tento olej"
// shortcut while browsing as admin).

import { headers } from 'next/headers'
import Link from 'next/link'

type NavLink = { href: string; label: string }
type NavGroup = { label: string; items: NavLink[] }

const NAV: Array<{ group?: string; items: NavLink[] }> = [
  {
    items: [
      { href: '/admin', label: 'Přehled' },
    ],
  },
  {
    group: 'Katalog',
    items: [
      { href: '/admin/products', label: 'Produkty' },
      { href: '/admin/regions', label: 'Regiony' },
      { href: '/admin/brands', label: 'Značky' },
      { href: '/admin/cultivars', label: 'Odrůdy' },
    ],
  },
  {
    group: 'Discovery',
    items: [
      { href: '/admin/discovery', label: 'Návrhy' },
      { href: '/admin/discovery/sources', label: 'Zdroje' },
      { href: '/admin/bulk-jobs', label: 'Historie běhů' },
      { href: '/admin/quality', label: 'Kvalita dat' },
    ],
  },
  {
    group: 'Obchod',
    items: [
      { href: '/admin/retailers', label: 'Prodejci' },
    ],
  },
  {
    group: 'Obsah',
    items: [
      { href: '/admin/faq', label: 'FAQ' },
      { href: '/admin/newsletter', label: 'Newsletter' },
      { href: '/admin/manager', label: 'Manager Agent' },
    ],
  },
  {
    group: 'Systém',
    items: [
      { href: '/admin/nastaveni', label: 'Nastavení' },
    ],
  },
]

function isActive(pathname: string, href: string): boolean {
  if (href === '/admin') return pathname === '/admin'
  return pathname === href || pathname.startsWith(href + '/')
}

export async function AdminSidebar() {
  const headersList = await headers()
  const pathname = headersList.get('x-pathname') || ''

  const flatNav: NavGroup[] = NAV.map((g) => ({ label: g.group ?? '', items: g.items }))
  const all = flatNav.flatMap((g) => g.items)
  const activeMatch = all
    .filter((l) => isActive(pathname, l.href))
    .sort((a, b) => b.href.length - a.href.length)[0]

  return (
    <aside className="hidden lg:flex w-[220px] shrink-0 bg-off border-r border-off2 flex-col sticky top-0 h-screen">
      {/* Brand */}
      <div className="px-5 py-5 border-b border-off2">
        <Link href="/admin" className="block">
          <div className="font-[family-name:var(--font-display)] text-xl text-text leading-none">
            Olivátor
          </div>
          <div className="text-[10px] uppercase tracking-widest text-text3 mt-1">
            Admin
          </div>
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 px-3">
        {NAV.map((section, i) => (
          <div key={i} className={section.group ? 'mt-5 first:mt-0' : ''}>
            {section.group && (
              <div className="text-[10px] font-semibold tracking-widest uppercase text-text3 px-2.5 mb-1.5">
                {section.group}
              </div>
            )}
            <ul className="space-y-0.5">
              {section.items.map((item) => {
                const active = activeMatch?.href === item.href
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={`block px-2.5 py-1.5 text-[13px] rounded-md transition-colors ${
                        active
                          ? 'bg-white text-text font-medium border border-off2'
                          : 'text-text2 hover:text-text hover:bg-white/60'
                      }`}
                    >
                      {item.label}
                    </Link>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Footer link to public site */}
      <div className="px-3 py-3 border-t border-off2">
        <Link
          href="/"
          className="flex items-center justify-between px-2.5 py-1.5 text-[12px] text-text2 hover:text-olive transition-colors rounded-md hover:bg-white/60"
        >
          <span>Zobrazit web</span>
          <span className="text-text3">→</span>
        </Link>
      </div>
    </aside>
  )
}
