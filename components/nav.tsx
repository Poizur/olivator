'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useCompare } from '@/lib/compare-context'

const links = [
  { href: '/srovnavac', label: 'Srovnávač' },
  { href: '/zebricek', label: 'Žebříčky' },
  { href: '/pruvodce', label: 'Průvodce' },
  { href: '/recept', label: 'Recepty' },
  { href: '/metodika', label: 'Metodika' },
]

export function Nav({ hasAdminBar = false }: { hasAdminBar?: boolean }) {
  const pathname = usePathname()
  const { items: compareItems } = useCompare()
  const [mobileOpen, setMobileOpen] = useState(false)

  // Defense-in-depth: Nav je veřejný hlavička, na /admin se nemá zobrazovat.
  // Pokud root layout pathname check selhal, tady to chytíme klientsky.
  if (pathname.startsWith('/admin')) return null

  const compareCount = compareItems.length

  return (
    <>
      <nav className={`sticky ${hasAdminBar ? 'top-9' : 'top-0'} z-50 bg-white/88 backdrop-blur-xl border-b border-black/8 px-6 md:px-10`}>
        <div className="max-w-[1280px] mx-auto h-[52px] flex items-center gap-8">
          <Link href="/" className="shrink-0 flex items-center" aria-label="Olivátor — domů">
            <Image
              src="/logo-wordmark.png"
              alt="olivátor"
              width={140}
              height={36}
              priority
              className="h-7 w-auto"
            />
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
              Najít olej
            </Link>
            <Link
              href="/oblibene"
              className="hidden sm:flex items-center text-[13px] text-text2 hover:text-olive transition-colors"
              aria-label="Oblíbené"
              title="Oblíbené oleje"
            >
              ♡
            </Link>
            {/* Porovnat — schované při 0 olejích (nemá co porovnávat).
                Zobrazí se jakmile uživatel přidá první olej do comparátoru. */}
            {compareCount > 0 && (
              <Link
                href="/porovnani"
                className="bg-olive text-white border-none rounded-full px-4 py-1.5 text-xs font-medium hover:bg-olive-dark transition-colors flex items-center gap-1.5"
              >
                Porovnat
                <span className="bg-white/25 rounded-full px-1.5 py-0 text-[10px] tabular-nums leading-tight">
                  {compareCount}
                </span>
              </Link>
            )}
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
        <div className={`md:hidden fixed inset-0 ${hasAdminBar ? 'top-[88px]' : 'top-[52px]'} bg-white z-40 px-6 pt-6 pb-10`}>
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
