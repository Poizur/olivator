import Link from 'next/link'
import { NewsletterSignup } from './newsletter-signup'

export function Footer() {
  return (
    <footer className="bg-olive-dark text-white mt-12">

      {/* ── Newsletter strip ── */}
      <div className="border-b border-white/10 px-6 md:px-10 py-10">
        <div className="max-w-[1280px] mx-auto grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-6 items-center">
          <div>
            <div className="text-[10px] font-bold tracking-widest uppercase text-white/50 mb-2">
              — Zůstaň v obraze
            </div>
            <h2 className="font-[family-name:var(--font-display)] text-2xl font-normal text-white leading-tight mb-1">
              Olíkův týdenní digest
            </h2>
            <p className="text-white/65 text-[13px]">
              Slevy, nové oleje a tipy každý čtvrtek v 8:00.
            </p>
          </div>
          <div className="w-full lg:w-[420px]">
            <NewsletterSignup source="footer" variant="dark" />
          </div>
        </div>
      </div>

      {/* ── Links + logo ── */}
      <div className="px-6 md:px-10 py-10">
        <div className="max-w-[1280px] mx-auto grid grid-cols-2 md:grid-cols-[1.5fr_1fr_1fr_1fr] gap-8">

          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <div className="font-[family-name:var(--font-display)] text-[22px] italic text-olive3 mb-2">
              olivátor
            </div>
            <p className="text-white/60 text-[12px] leading-relaxed max-w-[220px]">
              Největší srovnávač olivových olejů v ČR.
              Bez reklam, bez sponzorů — jen data, lab
              testy a 4 tvrdá čísla.
            </p>
            <div className="flex flex-wrap gap-3 mt-4">
              {[
                { href: '/metodika', label: 'Metodika' },
                { href: '/o-projektu', label: 'O projektu' },
                { href: '/editorial-policy', label: 'Editorial' },
              ].map(l => (
                <Link
                  key={l.label}
                  href={l.href}
                  className="text-[11px] text-white/40 hover:text-white/80 transition-colors"
                >
                  {l.label}
                </Link>
              ))}
            </div>
          </div>

          {/* Oleje */}
          <div>
            <div className="text-[10px] font-bold tracking-widest uppercase text-white/40 mb-3">Oleje</div>
            <ul className="space-y-2">
              {[
                { href: '/srovnavac', label: 'Katalog' },
                { href: '/zebricek', label: 'Žebříčky' },
                { href: '/nejprodavanejsi', label: 'Bestsellery' },
                { href: '/slevy', label: 'Slevy' },
                { href: '/srovnavac?volume=5000', label: '5L balení' },
              ].map(l => (
                <li key={l.label}>
                  <Link href={l.href} className="text-[13px] text-white/70 hover:text-white transition-colors">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Průvodce */}
          <div>
            <div className="text-[10px] font-bold tracking-widest uppercase text-white/40 mb-3">Průvodce</div>
            <ul className="space-y-2">
              {[
                { href: '/pruvodce/jak-vybrat-olivovy-olej', label: 'Jak vybrat olej' },
                { href: '/pruvodce/polyfenoly-kolik-je-dost', label: 'Polyfenoly' },
                { href: '/pruvodce/olivovy-olej-a-zdravi-veda-2026', label: 'Acidita' },
                { href: '/pruvodce/dop-pgi-bio-certifikace', label: 'PDO/PGI' },
                { href: '/recept', label: 'Recepty' },
              ].map(l => (
                <li key={l.label}>
                  <Link href={l.href} className="text-[13px] text-white/70 hover:text-white transition-colors">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Olivátor */}
          <div>
            <div className="text-[10px] font-bold tracking-widest uppercase text-white/40 mb-3">Olivátor</div>
            <ul className="space-y-2">
              {[
                { href: '/o-projektu', label: 'O projektu' },
                { href: '/metodika', label: 'Metodika' },
                { href: '/novinky', label: 'Novinky' },
                { href: '/o-projektu#affiliate', label: 'Affiliate' },
                { href: '/o-projektu#kontakt', label: 'Kontakt' },
              ].map(l => (
                <li key={l.label}>
                  <Link href={l.href} className="text-[13px] text-white/70 hover:text-white transition-colors">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

        </div>
      </div>

      {/* ── Bottom bar ── */}
      <div className="border-t border-white/10 px-6 md:px-10 py-4">
        <div className="max-w-[1280px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-white/35">
          <span>© {new Date().getFullYear()} Olivátor — Největší srovnávač olivových olejů v ČR</span>
          <span>Aktualizace 2× denně · data z prodejců</span>
        </div>
      </div>

    </footer>
  )
}
