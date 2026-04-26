import { getAllGeneralFAQs } from '@/lib/data'
import { FAQEditor } from './faq-editor'

export const dynamic = 'force-dynamic'

export default async function AdminFAQPage() {
  const faqs = await getAllGeneralFAQs()

  return (
    <div>
      <div className="flex items-start justify-between mb-6 gap-4 flex-wrap">
        <div>
          <h1 className="font-[family-name:var(--font-display)] text-3xl text-text mb-1">
            Obecné FAQ
          </h1>
          <p className="text-sm text-text3 max-w-[640px]">
            Otázky a odpovědi zobrazené plošně na všech produktových stránkách
            v sekci <strong>„Co lidé hledají o olivovém oleji"</strong>. Každý produkt
            ukáže 5 otázek (deterministicky vybraných podle slugu) — měň pořadí
            přes „Pořadí" a deaktivuj přes přepínač.
          </p>
        </div>
      </div>

      {faqs.length === 0 && (
        <div className="bg-terra-bg border border-terra/30 text-terra rounded-lg px-4 py-3 mb-4 text-sm">
          ⚠ Tabulka <code>general_faqs</code> je prázdná nebo neexistuje.
          Spusť SQL migraci v Supabase a klikni na „🌱 Naseedovat 12 výchozích FAQ" níže.
        </div>
      )}

      <FAQEditor initialFAQs={faqs} />
    </div>
  )
}
