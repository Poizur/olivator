'use client'

import { useEffect, useState } from 'react'
import Script from 'next/script'
import Link from 'next/link'

const CONSENT_KEY = 'olivator_cookie_consent'

type Consent = 'analytics' | 'essential'

export function CookieConsentBanner({ gaId }: { gaId?: string }) {
  const [consent, setConsent] = useState<Consent | null | 'loading'>('loading')
  const [showSettings, setShowSettings] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem(CONSENT_KEY) as Consent | null
    setConsent(stored)
  }, [])

  function saveConsent(value: Consent) {
    localStorage.setItem(CONSENT_KEY, value)
    setConsent(value)
    setShowSettings(false)
  }

  // During SSR / before hydration — don't render anything to avoid mismatch
  if (consent === 'loading') return null

  const loadGA = consent === 'analytics' && gaId

  return (
    <>
      {loadGA && (
        <>
          <Script
            strategy="afterInteractive"
            src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`}
          />
          <Script id="ga-init" strategy="afterInteractive">
            {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${gaId}',{anonymize_ip:true});`}
          </Script>
        </>
      )}

      {consent === null && (
        <div
          role="dialog"
          aria-label="Nastavení cookies"
          className="fixed bottom-0 left-0 right-0 z-[9998] bg-white border-t border-off2 shadow-[0_-4px_24px_rgba(0,0,0,0.08)]"
        >
          <div className="max-w-[1280px] mx-auto px-6 py-3.5">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <p className="text-[13px] text-text2 flex-1 leading-relaxed">
                Používáme nezbytné cookies pro fungování webu a volitelně Google&nbsp;Analytics
                pro zlepšování obsahu (pouze se souhlasem).{' '}
                <Link href="/cookies" className="text-olive underline decoration-dotted underline-offset-2">
                  Více o&nbsp;cookies
                </Link>
              </p>
              <div className="flex gap-2 shrink-0 flex-wrap">
                <button
                  onClick={() => setShowSettings(s => !s)}
                  className="px-4 py-1.5 text-[12px] border border-off2 rounded-full text-text2 hover:border-olive/40 transition-colors"
                >
                  Nastavení
                </button>
                <button
                  onClick={() => saveConsent('essential')}
                  className="px-4 py-1.5 text-[12px] border border-off2 rounded-full text-text hover:border-olive/40 transition-colors"
                >
                  Jen nezbytné
                </button>
                <button
                  onClick={() => saveConsent('analytics')}
                  className="px-4 py-1.5 text-[12px] bg-olive text-white rounded-full hover:bg-[#1b4332] transition-colors font-medium"
                >
                  Přijmout vše
                </button>
              </div>
            </div>

            {showSettings && (
              <div className="mt-3 pt-3 border-t border-off2 grid sm:grid-cols-2 gap-4 text-[12px] text-text2">
                <div className="flex gap-2.5">
                  <div className="mt-0.5 w-3.5 h-3.5 rounded-sm bg-olive shrink-0 flex items-center justify-center">
                    <span className="text-white text-[9px] font-bold">✓</span>
                  </div>
                  <div>
                    <div className="font-medium text-text mb-0.5">Nezbytné cookies</div>
                    <div className="leading-relaxed text-text3">
                      Relace, CSRF ochrana, preferované nastavení. Bez nich web nefunguje správně.
                      Nelze vypnout.
                    </div>
                  </div>
                </div>
                <div className="flex gap-2.5">
                  <div className={`mt-0.5 w-3.5 h-3.5 rounded-sm shrink-0 flex items-center justify-center border ${
                    consent === 'analytics' ? 'bg-olive border-olive' : 'border-text3'
                  }`}>
                    {consent === 'analytics' && (
                      <span className="text-white text-[9px] font-bold">✓</span>
                    )}
                  </div>
                  <div>
                    <div className="font-medium text-text mb-0.5">Analytické cookies (GA4)</div>
                    <div className="leading-relaxed text-text3">
                      Pseudonymizovaná data o návštěvnosti (typ zařízení, zobrazené stránky).
                      Pomáhají nám zlepšovat obsah. Data nejsou sdílena pro reklamní účely.
                    </div>
                  </div>
                </div>
                <div className="sm:col-span-2 flex justify-end gap-2 pt-1">
                  <button
                    onClick={() => saveConsent('essential')}
                    className="px-4 py-1.5 text-[12px] border border-off2 rounded-full text-text hover:border-olive/40 transition-colors"
                  >
                    Uložit — jen nezbytné
                  </button>
                  <button
                    onClick={() => saveConsent('analytics')}
                    className="px-4 py-1.5 text-[12px] bg-olive text-white rounded-full hover:bg-[#1b4332] transition-colors font-medium"
                  >
                    Uložit — přijmout vše
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}
