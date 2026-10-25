-- Public Reports archive. Additive migration; does not alter existing news or weather tables.
begin;

create table if not exists public.public_report_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text not null default '',
  is_active boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint public_report_categories_name_nonempty check (length(btrim(name)) > 0)
);

create table if not exists public.public_report_sources (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  website_url text not null default '',
  organization_type text not null default '',
  jurisdiction text not null default '',
  notes text not null default '',
  is_active boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint public_report_sources_name_nonempty check (length(btrim(name)) > 0)
);

create table if not exists public.public_reports (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null unique,
  summary text not null default '',
  body text not null default '',
  category_id uuid references public.public_report_categories(id) on delete restrict,
  source_id uuid references public.public_report_sources(id) on delete restrict,
  source_url text not null default '',
  document_url text not null default '',
  publication_date date,
  publication_year smallint generated always as (extract(year from publication_date)::smallint) stored,
  reference_year smallint,
  methodology text not null default '',
  scope_notes text not null default '',
  limitations text not null default '',
  verification_status text not null default 'unverified'
    check (verification_status in ('unverified', 'awaiting_verification', 'verified', 'rejected')),
  status text not null default 'draft'
    check (status in ('draft', 'published', 'archived')),
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  verified_by uuid references auth.users(id) on delete set null,
  verified_at timestamptz,
  published_at timestamptz,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint public_reports_title_nonempty check (length(btrim(title)) > 0),
  constraint public_reports_slug_format check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  constraint public_reports_reference_year_valid check (reference_year is null or reference_year between 1000 and 9999),
  constraint public_reports_verified_requires_evidence check (
    verification_status <> 'verified' or (
      category_id is not null
      and source_id is not null
      and length(btrim(source_url)) > 0
      and publication_date is not null
      and length(btrim(summary)) > 0
      and length(btrim(body)) > 0
      and length(btrim(methodology)) > 0
      and verified_by is not null
      and verified_at is not null
    )
  ),
  constraint public_reports_publish_requires_verification check (
    status <> 'published' or (
      verification_status = 'verified'
      and category_id is not null
      and source_id is not null
      and length(btrim(source_url)) > 0
      and publication_date is not null
      and length(btrim(summary)) > 0
      and length(btrim(body)) > 0
      and length(btrim(methodology)) > 0
      and verified_by is not null
      and verified_at is not null
    )
  )
);

-- Additive upgrade for installations that created the original report table earlier.
alter table public.public_reports
  add column if not exists reference_period text not null default '';

create index if not exists public_reports_published_date_idx
  on public.public_reports (published_at desc) where status = 'published';
create index if not exists public_reports_category_status_idx
  on public.public_reports (category_id, status, publication_date desc);
create index if not exists public_reports_source_idx
  on public.public_reports (source_id);
create index if not exists public_report_categories_active_name_idx
  on public.public_report_categories (is_active, name);
create index if not exists public_report_sources_active_name_idx
  on public.public_report_sources (is_active, name);

create or replace function public.touch_public_report_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists public_report_categories_touch_updated_at on public.public_report_categories;
create trigger public_report_categories_touch_updated_at
before update on public.public_report_categories
for each row execute function public.touch_public_report_updated_at();

drop trigger if exists public_report_sources_touch_updated_at on public.public_report_sources;
create trigger public_report_sources_touch_updated_at
before update on public.public_report_sources
for each row execute function public.touch_public_report_updated_at();

drop trigger if exists public_reports_touch_updated_at on public.public_reports;
create trigger public_reports_touch_updated_at
before update on public.public_reports
for each row execute function public.touch_public_report_updated_at();

alter table public.public_report_categories enable row level security;
alter table public.public_report_sources enable row level security;
alter table public.public_reports enable row level security;

drop policy if exists "public report categories read active" on public.public_report_categories;
create policy "public report categories read active" on public.public_report_categories
for select to anon, authenticated using (
  is_active or public.is_admin() or exists (
    select 1 from public.public_reports r
    where r.category_id = public_report_categories.id and r.status = 'published'
  )
);
drop policy if exists "public report categories admin insert" on public.public_report_categories;
create policy "public report categories admin insert" on public.public_report_categories
for insert to authenticated with check (public.is_admin());
drop policy if exists "public report categories admin update" on public.public_report_categories;
create policy "public report categories admin update" on public.public_report_categories
for update to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "public report sources read active or referenced" on public.public_report_sources;
create policy "public report sources read active or referenced" on public.public_report_sources
for select to anon, authenticated using (
  is_active or public.is_admin() or exists (
    select 1 from public.public_reports r
    where r.source_id = public_report_sources.id and r.status = 'published'
  )
);
drop policy if exists "public report sources admin insert" on public.public_report_sources;
create policy "public report sources admin insert" on public.public_report_sources
for insert to authenticated with check (public.is_admin());
drop policy if exists "public report sources admin update" on public.public_report_sources;
create policy "public report sources admin update" on public.public_report_sources
for update to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "public reports read published or admin" on public.public_reports;
create policy "public reports read published or admin" on public.public_reports
for select to anon, authenticated using (status = 'published' or public.is_admin());
drop policy if exists "public reports admin insert" on public.public_reports;
create policy "public reports admin insert" on public.public_reports
for insert to authenticated with check (public.is_admin());
drop policy if exists "public reports admin update" on public.public_reports;
create policy "public reports admin update" on public.public_reports
for update to authenticated using (public.is_admin()) with check (public.is_admin());

grant select on public.public_report_categories, public.public_report_sources, public.public_reports to anon, authenticated;
grant insert, update on public.public_report_categories, public.public_report_sources, public.public_reports to authenticated;
grant all on public.public_report_categories, public.public_report_sources, public.public_reports to service_role;

commit;
