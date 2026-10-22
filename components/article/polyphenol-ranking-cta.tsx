import Link from 'next/link'

export const POLYPHENOL_RANKING_URL = '/zebricek/nejlepsi-vysokopolyfenolovy-olej'

export function isPolyphenolArticle(slug: string): boolean {
  return /polyfenol/.test(slug)
}

/** Výrazný odkaz z průvodců o polyfenolech na žebříček olejů s nejvyšším naměřeným obsahem. */
export function PolyphenolRankingCta({ position }: { position: 'top' | 'bottom' }) {
  return (
    <Link
      href={POLYPHENOL_RANKING_URL}
      className={`flex items-center justify-between gap-4 rounded-[var(--radius-card)] border border-olive bg-olive-bg px-5 py-4 hover:border-olive-dark transition-colors ${
        position === 'top' ? 'mb-8' : 'my-8'
      }`}
    >
      <div>
        <div className="text-[11px] font-semibold uppercase tracking-wider text-olive-dark mb-1">Žebříček</div>
        <div className="text-[16px] font-semibold text-text leading-snug">
          {position === 'top'
            ? 'Oleje s nejvyšším naměřeným obsahem polyfenolů'
            : 'Chceš olej s vysokým obsahem polyfenolů? Mrkni na žebříček'}
        </div>
        <div className="text-[13px] text-text2 mt-0.5">Seřazeno podle laboratorních hodnot v mg/kg, s aktuálními cenami.</div>
      </div>
      <span className="shrink-0 text-[14px] font-medium text-olive">Zobrazit →</span>
    </Link>
  )
}
