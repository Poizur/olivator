'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

// Client-side nav rendering pro admin sidebar.
// Důvod: server-side `headers()` čte pathname z middleware ale neobnoví se
// při client-side navigaci (Link soft-nav). Active state pak fungoval jen
// po refreshi. usePathname() hook updatuje pri kazde navigaci.

export type AdminNavLink = {
  href: string
  label: string
  badge?: number
  badgeTone?: 'amber' | 'red' | 'olive'
  subItems?: AdminNavLink[]
}

export type AdminNavSection = {
  group?: string
  items: AdminNavLink[]
}

function isActive(pathname: string, href: string): boolean {
  if (href === '/admin') return pathname === '/admin'
  return pathname === href || pathname.startsWith(href + '/')
}

export function AdminSidebarNav({ sections }: { sections: AdminNavSection[] }) {
  const pathname = usePathname() ?? ''

  // Najdi nej-specifický match (delší href vyhrává — /admin/products/123 → /admin/products)
  const all = sections.flatMap((g) => g.items.flatMap((i) => [i, ...(i.subItems ?? [])]))
  const activeMatch = all
    .filter((l) => isActive(pathname, l.href))
    .sort((a, b) => b.href.length - a.href.length)[0]

  return (
    <>
      {sections.map((section, i) => (
        <div key={i} className={section.group ? 'mt-5 first:mt-0' : ''}>
          {section.group && (
            <div className="text-[10px] font-semibold tracking-widest uppercase text-text3 px-2.5 mb-1.5">
              {section.group}
            </div>
          )}
          <ul className="space-y-0.5">
            {section.items.map((item) => {
              const active = activeMatch?.href === item.href
              const inScope = isActive(pathname, item.href)
              const dotColor = active
                ? 'bg-olive'
                : item.badge
                  ? item.badgeTone === 'red'
                    ? 'bg-red-500/70'
                    : item.badgeTone === 'amber'
                      ? 'bg-amber-500/70'
                      : 'bg-olive'
                  : 'bg-off2'
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={active ? 'page' : undefined}
                    className={`relative flex items-center gap-2.5 px-2.5 py-1.5 text-[13px] rounded-md transition-colors ${
                      active
                        ? 'bg-olive-bg text-olive-dark font-medium'
                        : 'text-text2 hover:text-text hover:bg-off'
                    }`}
                  >
                    {active && (
                      <span className="absolute left-0 top-1.5 bottom-1.5 w-[3px] bg-olive rounded-r" aria-hidden="true" />
                    )}
                    <span className={`shrink-0 w-1.5 h-1.5 rounded-full ${dotColor}`} />
                    <span className="flex-1 truncate">{item.label}</span>
                    {item.badge != null && item.badge > 0 && (
                      <span
                        className={`text-[10px] font-semibold rounded-md px-1.5 py-0.5 tabular-nums ${
                          item.badgeTone === 'red'
                            ? 'bg-red-50 text-red-700'
                            : item.badgeTone === 'amber'
                              ? 'bg-amber-50 text-amber-700'
                              : 'bg-olive-bg text-olive'
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </Link>
                  {item.subItems && inScope && (
                    <ul className="mt-0.5 ml-4 pl-3 border-l border-off2 space-y-0.5">
                      {item.subItems.map((sub) => {
                        const subActive = activeMatch?.href === sub.href
                        return (
                          <li key={sub.href}>
                            <Link
                              href={sub.href}
                              aria-current={subActive ? 'page' : undefined}
                              className={`flex items-center gap-2 px-2 py-1 text-[12px] rounded-md transition-colors ${
                                subActive
                                  ? 'bg-olive-bg text-olive-dark font-medium'
                                  : 'text-text3 hover:text-text2 hover:bg-off'
                              }`}
                            >
                              <span className="flex-1 truncate">{sub.label}</span>
                            </Link>
                          </li>
                        )
                      })}
                    </ul>
                  )}
                </li>
              )
            })}
          </ul>
        </div>
      ))}
    </>
  )
}
