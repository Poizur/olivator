import type { Metadata } from 'next'
import Link from 'next/link'
import { PartnerInquiryForm } from '@/components/partner-inquiry-form'

export const metadata: Metadata = {
  title: 'Pro prodejce — zařaďte svůj e-shop zdarma | Olivátor',
  description: 'Prodáváte olivový olej? Zařadíme vás do katalogu olivátor.cz zdarma. Zákazníci přímo k vám — žádný marketplace, žádné poplatky za pozici.',
  alternates: { canonical: 'https://olivator.cz/pro-prodejce' },
}

const BENEFITS = [
  {
    icon: '🏪',
    title: 'Profil obchodu a produkty v katalogu',
    desc: 'Zdarma. Vaše produkty s fotografiemi, popisem, Olivator Score a aktuální cenou — viditelné pro všechny návštěvníky.',
  },
  {
    icon: '🔗',
    title: 'Zákazníci přímo k vám',
    desc: 'Olivátor není marketplace — neprodáváme za vás. Každý "Koupit" klik vede přímo na váš e-shop.',
  },
  {
    icon: '📡',
    title: 'Denně aktuální ceny z vašeho feedu',
    desc: 'Napojíme se na váš Heureka XML feed a ceny budeme aktualizovat každý den automaticky.',
  },
  {
    icon: '⚖️',
    title: 'Férové srovnání — pozici nelze koupit',
    desc: (
      <>
        Pořadí určuje výhradně{' '}
        <Link href="/metodika" className="text-olive underline underline-offset-2">Olivator Score</Link>
        {' '}— veřejná a auditovatelná metodika. Žádná sponzorovaná místa.
      </>
    ),
  },
]

const STEPS = [
  {
    num: '1',
    title: 'Vyplňte formulář',
    desc: 'Stačí název e-shopu, web a email. Feed URL je výhodou — pokud ho nemáte po ruce, ozveme se a vyřešíme to společně.',
  },
  {
    num: '2',
    title: 'Zkontrolujeme feed a připravíme profil',
    desc: 'Ověříme data, nastavíme parametry scraping pipeline a připravíme profil prodejce.',
  },
  {
    num: '3',
    title: 'Jste v katalogu',
    desc: 'Do několika dní jsou vaše produkty živé. Zrušit spolupráci lze kdykoli emailem — bez sankcí, bez výpovědní lhůty.',
  },
]

const FAQ = [
  {
    q: 'Co když nemám Heureka feed?',
    a: 'Nevadí. Ozvěte se s URL svého e-shopu a vyřešíme to individuálně — buď vám pomůžeme feed nastavit, nebo produkty stáhneme jinak.',
  },
  {
    q: 'Kolik to stojí?',
    a: 'Zařazení je zdarma. Pokud nás zvolíte jako affiliate partnera a zákazník přes nás nakoupí, dostaneme standardní provizi — ale to je čistě dobrovolné a nikdy neovlivňuje pořadí v katalogu.',
  },
  {
    q: 'Můžu kdykoli odejít?',
    a: 'Ano. Stačí napsat email na info@makyoutdoors.com a profil deaktivujeme do 48 hodin. Žádné smlouvy, žádné sankce.',
  },
  {
    q: 'Jak počítáte hodnocení?',
    a: (
      <>
        Olivator Score (0–100) vychází z kyselosti, polyfenolů, certifikací a poměru cena/kvalita.{' '}
        <Link href="/metodika" className="text-olive underline underline-offset-2">
          Celá metodika je veřejná →
        </Link>
      </>
    ),
  },
]

export default function ProProdejcePage() {
  return (
    <div className="max-w-[820px] mx-auto px-6 md:px-10 py-12">
      {/* Breadcrumb */}
      <div className="text-xs text-text3 mb-8">
        <Link href="/" className="text-olive hover:underline">Olivátor</Link>
        {' › '}
        <span>Pro prodejce</span>
      </div>

      {/* ── HERO ─────────────────────────────────────────────── */}
      <section className="mb-14">
        <h1 className="font-[family-name:var(--font-display)] text-4xl md:text-5xl font-normal text-text mb-3 leading-tight">
          Prodáváte olivový olej?<br />
          <span className="text-[#2d6a4f] italic">Zařadíme vás zdarma.</span>
        </h1>
        <p className="text-[17px] text-text2 font-light max-w-[580px] leading-relaxed">
          Olivátor je datový srovnávač — posíláme zákazníky přímo do vašeho e-shopu.
          Žádný marketplace, žádné poplatky za místo v katalogu.
        </p>
      </section>

      {/* ── CO ZÍSKÁTE ───────────────────────────────────────── */}
      <section className="mb-14">
        <h2 className="font-[family-name:var(--font-display)] text-2xl font-normal text-text mb-6">
          Co získáte
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {BENEFITS.map((b, i) => (
            <div key={i} className="bg-white border border-off2 rounded-2xl p-5">
              <div className="text-2xl mb-3">{b.icon}</div>
              <div className="font-medium text-[15px] text-text mb-1.5">{b.title}</div>
              <p className="text-[13px] text-text2 leading-relaxed">{b.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── JAK TO FUNGUJE ───────────────────────────────────── */}
      <section className="mb-14">
        <h2 className="font-[family-name:var(--font-display)] text-2xl font-normal text-text mb-6">
          Jak to funguje
        </h2>
        <div className="space-y-4">
          {STEPS.map((s, i) => (
            <div key={i} className="flex gap-5 items-start">
              <div className="w-9 h-9 rounded-full bg-[#d8f3dc] flex items-center justify-center shrink-0 text-[15px] font-semibold text-[#1b4332]">
                {s.num}
              </div>
              <div className="pt-1">
                <div className="font-medium text-[15px] text-text mb-1">{s.title}</div>
                <p className="text-[13px] text-text2 leading-relaxed">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── FORMULÁŘ ─────────────────────────────────────────── */}
      <section className="mb-16" id="formular">
        <h2 className="font-[family-name:var(--font-display)] text-2xl font-normal text-text mb-2">
          Mám zájem
        </h2>
        <p className="text-[14px] text-text2 mb-6">
          Vyplňte formulář a ozveme se do 2 pracovních dnů.
        </p>
        <div className="bg-off rounded-2xl p-6 md:p-8">
          <PartnerInquiryForm />
        </div>
      </section>

      {/* ── PODMÍNKY ZAŘAZENÍ ────────────────────────────────── */}
      <section className="mb-14" id="podminky">
        <h2 className="font-[family-name:var(--font-display)] text-2xl font-normal text-text mb-5">
          Podmínky zařazení
        </h2>
        <div className="prose prose-sm max-w-none text-text2 space-y-4 text-[13px] leading-relaxed">
          <p>
            <strong>1. Co zařazení zahrnuje.</strong> Zobrazení produktů, cen a odkazů z vašeho feedu v katalogu olivátor.cz, denní automatická aktualizace dat, profil prodejce zdarma.
          </p>
          <p>
            <strong>2. Nezávislost hodnocení.</strong> Pořadí v katalogu a Olivator Score jsou určeny výhradně dle{' '}
            <Link href="/metodika" className="text-olive underline underline-offset-2">veřejné metodiky</Link>. Pozici nelze koupit ani ovlivnit komerční spoluprací.
          </p>
          <p>
            <strong>3. Práva prodejce.</strong> Kdykoli nás můžete požádat o úpravu nebo odstranění dat (zpracujeme do 48 h). Pokud jsou data ve feedu prokazatelně nesprávná, opravíme je po doložení.
          </p>
          <p>
            <strong>4. Práva Olivátoru.</strong> Vyhrazujeme si právo vyřadit prodejce při nefunkčním feedu déle než 7 dní, porušení pravidel (falešné ceny, spam) nebo redakční kontrole profilových textů.
          </p>
          <p>
            <strong>5. Ukončení.</strong> Spolupráci lze ukončit kdykoli emailem na info@makyoutdoors.com — bez sankcí, bez výpovědní lhůty.
          </p>
          <p>
            <strong>6. Bez záruky návštěvnosti.</strong> Olivátor nezaručuje konkrétní objem kliků ani konverzí.
          </p>
          <p>
            <strong>7. Provozovatel.</strong> Maky Outdoors s.r.o., IČO 09520074, Brno.{' '}
            <a href="mailto:info@makyoutdoors.com" className="text-olive underline underline-offset-2">info@makyoutdoors.com</a>
          </p>
        </div>
      </section>

      {/* ── FAQ ──────────────────────────────────────────────── */}
      <section className="mb-8">
        <h2 className="font-[family-name:var(--font-display)] text-2xl font-normal text-text mb-6">
          Časté otázky
        </h2>
        <div className="space-y-4">
          {FAQ.map((f, i) => (
            <div key={i} className="border-b border-off2 pb-4">
              <div className="font-medium text-[14px] text-text mb-1.5">{f.q}</div>
              <p className="text-[13px] text-text2 leading-relaxed">{f.a}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
