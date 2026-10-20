-- Permit same-named cities in different states while keeping daily upserts unique.
-- Run in Supabase Dashboard -> SQL Editor before deploying the matching function change.

alter table public.daily_weather_reports
  drop constraint if exists daily_weather_reports_report_date_city_country_key;

create unique index if not exists daily_weather_reports_date_city_state_country_uidx
  on public.daily_weather_reports (report_date, city, state, country);
