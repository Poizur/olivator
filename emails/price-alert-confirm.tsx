import { Button, Section, Text } from '@react-email/components'
import { NewsletterLayout } from './_layout'

interface Props {
  unsubscribeUrl: string
  productName: string
  productUrl: string
  thresholdPrice: number
  currentPrice: number
}

const SITE_URL = 'https://olivator.cz'

export function PriceAlertConfirmEmail({
  unsubscribeUrl,
  productName,
  productUrl,
  thresholdPrice,
  currentPrice,
}: Props) {
  return (
    <NewsletterLayout
      preheader={`Hlídáme cenu — napíšeme až klesne pod ${thresholdPrice} Kč`}
      unsubscribeUrl={unsubscribeUrl}
    >
      <Section className="mt-2 mb-6">
        <Text className="text-[11px] text-olive font-bold tracking-widest uppercase m-0">
          🔔 Cenový alert aktivní
        </Text>
        <Text className="text-[24px] font-semibold text-text leading-tight m-0 mt-2">
          Hlídáme to za tebe
        </Text>
        <Text className="text-[15px] text-text2 leading-relaxed m-0 mt-3">
          Jakmile cena{' '}
          <span style={{ color: '#1d1d1f', fontWeight: 500 }}>{productName}</span>{' '}
          klesne pod{' '}
          <span style={{ color: '#2d6a4f', fontWeight: 600 }}>{thresholdPrice} Kč</span>,
          okamžitě ti napíšeme. Aktuálně stojí {currentPrice} Kč.
        </Text>
      </Section>

      <Section className="mb-6">
        <Button
          href={`${SITE_URL}${productUrl}`}
          style={{
            backgroundColor: '#2d6a4f',
            color: '#ffffff',
            borderRadius: '12px',
            padding: '12px 24px',
            fontSize: '14px',
            fontWeight: '600',
            textDecoration: 'none',
            display: 'inline-block',
          }}
        >
          Zobrazit olej →
        </Button>
      </Section>

      <Section className="mt-4 pt-4" style={{ borderTop: '1px solid #e8e8ed' }}>
        <Text className="text-[12px] text-text3 leading-relaxed m-0">
          Alert je jednorázový — po prvním upozornění se automaticky deaktivuje.
          Ceny kontrolujeme každý den.
        </Text>
      </Section>
    </NewsletterLayout>
  )
}

export default PriceAlertConfirmEmail
