'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useCompare } from '@/lib/compare-context'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

type PeekState = 'idle' | 'showing' | 'retracting'

const SUGGESTIONS = [
  '🎁 Dárek pro tátu co rád vaří',
  '🇬🇷 Lehký řecký do 300 Kč',
  '🔬 Co má nejvíc polyfenolů?',
  '💚 Doporuč BIO olej na saláty',
]

const PLACEHOLDER_TEXTS = [
  'Napiš: lehký řecký do 300 Kč',
  'Napiš: dárek pro tátu co rád vaří',
  'Napiš: olej na smažení',
]

function getOrCreateSessionId(): string {
  try {
    const key = 'olik_session_id'
    const existing = sessionStorage.getItem(key)
    if (existing) return existing
    const id = crypto.randomUUID()
    sessionStorage.setItem(key, id)
    return id
  } catch {
    return 'anon'
  }
}

function getSessionId(): string | undefined {
  try { return sessionStorage.getItem('olik_session_id') ?? undefined } catch { return undefined }
}

function trackImpression(type: 'floater' | 'peek_shown' | 'peek_clicked', page: string) {
  fetch('/api/olik-impression', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type, page, session_id: getSessionId() }),
  }).catch(() => {})
}

function formatReply(text: string) {
  const parts = text.split(/(\/go\/[\w-]+\/[\w-]+(?:\?[^\s\n]*)?|\/olej\/[\w-]+)/g)
  return parts.map((part, i) => {
    if (part.startsWith('/go/')) {
      return (
        <Link key={i} href={part} className="inline-flex items-center gap-0.5 text-olive underline hover:text-olive2 text-[12px]">
          → koupit
        </Link>
      )
    }
    if (part.startsWith('/olej/')) {
      const slug = part.replace('/olej/', '')
      return (
        <Link key={i} href={part} className="text-olive underline hover:text-olive2">
          {slug}
        </Link>
      )
    }
    return <span key={i}>{part}</span>
  })
}

export function SommelierChat() {
  const pathname = usePathname()
  const { items: compareItems } = useCompare()

  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [hiddenByStickyBar, setHiddenByStickyBar] = useState(false)
  const [placeholderIdx, setPlaceholderIdx] = useState(0)
  const [productHint, setProductHint] = useState<{ name: string; nameShort: string | null } | null>(null)
  const [peekState, setPeekState] = useState<PeekState>('idle')
  const [floaterReady, setFloaterReady] = useState(false)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const floaterRef = useRef<HTMLButtonElement>(null)
  const peekRef = useRef<HTMLDivElement>(null)
  const floaterImpressionFired = useRef(false)
  const peekAutoRetractTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const peekInitTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Stable helper — only uses state setters (stable) and refs
  function retractPeek(openChat = false) {
    if (peekAutoRetractTimer.current) clearTimeout(peekAutoRetractTimer.current)
    setPeekState('retracting')
    document.body.classList.remove('olik-peeking')
    window.dispatchEvent(new CustomEvent('olik:peek', { detail: { active: false } }))
    if (openChat) {
      setOpen(true)
      setFloaterReady(true)
    }
    setTimeout(() => {
      setPeekState('idle')
      if (!openChat) setFloaterReady(true)
    }, 400)
  }

  // Impression tracking — fires once when floater enters viewport
  // eslint-disable-next-line react-hooks/rules-of-hooks
  useEffect(() => {
    const el = floaterRef.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !floaterImpressionFired.current) {
          floaterImpressionFired.current = true
          trackImpression('floater', window.location.pathname)
        }
      },
      { threshold: 0.5 }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  // Rotating placeholder — cycles every 3.5s
  // eslint-disable-next-line react-hooks/rules-of-hooks
  useEffect(() => {
    const t = setInterval(() => setPlaceholderIdx((i) => (i + 1) % PLACEHOLDER_TEXTS.length), 3500)
    return () => clearInterval(t)
  }, [])

  // Product context + peek scheduling
  // eslint-disable-next-line react-hooks/rules-of-hooks
  useEffect(() => {
    setPeekState('idle')
    setFloaterReady(false)
    setProductHint(null)
    document.body.classList.remove('olik-peeking')
    if (peekInitTimer.current) clearTimeout(peekInitTimer.current)
    if (peekAutoRetractTimer.current) clearTimeout(peekAutoRetractTimer.current)

    if (!pathname.startsWith('/olej/')) {
      setFloaterReady(true)
      return
    }

    const slug = pathname.split('/olej/')[1]?.split('/')[0]?.split('?')[0]
    if (!slug) { setFloaterReady(true); return }

    const peekKey = `olik_peek_${slug}`
    const alreadyShown = (() => { try { return !!sessionStorage.getItem(peekKey) } catch { return false } })()
    if (alreadyShown) setFloaterReady(true)

    fetch(`/api/product-hint/${slug}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { name: string; nameShort: string | null } | null) => {
        setProductHint(data)

        if (data && !alreadyShown) {
          peekInitTimer.current = setTimeout(() => {
            setPeekState('showing')
            document.body.classList.add('olik-peeking')
            window.dispatchEvent(new CustomEvent('olik:peek', { detail: { active: true } }))
            try { sessionStorage.setItem(peekKey, '1') } catch {}
            trackImpression('peek_shown', pathname)
            peekAutoRetractTimer.current = setTimeout(() => retractPeek(), 4000)
          }, 1500)
        }
      })
      .catch(() => setFloaterReady(true))

    return () => {
      if (peekInitTimer.current) clearTimeout(peekInitTimer.current)
      if (peekAutoRetractTimer.current) clearTimeout(peekAutoRetractTimer.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname])

  if (pathname.startsWith('/admin')) return null

  // Dismiss peek on scroll or tap outside (grace period 600ms po zobrazení)
  // eslint-disable-next-line react-hooks/rules-of-hooks
  useEffect(() => {
    if (peekState !== 'showing') return

    let active = false
    const grace = setTimeout(() => { active = true }, 600)

    function dismiss(e: Event) {
      if (!active) return
      if (peekRef.current?.contains(e.target as Node)) return
      retractPeek()
    }

    window.addEventListener('scroll', dismiss, { passive: true })
    document.addEventListener('pointerdown', dismiss)
    return () => {
      clearTimeout(grace)
      window.removeEventListener('scroll', dismiss)
      document.removeEventListener('pointerdown', dismiss)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [peekState])

  // eslint-disable-next-line react-hooks/rules-of-hooks
  useEffect(() => {
    if (!pathname.startsWith('/olej/')) { setHiddenByStickyBar(false); return }
    function onScroll() { setHiddenByStickyBar(window.scrollY > 600) }
    window.addEventListener('scroll', onScroll, { passive: true })
    onScroll()
    return () => window.removeEventListener('scroll', onScroll)
  }, [pathname])

  useEffect(() => {
    if (open && messages.length === 0) {
      setMessages([{
        role: 'assistant',
        content: 'Ahoj! Jsem Olík, průvodce Olivatoru. Poradím ti s výběrem olivového oleje — ať hledáš na saláty, vaření, dárek nebo chceš max polyfenoly. Na co se chceš zeptat?',
      }])
    }
  }, [open, messages.length])

  useEffect(() => {
    if (open) setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
  }, [messages, open])

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 100)
  }, [open])

  function handlePeekClick() {
    trackImpression('peek_clicked', pathname)
    retractPeek(true)
  }

  async function handleSend(text?: string) {
    const msg = (text ?? input).trim()
    if (!msg || loading) return
    setInput('')
    const newMessages: Message[] = [...messages, { role: 'user', content: msg }]
    setMessages(newMessages)
    setLoading(true)
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages,
          session_id: getOrCreateSessionId(),
          source_page: typeof window !== 'undefined' ? window.location.pathname : undefined,
        }),
      })
      const data = (await res.json()) as { reply?: string; error?: string }
      setMessages((prev) => [...prev, {
        role: 'assistant',
        content: data.reply ?? data.error ?? 'Chyba — zkus to znovu.',
      }])
    } catch {
      setMessages((prev) => [...prev, { role: 'assistant', content: 'Připojení selhalo — zkus to znovu.' }])
    } finally {
      setLoading(false)
    }
  }

  const productName = productHint?.nameShort ?? productHint?.name?.split(' ').slice(0, 3).join(' ') ?? null
  const activeSuggestions = productName
    ? [
        `Hodí se ${productName} na saláty?`,
        `Na co je ${productName} nejlepší?`,
        '🔬 Co má nejvíc polyfenolů?',
        '🎁 Dárek pro tátu co rád vaří',
      ]
    : SUGGESTIONS

  const compareBarActive = compareItems.length > 0
  const floaterBottom = compareBarActive ? 'bottom-24' : 'bottom-6'
  const isProductPage = pathname.startsWith('/olej/')

  return (
    <>
      {/* PEEK — slide-in zleva, pouze na /olej/* */}
      {isProductPage && (
        <div
          ref={peekRef}
          role="button"
          tabIndex={peekState === 'showing' ? 0 : -1}
          aria-label={`Olík — zeptej se na ${productName ?? 'tento olej'}`}
          onClick={handlePeekClick}
          onKeyDown={(e) => e.key === 'Enter' && handlePeekClick()}
          className="fixed left-0 z-[49] flex items-center cursor-pointer select-none"
          style={{
            bottom: '33vh',
            transform: peekState === 'showing' ? 'translateX(0)' : 'translateX(-100%)',
            transition: 'transform 350ms ease-out',
            pointerEvents: peekState === 'showing' ? 'auto' : 'none',
          }}
        >
          <picture>
            <source srcSet="/olik-peek.webp" type="image/webp" />
            <img
              src="/olik-peek.png"
              alt="Olík"
              width={200}
              height={133}
              className="block"
              draggable={false}
            />
          </picture>
          {productHint && (
            <div className="ml-2 bg-white border border-olive/25 rounded-2xl shadow-lg px-3 py-2 text-[13px] font-medium text-olive whitespace-nowrap">
              Znám {productName} — zeptej se mě 🫒
            </div>
          )}
        </div>
      )}

      {/* FLOATER — zobrazí se po peek, nebo okamžitě na ostatních stránkách */}
      {floaterReady && (
        <button
          ref={floaterRef}
          onClick={() => setOpen((o) => !o)}
          aria-label="Olík — průvodce výběrem oleje"
          className={`fixed right-6 z-[50] w-16 h-16 rounded-full bg-white shadow-lg hover:scale-105 flex items-center justify-center border-2 border-olive/20 transition-all lg:transition-[opacity,transform] ${floaterBottom} ${
            hiddenByStickyBar ? 'lg:opacity-0 lg:pointer-events-none lg:scale-75' : 'opacity-100'
          }`}
          style={{ boxShadow: '0 4px 24px rgba(45,106,79,0.30)', transitionDuration: '200ms' }}
        >
          {open
            ? <span className="text-xl leading-none text-olive font-bold">✕</span>
            : <img src="/olik.png" alt="Olík" className="w-14 h-14 object-contain" />
          }
        </button>
      )}

      {/* CHAT PANEL */}
      {open && (
        <div
          className="fixed bottom-24 right-6 z-[50] w-[340px] sm:w-[380px] bg-white border border-off2 rounded-2xl shadow-2xl flex flex-col overflow-hidden"
          style={{ height: 'min(520px, calc(100vh - 120px))' }}
        >
          <div className="px-4 py-3 bg-olive text-white flex items-center gap-2.5 shrink-0">
            <div className="w-8 h-8 rounded-full bg-white/15 flex items-center justify-center overflow-hidden">
              <img src="/olik.png" alt="Olík" className="w-7 h-7 object-contain" />
            </div>
            <div>
              <div className="text-sm font-semibold">Olík</div>
              <div className="text-[10px] opacity-70">Průvodce výběrem oleje</div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto min-h-0 px-4 py-3 space-y-3">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] px-3 py-2 rounded-2xl text-[13px] leading-relaxed ${
                  m.role === 'user' ? 'bg-olive text-white rounded-br-sm' : 'bg-off text-text rounded-bl-sm'
                }`}>
                  {m.role === 'assistant' ? formatReply(m.content) : m.content}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <div className="bg-off rounded-2xl rounded-bl-sm px-4 py-2.5">
                  <span className="inline-flex gap-1">
                    <span className="w-1.5 h-1.5 bg-text3 rounded-full animate-bounce [animation-delay:0ms]" />
                    <span className="w-1.5 h-1.5 bg-text3 rounded-full animate-bounce [animation-delay:150ms]" />
                    <span className="w-1.5 h-1.5 bg-text3 rounded-full animate-bounce [animation-delay:300ms]" />
                  </span>
                </div>
              </div>
            )}

            {messages.length === 1 && !loading && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {activeSuggestions.map((s) => (
                  <button
                    key={s}
                    onClick={() => handleSend(s)}
                    className="text-[11px] px-2.5 py-1 rounded-full border border-olive/30 text-olive hover:bg-olive-bg transition-colors"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          <div className="px-3 pb-3 pt-2 border-t border-off shrink-0">
            <div className="flex gap-2 items-center">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder={PLACEHOLDER_TEXTS[placeholderIdx]}
                disabled={loading}
                className="flex-1 text-sm bg-off rounded-full px-4 py-2 outline-none placeholder:text-text3 focus:ring-1 focus:ring-olive/30"
              />
              <button
                onClick={() => handleSend()}
                disabled={!input.trim() || loading}
                className="w-9 h-9 rounded-full bg-olive text-white flex items-center justify-center text-sm disabled:opacity-40 hover:bg-olive2 transition-colors shrink-0"
              >
                →
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
