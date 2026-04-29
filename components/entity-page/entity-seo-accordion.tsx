// Blok 8: SEO akordeon — TL;DR pásek + nativní <details> sekce + FAQ.
// JSON-LD pro FAQPage je v samostatné komponentě (entity-jsonld.tsx).
// Brief.md: nativní <details>/<summary> bez JS toggle (přístupnost).

import type { AccordionSection, FaqItem } from './types'

function renderInline(text: string): React.ReactNode[] {
  // Zachová ## a ### nadpisy + odstavce, podobně jako renderDescription
  // v entity stránkách. Bez fotek — to už je v editorial bloku nahoře.
  return text.split('\n').map((line, i) => {
    if (line.startsWith('## ')) {
      return (
        <h3 key={i} className="font-[family-name:var(--font-display)] text-xl font-normal text-text mt-6 mb-2">
          {line.slice(3)}
        </h3>
      )
    }
    if (line.startsWith('### ')) {
      return (
        <h4 key={i} className="text-base font-medium text-text mt-4 mb-1.5">
          {line.slice(4)}
        </h4>
      )
    }
    if (line.trim() === '') return <div key={i} className="h-2" />
    return (
      <p key={i} className="text-[14px] text-text2 font-light leading-relaxed">
        {line}
      </p>
    )
  })
}

interface Props {
  /** Krátké shrnutí na info pásek nad akordeonem (modrý box). */
  tldr?: string | null
  /** Sekce akordeonu — sbalené ve výchozím stavu. */
  sections: AccordionSection[]
  /** FAQ — vykreslíme se schema.org/FAQPage JSON-LD nahoře. */
  faqs: FaqItem[]
}

export function EntitySeoAccordion({ tldr, sections, faqs }: Props) {
  if (sections.length === 0 && faqs.length === 0 && !tldr) return null

  return (
    <section className="px-6 md:px-10">
      <div className="max-w-[920px] mx-auto">
        {/* TL;DR info pásek */}
        {tldr && (
          <div className="bg-olive-bg border-l-4 border-olive rounded-r-[var(--radius-card)] px-5 py-4 mb-6">
            <div className="text-[11px] font-bold tracking-widest uppercase text-olive-dark mb-1">
              TL;DR
            </div>
            <p className="text-[14px] text-olive-dark leading-relaxed">{tldr}</p>
          </div>
        )}

        {/* Akordeon — nativní <details> */}
        {sections.length > 0 && (
          <div className="space-y-2 mb-6">
            {sections.map((section, i) => (
              <details
                key={i}
                className="bg-white border border-off2 rounded-[var(--radius-card)] group"
              >
                <summary className="cursor-pointer list-none px-5 py-4 flex items-center justify-between gap-3 [&::-webkit-details-marker]:hidden">
                  <span className="text-[15px] font-medium text-text">
                    {section.title}
                  </span>
                  <span className="text-text3 text-[14px] group-open:rotate-180 transition-transform">
                    ▾
                  </span>
                </summary>
                <div className="px-5 pb-5 pt-1 border-t border-off">
                  {renderInline(section.body)}
                </div>
              </details>
            ))}
          </div>
        )}

        {/* FAQ — sekce */}
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
