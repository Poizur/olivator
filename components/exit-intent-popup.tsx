'use client'

// Exit-intent popup — spustí se když kurzor opustí viewport nahoru.
// Trigger jen na /olej/ a /zebricek/ stránkách.
// Cooldown: 30 dní (localStorage). Ukáže se max 1× za session.

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { NewsletterSignup } from './newsletter-signup'

const STORAGE_KEY = 'exit_intent_shown'
const COOLDOWN_DAYS = 30

function shouldTrigger(pathname: string): boolean {
  return pathname.startsWith('/olej/') || pathname.startsWith('/zebricek/')
}

function isOnCooldown(): boolean {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return false
    const ts = parseInt(raw, 10)
    return Date.now() - ts < COOLDOWN_DAYS * 24 * 60 * 60 * 1000
  } catch {
    return false
  }
}

function markShown() {
  try {
    localStorage.setItem(STORAGE_KEY, String(Date.now()))
  } catch {
    // private mode — tichý fail
  }
}

export function ExitIntentPopup() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    if (dismissed || !shouldTrigger(pathname)) return

    function handleMouseLeave(e: MouseEvent) {
      if (e.clientY > 10) return
      if (isOnCooldown()) return
      markShown()
      setOpen(true)
    }

    document.addEventListener('mouseleave', handleMouseLeave)
    return () => document.removeEventListener('mouseleave', handleMouseLeave)
  }, [pathname, dismissed])

  if (!open) return null

  function close() {
    setOpen(false)
    setDismissed(true)
  }

  return (
    <div
      className="fixed inset-0 z-[200] bg-black/50 flex items-center justify-center p-4"
      onClick={close}
    >
      <div
        className="bg-white rounded-2xl max-w-[420px] w-full p-7 shadow-2xl relative"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={close}
          className="absolute top-4 right-4 text-text3 hover:text-text transition-colors text-xl leading-none"
          aria-label="Zavřít"
        >
          ×
        </button>

        <div className="text-[10px] font-semibold tracking-widest uppercase text-olive mb-2">
          Než odejdeš
        </div>
        <h2 className="text-[20px] font-semibold text-text mb-2 leading-tight">
          5 nejlepších olejů pod 200 Kč
        </h2>
        <p className="text-[13px] text-text2 leading-relaxed mb-5">
          Každý čtvrtek výběr olejů, slevy a jeden recept. Žádný spam,
          odhlásit jedním klikem.
        </p>

        <NewsletterSignup source="exit_intent" variant="inline" />
      </div>
    </div>
  )
}
