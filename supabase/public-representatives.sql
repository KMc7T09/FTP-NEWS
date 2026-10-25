-- Additive, source-linked public representative directory. Run after
-- public-reports-integrity.sql. No representative records are seeded.
begin;

create table if not exists public.public_representatives (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  full_name text not null,
  office_title text not null default '',
  constituency text not null default '',
  state_or_ut text not null default '',
  party text not null default '',
  party_as_of date,
  term_start date,
  term_end date,
  summary text not null default '',
  election_results text not null default '',
  asset_disclosure text not null default '',
  attendance_participation text not null default '',
  documented_public_work text not null default '',
  source_id uuid not null references public.public_report_sources(id) on delete restrict,
  source_url text not null check (public.is_valid_https_url(source_url) and length(btrim(source_url)) > 0),
  verification_status text not null default 'unverified'
    check (verification_status in ('unverified', 'verified', 'rejected')),
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  verified_by uuid references auth.users(id) on delete set null,
  verified_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  published_at timestamptz,
  constraint public_representatives_name_nonempty check (length(btrim(full_name)) > 0),
  constraint public_representatives_slug_format check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  constraint public_representatives_term_order check (term_start is null or term_end is null or term_start <= term_end),
  constraint public_representatives_verified_evidence check (
    verification_status <> 'verified' or (verified_by is not null and verified_at is not null)
  ),
  constraint public_representatives_publish_verified check (
    status <> 'published' or (verification_status = 'verified' and verified_by is not null and verified_at is not null)
  )
);

create index if not exists public_representatives_public_idx
  on public.public_representatives (status, state_or_ut, full_name);
create index if not exists public_representatives_source_idx
  on public.public_representatives (source_id);

create or replace function public.enforce_public_representative_integrity()
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
    new.slug, new.full_name, new.office_title, new.constituency, new.state_or_ut,
    new.party, new.party_as_of, new.term_start, new.term_end, new.summary,
    new.election_results, new.asset_disclosure, new.attendance_participation,
    new.documented_public_work, new.source_id, new.source_url
  ) is distinct from row(
    old.slug, old.full_name, old.office_title, old.constituency, old.state_or_ut,
    old.party, old.party_as_of, old.term_start, old.term_end, old.summary,
    old.election_results, old.asset_disclosure, old.attendance_participation,
    old.documented_public_work, old.source_id, old.source_url
  ) then
    new.status := 'draft';
    new.verification_status := 'unverified';
    new.verified_by := null;
    new.verified_at := null;
    new.published_at := null;
  elsif new.status = 'published' then
    new.published_at := coalesce(old.published_at, now());
  else
    new.published_at := null;
  end if;
  return new;
end;
$$;

drop trigger if exists public_representatives_integrity on public.public_representatives;
create trigger public_representatives_integrity
before insert or update on public.public_representatives
for each row execute function public.enforce_public_representative_integrity();
revoke all on function public.enforce_public_representative_integrity() from public, anon, authenticated;

create or replace function public.invalidate_representatives_after_source_change()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if row(new.name, new.website_url, new.organization_type, new.jurisdiction, new.notes)
     is distinct from row(old.name, old.website_url, old.organization_type, old.jurisdiction, old.notes) then
    update public.public_representatives
    set status = 'draft', verification_status = 'unverified', verified_by = null,
        verified_at = null, published_at = null, updated_at = now(),
        updated_by = coalesce(new.updated_by, updated_by)
    where source_id = new.id;
  end if;
  return new;
end;
$$;
drop trigger if exists public_representatives_source_invalidation on public.public_report_sources;
create trigger public_representatives_source_invalidation
after update on public.public_report_sources
for each row execute function public.invalidate_representatives_after_source_change();
revoke all on function public.invalidate_representatives_after_source_change() from public, anon, authenticated;

alter table public.public_representatives enable row level security;
drop policy if exists "public representatives read published" on public.public_representatives;
create policy "public representatives read published" on public.public_representatives
for select to anon, authenticated using (
  (status = 'published' and verification_status = 'verified') or public.is_admin()
);
drop policy if exists "public representatives admin write" on public.public_representatives;
create policy "public representatives admin write" on public.public_representatives
for all to authenticated using (public.is_admin()) with check (public.is_admin());
grant select on public.public_representatives to anon, authenticated;
grant insert, update, delete on public.public_representatives to authenticated;
grant all on public.public_representatives to service_role;

commit;
