'use client'

import { useState } from 'react'
import Link from 'next/link'
import { QUIZ_QUESTIONS, findRecommendations, type QuizAnswers } from '@/lib/quiz'
import { formatPrice, formatPricePer100ml } from '@/lib/utils'
import type { Product, ProductOffer } from '@/lib/types'
import { ScoreBadge } from './score-badge'

type ProductWithOffer = Product & { cheapestOffer: ProductOffer | null }

interface Props {
  products: ProductWithOffer[]
}

type Phase = 'quiz' | 'results'

export function QuizWizard({ products }: Props) {
  const [phase, setPhase] = useState<Phase>('quiz')
  const [step, setStep] = useState(0)
  const [answers, setAnswers] = useState<QuizAnswers>({})
  const [selected, setSelected] = useState<string | null>(null)

  const question = QUIZ_QUESTIONS[step]
  const isLast = step === QUIZ_QUESTIONS.length - 1
  const progress = ((step) / QUIZ_QUESTIONS.length) * 100

  function handleSelect(value: string) {
    setSelected(value)
  }

  function handleNext() {
    if (!selected) return
    const newAnswers = { ...answers, [question.key]: selected }
    setAnswers(newAnswers)
    setSelected(null)
    if (isLast) {
      setPhase('results')
    } else {
      setStep((s) => s + 1)
    }
  }

  function handleBack() {
    if (step === 0) return
    setStep((s) => s - 1)
    setSelected(answers[QUIZ_QUESTIONS[step - 1].key] ?? null)
    const newAnswers = { ...answers }
    delete newAnswers[question.key]
    setAnswers(newAnswers)
  }

  function handleRestart() {
    setPhase('quiz')
    setStep(0)
    setAnswers({})
    setSelected(null)
  }

  if (phase === 'results') {
    return <QuizResults products={products} answers={answers} onRestart={handleRestart} />
  }

  return (
    <div className="max-w-[600px] mx-auto">
      {/* Progress bar */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-semibold uppercase tracking-widest text-text3">
            Otázka {step + 1} z {QUIZ_QUESTIONS.length}
          </span>
          <span className="text-[11px] text-text3">{Math.round(progress)}% hotovo</span>
        </div>
        <div className="h-1 bg-off2 rounded-full overflow-hidden">
          <div
            className="h-full bg-olive rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Question */}
      <div className="mb-2">
        <h2 className="font-[family-name:var(--font-display)] text-2xl font-normal text-text leading-tight">
          {question.question}
        </h2>
        {question.helpText && (
          <p className="text-sm text-text3 mt-1">{question.helpText}</p>
        )}
      </div>

      {/* Options */}
      <div className="mt-6 space-y-2.5">
        {question.options.map((opt) => {
          const isActive = selected === opt.value
          return (
            <button
              key={opt.value}
              onClick={() => handleSelect(opt.value)}
              className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-[var(--radius-card)] border text-left transition-all ${
                isActive
                  ? 'border-olive bg-olive-bg text-text shadow-sm'
                  : 'border-off2 bg-white text-text2 hover:border-olive/40 hover:bg-off/50'
              }`}
            >
              {opt.emoji && (
                <span className="text-xl shrink-0 w-7 text-center">{opt.emoji}</span>
              )}
              <span className="text-sm font-medium">{opt.label}</span>
              {isActive && (
                <span className="ml-auto text-olive shrink-0">✓</span>
              )}
            </button>
          )
        })}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between mt-8">
        {step > 0 ? (
          <button
            onClick={handleBack}
            className="text-sm text-text3 hover:text-text transition-colors px-3 py-2"
          >
            ← Zpět
          </button>
        ) : (
          <div />
        )}
        <button
          onClick={handleNext}
          disabled={!selected}
          className={`px-6 py-2.5 rounded-full text-sm font-semibold transition-all ${
            selected
              ? 'bg-olive text-white hover:bg-olive2 shadow-sm'
              : 'bg-off2 text-text3 cursor-not-allowed'
          }`}
        >
          {isLast ? 'Zobrazit doporučení →' : 'Další →'}
        </button>
      </div>
    </div>
  )
}

function QuizResults({
  products,
  answers,
  onRestart,
}: {
  products: ProductWithOffer[]
  answers: QuizAnswers
  onRestart: () => void
}) {
  const recommendations = findRecommendations(products, answers)

  if (recommendations.length === 0) {
    return (
      <div className="max-w-[600px] mx-auto text-center py-16">
        <h2 className="font-[family-name:var(--font-display)] text-2xl text-text mb-3">
          Nenašli jsme shodu
        </h2>
        <p className="text-text3 text-sm mb-6">
          Bohužel žádný olej v databázi zatím není ohodnocen — zkus znovu nebo prohlédni celý katalog.
        </p>
        <div className="flex gap-3 justify-center">
          <button onClick={onRestart} className="px-5 py-2 rounded-full text-sm font-semibold bg-olive text-white hover:bg-olive2">
            Zkusit znovu
          </button>
          <Link href="/srovnavac" className="px-5 py-2 rounded-full text-sm font-semibold border border-off2 text-text2 hover:border-olive/40">
            Katalog olejů
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-[640px] mx-auto">
      <div className="text-center mb-10">
        <div className="text-[10px] font-bold tracking-widest uppercase text-olive mb-2">
          — Tvoje doporučení
        </div>
        <h2 className="font-[family-name:var(--font-display)] text-3xl font-normal text-text mb-2">
          Co jsme pro tebe vybrali
        </h2>
        <p className="text-sm text-text3">
          Z {products.filter(p => p.olivatorScore != null && p.olivatorScore > 0).length} olejů v databázi — seřazeno dle shody
        </p>
      </div>

      <div className="space-y-4 mb-10">
        {recommendations.map((rec, i) => {
          const p = rec.product as ProductWithOffer
          const offer = p.cheapestOffer
          return (
            <div
              key={p.id}
              className={`bg-white border rounded-[var(--radius-card)] p-5 ${
                i === 0 ? 'border-olive shadow-sm' : 'border-off2'
              }`}
            >
              {i === 0 && (
                <div className="text-[10px] font-semibold uppercase tracking-widest text-olive mb-3">
                  Nejlepší shoda
                </div>
              )}
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 shrink-0 mt-0.5 bg-off rounded-lg flex items-center justify-center font-[family-name:var(--font-display)] text-2xl italic text-olive/40 leading-none">
                  {p.name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <Link
                      href={`/olej/${p.slug}`}
                      className="font-semibold text-text hover:text-olive text-base leading-tight"
                    >
                      {p.name}
                    </Link>
                    <span className="shrink-0">
                      <ScoreBadge score={p.olivatorScore} type={p.type} size="small" />
                    </span>
                  </div>

                  {/* Důvody shody */}
                  {rec.reasons.length > 0 && (
                    <ul className="mt-2 space-y-1">
                      {rec.reasons.slice(0, 3).map((r, ri) => (
                        <li key={ri} className="flex items-start gap-1.5 text-[12px] text-text2">
                          <span className="text-olive mt-px shrink-0">✓</span>
                          {r}
                        </li>
                      ))}
                    </ul>
                  )}

                  {/* Cena + CTA */}
                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-off">
                    <div>
                      {offer ? (
                        <>
                          <span className="text-sm font-semibold text-text">
                            {formatPrice(offer.price)}
                          </span>
                          {p.volumeMl > 0 && (
                            <span className="text-[11px] text-text3 ml-1.5">
                              · {formatPricePer100ml(offer.price, p.volumeMl)}
                            </span>
                          )}
                          <div className="text-[11px] text-text3 mt-0.5">u {offer.retailer.name}</div>
                        </>
                      ) : (
                        <span className="text-[12px] text-text3">Cena nedostupná</span>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Link
                        href={`/olej/${p.slug}`}
                        className="px-3 py-1.5 text-[12px] font-semibold text-olive border border-olive/30 rounded-full hover:bg-olive-bg transition-colors"
                      >
                        Detail
                      </Link>
                      {offer && (
                        <Link
                          href={`/go/${offer.retailer.slug}/${p.slug}`}
                          className="px-3 py-1.5 text-[12px] font-semibold bg-olive text-white rounded-full hover:bg-olive2 transition-colors"
                          target="_blank"
                        >
                          Koupit
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Footer actions */}
      <div className="flex flex-col sm:flex-row items-center gap-3 pt-6 border-t border-off">
        <button
          onClick={onRestart}
          className="w-full sm:w-auto px-6 py-2.5 rounded-full text-sm font-semibold border border-off2 text-text2 hover:border-olive/40 hover:text-text transition-colors"
        >
          ← Zkusit znovu
        </button>
        <Link
          href="/srovnavac"
          className="w-full sm:w-auto px-6 py-2.5 rounded-full text-sm font-semibold bg-olive text-white hover:bg-olive2 transition-colors text-center"
        >
          Prohlédnout všechny oleje
        </Link>
      </div>
    </div>
  )
}
