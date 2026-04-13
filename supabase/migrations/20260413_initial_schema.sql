-- Olivator.cz initial schema
-- Run this in Supabase SQL editor after creating the project

-- Products table
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ean VARCHAR(13) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE NOT NULL,
  name_short VARCHAR(100),
  origin_country CHAR(2),
  origin_region VARCHAR(100),
  type VARCHAR(20) CHECK (type IN ('evoo','virgin','refined','olive_oil','pomace')),
  acidity DECIMAL(4,2),
  polyphenols INTEGER,
  peroxide_value DECIMAL(5,2),
  oleic_acid_pct DECIMAL(4,1),
  harvest_year INTEGER,
  best_before DATE,
  processing VARCHAR(50),
  flavor_profile JSONB DEFAULT '{}',
  certifications TEXT[] DEFAULT '{}',
  use_cases TEXT[] DEFAULT '{}',
  volume_ml INTEGER,
  packaging VARCHAR(20),
  olivator_score INTEGER CHECK (olivator_score BETWEEN 0 AND 100),
  score_breakdown JSONB DEFAULT '{}',
  description_short TEXT,
  description_long TEXT,
  meta_title VARCHAR(70),
  meta_description VARCHAR(160),
  status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft','active','inactive')),
  ai_generated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Retailers table
CREATE TABLE retailers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  domain VARCHAR(100),
  affiliate_network VARCHAR(50),
  base_tracking_url TEXT,
  default_commission_pct DECIMAL(4,2),
  is_active BOOLEAN DEFAULT true,
  market CHAR(5) DEFAULT 'CZ',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Product offers (prices at retailers)
CREATE TABLE product_offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  retailer_id UUID REFERENCES retailers(id),
  price DECIMAL(10,2),
  currency CHAR(3) DEFAULT 'CZK',
  in_stock BOOLEAN DEFAULT true,
  product_url TEXT,
  affiliate_url TEXT,
  commission_pct DECIMAL(4,2),
  last_checked TIMESTAMPTZ DEFAULT NOW(),
  last_price_change TIMESTAMPTZ,
  UNIQUE(product_id, retailer_id)
);

-- Price history (for future price history graphs)
CREATE TABLE price_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  retailer_id UUID REFERENCES retailers(id),
  price DECIMAL(10,2),
  in_stock BOOLEAN,
  recorded_at TIMESTAMPTZ DEFAULT NOW()
);

-- Affiliate clicks tracking
CREATE TABLE affiliate_clicks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  click_id VARCHAR(36) UNIQUE DEFAULT gen_random_uuid()::text,
  product_id UUID REFERENCES products(id),
  retailer_id UUID REFERENCES retailers(id),
  session_id VARCHAR(36),
  ip_hash VARCHAR(64),
  market CHAR(5) DEFAULT 'CZ',
  user_agent TEXT,
  referrer TEXT,
  clicked_at TIMESTAMPTZ DEFAULT NOW()
);

-- Product images
CREATE TABLE product_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  alt_text TEXT,
  is_primary BOOLEAN DEFAULT false,
  sort_order INTEGER DEFAULT 0,
  source VARCHAR(50) DEFAULT 'scraper',
  width INTEGER,
  height INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Feature flags
CREATE TABLE feature_flags (
  key VARCHAR(50) PRIMARY KEY,
  enabled BOOLEAN DEFAULT false,
  description TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO feature_flags (key, enabled, description) VALUES
  ('ai_sommelier',  false, 'AI chat — Faze 2'),
  ('wishlist',      false, 'Oblibene — Faze 2'),
  ('user_profiles', false, 'Uzivatelske ucty — Faze 3'),
  ('visual_search', false, 'Vizualni search — Faze 3'),
  ('price_alerts',  false, 'Price alerts — Faze 3'),
  ('ai_search',     true,  'AI natural language search — MVP'),
  ('comparator',    true,  'Porovnavac — MVP'),
  ('quiz',          true,  'Quiz najdi svuj olej — MVP');

-- Users table (empty, ready for Phase 2)
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users,
  email VARCHAR(255),
  display_name VARCHAR(100),
  taste_profile JSONB DEFAULT '{}',
  market CHAR(5) DEFAULT 'CZ',
  newsletter BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Wishlists (empty, ready for Phase 2)
CREATE TABLE wishlists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  added_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, product_id)
);

-- Indexes for common queries
CREATE INDEX idx_products_status ON products(status);
CREATE INDEX idx_products_origin ON products(origin_country);
CREATE INDEX idx_products_type ON products(type);
CREATE INDEX idx_products_score ON products(olivator_score DESC);
CREATE INDEX idx_products_slug ON products(slug);
CREATE INDEX idx_offers_product ON product_offers(product_id);
CREATE INDEX idx_offers_retailer ON product_offers(retailer_id);
CREATE INDEX idx_price_history_product ON price_history(product_id);
CREATE INDEX idx_clicks_product ON affiliate_clicks(product_id);
CREATE INDEX idx_clicks_clicked_at ON affiliate_clicks(clicked_at);

-- Seed initial retailers
INSERT INTO retailers (name, slug, domain, affiliate_network, default_commission_pct, market) VALUES
  ('Rohlík.cz', 'rohlik', 'rohlik.cz', 'Dognet', 4.00, 'CZ'),
  ('Košík.cz', 'kosik', 'kosik.cz', 'Dognet', 3.50, 'CZ'),
  ('Mall.cz', 'mall', 'mall.cz', 'CJ', 5.00, 'CZ'),
  ('Olivio.cz', 'olivio', 'olivio.cz', 'direct', 12.00, 'CZ'),
  ('Zdravasila.cz', 'zdravasila', 'zdravasila.cz', 'Heureka', 8.00, 'CZ'),
  ('iTesco.cz', 'itesco', 'itesco.cz', 'Dognet', 3.00, 'CZ'),
  ('Albert.cz', 'albert', 'albert.cz', 'Dognet', 3.00, 'CZ'),
  ('Kaufland.cz', 'kaufland', 'kaufland.cz', 'Dognet', 3.00, 'CZ'),
  ('Globus.cz', 'globus', 'globus.cz', 'Dognet', 3.00, 'CZ'),
  ('Olivovyolej.cz', 'olivovyolej', 'olivovyolej.cz', 'direct', 15.00, 'CZ'),
  ('Gaea.cz', 'gaea', 'gaea.cz', 'direct', 10.00, 'CZ'),
  ('MujBio.cz', 'mujbio', 'mujbio.cz', 'Heureka', 8.00, 'CZ'),
  ('iHerb.com', 'iherb', 'iherb.com', 'CJ', 5.00, 'CZ');
