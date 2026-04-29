// Blok 3: Akční pásek — "Nevíte který? Quiz vám doporučí za 60 sekund."

import Link from 'next/link'
import type { CtaConfig } from './types'

export function EntityCtaStripe({ cta }: { cta: CtaConfig }) {
  return (
    <section className="px-6 md:px-10">
      <div className="max-w-[1280px] mx-auto">
        <div className="bg-olive-bg border border-olive-border rounded-[var(--radius-card)] px-6 py-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex-1 min-w-0">
            <p className="text-[15px] text-olive-dark leading-snug">
              {cta.description}
            </p>
          </div>
          <Link
            href={cta.href}
            className="bg-olive text-white rounded-full px-5 py-2.5 text-[13px] font-medium hover:bg-olive-dark transition-colors whitespace-nowrap text-center"
          >
            {cta.label} →
          </Link>
        </div>
      </div>
    </section>
  )
}
