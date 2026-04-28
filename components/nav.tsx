'use client'

import { useState } from 'react'
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
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <>
      <nav className="sticky top-0 z-50 bg-white/88 backdrop-blur-xl border-b border-black/8">
        <div className="max-w-[1280px] mx-auto h-[52px] flex items-center px-6 md:px-10 gap-8">
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
              className="hidden sm:flex items-center gap-2 bg-off rounded-full px-3.5 py-1.5 text-xs text-text3 hover:bg-off2 transition-colors"
            >
              <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.35-4.35" />
              </svg>
              Hledat
            </Link>
            <Link
              href="/quiz"
              className="hidden sm:block text-[13px] text-text2 hover:text-olive transition-colors whitespace-nowrap"
            >
              Quiz
            </Link>
            <Link
              href="/oblibene"
              className="hidden sm:flex items-center text-[13px] text-text2 hover:text-olive transition-colors"
              aria-label="Oblíbené"
              title="Oblíbené oleje"
            >
              ♡
            </Link>
            <Link
              href="/porovnani"
              className="bg-olive text-white border-none rounded-full px-4 py-1.5 text-xs font-medium hover:bg-olive-dark transition-colors"
            >
              Porovnat
            </Link>
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="md:hidden flex flex-col gap-[5px] p-1 cursor-pointer"
              aria-label="Menu"
            >
              <span className={`block w-5 h-[1.5px] bg-text transition-transform ${mobileOpen ? 'rotate-45 translate-y-[6.5px]' : ''}`} />
              <span className={`block w-5 h-[1.5px] bg-text transition-opacity ${mobileOpen ? 'opacity-0' : ''}`} />
              <span className={`block w-5 h-[1.5px] bg-text transition-transform ${mobileOpen ? '-rotate-45 -translate-y-[6.5px]' : ''}`} />
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 top-[52px] bg-white z-40 px-6 pt-6 pb-10">
          <div className="flex flex-col gap-1">
            {links.map(l => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setMobileOpen(false)}
                className={`text-lg py-3 border-b border-off transition-colors ${
                  pathname.startsWith(l.href) ? 'text-olive font-medium' : 'text-text'
                }`}
              >
                {l.label}
              </Link>
            ))}
          </div>
          <Link
            href="/srovnavac"
            onClick={() => setMobileOpen(false)}
            className="mt-6 flex items-center justify-center gap-2 bg-off rounded-full px-4 py-3 text-sm text-text2"
          >
            <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" />
            </svg>
            Hledat oleje
          </Link>
        </div>
      )}
    </>
  )
}
