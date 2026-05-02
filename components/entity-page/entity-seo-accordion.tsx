// SEO blok — TL;DR info pásek + FAQ.
// Editorial sekce přesunuly do EntityEditorialStory (magazine-style s fotkami).
// FAQ JSON-LD je v samostatné komponentě (entity-jsonld.tsx).

import type { FaqItem } from './types'

interface Props {
  /** Krátké shrnutí na info pásek. */
  tldr?: string | null
  /** FAQ — vykreslíme se schema.org/FAQPage JSON-LD nahoře. */
  faqs: FaqItem[]
}

export function EntitySeoAccordion({ tldr, faqs }: Props) {
  if (faqs.length === 0 && !tldr) return null

  return (
    <section className="px-6 md:px-10">
      <div className="max-w-[920px] mx-auto">
        {/* Stručně — info pásek */}
        {tldr && (
          <div className="bg-olive-bg border-l-4 border-olive rounded-r-[var(--radius-card)] px-5 py-4 mb-8">
            <div className="text-[11px] font-bold tracking-widest uppercase text-olive-dark mb-1">
              Stručně
            </div>
            <p className="text-[14px] text-olive-dark leading-relaxed">{tldr}</p>
          </div>
        )}

        {/* FAQ */}
        {faqs.length > 0 && (
          <div>
            <h2 className="font-[family-name:var(--font-display)] text-2xl font-normal text-text mb-4">
              Časté otázky
            </h2>
            <div className="space-y-2">
              {faqs.map((f, i) => (
                <details
                  key={i}
                  className="bg-white border border-off2 rounded-[var(--radius-card)] group"
                >
                  <summary className="cursor-pointer list-none px-5 py-4 flex items-center justify-between gap-3 [&::-webkit-details-marker]:hidden">
                    <h3 className="text-[15px] font-medium text-text m-0">{f.question}</h3>
                    <span className="text-text3 text-[14px] group-open:rotate-180 transition-transform">
                      ▾
                    </span>
                  </summary>
                  <div className="px-5 pb-5 pt-1 border-t border-off">
                    <p className="text-[14px] text-text2 font-light leading-relaxed whitespace-pre-line">
                      {f.answer}
                    </p>
                  </div>
                </details>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
