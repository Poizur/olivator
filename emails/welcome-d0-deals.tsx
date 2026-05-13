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

      {/* Deal cards — compact ~90px */}
      {deals.map((deal, i) => {
        const showVolume = deal.volumeMl !== null && deal.volumeMl <= 1000
        const per100ml = showVolume && deal.volumeMl
          ? Math.round((deal.currentPrice / deal.volumeMl) * 100)
          : null
        const displayName = deal.brandName
          ? `${deal.brandName} — ${deal.name}`
          : deal.name

        return (
          <Section
            key={i}
            style={{
              border: '1px solid #e7e5e4',
              borderRadius: '8px',
              marginBottom: '8px',
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
                  {/* ── Foto 60×60 ── */}
                  <td
                    valign="middle"
                    style={{ width: '60px', padding: '10px 0 10px 12px' }}
                  >
                    {deal.imageUrl ? (
                      <Img
                        src={deal.imageUrl}
                        alt={deal.name}
                        width={60}
                        height={60}
                        style={{
                          width: '60px',
                          height: '60px',
                          objectFit: 'cover',
                          borderRadius: '6px',
                          display: 'block',
                          background: '#f5f5f5',
                        }}
                      />
                    ) : (
                      <table
                        cellPadding={0}
                        cellSpacing={0}
                        role="presentation"
                        style={{ width: '60px', height: '60px', background: '#d8f3dc', borderRadius: '6px' }}
                      >
                        <tbody>
                          <tr>
                            <td align="center" valign="middle" style={{ fontSize: '22px' }}>🫒</td>
                          </tr>
                        </tbody>
                      </table>
                    )}
                  </td>

                  {/* ── Obsah ── */}
                  <td valign="middle" style={{ padding: '10px 12px' }}>

                    {/* Řádek 1: Název + badges */}
                    <table
                      width="100%"
                      cellPadding={0}
                      cellSpacing={0}
                      role="presentation"
                      style={{ borderCollapse: 'collapse' }}
                    >
                      <tbody>
                        <tr>
                          <td>
                            <Text
                              style={{
                                fontSize: '13px',
                                fontWeight: '600',
                                color: '#1c1917',
                                margin: '0',
                                lineHeight: '1.4',
                              }}
                            >
                              {displayName}
                            </Text>
                          </td>
                          <td valign="top" style={{ paddingLeft: '8px', whiteSpace: 'nowrap' }}>
                            <table cellPadding={0} cellSpacing={0} role="presentation">
                              <tbody>
                                <tr>
                                  <td
                                    style={{
                                      background: '#d8f3dc',
                                      borderRadius: '10px',
                                      padding: '2px 7px',
                                      fontSize: '10px',
                                      fontWeight: '600',
                                      color: '#1b4332',
                                    }}
                                  >
                                    {deal.score}
                                  </td>
                                  {deal.dropPct && !deal.isFallback && (
                                    <>
                                      <td style={{ width: '4px' }} />
                                      <td
                                        style={{
                                          background: '#c4711a',
                                          borderRadius: '10px',
                                          padding: '2px 7px',
                                          fontSize: '10px',
                                          fontWeight: '700',
                                          color: '#fff',
                                        }}
                                      >
                                        -{deal.dropPct}%
                                      </td>
                                    </>
                                  )}
                                </tr>
                              </tbody>
                            </table>
                          </td>
                        </tr>
                      </tbody>
                    </table>

                    {/* Řádek 2: Cena + muted + inline CTA */}
                    <table
                      cellPadding={0}
                      cellSpacing={0}
                      role="presentation"
                      style={{ marginTop: '4px' }}
                    >
                      <tbody>
                        <tr>
                          <td valign="baseline" style={{ paddingRight: '6px' }}>
                            <Text
                              style={{
                                fontSize: '15px',
                                fontWeight: '700',
                                color: '#1c1917',
                                margin: '0',
                                lineHeight: '1.2',
                              }}
                            >
                              {deal.currentPrice} Kč
                            </Text>
                          </td>
                          {deal.oldPrice && !deal.isFallback && (
                            <td valign="baseline" style={{ paddingRight: '6px' }}>
                              <Text
                                style={{
                                  fontSize: '11px',
                                  color: '#a8a29e',
                                  textDecoration: 'line-through',
                                  margin: '0',
                                  lineHeight: '1.6',
                                }}
                              >
                                {deal.oldPrice} Kč
                              </Text>
                            </td>
                          )}
                          {per100ml && (
                            <td valign="baseline" style={{ paddingRight: '10px' }}>
                              <Text
                                style={{
                                  fontSize: '11px',
                                  color: '#a8a29e',
                                  margin: '0',
                                  lineHeight: '1.6',
                                }}
                              >
                                {per100ml} Kč/100 ml
                              </Text>
                            </td>
                          )}
                          <td valign="baseline">
                            <Link
                              href={`${deal.ctaUrl}?${UTM}&utm_content=deal_${i + 1}`}
                              style={{
                                color: '#2d6a4f',
                                fontSize: '12px',
                                fontWeight: '600',
                                textDecoration: 'none',
                              }}
                            >
                              {deal.retailerName}&nbsp;→
                            </Link>
                          </td>
                        </tr>
                      </tbody>
                    </table>

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
