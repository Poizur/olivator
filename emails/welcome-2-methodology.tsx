import { Button, Section, Text, Hr } from '@react-email/components'
import { NewsletterLayout } from './_layout'

interface Props {
  unsubscribeUrl: string
}

// Texty Level 1 + Level 2 převzaty doslova z SCORE_EXPLANATION_STRATEGY.md

const COMPONENTS = [
  {
    label: 'Kyselost',
    weight: '35 %',
    level1: 'Kyselost ukazuje jak je olej čerstvý. Čím nižší, tím lepší.',
    level2: 'Kyselost měří kolik volných mastných kyselin olej obsahuje. Vzniká když se olivy špatně zpracují nebo když olej dlouho stojí ve špatných podmínkách. Extra panenský olej musí mít kyselost pod 0,8 %. Ty nejlepší mají pod 0,2 % — to je důkaz čerstvosti a precizní výroby.',
  },
  {
    label: 'Certifikace',
    weight: '25 %',
    level1: 'Certifikáty = razítka která potvrzují kvalitu nezávislí kontroloři.',
    level2: 'Certifikáty dávají třetí strany, ne výrobce. Nejdůležitější jsou DOP (Chráněné označení původu — olej z přesné oblasti dle tradičních metod), BIO (bez pesticidů), a NYIOOC (vítězství na světové soutěži v New Yorku). Čím víc certifikátů, tím spolehlivější kvalita.',
  },
  {
    label: 'Polyfenoly',
    weight: '25 %',
    level1: 'Polyfenoly jsou přírodní antioxidanty které dělají olej zdravým. Čím víc, tím lepší.',
    level2: 'Polyfenoly jsou skupina rostlinných látek které dělají olej zároveň zdravým, chuťově bohatým a trvanlivým. Když cítíš v krku to pálení po doušku kvalitního EVOO — to jsou polyfenoly. EU schválila zdravotní tvrzení: olej s 250+ mg/kg polyfenolů chrání tělo před oxidačním stresem. Top oleje mají 400–800 mg/kg.',
  },
  {
    label: 'Cena / kvalita',
    weight: '15 %',
    level1: 'Měříme jestli platíš za chuť a kvalitu, ne za marketing a krásnou láhev.',
    level2: 'Některé oleje mají skvělé Score a stojí 200 Kč. Jiné stejně dobré stojí 800 Kč — rozdíl je v značce, balení a marketingu. Naše hodnota počítá kolik kvality dostaneš za sto korun. Pomáhá ti najít olej s nejlepším poměrem cena/kvalita pro tvůj rozpočet.',
  },
]

export function Welcome2MethodologyEmail({ unsubscribeUrl }: Props) {
  return (
    <NewsletterLayout
      preheader="Olivator Score: 4 složky, žádné tajemství. Tady je jak a proč."
      unsubscribeUrl={unsubscribeUrl}
    >
      <Section className="mt-2 mb-5">
        <Text className="text-[11px] text-olive font-bold tracking-widest uppercase m-0">
          Jak to děláme
        </Text>
        <Text className="text-[22px] font-semibold text-text leading-tight m-0 mt-2">
          Jak vybíráme oleje (a proč nám můžeš věřit)
        </Text>
        <Text className="text-[15px] text-text2 leading-relaxed m-0 mt-3" style={{ fontStyle: 'italic' }}>
          Přihlásil ses. Tady je základ, na kterém stojí každé naše doporučení.
        </Text>
      </Section>

      <Section className="mb-5">
        <Text className="text-[14px] text-text leading-relaxed m-0">
          Olivator Score je číslo 0–100. Vážený průměr 4 složek. 100 = perfektní olej. Pod 50 = slabý.
          Každá složka vychází z ověřitelných dat — ne z dojmů, ne z marketingu výrobce.
        </Text>
      </Section>

      {COMPONENTS.map(({ label, weight, level1, level2 }) => (
        <Section
          key={label}
          className="mb-4 rounded-xl px-5 py-4"
          style={{ background: '#f5f5f7', border: '1px solid #e8e8ed' }}
        >
          <Text className="text-[11px] font-bold tracking-widest uppercase m-0" style={{ color: '#2d6a4f' }}>
            {label} — {weight}
          </Text>
          <Text className="text-[14px] font-semibold text-text m-0 mt-1.5 leading-snug">
            {level1}
          </Text>
          <Text className="text-[13px] m-0 mt-2 leading-relaxed" style={{ color: '#6e6e73' }}>
            {level2}
          </Text>
        </Section>
      ))}

      <Section className="mb-5 mt-2">
        <Text className="text-[14px] text-text leading-relaxed m-0">
          Výrobci nám neplatí za lepší umístění. Nemáme sponzorované pozice. Score je nezávislé —
          proto ho dostaneš rovnou bez příkras.
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
          Celá metodika s vědeckým vysvětlením →
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
