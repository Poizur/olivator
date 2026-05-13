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

      {/* Deal cards */}
      {deals.map((deal, i) => {
        const per100ml = deal.volumeMl
          ? Math.round((deal.currentPrice / deal.volumeMl) * 100)
          : null

        return (
          <Section
            key={i}
            style={{
              border: '1px solid #e7e5e4',
              borderRadius: '8px',
              padding: '16px',
              marginBottom: '12px',
            }}
          >
            <table
              width="100%"
              cellPadding={0}
              cellSpacing={0}
              role="presentation"
              style={{ borderCollapse: 'collapse' }}
            >
              <tbody>
                <tr>
                  {/* Foto */}
                  <td valign="top" style={{ width: '80px', paddingRight: '14px' }}>
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
                            <td align="center" valign="middle" style={{ fontSize: '28px' }}>
                              🫒
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    )}
                  </td>

                  {/* Info */}
                  <td valign="top">
                    {/* Brand */}
                    {deal.brandName && (
                      <Text
                        style={{
                          fontSize: '10px',
                          fontWeight: '700',
                          letterSpacing: '0.08em',
                          textTransform: 'uppercase',
                          color: '#78716c',
                          margin: '0',
                          lineHeight: '1.4',
                        }}
                      >
                        {deal.brandName}
                      </Text>
                    )}

                    {/* Name */}
                    <Text
                      style={{
                        fontSize: '14px',
                        fontWeight: '600',
                        color: '#1c1917',
                        margin: '2px 0 0',
                        lineHeight: '1.4',
                      }}
                    >
                      {deal.name}
                    </Text>

                    {/* Variant + Volume */}
                    {(deal.variantInfo || deal.volumeMl) && (
                      <Text
                        style={{
                          fontSize: '12px',
                          color: '#57534e',
                          margin: '2px 0 0',
                          lineHeight: '1.4',
                        }}
                      >
                        {[deal.variantInfo, deal.volumeMl ? `${deal.volumeMl} ml` : null]
                          .filter(Boolean)
                          .join(' · ')}
                      </Text>
                    )}

                    {/* Score badge */}
                    <table
                      cellPadding={0}
                      cellSpacing={0}
                      role="presentation"
                      style={{ marginTop: '6px' }}
                    >
                      <tbody>
                        <tr>
                          <td
                            style={{
                              background: '#d8f3dc',
                              borderRadius: '12px',
                              padding: '2px 8px',
                              fontSize: '11px',
                              fontWeight: '600',
                              color: '#1b4332',
                            }}
                          >
                            Score {deal.score}
                          </td>
                        </tr>
                      </tbody>
                    </table>

                    {/* Cena */}
                    <table
                      cellPadding={0}
                      cellSpacing={0}
                      role="presentation"
                      style={{ marginTop: '8px' }}
                    >
                      <tbody>
                        {deal.oldPrice && !deal.isFallback && (
                          <tr>
                            <td style={{ paddingRight: '8px' }}>
                              <Text
                                style={{
                                  fontSize: '11px',
                                  color: '#a8a29e',
                                  margin: '0',
                                  textDecoration: 'line-through',
                                  lineHeight: '1.3',
                                }}
                              >
                                {deal.oldPrice} Kč
                              </Text>
                            </td>
                            {deal.dropPct && (
                              <td>
                                <Text
                                  style={{
                                    fontSize: '10px',
                                    fontWeight: '700',
                                    color: '#fff',
                                    background: '#c4711a',
                                    padding: '1px 6px',
                                    borderRadius: '10px',
                                    margin: '0',
                                    lineHeight: '1.5',
                                  }}
                                >
                                  -{deal.dropPct}%
                                </Text>
                              </td>
                            )}
                          </tr>
                        )}
                        <tr>
                          <td colSpan={2}>
                            <Text
                              style={{
                                fontSize: '18px',
                                fontWeight: '700',
                                color: '#1c1917',
                                margin: '0',
                                lineHeight: '1.3',
                              }}
                            >
                              {deal.currentPrice} Kč
                            </Text>
                          </td>
                        </tr>
                        {per100ml && (
                          <tr>
                            <td colSpan={2}>
                              <Text
                                style={{
                                  fontSize: '11px',
                                  color: '#a8a29e',
                                  margin: '0',
                                  lineHeight: '1.3',
                                }}
                              >
                                {per100ml} Kč / 100 ml
                              </Text>
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>

                    {/* CTA */}
                    <Link
                      href={`${deal.ctaUrl}?${UTM}&utm_content=deal_${i + 1}`}
                      style={{
                        display: 'inline-block',
                        marginTop: '10px',
                        background: '#2d6a4f',
                        color: '#fff',
                        padding: '6px 16px',
                        borderRadius: '20px',
                        fontSize: '12px',
                        fontWeight: '600',
                        textDecoration: 'none',
                      }}
                    >
                      Koupit u {deal.retailerName} →
                    </Link>
                  </td>
                </tr>
              </tbody>
            </table>
          </Section>
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
          <Text className="text-[14px] font-semibold text-text m-0 mt-2 leading-snug">
            {topPick.brandName ? `${topPick.brandName} — ` : ''}{topPick.name}
          </Text>
          <Text className="text-[13px] text-text2 m-0 mt-1 leading-relaxed">
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
                  href={`${SITE}/${isDealMode ? 'slevy' : 'zebricek/nejlepsi'}?${UTM}&utm_content=${isDealMode ? 'all_deals' : 'zebricek'}`}
                  className="text-[13px] text-olive font-medium"
                >
                  {isDealMode ? '→ Všechny aktuální slevy' : '→ Žebříček nejlepších olejů'}
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
