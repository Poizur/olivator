-- Slevy počítané v SQL (ne přes načtení tisíců řádků price_history do Node — PostgREST ořezává na 1 000 řádků).
--
-- deal_candidates: pro každou nabídku skladem u aktivního obchodu na aktivním produktu:
--   current_price  = cena, kterou zákazník zaplatí (action_price, pokud je nižší než price)
--   current_since  = od kdy se tato cena drží (začátek souvislé řady stejné ceny v price_history)
--   reference_price = NEJNIŽŠÍ cena za 30 dní před začátkem současné ceny (ochrana spotřebitele §12a: žádné nafouklé „původní“ ceny)
-- confirmed_deals: pokles current vs reference ≥ 5 % → skutečná sleva
-- action_price_notices: obchod uvádí akční cenu, ale historie ji nepotvrzuje → bez přeškrtnuté ceny, jen informace
-- weekly_price_drops: potvrzené slevy, jejichž současná cena začala v posledních 7 dnech (sekce „Nové poklesy tento týden“)

create or replace view public.deal_candidates as
with cur as (
  select o.product_id, o.retailer_id, o.price as list_price, o.action_price,
         case when o.action_price is not null and o.action_price > 0 and o.action_price < o.price then o.action_price else o.price end as current_price
  from public.product_offers o
  join public.products p on p.id = o.product_id
  join public.retailers r on r.id = o.retailer_id
  where o.in_stock and o.price is not null and p.status = 'active' and r.is_active
),
last_other as (
  select ph.product_id, ph.retailer_id, max(ph.recorded_at) as last_other_at
  from public.price_history ph
  join cur c on c.product_id = ph.product_id and c.retailer_id = ph.retailer_id
  where ph.price <> c.current_price
  group by 1, 2
),
run as (
  select c.*,
         coalesce(
           (select min(ph.recorded_at) from public.price_history ph
             where ph.product_id = c.product_id and ph.retailer_id = c.retailer_id and ph.price = c.current_price
               and (lo.last_other_at is null or ph.recorded_at > lo.last_other_at)),
           now()
         ) as current_since,
         (select min(ph.recorded_at) from public.price_history ph
           where ph.product_id = c.product_id and ph.retailer_id = c.retailer_id) as history_since
  from cur c
  left join last_other lo on lo.product_id = c.product_id and lo.retailer_id = c.retailer_id
)
select r.product_id, r.retailer_id, r.list_price, r.action_price, r.current_price, r.current_since, r.history_since,
       (select min(ph.price) from public.price_history ph
         where ph.product_id = r.product_id and ph.retailer_id = r.retailer_id
           and ph.recorded_at >= r.current_since - interval '30 days' and ph.recorded_at < r.current_since) as reference_price
from run r;

create or replace view public.confirmed_deals as
select d.*,
       round((d.reference_price - d.current_price) / d.reference_price * 100) as drop_pct
from public.deal_candidates d
where d.reference_price is not null
  and d.reference_price > d.current_price
  and (d.reference_price - d.current_price) / d.reference_price * 100 >= 5
  -- sleva starší než 30 dní je běžná cena, ne akce
  and d.current_since >= now() - interval '30 days';

create or replace view public.action_price_notices as
select d.product_id, d.retailer_id, d.list_price, d.action_price, d.current_price, d.current_since, d.history_since
from public.deal_candidates d
where d.action_price is not null and d.action_price > 0 and d.action_price < d.list_price
  and not exists (select 1 from public.confirmed_deals c where c.product_id = d.product_id and c.retailer_id = d.retailer_id);

create or replace view public.weekly_price_drops as
select c.product_id, c.retailer_id, c.current_price, c.reference_price as baseline_price, c.drop_pct, c.current_since
from public.confirmed_deals c
where c.current_since >= now() - interval '7 days';

revoke all on public.deal_candidates, public.confirmed_deals, public.action_price_notices, public.weekly_price_drops from anon, authenticated;
grant select on public.deal_candidates, public.confirmed_deals, public.action_price_notices, public.weekly_price_drops to service_role;
