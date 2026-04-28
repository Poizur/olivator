import type { Metadata } from 'next'
import { getProductsWithOffers } from '@/lib/data'
import { QuizWizard } from '@/components/quiz-wizard'

export const metadata: Metadata = {
  title: 'Najdi svůj olej — Quiz | Olivator',
  description: 'Odpověz na 5 otázek a dostaneš 3 olivové oleje šité přesně na míru tvým preferencím.',
  alternates: { canonical: 'https://olivator.cz/quiz' },
}

export default async function QuizPage() {
  const products = await getProductsWithOffers()

  return (
    <div className="max-w-[800px] mx-auto px-6 md:px-10 py-12">
      {/* Header */}
      <div className="text-center mb-10">
        <div className="text-[10px] font-semibold tracking-widest uppercase text-olive mb-3">
          Průvodce výběrem
        </div>
        <h1 className="font-[family-name:var(--font-display)] text-4xl font-normal text-text mb-3 leading-tight">
          Najdi svůj olej
        </h1>
        <p className="text-text2 max-w-[460px] mx-auto text-base">
          5 otázek · 3 doporučení přesně pro tebe
        </p>
      </div>

      <QuizWizard products={products} />
    </div>
  )
}
