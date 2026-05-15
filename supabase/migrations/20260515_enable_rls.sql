-- Enable Row Level Security na všech 57 tabulkách public schématu.
-- service_role vždy bypass RLS (Supabase default) — žádné extra policies.
-- anon key: SELECT jen na skupině A (veřejný obsah webu), zbytek deny all.
--
-- Ověřeno 2026-05-15:
--   - newsletter_signups INSERT: pouze /api/newsletter + supabaseAdmin ✓
--   - affiliate_clicks INSERT: pouze /go/[retailer]/[slug] + supabaseAdmin ✓
--   - wishlists: čistě localStorage, DB tabulka prázdná (Fáze 2) ✓
--   - getSupabaseBrowser() (anon client): definovaný ale nikde nepoužitý ✓

-- ══════════════════════════════════════════════════════════════
-- SKUPINA A — PUBLIC READ (20 tabulek)
-- Veřejný obsah olivator.cz — anon SELECT povolen
-- ══════════════════════════════════════════════════════════════

alter table products              enable row level security;
alter table brands                enable row level security;
alter table retailers             enable row level security;
alter table product_offers        enable row level security;
alter table regions               enable row level security;
alter table cultivars             enable row level security;
alter table product_images        enable row level security;
alter table entity_images         enable row level security;
alter table product_cultivars     enable row level security;
alter table articles              enable row level security;
alter table recipes               enable row level security;
alter table glossary_terms        enable row level security;
alter table general_faqs          enable row level security;
alter table entity_faqs           enable row level security;
alter table recipe_entity_links   enable row level security;
alter table authors               enable row level security;
alter table radar_items           enable row level security;
alter table market_prices         enable row level security;
alter table rankings              enable row level security;
alter table price_history         enable row level security;

create policy "anon_read" on products            for select using (true);
create policy "anon_read" on brands              for select using (true);
create policy "anon_read" on retailers           for select using (true);
create policy "anon_read" on product_offers      for select using (true);
create policy "anon_read" on regions             for select using (true);
create policy "anon_read" on cultivars           for select using (true);
create policy "anon_read" on product_images      for select using (true);
create policy "anon_read" on entity_images       for select using (true);
create policy "anon_read" on product_cultivars   for select using (true);
create policy "anon_read" on articles            for select using (true);
create policy "anon_read" on recipes             for select using (true);
create policy "anon_read" on glossary_terms      for select using (true);
create policy "anon_read" on general_faqs        for select using (true);
create policy "anon_read" on entity_faqs         for select using (true);
create policy "anon_read" on recipe_entity_links for select using (true);
create policy "anon_read" on authors             for select using (true);
create policy "anon_read" on radar_items         for select using (true);
create policy "anon_read" on market_prices       for select using (true);
create policy "anon_read" on rankings            for select using (true);
create policy "anon_read" on price_history       for select using (true);

-- ══════════════════════════════════════════════════════════════
-- SKUPINA B — PRIVATE (37 tabulek)
-- Interní data — anon key deny all, service_role bypass
-- ══════════════════════════════════════════════════════════════

alter table admin_login_attempts  enable row level security;
alter table affiliate_clicks      enable row level security;
alter table agent_decisions       enable row level security;
alter table app_settings          enable row level security;
alter table articles_backup_olik  enable row level security;
alter table audit_runs            enable row level security;
alter table brand_research_drafts enable row level security;
alter table bulk_jobs             enable row level security;
alter table content_calendar      enable row level security;
alter table discovery_candidates  enable row level security;
alter table discovery_sources     enable row level security;
alter table feature_flags         enable row level security;
alter table gsc_keyword_metrics   enable row level security;
alter table keyword_mapping       enable row level security;
alter table manager_reports       enable row level security;
alter table newsletter_drafts     enable row level security;
alter table newsletter_events     enable row level security;
alter table newsletter_facts      enable row level security;
alter table newsletter_sends      enable row level security;
alter table newsletter_signups    enable row level security;
alter table notification_log      enable row level security;
alter table price_alerts          enable row level security;
alter table product_data_audit    enable row level security;
alter table project_learnings     enable row level security;
alter table quality_issues        enable row level security;
alter table quality_rules         enable row level security;
alter table seasonal_emails       enable row level security;
alter table seo_activity_log      enable row level security;
alter table seo_metric_snapshots  enable row level security;
alter table seo_notes             enable row level security;
alter table seo_proposals         enable row level security;
alter table seo_tasks             enable row level security;
alter table strategy_goals        enable row level security;
alter table topic_ideas           enable row level security;
alter table users                 enable row level security;
alter table welcome_series_queue  enable row level security;
alter table wishlists             enable row level security;
