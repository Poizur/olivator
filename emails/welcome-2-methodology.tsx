import { Button, Section, Text, Hr } from '@react-email/components'
import { NewsletterLayout } from './_layout'

interface Props {
  unsubscribeUrl: string
}

export function Welcome2MethodologyEmail({ unsubscribeUrl }: Props) {
  return (
    <NewsletterLayout
      preheader="Olivator Score — 4 složky, žádné tajemství. Tady je jak to počítáme."
      unsubscribeUrl={unsubscribeUrl}
    >
      <Section className="mt-2 mb-4">
        <Text className="text-[11px] text-olive font-bold tracking-widest uppercase m-0">
          🫒 Jak to děláme
        </Text>
        <Text className="text-[22px] font-semibold text-text leading-tight m-0 mt-2">
          Jak vybíráme oleje (a proč nám můžeš věřit)
        </Text>
        <Text className="text-[15px] text-text2 leading-relaxed m-0 mt-3" style={{ fontStyle: 'italic' }}>
          Před dvěma dny ses přihlásil. Tady je základ, na kterém stojí každé naše doporučení.
        </Text>
      </Section>

      <Section className="mb-4">
        <Text className="text-[14px] text-text leading-relaxed m-0">
          Olivator Score je číslo 0–100. Počítáme ho ze čtyř složek — každá
          má svou váhu a vychází z ověřitelných dat, ne z dojmů.
        </Text>
      </Section>

      <Section
        className="mb-4 rounded-xl px-5 py-4"
        style={{ background: '#d8f3dc', border: '1px solid #b7e4c7' }}
      >
        <Text className="text-[12px] font-bold text-olive m-0 mb-3">4 složky Olivator Score</Text>
        {[
          { label: 'Kyselost', weight: '35 %', note: 'Nižší = lepší. Pod 0,2 % = maximum.' },
          { label: 'Certifikace', weight: '25 %', note: 'DOP + BIO = maximum. Certifikace jsou ověřitelné třetí stranou.' },
          { label: 'Polyfenoly + chemická kvalita', weight: '25 %', note: 'Polyfenoly = zdravotní hodnota + trvanlivost.' },
          { label: 'Cena / kvalita', weight: '15 %', note: 'Kolik Score dostaneš za 100 Kč.' },
        ].map(({ label, weight, note }) => (
          <Section key={label} className="mb-2">
            <Text className="text-[13px] text-text m-0">
              <span style={{ fontWeight: 600 }}>{label}</span>
              {' '}
              <span style={{ color: '#2d6a4f', fontWeight: 700 }}>{weight}</span>
            </Text>
            <Text className="text-[12px] text-text2 m-0 mt-0.5">{note}</Text>
          </Section>
        ))}
      </Section>

      <Section className="mb-5">
        <Text className="text-[14px] text-text leading-relaxed m-0">
          Výrobci nám neplatí za lepší umístění. Nemáme sponzorované pozice.
          Olivator Score stejně jako naše nezávislé — proto ti ho můžeme
          dát rovně bez příkras.
        </Text>
      </Section>

      <Section className="mb-6">
        <Button
          href="https://olivator.cz/metodika"
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
          Přečíst plnou metodiku →
        </Button>
      </Section>

      <Hr style={{ borderColor: '#e8e8ed', margin: '0 0 16px' }} />
      <Text className="text-[12px] text-text3 m-0">
        Příště (za 3 dny): 5 olejů, které si teď zaslouží pozornost —
        výběr z nejvýše hodnocených pod 400 Kč.
      </Text>
    </NewsletterLayout>
  )
}

export default Welcome2MethodologyEmail
