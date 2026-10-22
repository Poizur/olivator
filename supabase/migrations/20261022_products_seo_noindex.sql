-- Produkt bez aktivního obchodu a bez zobrazení v GSC (90 dní): noindex + mimo sitemap, dokud nemá nabídku u spolupracujícího obchodu.
ALTER TABLE products ADD COLUMN IF NOT EXISTS seo_noindex BOOLEAN NOT NULL DEFAULT false;
