'use client'

import { useState, useRef } from 'react'

interface FormState {
  status: 'idle' | 'loading' | 'success' | 'error'
  error?: string
}

export function PartnerInquiryForm() {
  const [state, setState] = useState<FormState>({ status: 'idle' })
  const formRef = useRef<HTMLFormElement>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setState({ status: 'loading' })

    const fd = new FormData(e.currentTarget)
    const data = {
      shop_name:        fd.get('shop_name'),
      web_url:          fd.get('web_url'),
      email:            fd.get('email'),
      feed_url:         fd.get('feed_url') || undefined,
      message:          fd.get('message') || undefined,
      consent:          fd.get('consent') === 'on',
      website_confirm:  fd.get('website_confirm'), // honeypot
    }

    try {
      const res = await fetch('/api/partner-inquiry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      const json = await res.json()
      if (!res.ok) {
        setState({ status: 'error', error: json.error ?? 'Chyba serveru.' })
      } else {
        setState({ status: 'success' })
        formRef.current?.reset()
      }
    } catch {
      setState({ status: 'error', error: 'Nepodařilo se odeslat formulář. Zkuste to znovu.' })
    }
  }

  if (state.status === 'success') {
    return (
      <div className="bg-[#f0faf4] border border-[#b7e4c7] rounded-2xl p-8 text-center">
        <div className="text-4xl mb-3">✓</div>
        <h3 className="text-xl font-medium text-[#1b4332] mb-2">Poptávka odeslána</h3>
        <p className="text-[15px] text-text2">
          Ozveme se do 2 pracovních dnů na váš email.
        </p>
      </div>
    )
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="space-y-4" noValidate>
      {/* Honeypot */}
      <input type="text" name="website_confirm" className="hidden" tabIndex={-1} autoComplete="off" />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="pi-shop" className="block text-[13px] font-medium text-text mb-1">
            Název e-shopu <span className="text-red-500">*</span>
          </label>
          <input
            id="pi-shop" name="shop_name" type="text" required
            placeholder="např. Olivio.cz"
            className="w-full border border-off2 rounded-xl px-4 py-2.5 text-[14px] text-text placeholder:text-text3 focus:outline-none focus:border-olive focus:ring-1 focus:ring-olive/30"
          />
        </div>
        <div>
          <label htmlFor="pi-web" className="block text-[13px] font-medium text-text mb-1">
            Web (URL) <span className="text-red-500">*</span>
          </label>
          <input
            id="pi-web" name="web_url" type="url" required
            placeholder="https://vaseshop.cz"
            className="w-full border border-off2 rounded-xl px-4 py-2.5 text-[14px] text-text placeholder:text-text3 focus:outline-none focus:border-olive focus:ring-1 focus:ring-olive/30"
          />
        </div>
      </div>

      <div>
        <label htmlFor="pi-email" className="block text-[13px] font-medium text-text mb-1">
          Kontaktní e-mail <span className="text-red-500">*</span>
        </label>
        <input
          id="pi-email" name="email" type="email" required
          placeholder="vy@vaseshop.cz"
          className="w-full border border-off2 rounded-xl px-4 py-2.5 text-[14px] text-text placeholder:text-text3 focus:outline-none focus:border-olive focus:ring-1 focus:ring-olive/30"
        />
      </div>

      <div>
        <label htmlFor="pi-feed" className="block text-[13px] font-medium text-text mb-1">
          Heureka / XML feed URL
          <span className="ml-2 text-text3 font-normal">(nepovinné)</span>
        </label>
        <input
          id="pi-feed" name="feed_url" type="url"
          placeholder="https://vaseshop.cz/heureka.xml"
          className="w-full border border-off2 rounded-xl px-4 py-2.5 text-[14px] text-text placeholder:text-text3 focus:outline-none focus:border-olive focus:ring-1 focus:ring-olive/30"
        />
        <p className="text-[12px] text-text3 mt-1">
          V Shoptetu: Propojení → Heureka. Pokud ho nemáte po ruce, ozveme se.
        </p>
      </div>

      <div>
        <label htmlFor="pi-msg" className="block text-[13px] font-medium text-text mb-1">
          Zpráva <span className="text-text3 font-normal">(nepovinné)</span>
        </label>
        <textarea
          id="pi-msg" name="message" rows={3}
          placeholder="Cokoli chcete sdělit — počet produktů, speciální sortiment, atp."
          className="w-full border border-off2 rounded-xl px-4 py-2.5 text-[14px] text-text placeholder:text-text3 focus:outline-none focus:border-olive focus:ring-1 focus:ring-olive/30 resize-none"
        />
      </div>

      <div className="space-y-2">
        <label className="flex items-start gap-3 cursor-pointer group">
          <input
            name="consent" type="checkbox" required
            className="mt-0.5 h-4 w-4 rounded border-off2 text-olive focus:ring-olive/30 shrink-0"
          />
          <span className="text-[13px] text-text2 group-hover:text-text transition-colors">
            Souhlasím s{' '}
            <a href="#podminky" className="text-olive underline underline-offset-2">podmínkami zařazení</a>{' '}
            <span className="text-red-500">*</span>
          </span>
        </label>
        <p className="text-[11px] text-text3 pl-7">
          Osobní údaje zpracováváme dle{' '}
          <a href="/ochrana-osobnich-udaju" className="underline underline-offset-2 hover:text-text2">
            zásad ochrany osobních údajů
          </a>
          . Kontaktní data uchováváme výhradně za účelem vyřízení poptávky.
        </p>
      </div>

      {state.status === 'error' && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-[13px] text-red-700">
          {state.error}
        </div>
      )}

      <button
        type="submit"
        disabled={state.status === 'loading'}
        className="w-full bg-[#2d6a4f] hover:bg-[#1b4332] text-white font-medium text-[14px] py-3 rounded-xl transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {state.status === 'loading' ? 'Odesílám…' : 'Odeslat poptávku →'}
      </button>
    </form>
  )
}
