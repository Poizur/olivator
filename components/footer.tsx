import Link from 'next/link'
import { NewsletterSignup } from '@/components/newsletter-signup'

export function Footer() {
  return (
    <footer className="bg-[#173404] text-white">
      <div className="max-w-[1280px] mx-auto px-6 md:px-10">

        {/* ── Newsletter + PDF — jeden sloučený blok ── */}
        <div className="flex flex-col md:flex-row md:items-center gap-6 py-8 border-b border-white/10">
          <div className="flex-1 min-w-0">
            <div className="text-[11px] font-medium tracking-[0.05em] uppercase text-olive3 mb-1.5">
              — Zůstaň v obraze
            </div>
            <div className="font-[family-name:var(--font-display)] text-[22px] font-medium text-white leading-tight mb-1">
              Olíkův týdenní digest
            </div>
            <p className="text-[13px] text-white/55">
              Slevy, nové oleje a tipy každý čtvrtek — a průvodce výběrem oleje (PDF) jako dárek na uvítanou.
            </p>
          </div>
          <div className="w-full md:w-[380px] shrink-0">
            <NewsletterSignup source="footer_combined" variant="dark" />
          </div>
        </div>

        {/* ── Links row ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 py-7 border-b border-white/10">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <div className="font-[family-name:var(--font-display)] text-[22px] font-normal mb-2 text-white">
              olivátor
            </div>
            <p className="text-[12px] text-white/55 leading-relaxed max-w-[240px]">
              Jediný datový srovnávač olivových olejů v ČR. Žádné placené pozice — jen deklarovaná data výrobců, veřejná metodika a transparentní Score.
            </p>
          </div>

          {/* Oleje */}
          <div>
            <h4 className="text-[10px] font-medium tracking-widest uppercase text-white/40 mb-3">Oleje</h4>
            {[
              { href: '/srovnavac', label: 'Katalog' },
              { href: '/zebricek', label: 'Žebříčky' },
              { href: '/nejprodavanejsi', label: 'Bestsellery' },
              { href: '/slevy', label: 'Slevy' },
              { href: '/olivovy-olej-5l', label: '5L balení' },
            ].map(l => (
              <Link key={l.href} href={l.href} className="block text-[12px] text-white/65 hover:text-white py-0.5 transition-colors">
                {l.label}
              </Link>
            ))}
          </div>

          {/* Průvodce */}
          <div>
            <h4 className="text-[10px] font-medium tracking-widest uppercase text-white/40 mb-3">Průvodce</h4>
            {[
              { href: '/pruvodce/jak-vybrat-olivovy-olej', label: 'Jak vybrat olej' },
              { href: '/pruvodce/polyfenoly-proc-na-nich-zalezi', label: 'Polyfenoly' },
              { href: '/metodika', label: 'Metodika Score' },
              { href: '/recept', label: 'Recepty' },
            ].map(l => (
              <Link key={l.href} href={l.href} className="block text-[12px] text-white/65 hover:text-white py-0.5 transition-colors">
                {l.label}
              </Link>
            ))}
          </div>

          {/* Olivátor */}
          <div>
            <h4 className="text-[10px] font-medium tracking-widest uppercase text-white/40 mb-3">Olivátor</h4>
            {[
              { href: '/o-projektu', label: 'O projektu' },
              { href: '/metodika', label: 'Metodika' },
              { href: '/novinky', label: 'Novinky' },
              { href: '/o-projektu#affiliate', label: 'Affiliate' },
              { href: '/pro-prodejce', label: 'Pro prodejce' },
              { href: '/o-projektu#kontakt', label: 'Kontakt' },
            ].map(l => (
              <Link key={l.href} href={l.href} className="block text-[12px] text-white/65 hover:text-white py-0.5 transition-colors">
                {l.label}
              </Link>
            ))}
          </div>
        </div>

        {/* ── Legal links ── */}
        <div className="py-3 flex flex-wrap gap-x-4 gap-y-1 border-b border-white/10 text-[11px] text-white/45">
          <Link href="/ochrana-osobnich-udaju" className="hover:text-white/70 transition-colors">Ochrana osobních údajů</Link>
          <Link href="/podminky-uziti" className="hover:text-white/70 transition-colors">Podmínky užití</Link>
          <Link href="/cookies" className="hover:text-white/70 transition-colors">Cookies</Link>
          <Link href="/editorial-policy" className="hover:text-white/70 transition-colors">Redakční zásady</Link>
        </div>

        {/* ── Copyright ── */}
        <div className="py-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-1.5 text-[11px] text-white/35">
          <div>© {new Date().getFullYear()} Olivátor — Jediný datový srovnávač olivových olejů v ČR</div>
          <div className="text-right">
            <span>Provozovatel: Maky Outdoors s.r.o., IČO 09520074, Brno</span>
            <span className="mx-2 text-white/20">·</span>
            <span>Aktualizace denně · data z prodejců</span>
          </div>
        </div>

      </div>
    </footer>
  )
}
