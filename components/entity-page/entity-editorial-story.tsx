// Magazine-style editorial story — nahrazuje 2-sloupcový grid plain text karet.
// Každá H2 sekce z description_long má vlastní full-width zónu s fotkou.
// Strana fotky se střídá (zebra layout), na mobilu vždy nahoře.
// Pokud fotek není dostatek, sekce se vykreslí čistě textová.

import type { AccordionSection } from './types'

interface StoryPhoto {
  url: string
  alt: string | null
}

interface Props {
  sections: AccordionSection[]
  photos: StoryPhoto[]
  /** Volitelný "lead" odstavec nad první sekcí (intro z description_long bez ## headers). */
  intro?: string | null
}

function renderInline(body: string): React.ReactNode[] {
  return body.split('\n').map((line, i) => {
    if (line.startsWith('### ')) {
      return (
        <h4 key={i} className="text-base font-medium text-text mt-5 mb-2">
          {line.slice(4)}
        </h4>
      )
    }
    if (line.trim() === '') return <div key={i} className="h-2" />
    return (
      <p key={i} className="text-[15px] text-text2 font-light leading-[1.7] mb-3">
        {line}
      </p>
    )
  })
}

export function EntityEditorialStory({ sections, photos, intro }: Props) {
  if (sections.length === 0 && !intro) return null

  return (
    <section className="px-6 md:px-10">
      <div className="max-w-[1080px] mx-auto">
        {/* Intro lead — bez fotky, větší velkorysý odstup */}
        {intro && (
          <div className="max-w-[720px] mx-auto mb-12 md:mb-16">
            <p className="font-[family-name:var(--font-display)] text-xl md:text-2xl text-text font-normal leading-[1.55] italic">
              {intro}
            </p>
          </div>
        )}

        {/* Sekce — zebra layout */}
        <div className="space-y-12 md:space-y-20">
          {sections.map((section, i) => {
            const photo = photos[i] ?? null
            const photoOnRight = i % 2 === 1
            const hasPhoto = !!photo

            return (
              <article key={i} className="grid grid-cols-1 md:grid-cols-12 gap-6 md:gap-10 items-start">
                {/* Foto — order podle parity, mobilu vždy nahoře */}
                {hasPhoto && (
                  <div
                    className={`md:col-span-5 ${
                      photoOnRight ? 'md:order-2' : 'md:order-1'
                    } order-1`}
                  >
                    <div className="relative aspect-[4/3] rounded-[var(--radius-card)] overflow-hidden bg-off">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={photo.url}
                        alt={photo.alt ?? section.title}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    </div>
                    {photo.alt && (
                      <p className="text-[11px] text-text3 mt-2 italic font-light leading-snug">
                        {photo.alt}
                      </p>
                    )}
                  </div>
                )}

                {/* Text */}
                <div
                  className={`${
                    hasPhoto
                      ? `md:col-span-7 ${photoOnRight ? 'md:order-1' : 'md:order-2'}`
                      : 'md:col-span-12'
                  } order-2`}
                >
                  <div className="text-[10px] font-bold tracking-widest uppercase text-olive mb-2">
                    — {String(i + 1).padStart(2, '0')}
                  </div>
                  <h2 className="font-[family-name:var(--font-display)] text-2xl md:text-3xl font-normal text-text leading-tight mb-4">
                    {section.title}
                  </h2>
                  <div>{renderInline(section.body)}</div>
                </div>
              </article>
            )
          })}
        </div>
      </div>
    </section>
  )
}
