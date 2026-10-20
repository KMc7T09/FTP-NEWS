-- Permit same-named cities in different states while keeping daily upserts unique.
-- Run in Supabase Dashboard -> SQL Editor before deploying the matching function change.

alter table public.daily_weather_reports
  drop constraint if exists daily_weather_reports_report_date_city_country_key;

drop index if exists public.daily_weather_reports_date_city_state_country_uidx;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.daily_weather_reports'::regclass
      and conname = 'daily_weather_reports_date_city_state_country_key'
  ) then
    alter table public.daily_weather_reports
      add constraint daily_weather_reports_date_city_state_country_key
      unique (report_date, city, state, country);
  end if;
end
$$;

notify pgrst, 'reload schema';
