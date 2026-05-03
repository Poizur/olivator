// Weekly newsletter template — magazine-style layout pro týdenní souhrn.
// Bloky: Hook → Olej týdne → Slevový radar → Premiéra → Recept → Fact

import { Hr, Section, Text } from '@react-email/components'
import { NewsletterLayout } from './_layout'
import {
  DealRow,
  EmailSectionHeader,
  FactBox,
  HeroHook,
  OilCard,
} from './_components'
import type {
  DealData,
  FactData,
  OilCardData,
  RecipeData,
} from '../lib/newsletter-blocks'

interface Props {
  preheader: string
  hook: string
  unsubscribeUrl: string
  blocks: {
    oilOfWeek: OilCardData | null
    deals: DealData[]
    newArrival: OilCardData | null
    recipe: RecipeData | null
    fact: FactData | null
  }
}

export function WeeklyEmail({ preheader, hook, unsubscribeUrl, blocks }: Props) {
  const { oilOfWeek, deals, newArrival, recipe, fact } = blocks

  return (
    <NewsletterLayout preheader={preheader} unsubscribeUrl={unsubscribeUrl}>
      {/* Hook intro */}
      <HeroHook>{hook}</HeroHook>

      {/* Olej týdne */}
      {oilOfWeek && (
        <>
          <EmailSectionHeader
            emoji="🏆"
            title="Olej týdne"
            lead="Náš osobní pick — co bych si tento týden objednal."
          />
          <OilCard
            imageUrl={oilOfWeek.imageUrl}
            name={oilOfWeek.name}
            brandName={oilOfWeek.brandName}
            score={oilOfWeek.score}
            price={oilOfWeek.price}
            oldPrice={oilOfWeek.oldPrice}
            retailerName={oilOfWeek.retailerName}
            ctaUrl={oilOfWeek.ctaUrl}
            reasoning={oilOfWeek.reasoning ?? undefined}
          />
        </>
      )}

      {/* Slevový radar */}
      {deals.length > 0 && (
        <>
          <EmailSectionHeader
            emoji="📉"
            title="Slevový radar"
            lead={`${deals.length} olejů s reálným poklesem ceny — sledujeme od 18 prodejců.`}
          />
          {deals.map((deal, i) => (
            <DealRow
              key={`${deal.productId}-${i}`}
              name={deal.name}
              oldPrice={deal.oldPrice}
              newPrice={deal.newPrice}
              retailerName={deal.retailerName}
              ctaUrl={deal.ctaUrl}
              context={deal.context}
            />
          ))}
        </>
      )}

      {/* Premiéra */}
      {newArrival && (
        <>
          <EmailSectionHeader emoji="🆕" title="Premiéra týdne" />
          <OilCard
            imageUrl={newArrival.imageUrl}
            name={newArrival.name}
            brandName={newArrival.brandName}
            score={newArrival.score}
            price={newArrival.price}
            oldPrice={null}
            retailerName={newArrival.retailerName}
            ctaUrl={newArrival.ctaUrl}
            reasoning={newArrival.reasoning ?? undefined}
          />
        </>
      )}

      {/* Recept */}
      {recipe && (
        <>
          <Hr className="border-off2 my-6" />
          <Section>
            <Text className="text-[11px] text-olive font-bold tracking-widest uppercase m-0">
              🍅 Recept týdne
            </Text>
            <Text className="text-[18px] font-semibold text-text leading-snug m-0 mt-2 mb-2">
              {recipe.title}
            </Text>
            <Text className="text-[13px] text-text2 leading-relaxed m-0 mb-3">
              {recipe.excerpt}
            </Text>
            <a
              href={recipe.url}
              style={{
                display: 'inline-block',
                background: '#f5f5f7',
                color: '#2d6a4f',
                padding: '8px 16px',
                borderRadius: '20px',
                fontSize: '13px',
                fontWeight: 500,
                textDecoration: 'none',
                border: '1px solid #b7e4c7',
              }}
            >
              Otevřít recept →
            </a>
          </Section>

          {/* Paired oil — pokud najdeme produkt z recommended regions/cultivars */}
          {recipe.pairedOil && (
            <Section className="mt-3">
              <Text className="text-[11px] text-olive font-bold tracking-widest uppercase m-0 mb-2">
                Doporučený olej k receptu
              </Text>
              <OilCard
                imageUrl={recipe.pairedOil.imageUrl}
                name={recipe.pairedOil.name}
                brandName={recipe.pairedOil.brandName}
                score={recipe.pairedOil.score}
                price={recipe.pairedOil.price}
                oldPrice={recipe.pairedOil.oldPrice}
                retailerName={recipe.pairedOil.retailerName}
                ctaUrl={recipe.pairedOil.ctaUrl}
                reasoning={recipe.pairedOil.reasoning ?? undefined}
              />
            </Section>
          )}
        </>
      )}

      {/* Edukace */}
      {fact && <FactBox>{fact.body}</FactBox>}

      {/* Pokud nic — gentle apologetic */}
      {!oilOfWeek && deals.length === 0 && !newArrival && (
        <Text className="text-text2 text-[14px] m-0 my-6">
          Tento týden žádné dramatické pohyby na trhu. Příští čtvrtek se zase ozvu — když bude co.
        </Text>
      )}
    </NewsletterLayout>
  )
}

// Default export pro react-email preview / dev server
export default WeeklyEmail
