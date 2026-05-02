// Stavební bloky pro newsletter emaily — kompozice z těchto komponent.
// Email-safe (table layouts, inline styles co Tailwind neproinlinuje).

import { Button, Img, Link, Section, Text } from '@react-email/components'
import type { ReactNode } from 'react'

const SITE_URL = 'https://olivator.cz'

// ── Section Header — velký nadpis sekce s ikonou + lead ────────────────────
export function EmailSectionHeader({
  emoji,
  title,
  lead,
}: {
  emoji: string
  title: string
  lead?: string
}) {
  return (
    <Section className="mt-6 mb-3">
      <Text className="text-[11px] text-olive font-bold tracking-widest uppercase m-0">
        {emoji} {title}
      </Text>
      {lead && (
        <Text className="text-[14px] text-text leading-snug m-0 mt-1">
          {lead}
        </Text>
      )}
    </Section>
  )
}

// ── Oil Card — primární CTA blok pro 1 olej (Olej týdne, Premiéra) ─────────
interface OilCardProps {
  imageUrl: string | null
  name: string
  brandName?: string | null
  score: number
  price: number
  oldPrice?: number | null
  retailerName: string
  /** Affiliate URL na /go/[retailer]/[slug] */
  ctaUrl: string
  /** Krátký editorial komentář (1-2 věty) */
  reasoning?: string
  /** UTM block_id pro tracking */
  blockId?: string
  baseUrl?: string
}

export function OilCard({
  imageUrl,
  name,
  brandName,
  score,
  price,
  oldPrice,
  retailerName,
  ctaUrl,
  reasoning,
  baseUrl = SITE_URL,
}: OilCardProps) {
  const hasDiscount = oldPrice && oldPrice > price
  const discountPct = hasDiscount
    ? Math.round(((oldPrice - price) / oldPrice) * 100)
    : 0

  return (
    <Section
      className="rounded-2xl overflow-hidden my-3"
      style={{ border: '1px solid #e8e8ed' }}
    >
      <table width="100%" cellPadding={0} cellSpacing={0} role="presentation" style={{ borderCollapse: 'collapse' }}>
        <tbody>
          <tr>
            {/* Image */}
            <td
              width="140"
              valign="top"
              style={{ padding: '16px 0 16px 16px', verticalAlign: 'top' }}
            >
              {imageUrl ? (
                <Img
                  src={imageUrl}
                  alt={name}
                  width={120}
                  height={140}
                  style={{
                    width: '120px',
                    height: '140px',
                    objectFit: 'contain',
                    borderRadius: '8px',
                    background: '#f5f5f7',
                  }}
                />
              ) : (
                <div
                  style={{
                    width: '120px',
                    height: '140px',
                    borderRadius: '8px',
                    background: '#f5f5f7',
                    display: 'inline-block',
                  }}
                />
              )}
            </td>
            {/* Content */}
            <td valign="top" style={{ padding: '16px', verticalAlign: 'top' }}>
              <table width="100%" cellPadding={0} cellSpacing={0} role="presentation">
                <tbody>
                  <tr>
                    <td>
                      {brandName && (
                        <Text className="text-[11px] text-text3 uppercase tracking-wider m-0 mb-1">
                          {brandName}
                        </Text>
                      )}
                      <Text className="text-[15px] font-semibold text-text leading-tight m-0 mb-2">
                        {name}
                      </Text>

                      {/* Score + cena na řádku */}
                      <table cellPadding={0} cellSpacing={0} role="presentation" style={{ marginBottom: '8px' }}>
                        <tbody>
                          <tr>
                            <td style={{ paddingRight: '8px' }}>
                              <span
                                style={{
                                  display: 'inline-block',
                                  background: '#c4711a',
                                  color: 'white',
                                  fontSize: '12px',
                                  fontWeight: 700,
                                  padding: '2px 8px',
                                  borderRadius: '12px',
                                }}
                              >
                                Score {score}
                              </span>
                            </td>
                            <td>
                              <span style={{ fontSize: '16px', fontWeight: 700, color: '#1d1d1f' }}>
                                {price} Kč
                              </span>
                              {hasDiscount && (
                                <>
                                  {' '}
                                  <span style={{ fontSize: '12px', color: '#aeaeb2', textDecoration: 'line-through' }}>
                                    {oldPrice} Kč
                                  </span>
                                  {' '}
                                  <span style={{ fontSize: '12px', color: '#c4711a', fontWeight: 600 }}>
                                    -{discountPct}%
                                  </span>
                                </>
                              )}
                            </td>
                          </tr>
                        </tbody>
                      </table>

                      {reasoning && (
                        <Text className="text-[13px] text-text2 leading-snug m-0 mb-3">
                          {reasoning}
                        </Text>
                      )}

                      <Button
                        href={ctaUrl}
                        style={{
                          background: '#2d6a4f',
                          color: 'white',
                          padding: '8px 16px',
                          borderRadius: '20px',
                          fontSize: '13px',
                          fontWeight: 500,
                          textDecoration: 'none',
                          display: 'inline-block',
                        }}
                      >
                        Koupit u {retailerName} →
                      </Button>
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
}

// ── Compact deal row — pro slevový radar (3-5 položek pod sebou) ───────────
interface DealRowProps {
  name: string
  oldPrice: number
  newPrice: number
  retailerName: string
  ctaUrl: string
  /** Volitelný kontext: "90denní minimum" / "klesla o 80 Kč za týden" */
  context?: string
}

export function DealRow({
  name,
  oldPrice,
  newPrice,
  retailerName,
  ctaUrl,
  context,
}: DealRowProps) {
  const discountPct = Math.round(((oldPrice - newPrice) / oldPrice) * 100)
  return (
    <Section className="my-2">
      <table width="100%" cellPadding={0} cellSpacing={0} role="presentation" style={{ borderCollapse: 'collapse' }}>
        <tbody>
          <tr>
            <td valign="top" style={{ padding: '12px 0', borderTop: '1px solid #e8e8ed' }}>
              <Text className="text-[14px] font-medium text-text m-0 leading-tight">
                {name}
              </Text>
              {context && (
                <Text className="text-[11px] text-text3 m-0 mt-1">{context}</Text>
              )}
            </td>
            <td valign="top" align="right" style={{ padding: '12px 0', borderTop: '1px solid #e8e8ed', whiteSpace: 'nowrap' }}>
              <Text className="text-[11px] text-text3 line-through m-0 leading-tight">
                {oldPrice} Kč
              </Text>
              <Text className="text-[15px] font-bold text-text m-0 leading-tight">
                {newPrice} Kč
              </Text>
              <Text className="text-[10px] text-terra font-semibold m-0 mt-0.5">
                -{discountPct}%
              </Text>
              <Link
                href={ctaUrl}
                className="text-[11px] text-olive font-medium"
              >
                {retailerName} →
              </Link>
            </td>
          </tr>
        </tbody>
      </table>
    </Section>
  )
}

// ── Edukační box — "Věděli jste?" ──────────────────────────────────────────
export function FactBox({ children }: { children: ReactNode }) {
  return (
    <Section
      className="my-4 rounded-xl px-5 py-4"
      style={{ background: '#d8f3dc', border: '1px solid #b7e4c7' }}
    >
      <Text className="text-[10px] font-bold tracking-widest uppercase text-olive m-0 mb-1">
        💡 Věděli jste?
      </Text>
      <Text className="text-[13px] text-olive-dark leading-relaxed m-0">
        {children}
      </Text>
    </Section>
  )
}

// ── Hook (intro pásek pod logem) ───────────────────────────────────────────
export function HeroHook({
  children,
}: {
  children: ReactNode
}) {
  return (
    <Section className="mt-2 mb-1">
      <Text
        className="text-[20px] text-text leading-tight m-0"
        style={{ fontFamily: 'Georgia, serif', fontStyle: 'italic' }}
      >
        {children}
      </Text>
    </Section>
  )
}
