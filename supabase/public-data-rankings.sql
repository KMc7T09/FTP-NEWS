-- Additive state, district and international indicator datasets for Public Reports.
-- Apply after public-reports.sql. No data is seeded or existing table replaced.
begin;

create table if not exists public.public_data_indicators (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  definition text not null default '',
  unit text not null default '',
  category_id uuid references public.public_report_categories(id) on delete set null,
  geography_level text not null default 'state'
    check (geography_level in ('country', 'state', 'district', 'mixed')),
  direction text not null default 'neutral'
    check (direction in ('higher_better', 'lower_better', 'neutral')),
  notes text not null default '',
  is_active boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint public_data_indicators_name_nonempty check (length(btrim(name)) > 0),
  constraint public_data_indicators_slug_format check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$')
);

create table if not exists public.public_data_editions (
  id uuid primary key default gen_random_uuid(),
  indicator_id uuid not null references public.public_data_indicators(id) on delete restrict,
  source_id uuid not null references public.public_report_sources(id) on delete restrict,
  report_id uuid references public.public_reports(id) on delete set null,
  edition_label text not null,
  publication_date date,
  reference_period_start date,
  reference_period_end date,
  source_url text not null default '' check (public.is_valid_https_url(source_url)),
  document_url text not null default '' check (public.is_valid_https_url(document_url)),
  methodology text not null default '',
  scope_notes text not null default '',
  limitations text not null default '',
  verification_status text not null default 'unverified'
    check (verification_status in ('unverified', 'awaiting_verification', 'verified', 'rejected')),
  status text not null default 'draft'
    check (status in ('draft', 'published', 'archived')),
  verified_by uuid references auth.users(id) on delete set null,
  verified_at timestamptz,
  published_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint public_data_editions_label_nonempty check (length(btrim(edition_label)) > 0),
  constraint public_data_editions_period_order check (
    reference_period_start is null or reference_period_end is null or reference_period_start <= reference_period_end
  ),
  constraint public_data_editions_verified_evidence check (
    verification_status <> 'verified' or (
      publication_date is not null and length(btrim(source_url)) > 0
      and length(btrim(methodology)) > 0 and verified_by is not null and verified_at is not null
    )
  ),
  constraint public_data_editions_publish_requires_verified check (
    status <> 'published' or (
      verification_status = 'verified' and publication_date is not null
      and length(btrim(source_url)) > 0 and length(btrim(methodology)) > 0
      and verified_by is not null and verified_at is not null
    )
  )
);

create table if not exists public.public_data_observations (
  id uuid primary key default gen_random_uuid(),
  edition_id uuid not null references public.public_data_editions(id) on delete cascade,
  geography_code text not null,
  geography_name text not null,
  geography_type text not null check (geography_type in ('country', 'state', 'ut', 'district')),
  value numeric,
  value_text text,
  unit text not null default '',
  published_rank integer,
  rank_scope text not null default '',
  is_missing boolean not null default false,
  notes text not null default '',
  source_page text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint public_data_observations_geo_nonempty check (
    length(btrim(geography_code)) > 0 and length(btrim(geography_name)) > 0
  ),
  constraint public_data_observations_rank_positive check (published_rank is null or published_rank > 0),
  constraint public_data_observations_value_present check (
    is_missing or value is not null or length(btrim(coalesce(value_text, ''))) > 0
  ),
  constraint public_data_observations_unique_geography unique (edition_id, geography_code)
);

create index if not exists public_data_indicators_category_idx
  on public.public_data_indicators (category_id, is_active, name);
create index if not exists public_data_editions_indicator_publication_idx
  on public.public_data_editions (indicator_id, publication_date desc);
create index if not exists public_data_editions_source_idx
  on public.public_data_editions (source_id);
create index if not exists public_data_observations_edition_type_idx
  on public.public_data_observations (edition_id, geography_type, geography_name);

create or replace function public.touch_public_data_updated_at()
returns trigger language plpgsql set search_path = public as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create or replace function public.invalidate_public_data_edition()
returns trigger language plpgsql set search_path = public as $$
begin
  new.updated_at := now();
  if tg_op = 'INSERT' then
    new.status := 'draft';
    new.verification_status := 'unverified';
    new.verified_by := null;
    new.verified_at := null;
    new.published_at := null;
    return new;
  end if;
  if row(
    new.indicator_id, new.source_id, new.report_id, new.edition_label,
    new.publication_date, new.reference_period_start, new.reference_period_end,
    new.source_url, new.document_url, new.methodology, new.scope_notes, new.limitations
  ) is distinct from row(
    old.indicator_id, old.source_id, old.report_id, old.edition_label,
    old.publication_date, old.reference_period_start, old.reference_period_end,
    old.source_url, old.document_url, old.methodology, old.scope_notes, old.limitations
  ) then
    new.status := 'draft';
    new.verification_status := 'unverified';
    new.verified_by := null;
    new.verified_at := null;
    new.published_at := null;
  elsif new.status = 'published' then
    new.published_at := coalesce(old.published_at, now());
  elsif new.status <> 'published' then
    new.published_at := null;
  end if;
  return new;
end;
$$;

create or replace function public.invalidate_public_data_on_observation_change()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  target_edition uuid;
begin
  target_edition := case when tg_op = 'DELETE' then old.edition_id else new.edition_id end;
  update public.public_data_editions
  set status = 'draft', verification_status = 'unverified', verified_by = null,
      verified_at = null, published_at = null, updated_at = now()
  where id = target_edition;
  if tg_op = 'UPDATE' and old.edition_id is distinct from new.edition_id then
    update public.public_data_editions
    set status = 'draft', verification_status = 'unverified', verified_by = null,
        verified_at = null, published_at = null, updated_at = now()
    where id = old.edition_id;
  end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

create or replace function public.invalidate_public_data_after_provenance_change()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_table_name = 'public_data_indicators' then
    if row(new.slug, new.name, new.definition, new.unit, new.category_id, new.geography_level, new.direction, new.notes)
       is distinct from
       row(old.slug, old.name, old.definition, old.unit, old.category_id, old.geography_level, old.direction, old.notes) then
      update public.public_data_editions
      set status = 'draft', verification_status = 'unverified', verified_by = null,
          verified_at = null, published_at = null, updated_at = now()
      where indicator_id = new.id;
    end if;
  elsif tg_table_name = 'public_report_sources' then
    if row(new.name, new.website_url, new.organization_type, new.jurisdiction, new.notes)
       is distinct from
       row(old.name, old.website_url, old.organization_type, old.jurisdiction, old.notes) then
      update public.public_data_editions
      set status = 'draft', verification_status = 'unverified', verified_by = null,
          verified_at = null, published_at = null, updated_at = now()
      where source_id = new.id;
    end if;
  end if;
  return new;
end;
$$;

create or replace function public.validate_public_data_observation_geography()
returns trigger language plpgsql set search_path = public as $$
declare
  expected_level text;
begin
  select i.geography_level into expected_level
  from public.public_data_editions e
  join public.public_data_indicators i on i.id = e.indicator_id
  where e.id = new.edition_id;

  if expected_level is null then
    raise exception 'Dataset edition or indicator was not found.' using errcode = '23503';
  end if;
  if expected_level <> 'mixed'
     and not (expected_level = 'state' and new.geography_type = 'ut')
     and new.geography_type <> expected_level then
    raise exception 'Geography type % does not match indicator level %.', new.geography_type, expected_level using errcode = '23514';
  end if;
  return new;
end;
$$;

drop trigger if exists public_data_indicators_touch on public.public_data_indicators;
create trigger public_data_indicators_touch before update on public.public_data_indicators
for each row execute function public.touch_public_data_updated_at();
drop trigger if exists public_data_indicator_invalidate_editions on public.public_data_indicators;
create trigger public_data_indicator_invalidate_editions after update on public.public_data_indicators
for each row execute function public.invalidate_public_data_after_provenance_change();
drop trigger if exists public_data_source_invalidate_editions on public.public_report_sources;
create trigger public_data_source_invalidate_editions after update on public.public_report_sources
for each row execute function public.invalidate_public_data_after_provenance_change();
drop trigger if exists public_data_editions_integrity on public.public_data_editions;
create trigger public_data_editions_integrity before insert or update on public.public_data_editions
for each row execute function public.invalidate_public_data_edition();
drop trigger if exists public_data_observations_touch on public.public_data_observations;
create trigger public_data_observations_touch before update on public.public_data_observations
for each row execute function public.touch_public_data_updated_at();
drop trigger if exists public_data_observations_geography_check on public.public_data_observations;
create trigger public_data_observations_geography_check before insert or update on public.public_data_observations
for each row execute function public.validate_public_data_observation_geography();
drop trigger if exists public_data_observations_invalidate_insert on public.public_data_observations;
create trigger public_data_observations_invalidate_insert after insert on public.public_data_observations
for each row execute function public.invalidate_public_data_on_observation_change();
drop trigger if exists public_data_observations_invalidate_update on public.public_data_observations;
create trigger public_data_observations_invalidate_update after update on public.public_data_observations
for each row execute function public.invalidate_public_data_on_observation_change();
drop trigger if exists public_data_observations_invalidate_delete on public.public_data_observations;
create trigger public_data_observations_invalidate_delete after delete on public.public_data_observations
for each row execute function public.invalidate_public_data_on_observation_change();

alter table public.public_data_indicators enable row level security;
alter table public.public_data_editions enable row level security;
alter table public.public_data_observations enable row level security;

drop policy if exists "public data indicators read published" on public.public_data_indicators;
create policy "public data indicators read published" on public.public_data_indicators
for select to anon, authenticated using (
  public.is_admin() or (is_active and exists (
    select 1 from public.public_data_editions e
    where e.indicator_id = public_data_indicators.id
      and e.status = 'published' and e.verification_status = 'verified'
  ))
);
drop policy if exists "public data indicators admin write" on public.public_data_indicators;
create policy "public data indicators admin write" on public.public_data_indicators
for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "public data editions read published" on public.public_data_editions;
create policy "public data editions read published" on public.public_data_editions
for select to anon, authenticated using (status = 'published' and verification_status = 'verified' or public.is_admin());
drop policy if exists "public data editions admin write" on public.public_data_editions;
create policy "public data editions admin write" on public.public_data_editions
for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "public data observations read published" on public.public_data_observations;
create policy "public data observations read published" on public.public_data_observations
for select to anon, authenticated using (
  public.is_admin() or exists (
    select 1 from public.public_data_editions e
    where e.id = edition_id and e.status = 'published' and e.verification_status = 'verified'
  )
);
drop policy if exists "public data observations admin write" on public.public_data_observations;
create policy "public data observations admin write" on public.public_data_observations
for all to authenticated using (public.is_admin()) with check (public.is_admin());

grant select on public.public_data_indicators, public.public_data_editions, public.public_data_observations to anon, authenticated;
grant insert, update, delete on public.public_data_indicators, public.public_data_editions, public.public_data_observations to authenticated;
grant all on public.public_data_indicators, public.public_data_editions, public.public_data_observations to service_role;

revoke all on function public.touch_public_data_updated_at() from public, anon, authenticated;
revoke all on function public.invalidate_public_data_edition() from public, anon, authenticated;
revoke all on function public.invalidate_public_data_on_observation_change() from public, anon, authenticated;
revoke all on function public.invalidate_public_data_after_provenance_change() from public, anon, authenticated;
revoke all on function public.validate_public_data_observation_geography() from public, anon, authenticated;

commit;
