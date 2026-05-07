// Mediakit pro novináře — F6 backlink building.
// Centralizuje fakta, čísla, screenshoty, kontakty pro press coverage.

import type { Metadata } from 'next'
import Link from 'next/link'
import { supabaseAdmin } from '@/lib/supabase'

export const metadata: Metadata = {
  title: 'Pro novináře — Mediakit',
  description:
    'Mediakit Olivator.cz — fakta, čísla, kontakt pro novinářskou spolupráci. Free-to-use materials.',
  alternates: { canonical: 'https://olivator.cz/pro-novinare' },
}

export const revalidate = 3600

async function getStats() {
  const [products, retailers, articles, regions, brands, cultivars] = await Promise.all([
    supabaseAdmin.from('products').select('*', { count: 'exact', head: true }).eq('status', 'active'),
    supabaseAdmin.from('retailers').select('*', { count: 'exact', head: true }).eq('is_active', true),
    supabaseAdmin.from('articles').select('*', { count: 'exact', head: true }).eq('status', 'active'),
    supabaseAdmin.from('regions').select('*', { count: 'exact', head: true }).eq('status', 'active'),
    supabaseAdmin.from('brands').select('*', { count: 'exact', head: true }).eq('status', 'active'),
    supabaseAdmin.from('cultivars').select('*', { count: 'exact', head: true }).eq('status', 'active'),
  ])
  return {
    products: products.count ?? 0,
    retailers: retailers.count ?? 0,
    articles: articles.count ?? 0,
    regions: regions.count ?? 0,
    brands: brands.count ?? 0,
    cultivars: cultivars.count ?? 0,
  }
}

export default async function MediakitPage() {
  const stats = await getStats()

  return (
    <div className="max-w-[820px] mx-auto px-6 md:px-10 py-12">
      <div className="text-xs text-text3 mb-6">
        <Link href="/" className="text-olive">Olivátor</Link>
        {' › '}
        <span>Pro novináře</span>
      </div>

      <h1 className="font-[family-name:var(--font-display)] text-4xl font-normal text-text mb-2">
        Pro novináře
      </h1>
      <p className="text-[16px] text-text2 font-light mb-10 max-w-[600px]">
        Mediakit s fakty, čísly a kontaktem. Vše free-to-use za standardní attribution.
      </p>

      {/* Live stats */}
      <section className="mb-12">
        <h2 className="font-[family-name:var(--font-display)] text-2xl font-normal text-text mb-4">
          Olivátor v číslech
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <StatCard label="Aktivních produktů" value={stats.products} />
          <StatCard label="Prodejců v katalogu" value={stats.retailers} />
          <StatCard label="Článků a průvodců" value={stats.articles} />
          <StatCard label="Regionů původu" value={stats.regions} />
          <StatCard label="Aktivních značek" value={stats.brands} />
          <StatCard label="Odrůd olivovníku" value={stats.cultivars} />
        </div>
        <p className="text-[12px] text-text3 mt-3">
          Čísla aktualizovaná denně, real-time z DB. K {new Date().toLocaleDateString('cs-CZ')}.
        </p>
      </section>

      {/* About */}
      <section className="mb-12">
        <h2 className="font-[family-name:var(--font-display)] text-2xl font-normal text-text mb-4">
          O Olivátoru
        </h2>
        <p className="text-[15px] text-text2 leading-relaxed mb-3">
          <strong>Olivátor.cz</strong> je největší nezávislý srovnávač olivových
          olejů v České republice. Hodnotíme každý olej proprietárním <strong>Olivator
          Score (0–100)</strong> založeným na kyselosti, polyfenolech, certifikacích
          a poměru cena/kvalita.
        </p>
        <p className="text-[15px] text-text2 leading-relaxed mb-3">
          Cílíme na <strong>kompletní pokrytí trhu</strong> — od supermarketových
          vlastních značek po single-estate prémium. Žádné placené umístění
          ani PR články.
        </p>
        <p className="text-[15px] text-text2 leading-relaxed">
          Vznik 2025–2026. Tým: malá redakce + AI agenti pro scraping cen,
          generování obsahu a quality control.
        </p>
      </section>

      {/* Topics we can speak to */}
      <section className="mb-12">
        <h2 className="font-[family-name:var(--font-display)] text-2xl font-normal text-text mb-4">
          Témata, ke kterým rádi promluvíme
        </h2>
        <ul className="space-y-2 text-[15px] text-text2 leading-relaxed">
          <li>🫒 <strong>Kvalita olivového oleje na českém trhu</strong> — co reálně dostaneš za 89 Kč vs 489 Kč</li>
          <li>📊 <strong>Cenové trendy</strong> — vývoj cen olivového oleje v ČR (data 2024–2026)</li>
          <li>🔬 <strong>Polyfenoly a zdraví</strong> — co tvrdí věda, EU EFSA claims</li>
          <li>🌍 <strong>Regiony původu</strong> — Kréta, Apulie, Peloponés, Korfu</li>
          <li>🏷️ <strong>Etikety a marketing</strong> — co je &bdquo;Light&ldquo;, jak číst &bdquo;extra panenský&ldquo;</li>
          <li>🌱 <strong>BIO certifikace</strong> — DOP, PGI, NYIOOC</li>
          <li>🔥 <strong>Olivový olej na smažení</strong> — bod zakouření, mýty, věda</li>
        </ul>
      </section>

      {/* Free-to-use assets */}
      <section className="mb-12">
        <h2 className="font-[family-name:var(--font-display)] text-2xl font-normal text-text mb-4">
          Co můžete použít
        </h2>
        <div className="bg-olive-bg/30 border border-olive-border rounded-xl p-5 mb-4">
          <h3 className="text-[14px] font-medium text-olive-dark mb-2">
            ✓ Logo a brand assets
          </h3>
          <p className="text-[13px] text-text2 mb-3">
            Logo Olivátor (PNG/SVG) ke stažení s attribution &bdquo;olivator.cz&ldquo;.
          </p>
          <a
            href="/logo-mark.png"
            download
            className="text-[13px] text-olive hover:text-olive-dark underline"
          >
            Stáhnout logo PNG
          </a>
        </div>

        <div className="bg-olive-bg/30 border border-olive-border rounded-xl p-5 mb-4">
          <h3 className="text-[14px] font-medium text-olive-dark mb-2">
            ✓ Statistiky a fakta
          </h3>
          <p className="text-[13px] text-text2">
            Live čísla z této stránky můžete citovat s odkazem na olivator.cz.
            Pro detailnější dotazy nebo embargo data piště na e-mail níže.
          </p>
        </div>

        <div className="bg-olive-bg/30 border border-olive-border rounded-xl p-5">
          <h3 className="text-[14px] font-medium text-olive-dark mb-2">
            ✓ Citáty a interview
          </h3>
          <p className="text-[13px] text-text2">
            K tématům olivového oleje rádi poskytneme citace. Odpovídáme do 24 h.
          </p>
        </div>
      </section>

      {/* Contact */}
      <section className="mb-12">
        <h2 className="font-[family-name:var(--font-display)] text-2xl font-normal text-text mb-4">
          Kontakt
        </h2>
        <div className="bg-white border border-off2 rounded-xl p-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <div className="text-[10px] uppercase tracking-wider text-text3 font-medium mb-1">
                E-mail (preferováno)
              </div>
              <a href="mailto:redakce@olivator.cz" className="text-[15px] text-olive hover:text-olive-dark">
                redakce@olivator.cz
              </a>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wider text-text3 font-medium mb-1">
                Web
              </div>
              <Link href="/" className="text-[15px] text-olive hover:text-olive-dark">
                olivator.cz
              </Link>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-off2 text-[12px] text-text3">
            Reaktivní time SLA: 24 h pro novináře, 48 h pro výrobce a obchodní partnery.
          </div>
        </div>
      </section>

      {/* Editorial */}
      <section className="mb-12">
        <h2 className="font-[family-name:var(--font-display)] text-2xl font-normal text-text mb-4">
          Editorial standardy
        </h2>
        <p className="text-[15px] text-text2 leading-relaxed">
          Před převzetím obsahu z Olivátoru se podívejte na naše{' '}
          <Link href="/editorial-policy" className="text-olive underline decoration-dotted">
            Redakční zásady
          </Link>{' '}
          (nezávislost, affiliate transparentnost, zdroje dat) a{' '}
          <Link href="/metodika" className="text-olive underline decoration-dotted">
            Metodiku Olivator Score
          </Link>{' '}
          (jak počítáme hodnocení produktů).
        </p>
      </section>
    </div>
  )
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-white border border-off2 rounded-lg p-4">
      <div className="text-[28px] font-[family-name:var(--font-display)] text-text leading-tight">
        {value}
      </div>
      <div className="text-[11px] text-text3 mt-0.5">{label}</div>
    </div>
  )
}
