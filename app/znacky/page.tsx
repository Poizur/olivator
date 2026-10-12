import Link from 'next/link'
import type { Metadata } from 'next'
import { getBrandDirectory } from '@/lib/data'
import { countryFlag, countryName } from '@/lib/utils'
import { BreadcrumbJsonLd } from '@/components/entity-page/entity-jsonld'

export const metadata: Metadata = {
  title: { absolute: 'Značky olivových olejů — přehled výrobců | Olivátor' },
  description:
    'Přehled značek a výrobců olivových olejů v katalogu Olivátoru — země a region původu, počet olejů a průměrné Olivator Score.',
  alternates: { canonical: 'https://olivator.cz/znacky' },
}

export const revalidate = 300

function productsLabel(n: number): string {
  return n === 1 ? 'olej' : n < 5 ? 'oleje' : 'olejů'
}

export default async function ZnackyPage() {
  const brands = await getBrandDirectory()

  return (
    <div className="bg-off pb-16">
      <BreadcrumbJsonLd
        items={[
          { name: 'Olivátor', url: '/' },
          { name: 'Značky', url: '/znacky' },
        ]}
      />

      <div className="max-w-[1280px] mx-auto px-4 md:px-10">
        <div className="pt-6 pb-3 text-xs text-text3">
          <Link href="/" className="text-olive">Olivator</Link>
          {' › '}
          <span>Značky</span>
        </div>

        <header className="pt-4 pb-8 max-w-[680px]">
          <h1 className="font-[family-name:var(--font-display)] text-[34px] md:text-4xl font-normal text-text leading-[1.15] mb-2 text-balance">
            Značky olivových olejů
          </h1>
          <p className="text-[15px] text-text2 font-light leading-relaxed mb-2">
            {brands.length} výrobců, jejichž oleje najdete v našem katalogu.
          </p>
          <p className="text-[13px] text-text3 leading-relaxed">
            Řazeno abecedně — pořadí nic nehodnotí. Průměrné Score počítáme z olejů, které mají ověřitelná data.{' '}
            <Link href="/metodika" className="text-olive hover:underline">Jak počítáme →</Link>
          </p>
        </header>

        <ul className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 md:gap-4">
          {brands.map((b) => (
            <li key={b.slug}>
              <Link
                href={`/znacka/${b.slug}`}
                className="group h-full bg-white border border-off2 rounded-[var(--radius-card)] overflow-hidden hover:border-olive-light hover:shadow-md transition-all flex flex-col focus-visible:outline focus-visible:outline-2 focus-visible:outline-olive"
              >
                <div className="aspect-[4/3] relative bg-white flex items-center justify-center p-5 border-b border-off2">
                  {b.logoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={b.logoUrl}
                      alt={`${b.name} logo`}
                      loading="lazy"
                      className="absolute inset-5 w-[calc(100%-2.5rem)] h-[calc(100%-2.5rem)] object-contain"
                    />
                  ) : (
                    <span className="font-[family-name:var(--font-display)] text-[17px] text-text text-center leading-tight">
                      {b.name}
                    </span>
                  )}
                </div>

                <div className="p-3 flex flex-col gap-1 flex-1">
                  <div className="text-[10px] text-text3 uppercase tracking-widest font-medium truncate">
                    {countryFlag(b.countryCode)} {countryName(b.countryCode)}
                    {b.regionName ? ` · ${b.regionName}` : ''}
                  </div>
                  <div className="text-[14px] font-semibold text-text leading-tight">{b.name}</div>
                  <div className="text-[12px] text-text2 tabular-nums">
                    {b.productCount} {productsLabel(b.productCount)}
                  </div>
                  <div className="mt-auto pt-1 text-[12px]">
                    {b.avgScore != null ? (
                      <span className="text-text2">
                        Průměrné Score <strong className="text-terra font-semibold tabular-nums">{b.avgScore}</strong>
                      </span>
                    ) : (
                      <span className="text-text3">Hodnocení připravujeme</span>
                    )}
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
