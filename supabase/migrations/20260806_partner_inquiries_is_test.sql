-- partner_inquiries: přidej is_test flag pro filtrování testovacích záznamů z dashboardu.
-- Záznamy s "TEST" v shop_name nebo test@ emailem se automaticky označí.
ALTER TABLE partner_inquiries
  ADD COLUMN IF NOT EXISTS is_test BOOLEAN DEFAULT false;

-- Retroaktivně označit testovací záznamy
UPDATE partner_inquiries
SET is_test = true
WHERE
  shop_name ILIKE '%test%'
  OR email ILIKE 'test@%';
