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

/**
 * Vyčistí text od /olej/ linků a prázdných markdown odkazů []().
 * Markdown bold **X** převede na <strong>.
 */
function renderInlineMarkdown(text: string): React.ReactNode[] {
  // Strip leftovers po stripping linků
  const cleaned = text
    .replace(/\[\]\([^)]*\)/g, '')           // []() prázdný markdown link
    .replace(/\(\/olej\/[\w-]+\)/g, '')      // (/olej/slug)
    .replace(/\/olej\/[\w-]+/g, '')          // /olej/slug holé
    .replace(/\(link\)/g, '')                // (link) leftover
    .replace(/\s+\.\s*$/g, '.')              // " ." na konci
    .replace(/\s+,/g, ',')                   // " ," uprostřed
    .trim()

  // Split by **bold** segments
  const parts = cleaned.split(/(\*\*[^*]+\*\*)/g)
  return parts
    .filter((p) => p.length > 0)
    .map((part, i) => {
      const boldMatch = part.match(/^\*\*([^*]+)\*\*$/)
      if (boldMatch) {
        return (
          <strong key={i} className="font-semibold text-text">
            {boldMatch[1]}
          </strong>
        )
      }
      return <span key={i}>{part}</span>
    })
}

interface ReplyBlock {
  type: 'intro' | 'oil' | 'outro'
  text: string
  slug?: string
}

/**
 * Rozparsuje AI odpověď na bloky:
 *   - intro: text před prvním očíslovaným bodem
 *   - oil: každý "1. ... 2. ... 3. ..." kus + slug toho produktu
 *   - outro: cokoliv za posledním očíslovaným bodem
 *
 * Používáme pro interleaved render: text bloku → karta produktu → další blok.
 */
function parseReplyBlocks(text: string): ReplyBlock[] {
  const slugs = extractSlugs(text)
  const lines = text.split('\n')
  const blocks: ReplyBlock[] = []
  let currentText: string[] = []
  let currentType: ReplyBlock['type'] = 'intro'
  let oilIndex = 0

  const flush = () => {
    const joined = currentText.join('\n').trim()
    if (joined.length === 0) return
    if (currentType === 'oil') {
      blocks.push({ type: 'oil', text: joined, slug: slugs[oilIndex] })
      oilIndex++
    } else {
      blocks.push({ type: currentType, text: joined })
    }
    currentText = []
  }

  for (const line of lines) {
    const isNumberedItem = /^\d+\.\s/.test(line.trim())
    if (isNumberedItem) {
      // Finish previous block
      flush()
      currentType = 'oil'
      currentText.push(line)
    } else if (currentType === 'oil' && line.trim() === '' && currentText.length > 0) {
      // Empty line — pokud následuje další numbered item, ukončí současný oil blok
      currentText.push(line)
    } else if (currentType === 'oil' && /^\*\*/.test(line.trim()) && currentText.length > 0) {
      // Začíná outro (např. "**Moje tip:**")
      flush()
      currentType = 'outro'
      currentText.push(line)
    } else {
      currentText.push(line)
    }
  }
  flush()
  return blocks
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
  const inputRef = useRef<HTMLInputElement>(null)

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

      <div className="px-6 md:px-10 pt-12 pb-14">
        <div className="max-w-[1280px] mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-10 items-start">
          {/* LEFT: Sommelier search */}
          <div>
            <div className="inline-flex items-center gap-3 text-[14px] font-semibold text-olive-dark bg-olive-bg px-5 py-2.5 rounded-full mb-5 tracking-tight">
              <span className="relative flex w-2.5 h-2.5">
                <span className="animate-ping absolute inline-flex w-full h-full rounded-full bg-olive opacity-50" />
                <span className="relative inline-flex w-2.5 h-2.5 rounded-full bg-olive" />
              </span>
              <span><strong>{totalProducts}</strong> olejů · <strong>{activeRetailers}</strong> prodejců · <strong>{regionCount}</strong> regionů · <strong>{brandCount}</strong> značek</span>
            </div>

            <h1 className="font-[family-name:var(--font-display)] text-5xl md:text-[64px] font-normal leading-[1.02] tracking-tight text-text mb-4">
              Zeptej se.<br />
              <em className="text-olive italic">Najdeme tvůj olej.</em>
            </h1>

            <p className="text-[16px] text-text2 font-light leading-relaxed mb-7 max-w-[560px]">
              AI Sommelier prochází celý katalog. Napiš co hledáš — chuť, cenu, příležitost — a dostaneš tři konkrétní oleje s cenou a důvodem proč.
            </p>

            {/* Search input — placeholder krátký, příklady jsou v pills níže.
                Mobile: ikon-only button (40×40), desktop: full "Zeptat se →". */}
            <div className="relative max-w-[640px]">
              <div className="flex gap-2 items-center bg-white border border-off2 rounded-full pl-5 pr-2 py-2 shadow-[0_4px_24px_rgba(0,0,0,0.04)] focus-within:border-olive focus-within:shadow-[0_4px_24px_rgba(45,106,79,0.12)] transition-all">
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && send()}
                  placeholder="Co hledáš?"
                  disabled={loading}
                  className="flex-1 min-w-0 text-[15px] outline-none placeholder:text-text3 bg-transparent py-2"
                />
                <button
                  onClick={() => {
                    if (!input.trim()) {
                      inputRef.current?.focus()
                      return
                    }
                    send()
                  }}
                  disabled={loading}
                  aria-label="Zeptat se"
                  className="bg-olive text-white rounded-full sm:px-5 sm:py-2.5 px-3 py-2.5 text-[14px] font-semibold hover:bg-olive2 transition-colors whitespace-nowrap inline-flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-wait shrink-0"
                >
                  {loading ? '…' : (
                    <>
                      <span className="hidden sm:inline">Zeptat se</span>
                      <ArrowRight size={16} strokeWidth={2.25} />
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
                    className="flex items-center gap-3 bg-black/15 hover:bg-black/25 border border-white/15 rounded-xl p-2.5 transition-colors group"
                  >
                    <div className="text-[12px] font-bold text-white/85 tabular-nums w-4 shrink-0 text-center">
                      {i + 1}
                    </div>
                    {/* Větší foto — obrázky prodávají, portrait aspect 3:4 */}
                    <div className="w-16 h-20 shrink-0 bg-white rounded-lg overflow-hidden">
                      <ProductImage product={p} fallbackSize="text-3xl" sizes="64px" />
                    </div>
                    <div className="flex-1 min-w-0 py-0.5">
                      <div className="text-[13px] font-semibold text-white leading-tight line-clamp-2 group-hover:text-olive4 transition-colors">
                        {p.name}
                      </div>
                      <div className="text-[11px] text-white/85 truncate mt-1">
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
      </div>

      {/* Chat modal — overlay, otevře se po prvním send().
          Předtím se konverzace renderovala inline v hero — rozbíjelo to layout
          stránky. Teď má vlastní okno, podobně jako Sommelier floating chat. */}
      {hasConversation && (
        <div
          className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm flex items-end md:items-center justify-center p-0 md:p-4"
          onClick={reset}
        >
          <div
            className="bg-white w-full md:max-w-[720px] md:rounded-[var(--radius-card)] rounded-t-2xl shadow-2xl flex flex-col max-h-[85vh] md:max-h-[80vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="px-5 py-4 border-b border-off2 flex items-center justify-between sticky top-0 bg-white z-10 rounded-t-[var(--radius-card)]">
              <div>
                <div className="text-[10px] font-bold tracking-widest uppercase text-olive mb-0.5">
                  — AI Sommelier
                </div>
                <h3 className="text-[15px] font-semibold text-text">
                  Náš katalog na míru tvé otázce
                </h3>
              </div>
              <button
                onClick={reset}
                aria-label="Zavřít chat"
                className="text-text3 hover:text-text text-2xl leading-none px-2 transition-colors"
              >
                ×
              </button>
            </div>

            {/* Conversation — scrollable */}
            <div className="flex-1 overflow-y-auto px-5 py-4">
              {messages.map((m, i) => {
                if (m.role === 'user') {
                  return (
                    <div key={i} className="flex justify-end mb-3">
                      <div className="bg-olive text-white rounded-2xl rounded-br-sm px-4 py-2.5 text-[14px] max-w-[85%]">
                        {m.content}
                      </div>
                    </div>
                  )
                }

                // Interleaved render: text bloku → karta produktu → další blok
                const blocks = parseReplyBlocks(m.content)
                return (
                  <div key={i} className="mb-5 space-y-3">
                    {blocks.map((block, bi) => {
                      const product = block.slug ? productLookup[block.slug] : undefined
                      return (
                        <div key={bi}>
                          {/* Text bloku — bez slug linků, s renderovaným bold */}
                          <div className="bg-off rounded-2xl rounded-bl-sm px-4 py-3 text-[14px] text-text leading-relaxed">
                            {block.text.split('\n').map((line, li) => {
                              const trimmed = line.trim()
                              if (trimmed === '') return <div key={li} className="h-2" />
                              return (
                                <p key={li} className="mb-1 last:mb-0">
                                  {renderInlineMarkdown(line)}
                                </p>
                              )
                            })}
                          </div>
                          {/* Karta produktu hned pod jeho textem */}
                          {block.type === 'oil' && product && (
                            <div className="mt-2">
                              <ProductMiniCard product={product} />
                            </div>
                          )}
                        </div>
                      )
                    })}
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
              <div ref={resultsEndRef} />
            </div>

            {/* Footer — input pro pokračování + utility links */}
            <div className="border-t border-off2 px-5 py-3 sticky bottom-0 bg-white rounded-b-[var(--radius-card)]">
              <div className="flex gap-2 items-center bg-off rounded-full pl-4 pr-2 py-1.5 mb-2 focus-within:bg-olive-bg/50 transition-colors">
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && send()}
                  placeholder="Zeptej se na něco dalšího…"
                  disabled={loading}
                  className="flex-1 text-[14px] outline-none placeholder:text-text3 bg-transparent py-1.5"
                />
                <button
                  onClick={() => {
                    if (!input.trim()) {
                      inputRef.current?.focus()
                      return
                    }
                    send()
                  }}
                  disabled={loading}
                  className="bg-olive text-white rounded-full px-4 py-1.5 text-[13px] font-semibold hover:bg-olive2 transition-colors whitespace-nowrap inline-flex items-center gap-1 disabled:opacity-50"
                >
                  {loading ? '…' : (
                    <>
                      Poslat
                      <ArrowRight size={12} strokeWidth={2} />
                    </>
                  )}
                </button>
              </div>
              <div className="flex items-center justify-between text-[11px] text-text3">
                <button onClick={reset} className="hover:text-text">
                  Začít znovu
                </button>
                <Link href="/srovnavac" className="hover:text-text">
                  Procházet celý katalog →
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}

function ProductMiniCard({ product }: { product: ProductWithOffer }) {
  return (
    <Link
      href={`/olej/${product.slug}`}
      className="bg-white border border-off2 rounded-xl p-3 flex gap-3 hover:border-olive-light hover:shadow-md transition-all group"
    >
      <div className="w-16 h-16 shrink-0 bg-white rounded-lg overflow-hidden">
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
