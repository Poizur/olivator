'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

const SUGGESTIONS = [
  'Dárek pro tátu co rád vaří',
  'Lehký řecký do 300 Kč',
  'Co má nejvíc polyfenolů?',
  'Doporuč BIO olej na saláty',
]

function formatReply(text: string) {
  // Convert /olej/[slug] to clickable links
  const parts = text.split(/(\/olej\/[\w-]+)/g)
  return parts.map((part, i) => {
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
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open && messages.length === 0) {
      setMessages([
        {
          role: 'assistant',
          content:
            'Ahoj! Jsem AI Sommelier Olivatoru. Poradím ti s výběrem olivového oleje — ať hledáš na saláty, vaření, dárek nebo chceš max polyfenoly. Na co se chceš zeptat?',
        },
      ])
    }
  }, [open, messages.length])

  useEffect(() => {
    if (open) {
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
    }
  }, [messages, open])

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 100)
  }, [open])

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

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="AI Sommelier"
        className="fixed bottom-6 right-6 z-[50] w-14 h-14 rounded-full bg-olive text-white shadow-lg hover:bg-olive2 transition-all flex items-center justify-center text-2xl"
        style={{ boxShadow: '0 4px 20px rgba(45,106,79,0.35)' }}
      >
        {open ? '✕' : '🫒'}
      </button>

      {/* Chat panel */}
      {open && (
        <div
          className="fixed bottom-24 right-6 z-[50] w-[340px] sm:w-[380px] bg-white border border-off2 rounded-2xl shadow-2xl flex flex-col overflow-hidden"
          style={{ maxHeight: 'min(520px, calc(100vh - 120px))' }}
        >
          {/* Header */}
          <div className="px-4 py-3 bg-olive text-white flex items-center gap-2 shrink-0">
            <span className="text-xl">🫒</span>
            <div>
              <div className="text-sm font-semibold">AI Sommelier</div>
              <div className="text-[10px] opacity-70">Poradím s výběrem oleje</div>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
            {messages.map((m, i) => (
              <div
                key={i}
                className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] px-3 py-2 rounded-2xl text-[13px] leading-relaxed ${
                    m.role === 'user'
                      ? 'bg-olive text-white rounded-br-sm'
                      : 'bg-off text-text rounded-bl-sm'
                  }`}
                >
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

            {/* Suggestion chips — only on first message */}
            {messages.length === 1 && !loading && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {SUGGESTIONS.map((s) => (
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

          {/* Input */}
          <div className="px-3 pb-3 pt-2 border-t border-off shrink-0">
            <div className="flex gap-2 items-center">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder="Zeptej se na cokoliv o oleji…"
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
