import Link from 'next/link'

export const metadata = {
  title: 'O projektu — Olivator',
  description:
    'Olivator je nezávislý srovnávač olivových olejů v ČR. Jak fungujeme, odkud jsou fotky, jak vyděláváme.',
  alternates: { canonical: 'https://olivator.cz/o-projektu' },
}

export default function OProjektuPage() {
  return (
    <div className="max-w-[760px] mx-auto px-6 md:px-10 py-12">
      <h1 className="font-[family-name:var(--font-display)] text-4xl font-normal text-text mb-2">
        O projektu Olivator
      </h1>
      <p className="text-[15px] text-text2 font-light mb-10">
        Nezávislý srovnávač olivových olejů v ČR a SK.
      </p>

      <section className="prose prose-sm max-w-none mb-12">
        <h2 className="font-[family-name:var(--font-display)] text-2xl font-normal text-text mb-3">
          Co děláme
        </h2>
        <p className="text-[15px] text-text2 leading-relaxed mb-4">
          Sbíráme data o olivových olejích z veřejně dostupných zdrojů — webů
          výrobců a partnerských e-shopů — a počítáme transparentní{' '}
          <Link href="/metodika" className="text-olive hover:text-olive-dark underline decoration-dotted">
            Olivator Score
          </Link>{' '}
          podle objektivních kritérií (kyselost, polyfenoly, certifikace, cena).
          Žádné PR články, žádné placené umístění, žádné &bdquo;sponsored&ldquo; produkty
          v žebříčcích.
        </p>
        <p className="text-[15px] text-text2 leading-relaxed">
          Olivator vznikl proto, že na českém trhu chyběl objektivní zdroj
          pro výběr kvalitního olivového oleje. Etikety jsou často matoucí,
          slovo &bdquo;extra panenský&ldquo; samo o sobě neříká nic.
        </p>
      </section>

      <section id="affiliate" className="prose prose-sm max-w-none mb-12 scroll-mt-24">
        <h2 className="font-[family-name:var(--font-display)] text-2xl font-normal text-text mb-3">
          Jak vyděláváme — affiliate
        </h2>
        <p className="text-[15px] text-text2 leading-relaxed mb-4">
          Když na Olivátoru klikneš na &bdquo;Koupit&ldquo;, přesměrujeme tě
          k partnerskému e-shopu. Pokud tam nakoupíš, Olivator dostane provizi
          (obvykle 3–15&nbsp;%). <strong className="text-text">Cena pro tebe je stejná</strong> —
          o provizi se dělíme s e-shopem z jejich marže.
        </p>
        <p className="text-[15px] text-text2 leading-relaxed mb-4">
          Tento model nás motivuje doporučovat ti opravdu kvalitní oleje, ne
          ty s nejvyšší provizí. Když ti doporučíme špatně, jdeš jinam a je
          po výdělku. Naše Score je proto čistě objektivní — vypočítáno
          z chemických parametrů, certifikací a ceny, bez ohledu na výši
          provize.
        </p>
        <p className="text-[15px] text-text2 leading-relaxed">
          Spolupracujeme s afiliate sítěmi <strong>Dognet, Heureka Affiliate</strong>{' '}
          a&nbsp;<strong>CJ Affiliate</strong>, plus máme přímé dohody s vybranými
          specializovanými e-shopy.
        </p>
      </section>

      <section id="fotky" className="prose prose-sm max-w-none mb-12 scroll-mt-24">
        <h2 className="font-[family-name:var(--font-display)] text-2xl font-normal text-text mb-3">
          Fotky produktů — odkud jsou
        </h2>
        <p className="text-[15px] text-text2 leading-relaxed mb-4">
          Fotografie produktů přejímáme od <strong className="text-text">výrobců a partnerských e-shopů</strong>,
          se kterými spolupracujeme v rámci affiliate programu. Hlavní fotky a
          5&nbsp;galerijních snímků pro každý produkt hostujeme přímo u nás na
          Supabase CDN s WebP optimalizací — kvůli rychlosti načítání a SEO.
          Další ukázky &bdquo;v rezervě&ldquo; (kandidáti pro budoucí výběr) odkazujeme
          přímo na zdrojové weby.
        </p>
        <p className="text-[15px] text-text2 leading-relaxed mb-4">
          U každé fotografie zachováváme identifikaci původu (alt text, link na
          partnera). Výrobci a e-shopy z toho profitují — jejich produkt je
          viditelný, kupující směřuje na jejich e-shop přes affiliate odkaz.
        </p>
        <p className="text-[15px] text-text2 leading-relaxed bg-off rounded-lg px-5 py-4 border border-off2">
          <strong className="text-text">Jste výrobce nebo prodejce?</strong> Pokud chcete
          fotku odstranit, doplnit, nebo upravit informace o vašem produktu,
          napište na{' '}
          <a
            href="mailto:info@olivator.cz"
            className="text-olive hover:text-olive-dark underline decoration-dotted"
          >
            info@olivator.cz
          </a>{' '}
          a&nbsp;ihned vyřídíme. Našim cílem je férová spolupráce — vy nám dáte
          fotku a data, my vám pošleme platící zákazníky.
        </p>
      </section>

      <section className="prose prose-sm max-w-none mb-12">
        <h2 className="font-[family-name:var(--font-display)] text-2xl font-normal text-text mb-3">
          Data o produktech
        </h2>
        <p className="text-[15px] text-text2 leading-relaxed mb-4">
          Strukturovaná data (kyselost, polyfenoly, certifikace, ceny) sbíráme
          z veřejných zdrojů — produktové stránky e-shopů, weby výrobců,
          databáze Open Food Facts, EU DOOR (DOP/CHOP), NYIOOC. Údaje
          aktualizujeme automaticky každý den.
        </p>
        <p className="text-[15px] text-text2 leading-relaxed">
          Pokud najdete chybu nebo zastaralou cenu, napište nám —
          opravíme do 24&nbsp;hodin.
        </p>
      </section>

      <section className="prose prose-sm max-w-none">
        <h2 className="font-[family-name:var(--font-display)] text-2xl font-normal text-text mb-3">
          Kontakt
        </h2>
        <p className="text-[15px] text-text2 leading-relaxed">
          Olivator.cz &middot;{' '}
          <a
            href="mailto:info@olivator.cz"
            className="text-olive hover:text-olive-dark underline decoration-dotted"
          >
            info@olivator.cz
          </a>
        </p>
      </section>
    </div>
  )
}
