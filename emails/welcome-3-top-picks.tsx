import { Button, Section, Text, Hr, Row, Column, Img } from '@react-email/components'
import { NewsletterLayout } from './_layout'

export interface TopPickProduct {
  slug: string
  name: string
  brandName: string | null
  imageUrl: string | null
  score: number
  acidity: number | null
  polyphenols: number | null
  price: number
  retailerSlug: string
  retailerName: string
  originCountry: string | null
}

interface Props {
  unsubscribeUrl: string
  products: TopPickProduct[]
}

const SITE_URL = 'https://olivator.cz'

export function Welcome3TopPicksEmail({ unsubscribeUrl, products }: Props) {
  return (
    <NewsletterLayout
      preheader="5 olejů s nejvyšším Score pod 400 Kč — naše tipy pro tebe."
      unsubscribeUrl={unsubscribeUrl}
    >
      <Section className="mt-2 mb-4">
        <Text className="text-[11px] text-olive font-bold tracking-widest uppercase m-0">
          🏆 Náš výběr
        </Text>
        <Text className="text-[22px] font-semibold text-text leading-tight m-0 mt-2">
          5 olejů, které si teď zaslouží pozornost
        </Text>
        <Text className="text-[14px] text-text2 leading-relaxed m-0 mt-3">
          Výběr z nejvýše hodnocených olejů pod 400 Kč — seřazeno podle
          Olivator Score.
        </Text>
      </Section>

      {products.map((p, i) => (
        <Section
          key={p.slug}
          className="mb-3 rounded-xl overflow-hidden"
          style={{ border: '1px solid #e8e8ed' }}
        >
          <Row>
            {p.imageUrl && (
              <Column width={80} style={{ padding: '12px 0 12px 12px', verticalAlign: 'top' }}>
                <Img
                  src={p.imageUrl}
                  alt={p.name}
                  width={68}
                  height={80}
                  style={{
                    width: '68px',
                    height: '80px',
                    objectFit: 'contain',
                    borderRadius: '6px',
                    border: '1px solid #e8e8ed',
                    background: '#fff',
                  }}
                />
              </Column>
            )}
            <Column style={{ padding: '12px 12px 12px 8px', verticalAlign: 'top' }}>
              <Text className="text-[10px] text-text3 uppercase tracking-wider m-0">
                #{i + 1} · {p.brandName ?? p.name.split(' ')[0]}
              </Text>
              <Text className="text-[14px] font-semibold text-text m-0 mt-0.5 leading-tight">
                {p.name.length > 50 ? p.name.slice(0, 47) + '…' : p.name}
              </Text>
              <Text className="text-[12px] text-text2 m-0 mt-1">
                <span
                  style={{
                    display: 'inline-block',
                    background: '#c4711a',
                    color: '#fff',
                    fontSize: '11px',
                    fontWeight: 700,
                    padding: '1px 7px',
                    borderRadius: '10px',
                    marginRight: '6px',
                  }}
                >
                  Score {p.score}
                </span>
                {p.acidity != null && `Kyselost ${p.acidity.toFixed(2).replace('.', ',')} %`}
                {p.acidity != null && p.polyphenols != null && ' · '}
                {p.polyphenols != null && `Polyfenoly ${p.polyphenols} mg/kg`}
              </Text>
              <Text className="text-[13px] font-bold text-text m-0 mt-1.5">
                {p.price} Kč
              </Text>
              <Button
                href={`${SITE_URL}/go/${p.retailerSlug}/${p.slug}?utm_source=newsletter&utm_medium=email&utm_content=welcome3`}
                style={{
                  display: 'inline-block',
                  background: '#2d6a4f',
                  color: '#fff',
                  fontSize: '12px',
                  fontWeight: 500,
                  padding: '6px 14px',
                  borderRadius: '16px',
                  textDecoration: 'none',
                  marginTop: '8px',
                }}
              >
                Koupit u {p.retailerName} →
              </Button>
            </Column>
          </Row>
        </Section>
      ))}

      <Hr style={{ borderColor: '#e8e8ed', margin: '16px 0' }} />
      <Section className="mb-4">
        <Button
          href={`${SITE_URL}/srovnavac`}
          style={{
            backgroundColor: '#f5f5f7',
            color: '#2d6a4f',
            border: '1px solid #b7e4c7',
            borderRadius: '12px',
            padding: '10px 20px',
            fontSize: '13px',
            fontWeight: '500',
            textDecoration: 'none',
            display: 'inline-block',
          }}
        >
          Zobrazit celý katalog →
        </Button>
      </Section>
    </NewsletterLayout>
  )
}

export default Welcome3TopPicksEmail
