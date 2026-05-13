-- project_learnings: lekce z newsletter improvement session (květen 2026)

INSERT INTO project_learnings (category, title, description, source, impact)
VALUES
(
  'ux',
  '"Buď první" copy vytváří falešná očekávání — vždy pište timing-honest',
  'Newsletter signup říkal "Buď první kdo se dozví o slevách" ale email dorazil až příští čtvrtek. Uživatel se cítil podveden. Fix: "Hned po přihlášení dostaneš aktuální slevy. Pak každý čtvrtek v 8:00." Konkrétní timing v copy zvyšuje důvěru a snižuje unsubscribes po prvním emailu.',
  'newsletter-improvement:2026-05',
  'high'
),
(
  'email',
  'sendTestEmail vs sendTransactionalEmail — production route musí vždy volat Transactional',
  'Welcome email docházel do produkce se subject prefixem [TEST] protože route.ts volal sendTestEmail() místo sendTransactionalEmail(). Pravidlo: sendTestEmail() jen v scripts/test-*.ts, nikdy v API routes. Při psaní nového emailového handleru první řádek: zkontrolovat import z newsletter-sender.ts.',
  'newsletter-improvement:2026-05',
  'medium'
),
(
  'seo',
  '/slevy jako SEO landing page — živé stats + FAQ schema + newsletter CTA = virální loop',
  'Dedikovaná stránka /slevy se živými stats (počet slev, prům. sleva %), FAQ s FAQPage schema.org, 3dílný edukační blok a newsletter CTA na konci tvoří virální loop: organické SEO → přihlášení k newsletteru → affiliate click z emailu. UTM params z emailových CTA jsou teď uloženy v affiliate_clicks.utm_source/medium/campaign/content — lze tedy přesně atribuovat revenue z emailu.',
  'newsletter-improvement:2026-05',
  'high'
);
