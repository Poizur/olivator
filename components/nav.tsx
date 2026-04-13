'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const links = [
  { href: '/srovnavac', label: 'Srovnávač' },
  { href: '/zebricek', label: 'Žebříčky' },
  { href: '/pruvodce', label: 'Průvodce' },
  { href: '/recept', label: 'Recepty' },
  { href: '/metodika', label: 'Metodika' },
]

export function Nav() {
  const pathname = usePathname()

  return (
    <nav className="sticky top-0 z-50 h-[52px] flex items-center px-6 md:px-10 gap-8 bg-white/88 backdrop-blur-xl border-b border-black/8">
      <Link
        href="/"
        className="font-[family-name:var(--font-display)] text-[19px] text-olive-dark tracking-tight shrink-0"
      >
        Olivator
      </Link>

      <div className="hidden md:flex gap-6 flex-1">
        {links.map(l => (
          <Link
            key={l.href}
            href={l.href}
            className={`text-[13px] transition-colors whitespace-nowrap ${
              pathname.startsWith(l.href) ? 'text-olive' : 'text-text2 hover:text-olive'
            }`}
          >
            {l.label}
          </Link>
        ))}
      </div>

      <div className="flex items-center gap-3 ml-auto">
        <Link
          href="/srovnavac"
          className="flex items-center gap-2 bg-off rounded-full px-3.5 py-1.5 text-xs text-text3 hover:bg-off2 transition-colors"
        >
          <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
          </svg>
          Hledat
        </Link>
        <Link
          href="/porovnani"
          className="bg-olive text-white border-none rounded-full px-4 py-1.5 text-xs font-medium hover:bg-olive-dark transition-colors"
        >
          Porovnat
        </Link>
      </div>
    </nav>
  )
}
