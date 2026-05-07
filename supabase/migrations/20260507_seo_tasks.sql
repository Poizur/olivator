-- SEO action items, progres-trackovaný v admin /seo dashboardu.
-- Phase 0-7 mapuje na sekce v SEO_STRATEGY.md.
-- Status pending → in_progress → done (skipped pro vyřazené úkoly).

CREATE TABLE IF NOT EXISTS seo_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_key VARCHAR(80) UNIQUE NOT NULL,
  phase INTEGER NOT NULL CHECK (phase BETWEEN 0 AND 7),
  sort_order INTEGER DEFAULT 0,
  title TEXT NOT NULL,
  description TEXT,
  estimated_time VARCHAR(30),
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'done', 'skipped')),
  auto_metric VARCHAR(80),
  notes TEXT,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS seo_tasks_phase_idx ON seo_tasks(phase, sort_order);
CREATE INDEX IF NOT EXISTS seo_tasks_status_idx ON seo_tasks(status);

-- Auto-update updated_at on row change
CREATE OR REPLACE FUNCTION seo_tasks_updated_at_trigger()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS seo_tasks_updated_at ON seo_tasks;
CREATE TRIGGER seo_tasks_updated_at
  BEFORE UPDATE ON seo_tasks
  FOR EACH ROW
  EXECUTE FUNCTION seo_tasks_updated_at_trigger();

-- ── SEED — všechny úkoly z SEO_STRATEGY.md ───────────────────────────────────

INSERT INTO seo_tasks (task_key, phase, sort_order, title, description, estimated_time, auto_metric) VALUES
-- ═══ FÁZE 0 — Quick Wins ═══
('homepage_h1', 0, 1, 'Homepage H1', 'Aktuálně největší nadpis je H2. Přidat hidden nebo viditelný H1: "Olivátor — Nezávislý srovnávač olivových olejů v Česku"', '5 min', 'homepage_has_h1'),
('zebricek_metadata', 0, 2, 'Metadata na /zebricek/[slug]', 'Přidat generateMetadata s názvem žebříčku + description. Sdílené žebříčky budou mít čitelný <title> v SERP.', '15 min', 'zebricek_slug_metadata'),
('sitemap_lastmodified', 0, 3, 'Fix sitemap lastModified', 'Použít product.updated_at, article.published_at místo new Date(). Google neignoruje crawl budget.', '30 min', NULL),
('breadcrumb_entity_pages', 0, 4, 'BreadcrumbList JSON-LD na entity pages', 'Použít existující breadcrumbSchema() z lib/schema.ts na /oblast, /znacka, /odruda.', '30 min', NULL),
('breadcrumb_articles', 0, 5, 'BreadcrumbList JSON-LD na článcích/receptech', 'Přidat breadcrumb schema na /pruvodce/[slug] a /recept/[slug].', '20 min', NULL),
('canonical_zebricek_slug', 0, 6, 'Canonical URL na /zebricek/[slug]', 'Přidat alternates.canonical do generateMetadata.', '5 min', NULL),
('product_schema_long_desc', 0, 7, 'Product schema description = description_long', 'Schema používá descriptionShort → změnit na descriptionLong (Google zvýhodňuje delší description).', '10 min', NULL),

-- ═══ FÁZE 1 — Schema & Discoverability ═══
('itemlist_srovnavac', 1, 1, 'ItemList schema na /srovnavac', 'Přidat ItemList JSON-LD s top 50 produkty. Google vidí, že je to ranking/katalog s konkrétními produkty.', '30 min', NULL),
('itemlist_zebricek', 1, 2, 'ItemList + AggregateOffer na /zebricek/[slug]', 'Žebříček = ranking → ItemList s position 1–N. Eligible pro rich snippets.', '1 h', NULL),
('newsarticle_novinky', 1, 3, 'NewsArticle schema na /novinky/[slug]', 'Přidat NewsArticle JSON-LD (datePublished, dateModified, author, image, articleBody). Eligible pro Google News, Top Stories, Discover.', '30 min', NULL),
('article_image_field', 1, 4, 'Article schema doplnit image pole', 'Schema má headline, datePublished, ale chybí image. Přidat hero image. Předpoklad: hero_image_url v articles tabulce.', '1 h', NULL),
('recipe_schema_extended', 1, 5, 'Recipe schema vylepšit', 'Přidat nutrition, recipeCategory, recipeCuisine, keywords.', '30 min', NULL),
('howto_schema', 1, 6, 'HowTo schema pro how-to články', 'Když article má strukturované kroky → HowTo schema. Eligible pro Google rich results.', '1 h', NULL),
('knowledge_graph_sameas', 1, 7, 'Knowledge Graph entity linking', 'Přidat sameAs do Organization schema (Wikipedia, Wikidata).', '30 min', NULL),

-- ═══ FÁZE 2 — Entity Foundation ═══
('cultivars_content_missing', 2, 1, 'Content pro chybějící cultivary (frantoio, leccino, olivastra)', 'Spustit: scripts/generate-entity-content.ts --only=cultivars. Doplnit profiles do CULTIVAR_PROFILES.', '30 min', 'cultivars_with_content'),
('script_import_entity_photos', 2, 2, 'Vytvořit scripts/import-entity-photos.ts', 'Volat importRegionPhotos(), importBrandPhotos(), importCultivarPhotos() z lib/entity-photos.ts.', '30 min', NULL),
('unsplash_queries_missing', 2, 3, 'Doplnit Unsplash queries pro chybějící entity', 'V lib/entity-photos.ts chybí: alfa (brand), frantoio, leccino, olivastra (cultivary).', '15 min', NULL),
('run_photo_import', 2, 4, 'Spustit import fotek', 'Cíl: 4 regiony × 3 fotky + 6 brandů × 1 + 8 cultivarů × 1 = ~26 fotek.', '5 min běh', 'entity_photos_count'),
('ai_alt_texts', 2, 5, 'AI alt texty pro entity fotky', 'Skript projde fotky bez alt_text, zavolá Claude → custom alt text.', '1 h', NULL),
('audit_draft_brands', 2, 6, 'Audit draft brandů → aktivovat ty s produkty', 'Pro draft brandy s 2+ produkty: content gen + Unsplash + activate. Cíl: 6 → 15+ aktivních.', '3 h', 'active_brands'),
('second_wave_entities', 2, 7, '2nd wave entity (Toskánsko, Andalusie, Picual, Arbequina)', 'Až dorazí produkty z těchto regionů, automaticky vytvořit entity. Čeká na produkty.', 'naplánováno', NULL),

-- ═══ FÁZE 3 — Meta Optimization ═══
('admin_meta_ui', 3, 1, 'Admin UI pro meta_title + meta_description', 'V product-form.tsx přidat 2 fields: meta_title (max 60), meta_description (max 160). Live preview SERP snippet.', '2 h', NULL),
('bulk_meta_titles', 3, 2, 'Bulk meta_title pro produkty', 'Skript backfill-meta-titles.ts. Šablona: ${name} — Score X/100, kyselost Y% | Olivátor. Pro top 50 Claude Haiku napíše unikátní.', '2 h', 'products_without_meta_title'),
('audit_meta_descriptions', 3, 3, 'Audit meta_descriptions pro relevanci', 'Zkontrolovat zda obsahují klíčová slova. Pro 50 nejhodnocenějších produktů → revize.', '3 h', NULL),
('image_alt_audit', 3, 4, 'Image alt_text audit', 'Najít produkty s generickým alt textem. Cíl: alt = ${name} — ${origin_region}, ${origin_country} formát.', '1 h', NULL),
('og_images_check', 3, 5, 'OG images optimalizace', 'Zkontrolovat 1200×630 ratio, fallback default pro produkty bez fotky.', '1 h', NULL),

-- ═══ FÁZE 4 — Topic Authority ═══
('article_jak_cist_etiketu', 4, 1, '[Vzdělávání] Jak číst etiketu olivového oleje', 'Kyselost, polyfenoly, sklizeň, certifikace. 1500+ slov.', '2 dny', NULL),
('article_polyfenoly_kolik', 4, 2, '[Vzdělávání] Polyfenoly: kolik je dost?', 'Aktualizace existujícího článku — rozšířit, přidat scientific sources.', '1 den', NULL),
('article_evoo_vs_virgin', 4, 3, '[Vzdělávání] Extra panenský vs panenský vs rafinovaný', 'Kompletní průvodce, srovnávací tabulka.', '2 dny', NULL),
('article_smazeni', 4, 4, '[Vzdělávání] Olivový olej na smažení — bod zakouření', 'Vědecky podložené, debunk mýtů.', '2 dny', NULL),
('article_zdravi_2026', 4, 5, '[Vzdělávání] Olivový olej a zdraví: co tvrdí věda v 2026', 'Aktualizace ke studiím, středomořská strava.', '2 dny', NULL),
('article_certifikace', 4, 6, '[Vzdělávání] DOP, PGI, BIO: které certifikace skutečně něco znamenají', 'Detailní průvodce, příklady reálných produktů.', '2 dny', NULL),
('article_sklizen', 4, 7, '[Vzdělávání] Sklizeň oliv: early harvest vs late harvest', 'Proč je rozdíl, jak to ovlivňuje kvalitu.', '1 den', NULL),
('article_filtrovany', 4, 8, '[Vzdělávání] Filtrovaný vs nefiltrovaný olivový olej', 'Pros/cons, kdy si vybrat co.', '1 den', NULL),
('article_stredomorska', 4, 9, '[Vzdělávání] Středomořská strava a olivový olej', 'Vědecký kontext, historie, praktické tipy.', '2 dny', NULL),
('article_pro_deti', 4, 10, '[Vzdělávání] Olivový olej pro děti', 'Od kdy, kolik, který — odborná doporučení.', '1 den', NULL),
('article_salat_vs_vareni', 4, 11, '[Srovnání] Olivový olej do salátu vs na vaření', 'Praktický průvodce, doporučení produktů.', '1 den', NULL),
('article_italsky_spanelsky_recky', 4, 12, '[Srovnání] Italský vs španělský vs řecký', 'Co si kdy vybrat, profily chutí, top picks.', '2 dny', NULL),
('article_premium', 4, 13, '[Srovnání] Premium olej (>500 Kč/l) — má smysl?', 'Kdy ano, kdy ne, top recommendations.', '1 den', NULL),
('article_do_200', 4, 14, '[Srovnání] Olivový olej do 200 Kč', 'Nejlepší poměr cena/výkon.', '1 den', NULL),
('article_darek', 4, 15, '[Srovnání] Dárkové balení olivového oleje', 'Pro koho a co — gift guide.', '1 den', NULL),
('article_skladovani', 4, 16, '[Praktické] Jak skladovat olivový olej doma', 'Tipy, mýty, jak prodloužit životnost.', '1 den', NULL),
('article_otevrena_lahev', 4, 17, '[Praktické] Otevřená lahev — jak rychle spotřebovat', 'Praktické tipy, signály zkažení.', '1 den', NULL),
('article_kde_koupit', 4, 18, '[Praktické] Kde koupit kvalitní olivový olej v ČR', 'Průvodce — eshop vs supermarket vs delikatesy.', '1 den', NULL),
('article_falesny_olej', 4, 19, '[Praktické] Falešný olivový olej: jak rozeznat', 'Detection guide, na co si dát pozor.', '1 den', NULL),
('article_degustace', 4, 20, '[Praktické] Degustace olivového oleje doma', 'Návod krok za krokem.', '1 den', NULL),
('recipes_10_new', 4, 21, '10+ nových receptů s product placement', 'Caprese, focaccia, hummus, greek salad, tapenade, aglio e olio, pita, carpaccio, bagna cauda, olive oil cake.', '10 dní', 'recipes_count'),
('rankings_to_db', 4, 22, 'Žebříčky → migrace ze static do DB + dynamické', 'rankings tabulka → admin UI → custom URL slugy. 10 nových žebříčků.', '1-2 týdny', 'rankings_in_db'),
('glossary_section', 4, 23, 'Glossary / wiki sekce /slovnik', 'Krátké definice termínů (kyselost, polyfenoly, oleocanthal, EVOO, DOP, ...). DefinedTerm schema.', '1 týden', NULL),

-- ═══ FÁZE 5 — E-E-A-T Signals ═══
('author_system', 5, 1, 'Autorský systém', 'DB tabulka authors. Stránky /o-projektu/[autor-slug]. Article schema author: Person.', '2 dny', NULL),
('editorial_guidelines', 5, 2, 'Editorial guidelines stránka', 'URL /editorial-policy. Jak vybíráme produkty, transparentnost affiliate.', '4 h', NULL),
('methodology_extended', 5, 3, 'Methodology page rozšíření', 'Detailní vzorec Score, source data list, peer review.', '1 den', NULL),
('article_hero_images', 5, 4, 'Article hero images + AI captions', 'DB articles.hero_image_url. Admin UI drag & drop.', '1 den', NULL),
('cited_sources', 5, 5, 'Cited sources v každém článku', 'Format: "Zdroj: IOC report 2025, USDA database". Schema Article.citation.', 'průběžně', NULL),
('updated_date_visible', 5, 6, 'Updated date visible v UI', '"Aktualizováno DD. MM. YYYY" v hlavičce článku. Schema dateModified už máme.', '1 h', NULL),
('trust_signals_homepage', 5, 7, 'Trust signals na homepage', '"173 produktů, 18 prodejců, aktualizace každých 24h" — konkrétní čísla.', '1 h', NULL),

-- ═══ FÁZE 6 — Backlink & Outreach ═══
('mediakit_page', 6, 1, 'Mediakit /pro-novinare', 'Logo, screenshoty, klíčová čísla, kontakt na PR.', '1 den', NULL),
('resource_page_outreach', 6, 2, 'Resource page outreach', 'Najít blog posty "Nejlepší zdroje o jídle/zdraví v ČR" → požádat o link.', 'ongoing 1h/týden', NULL),
('guest_posts', 6, 3, 'Guest posty 1× měsíčně', 'Food/zdraví/lifestyle blogy. "Jak vybrat olivový olej" pro food, "Polyfenoly" pro health.', '4 h/post', NULL),
('haro_outreach', 6, 4, 'HARO ekvivalenty (Mediafax, ČTK)', 'Nabídnout expertise → mention v článku → link.', 'ongoing', NULL),
('wikipedia_edits', 6, 5, 'Wikipedia editing', 'Edit hesla "Olivový olej", "Středomořská strava" v cz.wikipedia. Reference na zdroje.', '4 h', NULL),

-- ═══ FÁZE 7 — Advanced & Future ═══
('voice_search_optimization', 7, 1, 'Voice search optimization', 'Conversational keywords, FAQ schémata pro otázky typu "Jaký olej je nejlepší pro saláty?"', 'průběžně', NULL),
('sge_preparation', 7, 2, 'Search Generative Experience preparation', 'Klíčové info v prvních 3-5 odstavcích, strukturovaný obsah pro Google AI Overviews.', 'průběžně', NULL),
('localbusiness_schema', 7, 3, 'LocalBusiness schema na entity pages', 'Region pages s geo souřadnicemi (latitude, longitude do regions).', '1 den', NULL),
('multilang_sk', 7, 4, 'Multilang (SK)', 'Hreflang tags cs-CZ ↔ cs-SK. Předpoklad: SK affiliate síť funguje.', '1 týden', NULL),
('core_web_vitals', 7, 5, 'Core Web Vitals optimization', 'LCP <2.5s, CLS <0.1, INP <200ms. PageSpeed Insights, Lighthouse CI.', 'průběžně', NULL),
('gsc_dashboard', 7, 6, 'GSC monitoring dashboard', 'Týdenní review CTR, queries, posunů pozic. GSC API → custom dashboard.', '1 den setup', NULL),
('ab_meta_titles', 7, 7, 'A/B testing meta titles', 'Pro 10 TOP produktů zkusit 2 varianty, sledovat CTR v GSC.', '1 týden setup', NULL)
ON CONFLICT (task_key) DO NOTHING;
