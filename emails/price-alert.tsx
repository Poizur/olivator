// Price alert email — uživatel sleduje konkrétní olej, cena klesla pod limit.
// Trigger-based (ne periodic). Send přes /api/cron/price-alerts.

import { Section, Text } from '@react-email/components'
import { NewsletterLayout } from './_layout'
import { OilCard } from './_components'

interface Props {
  unsubscribeUrl: string
  productName: string
  imageUrl: string | null
  brandName: string | null
  score: number
  triggeredPrice: number
  thresholdPrice: number
  referencePrice: number | null
  retailerName: string
  ctaUrl: string
}

export function PriceAlertEmail({
  unsubscribeUrl,
  productName,
  imageUrl,
  brandName,
  score,
  triggeredPrice,
  thresholdPrice,
  referencePrice,
  retailerName,
  ctaUrl,
}: Props) {
  const savingsVsRef = referencePrice && referencePrice > triggeredPrice
    ? referencePrice - triggeredPrice
    : null

  return (
    <NewsletterLayout
      preheader={`${productName} klesl na ${triggeredPrice} Kč`}
      unsubscribeUrl={unsubscribeUrl}
    >
      {/* Big alert headline */}
      <Section className="mt-2">
        <Text className="text-[11px] text-terra font-bold tracking-widest uppercase m-0">
          🔔 Cenový alert
        </Text>
        <Text className="text-[24px] font-semibold text-text leading-tight m-0 mt-2">
          Cena právě klesla
        </Text>
        <Text className="text-[14px] text-text2 leading-relaxed m-0 mt-2 mb-4">
          Olej co sleduješ právě stojí {triggeredPrice} Kč —{' '}
          {savingsVsRef
            ? `o ${Math.round(savingsVsRef)} Kč levněji než když jsi alert nastavil(a).`
            : `pod tvůj limit ${thresholdPrice} Kč.`}{' '}
          Posíláme ti to hned, dokud cena platí.
        </Text>
      </Section>

      {/* Olej card s aktuální cenou */}
      <OilCard
        imageUrl={imageUrl}
        name={productName}
        brandName={brandName}
        score={score}
        price={triggeredPrice}
        oldPrice={referencePrice}
        retailerName={retailerName}
        ctaUrl={ctaUrl}
      />

      <Section className="mt-4">
        <Text className="text-[12px] text-text3 leading-relaxed m-0">
          Tento alert byl jednorázový — pošleme ti další jen pokud nastavíš nový.{' '}
          <a href="https://olivator.cz/oblibene" style={{ color: '#2d6a4f' }}>
            Spravovat tvé alerty
          </a>
        </Text>
      </Section>
    </NewsletterLayout>
  )
}

export default PriceAlertEmail
