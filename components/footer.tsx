import Image from 'next/image'
import Link from 'next/link'
import { NewsletterSignup } from './newsletter-signup'

// Footer je statický — nepotřebuje headers()/cookies(). Render decisions
// (skrýt na /admin) řeší LayoutChrome client-side přes usePathname.
export function Footer() {
  return (
    <footer className="bg-off border-t border-off2 mt-12">
      <div className="max-w-[1280px] mx-auto px-6 md:px-10 py-10 grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
        <div>
          <Image
            src="/logo-wordmark.png"
            alt="olivátor"
            width={720}
            height={184}
            className="h-16 md:h-28 w-auto"
          />
          <div className="text-xs text-text3 mt-2 leading-relaxed">
            Největší srovnávač olivových olejů v ČR
            <br />
            &copy; {new Date().getFullYear()}
          </div>
          <div className="flex gap-4 mt-4 flex-wrap">
            {[
              { href: '/metodika', label: 'Metodika' },
              { href: '/o-projektu', label: 'O projektu' },
              { href: '/o-projektu#fotky', label: 'Fotky' },
              { href: '/o-projektu#affiliate', label: 'Affiliate' },
            ].map((l) => (
              <Link
                key={l.label}
                href={l.href}
                className="text-xs text-text3 hover:text-olive transition-colors"
              >
                {l.label}
              </Link>
            ))}
          </div>
        </div>
        <div className="md:col-span-2 md:flex md:justify-end">
          <NewsletterSignup source="footer" variant="inline" />
        </div>
      </div>
    </footer>
  )
}
