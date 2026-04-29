'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { Trophy, ArrowRight } from 'lucide-react'
import { ProductImage } from './product-image'
import { formatPrice, formatPricePer100ml, countryName } from '@/lib/utils'
import type { Product, ProductOffer } from '@/lib/types'

type ProductWithOffer = Product & { cheapestOffer: ProductOffer | null }

interface Message {
  role: 'user' | 'assistant'
  content: string
}

interface Props {
  totalProducts: number
  activeRetailers: number
  regionCount: number
  brandCount: number
  topPicks: ProductWithOffer[]
  productLookup: Record<string, ProductWithOffer>
}

const SUGGESTIONS = [
  'Lehký řecký do 300 Kč',
  'Co má nejvíc polyfenolů?',
  'Dárek pro tátu co rád vaří',
  'BIO olej na saláty',
]

function extractSlugs(text: string): string[] {
  const matches = text.match(/\/olej\/([\w-]+)/g) ?? []
  const slugs = matches.map((m) => m.replace('/olej/', ''))
  return [...new Set(slugs)]
}

function formatReply(text: string) {
  // Strip /olej/ links from text since we render product cards separately
  return text
    .replace(/\(\/olej\/[\w-]+\)/g, '')
    .replace(/\/olej\/[\w-]+/g, '')
    .split('\n')
    .map((line, i) => (line.trim() === '' ? <div key={i} className="h-2" /> : <p key={i}>{line}</p>))
}

export function SommelierHero({
  totalProducts,
  activeRetailers,
  regionCount,
  brandCount,
  topPicks,
  productLookup,
}: Props) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const resultsEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => resultsEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 50)
    }
  }, [messages])

  async function send(text?: string) {
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
        body: JSON.stringify({ messages: newMessages }),
      })
      const data = (await res.json()) as { reply?: string; error?: string }
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: data.reply ?? data.error ?? 'Chyba — zkus to znovu.',
        },
      ])
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: 'Připojení selhalo — zkus to znovu.' },
      ])
    } finally {
      setLoading(false)
    }
  }

  function reset() {
    setMessages([])
    setInput('')
  }

  const hasConversation = messages.length > 0

  return (
    <section className="relative bg-white overflow-hidden border-b border-off2">
      <div
        aria-hidden
        className="absolute inset-0 -z-10 bg-gradient-to-b from-olive-bg/30 via-white to-white"
      />

      <div className="max-w-[1440px] mx-auto px-6 md:px-10 pt-12 pb-14">
        <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-10 items-start">
          {/* LEFT: Sommelier search */}
          <div>
            <div className="inline-flex items-center gap-2 text-[11px] font-medium text-olive bg-olive-bg px-3.5 py-1.5 rounded-full mb-5 tracking-wide">
              <span className="relative flex w-2 h-2">
                <span className="animate-ping absolute inline-flex w-full h-full rounded-full bg-olive opacity-50" />
                <span className="relative inline-flex w-2 h-2 rounded-full bg-olive" />
              </span>
              {totalProducts} olejů · {activeRetailers} prodejců · {regionCount} regionů · {brandCount} značek
            </div>

            <h1 className="font-[family-name:var(--font-display)] text-5xl md:text-[64px] font-normal leading-[1.02] tracking-tight text-text mb-4">
              Zeptej se.<br />
              <em className="text-olive italic">Najdeme tvůj olej.</em>
            </h1>

            <p className="text-[16px] text-text2 font-light leading-relaxed mb-7 max-w-[560px]">
              AI Sommelier prochází celý katalog. Napiš co hledáš — chuť, cenu, příležitost — a dostaneš tři konkrétní oleje s cenou a důvodem proč.
            </p>

            {/* Search input */}
            <div className="relative max-w-[640px]">
              <div className="flex gap-2 items-center bg-white border border-off2 rounded-full pl-5 pr-2 py-2 shadow-[0_4px_24px_rgba(0,0,0,0.04)] focus-within:border-olive focus-within:shadow-[0_4px_24px_rgba(45,106,79,0.12)] transition-all">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && send()}
                  placeholder="Co hledáš? Napiš třeba: lehký řecký do 300 Kč..."
                  disabled={loading}
                  className="flex-1 text-[15px] outline-none placeholder:text-text3 bg-transparent py-2"
                />
                <button
                  onClick={() => send()}
                  disabled={!input.trim() || loading}
                  className="bg-olive text-white rounded-full px-5 py-2.5 text-[14px] font-semibold disabled:opacity-40 hover:bg-olive2 transition-colors whitespace-nowrap inline-flex items-center gap-1.5"
                >
                  {loading ? '…' : (
                    <>
                      Zeptat se
                      <ArrowRight size={14} strokeWidth={2} />
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Suggestion chips */}
            {!hasConversation && (
              <div className="flex flex-wrap gap-2 mt-4 max-w-[640px]">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => send(s)}
                    disabled={loading}
                    className="text-[12px] text-text2 bg-off hover:bg-olive-bg hover:text-olive border border-off2 hover:border-olive-border rounded-full px-3.5 py-1.5 transition-colors"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}

            {/* Inline results */}
            {hasConversation && (
              <div className="mt-7 max-w-[720px]">
                {messages.map((m, i) => {
                  if (m.role === 'user') {
                    return (
                      <div key={i} className="flex justify-end mb-3">
                        <div className="bg-olive text-white rounded-2xl rounded-br-sm px-4 py-2.5 text-[14px] max-w-[80%]">
                          {m.content}
                        </div>
                      </div>
                    )
                  }
                  const slugs = extractSlugs(m.content)
                  const recommended = slugs.map((s) => productLookup[s]).filter(Boolean).slice(0, 3)

                  return (
                    <div key={i} className="mb-5">
                      <div className="bg-off rounded-2xl rounded-bl-sm px-4 py-3 text-[14px] text-text leading-relaxed mb-3 max-w-[80%]">
                        {formatReply(m.content)}
                      </div>
                      {recommended.length > 0 && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                          {recommended.map((p) => (
                            <ProductMiniCard key={p.id} product={p} />
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}

                {loading && (
                  <div className="bg-off rounded-2xl rounded-bl-sm px-4 py-3 inline-block">
                    <span className="inline-flex gap-1">
                      <span className="w-1.5 h-1.5 bg-text3 rounded-full animate-bounce [animation-delay:0ms]" />
                      <span className="w-1.5 h-1.5 bg-text3 rounded-full animate-bounce [animation-delay:150ms]" />
                      <span className="w-1.5 h-1.5 bg-text3 rounded-full animate-bounce [animation-delay:300ms]" />
                    </span>
                  </div>
                )}

                <div className="mt-3 flex items-center gap-3 text-[12px] text-text3">
                  <button onClick={reset} className="hover:text-text underline">
                    Začít znovu
                  </button>
                  <span>·</span>
                  <Link href="/srovnavac" className="hover:text-text">
                    Procházet celý katalog →
                  </Link>
                </div>
                <div ref={resultsEndRef} />
              </div>
            )}
          </div>

          {/* RIGHT: Top 3 této chvíle */}
          <aside className="lg:sticky lg:top-20">
            <div className="bg-olive-dark rounded-[var(--radius-card)] p-6 text-white">
              <div className="flex items-center gap-1.5 mb-5">
                <Trophy size={14} strokeWidth={1.75} className="text-white/80" />
                <span className="text-[10px] font-bold tracking-widest uppercase text-white/80">
                  Top 3 této chvíle
                </span>
              </div>

              <div className="space-y-2.5">
                {topPicks.map((p, i) => (
                  <Link
                    key={p.id}
                    href={`/olej/${p.slug}`}
                    className="flex items-center gap-3 bg-black/15 hover:bg-black/25 border border-white/15 rounded-xl p-3 transition-colors group"
                  >
                    <div className="text-[12px] font-bold text-white/85 tabular-nums w-4 shrink-0">{i + 1}</div>
                    <div className="w-14 h-14 shrink-0 bg-white rounded-lg overflow-hidden">
                      <ProductImage product={p} fallbackSize="text-2xl" sizes="56px" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] font-semibold text-white leading-tight line-clamp-2 group-hover:text-olive4 transition-colors">
                        {p.name}
                      </div>
                      <div className="text-[11px] text-white/85 truncate mt-0.5">
                        {p.cheapestOffer ? (
                          <span>{countryName(p.originCountry)} · {formatPrice(p.cheapestOffer.price)}</span>
                        ) : (
                          <span>{countryName(p.originCountry)}</span>
                        )}
                      </div>
                    </div>
                    <div className="text-[11px] font-bold text-white tabular-nums bg-terra rounded-full px-2 py-0.5 shrink-0">
                      {p.olivatorScore}
                    </div>
                  </Link>
                ))}
              </div>

              <Link
                href="/srovnavac"
                className="mt-4 block text-center text-[12px] text-white/85 hover:text-white border border-white/30 rounded-lg py-2 transition-colors"
              >
                Celý žebříček →
              </Link>
            </div>
          </aside>
        </div>
      </div>
    </section>
  )
}

function ProductMiniCard({ product }: { product: ProductWithOffer }) {
  return (
    <Link
      href={`/olej/${product.slug}`}
      className="bg-white border border-off2 rounded-xl p-3 flex gap-3 hover:border-olive-light hover:shadow-md transition-all group"
    >
      <div className="w-16 h-16 shrink-0 bg-off rounded-lg overflow-hidden">
        <ProductImage product={product} fallbackSize="text-2xl" sizes="64px" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[12px] font-semibold text-text leading-tight line-clamp-2 mb-1">
          {product.name}
        </div>
        <div className="flex items-center gap-2 text-[11px] text-text3">
          <span className="bg-terra text-white rounded-full px-1.5 py-0 tabular-nums font-bold">
            {product.olivatorScore}
          </span>
          {product.cheapestOffer && (
            <span className="font-semibold text-text">{formatPrice(product.cheapestOffer.price)}</span>
          )}
        </div>
      </div>
    </Link>
  )
}
