import { Img, Link, Section, Text } from '@react-email/components'
import { NewsletterLayout } from './_layout'

const SITE = 'https://olivator.cz'
const UTM = 'utm_source=newsletter&utm_medium=email&utm_campaign=welcome_d0'

export interface WelcomeDeal {
  name: string
  brandName: string | null
  variantInfo: string | null
  volumeMl: number | null
  imageUrl: string | null
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
  mode: 'deals' | 'tips'
}

export function WelcomeD0DealsEmail({
  unsubscribeUrl,
  deals,
  topPickIndex,
  topPickReason,
  mode,
}: Props) {
  const topPick = deals[topPickIndex] ?? deals[0]
  const isDealMode = mode === 'deals'

  return (
    <NewsletterLayout
      preheader={
        isDealMode
          ? 'Tady jsou aktuální slevy přímo z 18 prodejců'
          : 'Tři tipy na olivový olej, které stojí za pozornost'
      }
      unsubscribeUrl={unsubscribeUrl}
    >
      {/* Pozdrav */}
      <Section className="mt-6 mb-5">
        <Text className="text-[22px] font-semibold text-text m-0 leading-tight">
          Vítej v Olivátoru
        </Text>
        <Text className="text-[14px] text-text2 mt-3 m-0 leading-relaxed">
          {isDealMode ? (
            <>
              Olík tady. Měli jsme dohodu —{' '}
              <em>buď první kdo se dozví o slevách</em>. Tady jsou.
            </>
          ) : (
            <>
              Olík tady. Aktuálně nemáme slevy nad 15 % — čekáme na příští sezónu
              akcí. Mezitím tady jsou tři tipy, které stojí za tvou pozornost.
            </>
          )}
        </Text>
      </Section>

      {/* Sekce nadpis */}
      <Section className="mb-2">
        <Text className="text-[11px] font-bold tracking-widest uppercase text-olive m-0">
          {isDealMode ? '🏷 3 nejlepší slevy právě teď' : '🫒 3 tipy z katalogu'}
        </Text>
      </Section>

      {/* Deal cards — 3-column: foto | info | cena */}
      {deals.map((deal, i) => {
        const showVolume = deal.volumeMl !== null && deal.volumeMl <= 1000
        const per100ml = showVolume && deal.volumeMl
          ? Math.round((deal.currentPrice / deal.volumeMl) * 100)
          : null
        const variantParts = [
          showVolume ? `${deal.volumeMl} ml` : null,
          deal.variantInfo,
        ].filter(Boolean)
        const fmt = (n: number) =>
          n >= 1000
            ? `${Math.floor(n / 1000)} ${String(n % 1000).padStart(3, '0')}`
            : String(n)

        return (
          <table
            key={i}
            width="100%"
            cellPadding={0}
            cellSpacing={0}
            role="presentation"
            style={{
              border: '1px solid #e7e5e4',
              borderRadius: '8px',
              marginBottom: '12px',
            }}
          >
            <tbody>
              <tr>
                <td style={{ padding: '16px' }}>
                  <table
                    width="100%"
                    cellPadding={0}
                    cellSpacing={0}
                    role="presentation"
                    style={{ borderCollapse: 'collapse' }}
                  >
                    <tbody>
                      <tr>

                        {/* ── Sloupec 1: Foto 80×80 ── */}
                        <td style={{ width: '96px', verticalAlign: 'top' }}>
                          {deal.imageUrl ? (
                            <Img
                              src={deal.imageUrl}
                              alt={deal.name}
                              width={80}
                              height={80}
                              style={{
                                width: '80px',
                                height: '80px',
                                objectFit: 'cover',
                                borderRadius: '6px',
                                display: 'block',
                              }}
                            />
                          ) : (
                            <table
                              cellPadding={0}
                              cellSpacing={0}
                              role="presentation"
                              style={{ width: '80px', height: '80px', background: '#d8f3dc', borderRadius: '6px' }}
                            >
                              <tbody>
                                <tr>
                                  <td align="center" valign="middle" style={{ fontSize: '24px' }}>🫒</td>
                                </tr>
                              </tbody>
                            </table>
                          )}
                        </td>

                        {/* ── Sloupec 2: Info ── */}
                        <td style={{ verticalAlign: 'top', paddingRight: '16px' }}>
                          {deal.brandName && (
                            <Text style={{
                              fontSize: '11px',
                              fontWeight: '500',
                              textTransform: 'uppercase',
                              letterSpacing: '0.05em',
                              color: '#78716c',
                              margin: '0 0 3px',
                              lineHeight: '1.4',
                            }}>
                              {deal.brandName}
                            </Text>
                          )}
                          <Text style={{
                            fontSize: '16px',
                            fontWeight: '600',
                            color: '#1c1917',
                            margin: '0 0 3px',
                            lineHeight: '1.3',
                          }}>
                            {deal.name}
                          </Text>
                          {variantParts.length > 0 && (
                            <Text style={{
                              fontSize: '13px',
                              color: '#57534e',
                              margin: '0 0 8px',
                              lineHeight: '1.4',
                            }}>
                              {variantParts.join(' · ')}
                            </Text>
                          )}
                          {/* Score + drop badges */}
                          <table cellPadding={0} cellSpacing={0} role="presentation">
                            <tbody>
                              <tr>
                                <td style={{
                                  backgroundColor: '#d1fae5',
                                  color: '#047857',
                                  fontSize: '12px',
                                  fontWeight: '600',
                                  padding: '2px 8px',
                                  borderRadius: '4px',
                                }}>
                                  Score {deal.score}
                                </td>
                                {deal.dropPct && !deal.isFallback && (
                                  <>
                                    <td style={{ width: '6px' }} />
                                    <td style={{
                                      backgroundColor: '#c4711a',
                                      color: '#fff',
                                      fontSize: '12px',
                                      fontWeight: '700',
                                      padding: '2px 8px',
                                      borderRadius: '4px',
                                    }}>
                                      -{deal.dropPct}%
                                    </td>
                                  </>
                                )}
                              </tr>
                            </tbody>
                          </table>
                        </td>

                        {/* ── Sloupec 3: Cena + retailer ── */}
                        <td style={{ verticalAlign: 'top', textAlign: 'right', whiteSpace: 'nowrap' }}>
                          {deal.oldPrice && !deal.isFallback && (
                            <Text style={{
                              fontSize: '11px',
                              color: '#a8a29e',
                              textDecoration: 'line-through',
                              margin: '0 0 1px',
                              lineHeight: '1.3',
                            }}>
                              {fmt(deal.oldPrice)} Kč
                            </Text>
                          )}
                          <Text style={{
                            fontSize: '18px',
                            fontWeight: '700',
                            color: '#1c1917',
                            margin: '0 0 2px',
                            lineHeight: '1.2',
                          }}>
                            {fmt(deal.currentPrice)} Kč
                          </Text>
                          <Text style={{
                            fontSize: '12px',
                            color: '#78716c',
                            margin: `0 0 ${per100ml ? '12px' : '22px'}`,
                            lineHeight: '1.4',
                          }}>
                            {per100ml ? `${per100ml} Kč/100 ml` : ' '}
                          </Text>
                          <Link
                            href={`${deal.ctaUrl}?${UTM}&utm_content=deal_${i + 1}`}
                            style={{
                              display: 'block',
                              fontSize: '13px',
                              fontWeight: '500',
                              color: '#059669',
                              textDecoration: 'none',
                            }}
                          >
                            {deal.retailerName} →
                          </Link>
                        </td>

                      </tr>
                    </tbody>
                  </table>
                </td>
              </tr>
            </tbody>
          </table>
        )
      })}

      {/* Olíkův výběr */}
      {topPick && (
        <Section
          className="my-5 rounded-xl px-5 py-4"
          style={{ background: '#d8f3dc', border: '1px solid #b7e4c7' }}
        >
          <Text className="text-[11px] font-bold tracking-widest uppercase text-olive m-0">
            🫒 Olíkův výběr
          </Text>
          <Text className="text-[14px] text-text m-0 mt-2 leading-relaxed">
            {topPickReason}
          </Text>
          <Link
            href={`${topPick.ctaUrl}?${UTM}&utm_content=top_pick`}
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
      )}

      {/* Co dále */}
      <Section className="mt-6 mb-2">
        <Text className="text-[13px] text-text2 m-0 leading-relaxed">
          Tento čtvrtek v 8:00 ti přijde plný týdenní digest — všechny slevy,
          olej týdne, recept od Olíka.
        </Text>
        <Text className="text-[13px] text-text2 mt-3 m-0">Mezitím:</Text>
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
                  href={`${SITE}/zebricek?${UTM}&utm_content=zebricek`}
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
      <Section className="mt-6 mb-2">
        <table cellPadding={0} cellSpacing={0} role="presentation">
          <tbody>
            <tr>
              <td valign="middle">
                <Img
                  src={`${SITE}/olik.png`}
                  alt="Olík — hlavní degustátor"
                  width={48}
                  height={48}
                  style={{ width: '48px', height: '48px', borderRadius: '50%', display: 'block' }}
                />
              </td>
              <td valign="middle" style={{ paddingLeft: '12px' }}>
                <Text style={{ fontSize: '14px', fontWeight: '600', color: '#1c1917', margin: '0', lineHeight: '1.4' }}>
                  Olík
                </Text>
                <Text style={{ fontSize: '13px', color: '#57534e', margin: '0', lineHeight: '1.4' }}>
                  Hlavní degustátor Olivátoru
                </Text>
              </td>
            </tr>
          </tbody>
        </table>
      </Section>
    </NewsletterLayout>
  )
}

export default WelcomeD0DealsEmail
