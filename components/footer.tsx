import Link from 'next/link'

export function Footer() {
  return (
    <footer className="bg-[#173404] text-white">
      <div className="max-w-[1280px] mx-auto px-6 md:px-10 pt-12 pb-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-10 pb-8 border-b border-white/10">
          {/* Brand column */}
          <div className="col-span-2 md:col-span-1">
            <div className="font-[family-name:var(--font-display)] text-[26px] font-normal mb-3 text-white">
              olivátor
            </div>
            <p className="text-[13px] text-white/65 leading-relaxed max-w-[280px]">
              Největší srovnávač olivových olejů v ČR. Bez reklam, bez sponzorů — jen data, lab testy a 4 tvrdá čísla.
            </p>
          </div>

          {/* Oleje */}
          <div>
            <h4 className="text-[11px] font-medium tracking-widest uppercase text-white/50 mb-4">Oleje</h4>
            {[
              { href: '/srovnavac', label: 'Katalog' },
              { href: '/zebricek', label: 'Žebříčky' },
              { href: '/nejprodavanejsi', label: 'Bestsellery' },
              { href: '/slevy', label: 'Slevy' },
              { href: '/olivovy-olej-5l', label: '5L balení' },
            ].map(l => (
              <Link key={l.href} href={l.href} className="block text-[13px] text-white/75 hover:text-white py-1 transition-colors">
                {l.label}
              </Link>
            ))}
          </div>

          {/* Průvodce */}
          <div>
            <h4 className="text-[11px] font-medium tracking-widest uppercase text-white/50 mb-4">Průvodce</h4>
            {[
              { href: '/pruvodce/jak-vybrat-olivovy-olej', label: 'Jak vybrat olej' },
              { href: '/pruvodce/acidita-olivoveho-oleje', label: 'Acidita' },
              { href: '/pruvodce/polyfenoly-olivovy-olej', label: 'Polyfenoly' },
              { href: '/pruvodce/pdo-pgp-certifikace', label: 'PDO/PGI' },
              { href: '/recept', label: 'Recepty' },
            ].map(l => (
              <Link key={l.href} href={l.href} className="block text-[13px] text-white/75 hover:text-white py-1 transition-colors">
                {l.label}
              </Link>
            ))}
          </div>

          {/* Olivátor */}
          <div>
            <h4 className="text-[11px] font-medium tracking-widest uppercase text-white/50 mb-4">Olivátor</h4>
            {[
              { href: '/o-projektu', label: 'O projektu' },
              { href: '/metodika', label: 'Metodika' },
              { href: '/novinky', label: 'Novinky' },
              { href: '/o-projektu#affiliate', label: 'Affiliate' },
              { href: '/o-projektu#kontakt', label: 'Kontakt' },
            ].map(l => (
              <Link key={l.href} href={l.href} className="block text-[13px] text-white/75 hover:text-white py-1 transition-colors">
                {l.label}
              </Link>
            ))}
          </div>
        </div>

        <div className="pt-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-[12px] text-white/40">
          <div>© {new Date().getFullYear()} Olivátor — Největší srovnávač olivových olejů v ČR</div>
          <div>Aktualizace 2× denně · data z prodejců</div>
        </div>
      </div>
    </footer>
  )
}
