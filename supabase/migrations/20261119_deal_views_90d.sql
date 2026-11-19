-- Slevy a poklesy — úprava pravidel (Architekt, 19. 11. 2026)
--
-- confirmed_deals: současná cena smí být nejvýš 90 dní stará (dřív 30). Ostatní beze změny:
--   referenční cena = nejnižší cena za 30 dní před začátkem současné ceny, pokles aspoň 5 %.
-- weekly_price_drops: každý skutečný pokles ceny za posledních 7 dní aspoň o 2 % (informace „cena klesla z X na Y“).
--   Počítá se z jedné ceny za den (poslední záznam dne, Europe/Prague) — dva feedy jednoho obchodu zapisují
--   ráno někdy dvě ceny po sobě (např. Theoni 5 l: 1 490 a hned 1 390); to není pokles.
--   deal_pct je vyplněné jen tehdy, když nabídka zároveň splňuje pravidlo slevy (confirmed_deals) —
--   jen pak smí web použít slovo „sleva“ a odznak s procenty.
-- Sloupce weekly_price_drops: prvních 6 zachováno kvůli zpětné kompatibilitě (create or replace).

create or replace view public.confirmed_deals as
select d.*,
       round((d.reference_price - d.current_price) / d.reference_price * 100) as drop_pct
from public.deal_candidates d
where d.reference_price is not null
  and d.reference_price > d.current_price
  and (d.reference_price - d.current_price) / d.reference_price * 100 >= 5
  -- zlevnění starší než 90 dní je už běžná cena, ne akce
  and d.current_since >= now() - interval '90 days';

create or replace view public.weekly_price_drops as
with daily as (
  select ph.product_id, ph.retailer_id,
         (ph.recorded_at at time zone 'Europe/Prague')::date as day,
         (array_agg(ph.price order by ph.recorded_at desc))[1] as close_price
  from public.price_history ph
  where ph.recorded_at >= now() - interval '60 days'
  group by 1, 2, 3
),
changes as (
  select d.*, lag(d.close_price) over (partition by d.product_id, d.retailer_id order by d.day) as prev_close
  from daily d
),
last_change as (
  select distinct on (product_id, retailer_id) product_id, retailer_id, day, close_price, prev_close
  from changes
  where prev_close is not null and close_price <> prev_close
  order by product_id, retailer_id, day desc
)
select c.product_id,
       c.retailer_id,
       c.current_price,
       lc.prev_close as baseline_price,
       round((lc.prev_close - c.current_price) / lc.prev_close * 100, 1) as drop_pct,
       (lc.day::timestamp at time zone 'Europe/Prague') as current_since,
       cd.drop_pct as deal_pct,
       cd.reference_price as deal_reference_price
from last_change lc
join public.deal_candidates c on c.product_id = lc.product_id and c.retailer_id = lc.retailer_id
left join public.confirmed_deals cd on cd.product_id = lc.product_id and cd.retailer_id = lc.retailer_id
where lc.day >= (now() at time zone 'Europe/Prague')::date - 7
  and lc.close_price = c.current_price
  and lc.prev_close > c.current_price
  and (lc.prev_close - c.current_price) / lc.prev_close * 100 >= 2;

revoke all on public.confirmed_deals, public.weekly_price_drops from anon, authenticated;
grant select on public.confirmed_deals, public.weekly_price_drops to service_role;
