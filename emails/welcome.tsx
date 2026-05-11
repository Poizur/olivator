import { Button, Section, Text } from '@react-email/components'
import { NewsletterLayout } from './_layout'

interface Props {
  unsubscribeUrl: string
  email?: string
}

const SITE_URL = 'https://olivator.cz'

export function WelcomeEmail({ unsubscribeUrl, email: _email }: Props) {
  return (
    <NewsletterLayout
      preheader="Přihlášení potvrzeno — každou středu nejlepší oleje do schránky"
      unsubscribeUrl={unsubscribeUrl}
    >
      <Section className="mt-2 mb-6">
        <Text className="text-[11px] text-olive font-bold tracking-widest uppercase m-0">
          🫒 Vítej v Olivatoru
        </Text>
        <Text className="text-[24px] font-semibold text-text leading-tight m-0 mt-2">
          Přihlášení potvrzeno
        </Text>
        <Text className="text-[15px] text-text2 leading-relaxed m-0 mt-3">
          Každou středu dostaneš Olivový týden — jeden olej týdne, aktuální slevy
          a tipy co s ním uvařit. Žádný spam, odhlásit se dá jedním klikem.
        </Text>
      </Section>

      <Section className="mb-6">
        <Button
          href={`${SITE_URL}/srovnavac`}
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
          Prozkoumat katalog →
        </Button>
      </Section>

      <Section className="mt-4 pt-4" style={{ borderTop: '1px solid #e8e8ed' }}>
        <Text className="text-[12px] text-text3 leading-relaxed m-0">
          Olivator je nezávislý srovnávač. Neplatíme za reklamu,
          neplatíme za recenze — jen reálná data z více než 18 obchodů.
        </Text>
      </Section>
    </NewsletterLayout>
  )
}

export default WelcomeEmail
