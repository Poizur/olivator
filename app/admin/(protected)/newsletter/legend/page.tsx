// Legend — vysvětlení jak newsletter systém funguje. "Even a child understands."
// Tohle je strategická stránka — vysvětluje WHO co a KDY se děje.

import Link from 'next/link'

export default function NewsletterLegendPage() {
  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto">
      <div className="text-xs text-text3 mb-4">
        <Link href="/admin/newsletter" className="text-olive">Newsletter</Link>
        {' › '}Jak to funguje
      </div>

      <div className="mb-8">
        <h1 className="font-[family-name:var(--font-display)] text-3xl text-text leading-tight">
          Jak newsletter funguje
        </h1>
        <p className="text-[14px] text-text2 mt-2 max-w-[640px] leading-relaxed">
          Vysvětlení v jednoduchém jazyce — co se kdy děje, jaká data sledujeme,
          kde je tvoje kontrola.
        </p>
      </div>

      {/* TL;DR strip */}
      <div className="bg-olive-bg border-l-4 border-olive rounded-r-2xl p-5 mb-8">
        <div className="text-[10px] font-bold tracking-widest uppercase text-olive-dark mb-2">
          Stručně
        </div>
        <p className="text-[14px] text-olive-dark leading-relaxed">
          Systém každý týden automaticky <strong>vytvoří</strong> návrh emailu z reálných dat
          (slevy, novinky, recept). Ty ho <strong>schválíš</strong> (nebo upravíš), klikneš{' '}
          <strong>Odeslat</strong>, a Resend ho pošle všem subscribers podle jejich preferencí.
          Žádný spam, žádné překvapení.
        </p>
      </div>

      {/* Time flow */}
      <Section title="Týdenní cyklus — co se kdy děje" icon="⏰">
        <Timeline
          steps={[
            {
              when: 'Středa 18:00',
              who: '🤖 Cron',
              what: 'Automaticky se vytvoří draft týdenního souhrnu',
              detail:
                'Systém zavolá generator: vyhledá v DB nejlepší olej (Score 80+), top 3-5 slev z price_history, novinku za posledních 14 dnů, rotující recept a fact z knihovny. AI Claude napíše subject + intro hook. Vše se uloží jako draft.',
              outcome: 'Vidíš v /admin/newsletter/drafts s badge "draft"',
            },
            {
              when: 'Středa večer / čtvrtek ráno',
              who: '👤 Ty',
              what: 'Schválíš draft (nebo ho upravíš)',
              detail:
                'Otevřeš draft, vidíš preview, můžeš editovat subject + preheader. Můžeš poslat test do svojí adresy abys viděl jak to vypadá v inboxu. Pak buď klikneš "Schválit" (čeká na cron 8:00) nebo "Odeslat všem teď".',
              outcome: 'Status se změní na "approved" nebo "sending"',
            },
            {
              when: 'Čtvrtek 8:00',
              who: '🤖 Cron',
              what: 'Automaticky odešle všechny "approved" drafty',
              detail:
                'Cron projde všechny drafty se statusem "approved". Pro každý: filter subscribers (jen ti co mají odpovídající preferenci), pošle přes Resend, eviduje per-recipient.',
              outcome: 'Status "sent" + emaily v inboxech',
            },
            {
              when: 'Po odeslání',
              who: '🤖 Resend webhooks',
              what: 'Tracking opens, clicks, bounces',
              detail:
                'Když uživatel otevře email nebo klikne, Resend pošle webhook na /api/webhooks/resend. Aktualizuje newsletter_sends + newsletter_events. V /admin/newsletter/sends vidíš open rate a click rate.',
              outcome: 'Stats jsou ihned vidět v Historii',
            },
          ]}
        />
      </Section>

      {/* Campaign types */}
      <Section title="Typy kampaní — co posíláme" icon="📬">
        <CampaignCard
          icon="📅"
          title="Týdenní souhrn"
          freq="1× týdně, čtvrtek 8:00"
          who="Subscribers s preferencí 'weekly'"
          content="Olej týdne (kurátorský pick) → Slevový radar (3-5 drops) → Premiéra (nový olej) → Recept → Edukační fact"
          why="Hlavní pilíř. Kombinuje hodnotu (slevy, novinky) s důvěryhodností (kurátor, fact)."
        />
        <CampaignCard
          icon="📉"
          title="Slevové kampaně"
          freq="Ad hoc, max 2× týdně"
          who="Subscribers s preferencí 'deals'"
          content="3-5 olejů s drops nad threshold (default 15 %), s reálnou cenovou historií"
          why="Trigger-based. Pošleme jen když máme reálnou hodnotu — ne pravidelně."
        />
        <CampaignCard
          icon="🇬🇷"
          title="Sezónní sklizeň"
          freq="3-4× ročně"
          who="Subscribers s preferencí 'harvest'"
          content="První letošní řecká/italská/španělská sklizeň, novello oleje"
          why="Emoční sezónní moment. Olej z čerstvé sklizně má nejvyšší polyfenoly."
        />
        <CampaignCard
          icon="🔔"
          title="Cenový alert"
          freq="Per-user trigger"
          who="Uživatel co si nastavil alert na konkrétní olej"
          content="Email s aktuální cenou, retailer odkaz, jeden produkt"
          why="Nejvyšší conversion — user sám řekl 'chci koupit, jen čekám na cenu'."
        />
      </Section>

      {/* Data sources */}
      <Section title="Co automaticky sledujeme" icon="🔍">
        <DataItem
          name="Cenové změny"
          source="price_history (každý scrape uloží snapshot)"
          uses="Slevový radar — detekce drops vs 30/90 denní max"
        />
        <DataItem
          name="Nové produkty"
          source="products.created_at (Discovery agent vytvoří nové)"
          uses="Premiéra týdne — produkty < 14 dnů"
        />
        <DataItem
          name="Stock změny"
          source="product_offers.in_stock (denní scrape)"
          uses="'Mizí z trhu' kampaně (zatím nepoužito)"
        />
        <DataItem
          name="Score změny"
          source="products.olivator_score (recalculation)"
          uses="'Olej na vzestupu' (zatím nepoužito)"
        />
        <DataItem
          name="Heureka rating"
          source="retailers.rating (manual update)"
          uses="Trust signal v emailech"
        />
        <DataItem
          name="Receptová knihovna"
          source="ARTICLES (static MD soubory)"
          uses="Recept týdne — rotace podle týdne v roce"
        />
        <DataItem
          name="Educational facts"
          source="newsletter_facts table (admin edituje)"
          uses="'Věděli jste?' blok — least recently used"
        />
      </Section>

      {/* What you control */}
      <Section title="Co máš pod kontrolou" icon="🎛">
        <Control
          area="Schvalování"
          desc="Žádný draft se neodešle bez tvého kliku. Můžeš editovat subject, preheader, případně přepsat HTML před odesláním."
          link="/admin/newsletter/drafts"
        />
        <Control
          area="Knihovna faktů"
          desc="Edituj/přidej/smaž 'Věděli jste?' fakty. Composer je rotuje. Můžeš dočasně vypnout konkrétní fakt místo smazání."
          link="/admin/newsletter/facts"
        />
        <Control
          area="Automatizace"
          desc="Master switch + per-typ toggle. Můžeš změnit den/hodinu odesílání, threshold pro slevové kampaně, zapnout test mode."
          link="/admin/newsletter/settings"
        />
        <Control
          area="Subscribers"
          desc="Vidíš seznam, jejich preference, kde se přihlásili. (Zatím read-only — odhlášení dělá user sám přes link v emailu.)"
          link="/admin/newsletter/subscribers"
        />
        <Control
          area="Historie"
          desc="Po odeslání vidíš per-kampaň: doručeno, opens, clicks, bounces. Benchmark CZ: open 25-35 %, click 3-8 %."
          link="/admin/newsletter/sends"
        />
      </Section>

      {/* Safety nets */}
      <Section title="Pojistky proti chybám" icon="🛡">
        <SafetyItem
          name="Master switch"
          how="newsletter_enabled = false → nic se neděje"
          when="Kdykoliv potřebuješ rychle vypnout (chyba, dovolená)"
        />
        <SafetyItem
          name="Test mode"
          how="newsletter_test_mode = true → všechny emaily jdou jen tobě"
          when="Před spuštěním kampaně, při testování změn"
        />
        <SafetyItem
          name="Manuální schválení"
          how="newsletter_auto_send = false (default) → drafty čekají na tebe"
          when="Vždy. Auto-send je nepovinný feature pro pokročilé."
        />
        <SafetyItem
          name="Rate limit"
          how="Sender čeká 110ms mezi emaily — Resend free limit 10/sec"
          when="Vždy. Pojistka proti rate limit erroru."
        />
        <SafetyItem
          name="One-click unsubscribe"
          how="Token-based link v každém emailu + List-Unsubscribe header"
          when="GDPR + Gmail compliance. User klikne, je hned pryč."
        />
        <SafetyItem
          name="Bounce handling"
          how="Resend webhook označí bounced/complained subscriber jako unsubscribed"
          when="Auto. Brání rozesílání na neexistující emaily."
        />
      </Section>

      {/* CTA */}
      <div className="bg-olive-bg border border-olive-border rounded-2xl p-6 mt-8 text-center">
        <h3 className="text-[16px] font-semibold text-olive-dark mb-2">
          Začni hned: vygeneruj svůj první draft
        </h3>
        <p className="text-[13px] text-olive mb-4 max-w-[480px] mx-auto">
          Klik vytvoří kampaň z aktuálních dat. Můžeš si ji prohlédnout, poslat
          si test do emailu, pak schválit nebo zahodit.
        </p>
        <Link
          href="/admin/newsletter"
          className="inline-block bg-olive text-white rounded-full px-5 py-2 text-[13px] font-medium"
        >
          Zpět na dashboard →
        </Link>
      </div>
    </div>
  )
}

function Section({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) {
  return (
    <section className="mb-8">
      <h2 className="text-[18px] font-semibold text-text mb-4 flex items-center gap-2">
        <span>{icon}</span>
        {title}
      </h2>
      <div className="space-y-3">{children}</div>
    </section>
  )
}

interface TimelineStep {
  when: string
  who: string
  what: string
  detail: string
  outcome: string
}

function Timeline({ steps }: { steps: TimelineStep[] }) {
  return (
    <div className="bg-white border border-off2 rounded-2xl overflow-hidden">
      {steps.map((step, i) => (
        <div key={i} className={`p-5 ${i > 0 ? 'border-t border-off2' : ''}`}>
          <div className="flex items-start gap-4">
            <div className="bg-off rounded-lg px-3 py-1.5 text-[11px] font-mono text-text2 whitespace-nowrap shrink-0">
              {step.when}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[10px] uppercase tracking-widest text-text3 font-medium mb-1">
                {step.who}
              </div>
              <h3 className="text-[14px] font-semibold text-text leading-tight mb-1">
                {step.what}
              </h3>
              <p className="text-[12px] text-text2 leading-relaxed mb-2">{step.detail}</p>
              <div className="text-[11px] text-olive">→ {step.outcome}</div>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

function CampaignCard({
  icon,
  title,
  freq,
  who,
  content,
  why,
}: {
  icon: string
  title: string
  freq: string
  who: string
  content: string
  why: string
}) {
  return (
    <div className="bg-white border border-off2 rounded-xl p-4">
      <div className="flex items-start gap-3">
        <div className="text-2xl">{icon}</div>
        <div className="flex-1">
          <h3 className="text-[14px] font-semibold text-text leading-tight">{title}</h3>
          <div className="text-[11px] text-text3 mt-0.5">
            {freq} · {who}
          </div>
          <p className="text-[12px] text-text2 leading-snug mt-2">
            <strong>Co:</strong> {content}
          </p>
          <p className="text-[12px] text-text2 leading-snug mt-1">
            <strong>Proč:</strong> {why}
          </p>
        </div>
      </div>
    </div>
  )
}

function DataItem({ name, source, uses }: { name: string; source: string; uses: string }) {
  return (
    <div className="bg-white border border-off2 rounded-xl p-3">
      <div className="text-[13px] font-medium text-text">{name}</div>
      <div className="text-[11px] text-text3 mt-0.5">
        <strong>Zdroj:</strong> {source}
      </div>
      <div className="text-[11px] text-text2 mt-0.5">
        <strong>Použití:</strong> {uses}
      </div>
    </div>
  )
}

function Control({ area, desc, link }: { area: string; desc: string; link: string }) {
  return (
    <Link
      href={link}
      className="block bg-white border border-off2 rounded-xl p-4 hover:border-olive transition-colors"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex-1">
          <h3 className="text-[14px] font-medium text-text leading-tight">{area}</h3>
          <p className="text-[12px] text-text2 leading-snug mt-1">{desc}</p>
        </div>
        <span className="text-olive text-[14px] shrink-0">→</span>
      </div>
    </Link>
  )
}

function SafetyItem({ name, how, when }: { name: string; how: string; when: string }) {
  return (
    <div className="bg-white border border-off2 rounded-xl p-3">
      <div className="text-[13px] font-medium text-text">{name}</div>
      <div className="text-[11px] text-text2 mt-1">
        <strong>Jak:</strong> <code className="bg-off rounded px-1">{how}</code>
      </div>
      <div className="text-[11px] text-text3 mt-0.5">
        <strong>Kdy použít:</strong> {when}
      </div>
    </div>
  )
}
