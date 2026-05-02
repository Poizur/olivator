// Sdílený layout pro všechny newsletter emaily.
// React Email render → HTML s inlined styles (table-based pro Outlook etc).
//
// Použití:
//   <NewsletterLayout
//     preheader="Co je tento týden nového"
//     unsubscribeUrl="https://olivator.cz/api/newsletter/unsubscribe?token=..."
//   >
//     <Section>...obsah...</Section>
//   </NewsletterLayout>

import {
  Body,
  Container,
  Font,
  Head,
  Hr,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Tailwind,
  Text,
} from '@react-email/components'
import type { ReactNode } from 'react'

interface Props {
  preheader: string
  unsubscribeUrl: string
  children: ReactNode
  /** Volitelný site URL pro absolutní odkazy (pro lokální preview default localhost) */
  baseUrl?: string
}

const SITE_URL = 'https://olivator.cz'

export function NewsletterLayout({
  preheader,
  unsubscribeUrl,
  children,
  baseUrl = SITE_URL,
}: Props) {
  return (
    <Html lang="cs">
      <Head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Font
          fontFamily="Inter"
          fallbackFontFamily={['Helvetica', 'Arial', 'sans-serif']}
          webFont={{
            url: 'https://fonts.gstatic.com/s/inter/v18/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIa1ZL7.woff2',
            format: 'woff2',
          }}
          fontWeight={400}
          fontStyle="normal"
        />
      </Head>
      <Preview>{preheader}</Preview>
      <Tailwind
        config={{
          theme: {
            extend: {
              colors: {
                olive: '#2d6a4f',
                'olive-dark': '#1b4332',
                'olive-bg': '#d8f3dc',
                'olive-border': '#b7e4c7',
                terra: '#c4711a',
                'terra-bg': '#fef3c7',
                text: '#1d1d1f',
                text2: '#6e6e73',
                text3: '#aeaeb2',
                off: '#f5f5f7',
                off2: '#e8e8ed',
              },
            },
          },
        }}
      >
        <Body className="bg-off font-sans m-0 p-0">
          <Container className="bg-white max-w-[600px] mx-auto my-6 rounded-2xl overflow-hidden shadow-sm">
            {/* Header — logo + tagline */}
            <Section className="px-8 pt-8 pb-2">
              <Img
                src={`${baseUrl}/logo-wordmark.png`}
                alt="olivátor"
                width={140}
                height={36}
                style={{ width: '140px', height: 'auto' }}
              />
              <Text className="text-text3 text-[12px] m-0 mt-1 leading-tight">
                Největší srovnávač olivových olejů v ČR
              </Text>
            </Section>

            {/* Body content (děti) */}
            <Section className="px-8 py-2">{children}</Section>

            {/* Footer */}
            <Hr className="border-off2 my-6 mx-8" />
            <Section className="px-8 pb-8">
              <Text className="text-text3 text-[11px] leading-relaxed m-0">
                Tento email vám přišel protože jste se přihlásili k odběru
                novinek na <Link href={baseUrl} className="text-olive">
                  olivator.cz
                </Link>.
                <br />
                <Link
                  href={unsubscribeUrl}
                  className="text-text3 underline"
                >
                  Odhlásit odběr
                </Link>{' '}
                ·{' '}
                <Link
                  href={`${baseUrl}/admin/nastaveni`}
                  className="text-text3 underline"
                >
                  Spravovat preference
                </Link>
              </Text>
              <Text className="text-text3 text-[11px] mt-3 m-0">
                © {new Date().getFullYear()} olivátor.cz · Praha, ČR
              </Text>
            </Section>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  )
}
