-- UTM attribution columns for affiliate clicks
-- Needed for newsletter email revenue attribution
ALTER TABLE affiliate_clicks
  ADD COLUMN IF NOT EXISTS utm_source   VARCHAR(100),
  ADD COLUMN IF NOT EXISTS utm_medium   VARCHAR(100),
  ADD COLUMN IF NOT EXISTS utm_campaign VARCHAR(100),
  ADD COLUMN IF NOT EXISTS utm_content  VARCHAR(100);

COMMENT ON COLUMN affiliate_clicks.utm_source   IS 'utm_source param from /go redirect URL (e.g. newsletter)';
COMMENT ON COLUMN affiliate_clicks.utm_medium   IS 'utm_medium param (e.g. email)';
COMMENT ON COLUMN affiliate_clicks.utm_campaign IS 'utm_campaign param (e.g. welcome_d0)';
COMMENT ON COLUMN affiliate_clicks.utm_content  IS 'utm_content param (e.g. deal_1, top_pick)';
