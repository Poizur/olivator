import { Button, Link, Section, Text } from '@react-email/components'
import { NewsletterLayout } from './_layout'

const SITE = 'https://olivator.cz'
const UTM = 'utm_source=newsletter&utm_medium=email&utm_campaign=welcome_d0'

export interface WelcomeDeal {
  name: string
  score: number
  currentPrice: number
  oldPrice: number | null
  dropPct: number | null
  retailerName: string
  ctaUrl: string
  isFallback: boolean
}

interface Props {
  unsubscribeUrl: string
  deals: WelcomeDeal[]
  topPickIndex: number
  topPickReason: string
}

export function WelcomeD0DealsEmail({
  unsubscribeUrl,
  deals,
  topPickIndex,
  topPickReason,
}: Props) {
  const topPick = deals[topPickIndex] ?? deals[0]

  return (
    <NewsletterLayout
      preheader="Tady jsou aktuální slevy přímo z 18 prodejců"
      unsubscribeUrl={unsubscribeUrl}
    >
      {/* Pozdrav */}
      <Section className="mt-6 mb-5">
        <Text className="text-[22px] font-semibold text-text m-0 leading-tight">
          Vítej v Olivátoru
        </Text>
        <Text className="text-[14px] text-text2 mt-3 m-0 leading-relaxed">
          Olík tady. Měli jsme dohodu — <em>buď první kdo se dozví o slevách</em>.
          Tady jsou.
        </Text>
      </Section>

      {/* Sekce slev */}
      <Section className="mb-2">
        <Text className="text-[11px] font-bold tracking-widest uppercase text-olive m-0">
          🏷 {deals.some(d => !d.isFallback) ? '3 nejlepší slevy právě teď' : 'Olíkovy top tipy právě teď'}
        </Text>
      </Section>

      {deals.map((deal, i) => (
        <Section key={i} className="my-1">
          <table
            width="100%"
            cellPadding={0}
            cellSpacing={0}
            role="presentation"
            style={{ borderCollapse: 'collapse' }}
          >
            <tbody>
              <tr>
                <td
                  valign="top"
                  style={{ padding: '12px 0', borderTop: '1px solid #e8e8ed' }}
                >
                  <Text className="text-[14px] font-medium text-text m-0 leading-tight">
                    {deal.name}
                    {deal.score >= 80 && (
                      <span style={{ color: '#2d6a4f', fontSize: '11px', marginLeft: '6px' }}>
                        Score {deal.score}
                      </span>
                    )}
                  </Text>
                  {!deal.isFallback && deal.dropPct && (
                    <Text className="text-[11px] text-text3 m-0 mt-0.5">
                      Sleva oproti měsíčnímu maximu
                    </Text>
                  )}
                  {deal.isFallback && (
                    <Text className="text-[11px] text-text3 m-0 mt-0.5">
                      Score {deal.score} · Olíkův tip
                    </Text>
                  )}
                </td>
                <td
                  valign="top"
                  align="right"
                  style={{
                    padding: '12px 0',
                    borderTop: '1px solid #e8e8ed',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {deal.oldPrice && !deal.isFallback && (
                    <Text className="text-[11px] text-text3 m-0 leading-tight" style={{ textDecoration: 'line-through' }}>
                      {deal.oldPrice} Kč
                    </Text>
                  )}
                  <Text className="text-[15px] font-bold text-text m-0 leading-tight">
                    {deal.currentPrice} Kč
                  </Text>
                  {deal.dropPct && !deal.isFallback && (
                    <Text className="text-[10px] font-semibold m-0 mt-0.5" style={{ color: '#c4711a' }}>
                      -{deal.dropPct}%
                    </Text>
                  )}
                  <Link
                    href={`${deal.ctaUrl}&${UTM}&utm_content=deal_${i + 1}`}
                    className="text-[11px] text-olive font-medium"
                  >
                    {deal.retailerName} →
                  </Link>
                </td>
              </tr>
            </tbody>
          </table>
        </Section>
      ))}

      {/* Olíkův výběr */}
      <Section
        className="my-5 rounded-xl px-5 py-4"
        style={{ background: '#d8f3dc', border: '1px solid #b7e4c7' }}
      >
        <Text className="text-[11px] font-bold tracking-widest uppercase text-olive m-0">
          🫒 Olíkův výběr
        </Text>
        <Text className="text-[14px] font-semibold text-text m-0 mt-2 leading-snug">
          {topPick.name}
        </Text>
        <Text className="text-[13px] text-text2 m-0 mt-1 leading-relaxed">
          {topPickReason}
        </Text>
        <Link
          href={`${topPick.ctaUrl}&${UTM}&utm_content=top_pick`}
          style={{
            display: 'inline-block',
            marginTop: '12px',
            background: '#2d6a4f',
            color: '#fff',
            padding: '8px 20px',
            borderRadius: '20px',
            fontSize: '13px',
            fontWeight: '600',
            textDecoration: 'none',
          }}
        >
          Koupit u {topPick.retailerName}
        </Link>
      </Section>

      {/* Co dále */}
      <Section className="mt-6 mb-2">
        <Text className="text-[13px] text-text2 m-0 leading-relaxed">
          Tento čtvrtek v 8:00 ti přijde plný týdenní digest — všechny slevy,
          olej týdne, recept od Olíka.
        </Text>
        <Text className="text-[13px] text-text2 mt-3 m-0 leading-relaxed">
          Mezitím:
        </Text>
      </Section>

      <Section className="mb-6">
        <table cellPadding={0} cellSpacing={0} role="presentation">
          <tbody>
            <tr>
              <td style={{ padding: '4px 0' }}>
                <Link
                  href={`${SITE}/slevy?${UTM}&utm_content=all_deals`}
                  className="text-[13px] text-olive font-medium"
                >
                  → Všechny aktuální slevy
                </Link>
              </td>
            </tr>
            <tr>
              <td style={{ padding: '4px 0' }}>
                <Link
                  href={`${SITE}/zebricek/nejlepsi?${UTM}&utm_content=zebricek`}
                  className="text-[13px] text-olive font-medium"
                >
                  → Žebříček nejlepších olejů
                </Link>
              </td>
            </tr>
            <tr>
              <td style={{ padding: '4px 0' }}>
                <Link
                  href={`${SITE}/metodika?${UTM}&utm_content=metodika`}
                  className="text-[13px] text-olive font-medium"
                >
                  → Jak hodnotíme oleje
                </Link>
              </td>
            </tr>
          </tbody>
        </table>
      </Section>

      {/* Podpis */}
      <Section className="mt-4 mb-2">
        <Text className="text-[14px] text-text m-0 leading-relaxed">
          Olík
          <br />
          <span style={{ color: '#6e6e73', fontSize: '12px', fontStyle: 'italic' }}>
            Hlavní degustátor Olivátoru
          </span>
        </Text>
      </Section>
    </NewsletterLayout>
  )
}

export default WelcomeD0DealsEmail
