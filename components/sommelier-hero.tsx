'use client'

import { useState, useRef, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { ProductImage } from './product-image'
import { ScoreBadge } from './score-badge'
import { formatPrice } from '@/lib/utils'
import type { Product, ProductOffer } from '@/lib/types'

type ProductWithOffer = Product & { cheapestOffer: ProductOffer | null }

interface Message {
  role: 'user' | 'assistant'
  content: string
}

interface Props {
  totalProducts: number
  activeRetailers: number
  totalBrands: number
  productLookup: Record<string, ProductWithOffer>
}

const SUGGESTIONS = [
  '🇬🇷 Lehký řecký do 300 Kč',
  '🔬 Co má nejvíc polyfenolů?',
  '🎁 Dárek pro tátu co rád vaří',
  '💚 BIO olej na saláty',
  '🇬🇷 Tradiční řecký na grilování',
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
  const cleaned = text
    .replace(/\[\]\([^)]*\)/g, '')
    .replace(/\(\/olej\/[\w-]+\)/g, '')
    .replace(/\/olej\/[\w-]+/g, '')
    .replace(/\(link\)/g, '')
    .replace(/\s+\.\s*$/g, '.')
    .replace(/\s+,/g, ',')
    .trim()

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
      flush()
      currentType = 'oil'
      currentText.push(line)
    } else if (currentType === 'oil' && line.trim() === '' && currentText.length > 0) {
      currentText.push(line)
    } else if (currentType === 'oil' && /^\*\*/.test(line.trim()) && currentText.length > 0) {
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
  totalBrands,
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
    <section className="relative overflow-hidden border-b border-olive2/30">
      <div aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-br from-[#3B6D11] to-[#27500A]" />
      <div aria-hidden className="absolute text-[300px] opacity-[0.05] -right-12 -top-20 -rotate-[15deg] leading-none select-none pointer-events-none -z-10">🫒</div>

      <div className="px-6 md:px-10 py-5 md:py-6">
        <div className="max-w-[1280px] mx-auto">
          <div className="flex items-center gap-5 mb-4">
            <div className="shrink-0 w-[80px] h-[80px] md:w-[100px] md:h-[100px] relative drop-shadow-xl">
              <Image src="/olik.png" alt="Olík" fill sizes="(min-width: 768px) 100px, 80px" priority className="object-contain" />
            </div>
            <div className="flex-1 min-w-0">
              {/* olik-header: title vlevo, stats napravo */}
              <div className="flex items-baseline justify-between gap-4 flex-wrap mb-3">
                <div>
                  <h1 className="font-[family-name:var(--font-display)] text-[22px] md:text-[26px] font-semibold leading-tight text-white">
                    Olivový olej — <em className="text-olive-bright italic font-semibold">Olík ho najde za 5 sekund</em>
                  </h1>
                  <p className="text-[13px] text-white/85 font-semibold mt-1">
                    AI poradce prochází celý katalog {totalProducts} olejů
                  </p>
                </div>
                {/* Stats + trust signals napravo */}
                <div className="hidden md:flex flex-col items-end gap-1.5 shrink-0">
                  <div className="flex items-center gap-3 text-[12px] text-white/80">
                    <span><strong className="text-white font-semibold">{totalProducts}</strong> olejů</span>
                    <span className="text-white/40">·</span>
                    <span><strong className="text-white font-semibold">{activeRetailers}</strong> prodejců</span>
                    <span className="text-white/40">·</span>
                    <span><strong className="text-white font-semibold">{totalBrands}</strong> značek</span>
                  </div>
                  <div className="flex items-center gap-4 text-[11px] text-white/45">
                    <span className="inline-flex items-center gap-1"><span className="text-olive4">✓</span> Nezávislé hodnocení</span>
                    <span className="inline-flex items-center gap-1"><span className="text-olive4">✓</span> Žádná reklama</span>
                    <span className="inline-flex items-center gap-1"><span className="text-olive4">✓</span> 24h aktualizace</span>
                  </div>
                </div>
              </div>

              {/* Search input */}
              <div className="flex gap-2 items-center bg-white rounded-full pl-5 pr-2 py-1.5 shadow-[0_4px_24px_rgba(0,0,0,0.25)] focus-within:shadow-[0_6px_32px_rgba(0,0,0,0.35)] transition-all">
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && send()}
                  placeholder="Lehký řecký olej do 300 Kč na saláty..."
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
                  aria-label="Zeptat se Olíka"
                  className="bg-olive text-white rounded-full sm:px-5 sm:py-2.5 px-3 py-2.5 text-[14px] font-semibold hover:bg-olive2 transition-colors whitespace-nowrap inline-flex items-center gap-2 disabled:opacity-50 disabled:cursor-wait shrink-0"
                >
                  {loading ? '…' : 'Zeptat se →'}
                </button>
              </div>

              {/* Suggestion chips */}
              {!hasConversation && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      onClick={() => send(s)}
                      disabled={loading}
                      className="text-[12px] font-semibold text-white/90 bg-white/10 hover:bg-white/20 border border-white/20 hover:border-white/40 rounded-full px-3.5 py-1.5 transition-colors"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

        </div>
      </div>

      {/* ── Chat modal — slide-up overlay po prvním send() ── */}
      {hasConversation && (
        <div
          className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm flex items-end md:items-center justify-center p-0 md:p-4"
          onClick={reset}
        >
          <div
            className="bg-white w-full md:max-w-[720px] md:rounded-[var(--radius-card)] rounded-t-2xl shadow-2xl flex flex-col max-h-[85vh] md:max-h-[80vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-4 border-b border-off2 flex items-center justify-between sticky top-0 bg-white z-10 rounded-t-[var(--radius-card)]">
              <div>
                <div className="text-[10px] font-bold tracking-widest uppercase text-olive mb-0.5">— Olík</div>
                <h3 className="text-[15px] font-semibold text-text">Náš katalog na míru tvé otázce</h3>
              </div>
              <button
                onClick={reset}
                aria-label="Zavřít chat"
                className="text-text3 hover:text-text text-2xl leading-none px-2 transition-colors"
              >
                ×
              </button>
            </div>

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

                const blocks = parseReplyBlocks(m.content)
                return (
                  <div key={i} className="mb-5 space-y-3">
                    {blocks.map((block, bi) => {
                      const product = block.slug ? productLookup[block.slug] : undefined
                      return (
                        <div key={bi}>
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

            <div className="border-t border-off2 px-5 py-3 bg-white rounded-b-[var(--radius-card)] shrink-0">
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
                <button onClick={reset} className="hover:text-text">Začít znovu</button>
                <Link href="/srovnavac" className="hover:text-text">Procházet celý katalog →</Link>
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
          <ScoreBadge score={product.olivatorScore} type={product.type} size="small" />
          {product.cheapestOffer && (
            <span className="font-semibold text-text">{formatPrice(product.cheapestOffer.price)}</span>
          )}
        </div>
      </div>
    </Link>
  )
}
