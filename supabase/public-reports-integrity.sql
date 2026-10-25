-- Database-enforced report verification and HTTPS URL integrity.
-- Run after public-reports.sql. This migration is additive and does not
-- rewrite report content or alter existing News/Weather tables.
-- URL policy is ASCII DNS only (no IDN/punycode) and canonical IPv4; IPv6 is supported.
begin;

create or replace function public.is_valid_https_url(value text)
returns boolean
language plpgsql
immutable
parallel safe
set search_path = pg_catalog
as $$
declare
  authority text;
  hostname text;
  host_without_root_dot text;
  port_text text;
  suffix text;
  labels text[];
  final_label text;
  closing_bracket integer;
  parsed_ip inet;
begin
  if value is null or value = '' then
    return true;
  end if;
  if value <> btrim(value)
     or value !~* '^https://'
     or value ~ '[[:space:][:cntrl:]<>]'
     or position(chr(92) in value) > 0 then
    return false;
  end if;

  authority := substring(value from '^[hH][tT][tT][pP][sS]://([^/?#]+)');
  if authority is null or authority = '' or position('@' in authority) > 0 then
    return false;
  end if;

  if left(authority, 1) = '[' then
    closing_bracket := position(']' in authority);
    if closing_bracket < 3 then
      return false;
    end if;
    hostname := substring(authority from 2 for closing_bracket - 2);
    suffix := substring(authority from closing_bracket + 1);
    if hostname = '' or position('%' in hostname) > 0 then
      return false;
    end if;
    begin
      parsed_ip := hostname::inet;
    exception when invalid_text_representation then
      return false;
    end;
    if family(parsed_ip) <> 6 or masklen(parsed_ip) <> 128 then
      return false;
    end if;
    if suffix <> '' then
      if left(suffix, 1) <> ':' then return false; end if;
      port_text := substring(suffix from 2);
    else
      port_text := null;
    end if;
  else
    if (length(authority) - length(replace(authority, ':', ''))) > 1 then
      return false;
    end if;
    if position(':' in authority) > 0 then
      hostname := split_part(authority, ':', 1);
      port_text := substring(authority from position(':' in authority) + 1);
    else
      hostname := authority;
      port_text := null;
    end if;
    if hostname = '' then return false; end if;

    host_without_root_dot := hostname;
    if right(host_without_root_dot, 1) = '.' then
      host_without_root_dot := left(host_without_root_dot, length(host_without_root_dot) - 1);
    end if;
    if host_without_root_dot = '' or length(host_without_root_dot) > 253 then
      return false;
    end if;

    labels := string_to_array(host_without_root_dot, '.');
    if array_length(labels, 1) is null then return false; end if;
    foreach suffix in array labels loop
      if length(suffix) > 63
         or suffix !~ '^[A-Za-z0-9]([A-Za-z0-9-]{0,61}[A-Za-z0-9])?$' then
        return false;
      end if;
      -- PostgreSQL has no built-in IDNA validator; reject all punycode labels
      -- so malformed IDNs cannot pass this database constraint.
      if suffix ~* '^xn--' then return false; end if;
    end loop;

    final_label := labels[array_length(labels, 1)];
    -- WHATWG URL treats a numeric/hex/octal final label as an IPv4 candidate.
    -- Require an actual canonical IPv4 address instead of accepting it as DNS.
    if host_without_root_dot ~ '^[0-9.]+$'
       or final_label ~* '^(0x[0-9a-f]*|0[0-7]*|[0-9]+)$' then
      -- Node's WHATWG parser normalizes these forms; stored/direct-write values
      -- must already be canonical dotted-decimal IPv4.
      if hostname <> host_without_root_dot then return false; end if;
      begin
        parsed_ip := host_without_root_dot::inet;
      exception when invalid_text_representation then
        return false;
      end;
      if family(parsed_ip) <> 4 or masklen(parsed_ip) <> 32
         or host(parsed_ip) <> host_without_root_dot then
        return false;
      end if;
    end if;
  end if;

  if port_text is not null then
    if port_text = '' or port_text !~ '^[0-9]+$' then
      return false;
    end if;
    port_text := ltrim(port_text, '0');
    if port_text = '' then port_text := '0'; end if;
    if length(port_text) > 5 or port_text::integer > 65535 then
      return false;
    end if;
  end if;

  return true;
end;
$$;

grant execute on function public.is_valid_https_url(text) to anon, authenticated, service_role;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.public_report_sources'::regclass
      and conname = 'public_report_sources_website_https_check'
  ) then
    alter table public.public_report_sources
      add constraint public_report_sources_website_https_check
      check (public.is_valid_https_url(website_url)) not valid;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.public_reports'::regclass
      and conname = 'public_reports_source_https_check'
  ) then
    alter table public.public_reports
      add constraint public_reports_source_https_check
      check (public.is_valid_https_url(source_url)) not valid;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.public_reports'::regclass
      and conname = 'public_reports_document_https_check'
  ) then
    alter table public.public_reports
      add constraint public_reports_document_https_check
      check (public.is_valid_https_url(document_url)) not valid;
  end if;
end;
$$;

alter table public.public_report_sources
  validate constraint public_report_sources_website_https_check;
alter table public.public_reports
  validate constraint public_reports_source_https_check;
alter table public.public_reports
  validate constraint public_reports_document_https_check;

create or replace function public.enforce_public_report_integrity()
returns trigger
language plpgsql
set search_path = pg_catalog, public, auth
as $$
declare
  request_role text := auth.role();
  content_changed boolean;
begin
  if tg_op = 'INSERT' then
    new.verification_status := 'unverified';
    new.status := 'draft';
    new.verified_by := null;
    new.verified_at := null;
    new.published_at := null;
    new.archived_at := null;
    return new;
  end if;

  content_changed := row(
    new.title, new.slug, new.summary, new.body, new.category_id, new.source_id,
    new.source_url, new.document_url, new.publication_date, new.reference_year, new.reference_period,
    new.methodology, new.scope_notes, new.limitations
  ) is distinct from row(
    old.title, old.slug, old.summary, old.body, old.category_id, old.source_id,
    old.source_url, old.document_url, old.publication_date, old.reference_year, old.reference_period,
    old.methodology, old.scope_notes, old.limitations
  );

  if content_changed then
    new.verification_status := 'unverified';
    new.status := 'draft';
    new.verified_by := null;
    new.verified_at := null;
    new.published_at := null;
    new.archived_at := null;
    return new;
  end if;

  if new.verification_status = 'verified' then
    if (
      old.verification_status is distinct from 'verified'
      or new.verified_by is distinct from old.verified_by
      or new.verified_at is distinct from old.verified_at
    ) and request_role is distinct from 'service_role' then
      raise insufficient_privilege
        using message = 'Reports can only be verified through the authorized server workflow.';
    end if;
    if new.verified_by is null or new.verified_at is null then
      raise check_violation
        using message = 'Verified reports must include verifier and verification timestamp.';
    end if;
  else
    new.verified_by := null;
    new.verified_at := null;
    if old.verification_status = 'verified' then
      new.status := 'draft';
    end if;
  end if;

  if new.status = 'published' then
    new.published_at := case
      when old.status = 'published' then old.published_at
      else coalesce(new.published_at, now())
    end;
    new.archived_at := null;
  elsif new.status = 'archived' then
    new.published_at := null;
    new.archived_at := case
      when old.status = 'archived' then old.archived_at
      else coalesce(new.archived_at, now())
    end;
  else
    new.published_at := null;
    new.archived_at := null;
  end if;

  return new;
end;
$$;

revoke all on function public.enforce_public_report_integrity() from public;
grant execute on function public.enforce_public_report_integrity() to authenticated, service_role;

drop trigger if exists public_reports_enforce_integrity on public.public_reports;
create trigger public_reports_enforce_integrity
before insert or update on public.public_reports
for each row execute function public.enforce_public_report_integrity();

create or replace function public.invalidate_reports_after_source_edit()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  if row(new.name, new.website_url, new.organization_type, new.jurisdiction, new.notes)
     is distinct from row(old.name, old.website_url, old.organization_type, old.jurisdiction, old.notes) then
    update public.public_reports as report
    set verification_status = 'unverified',
        status = 'draft',
        verified_by = null,
        verified_at = null,
        published_at = null,
        archived_at = null,
        updated_by = coalesce(new.updated_by, report.updated_by)
    where report.source_id = new.id
      and (
        report.verification_status <> 'unverified'
        or report.status <> 'draft'
        or report.verified_by is not null
        or report.verified_at is not null
        or report.published_at is not null
        or report.archived_at is not null
      );
  end if;
  return new;
end;
$$;

revoke all on function public.invalidate_reports_after_source_edit() from public;
grant execute on function public.invalidate_reports_after_source_edit() to authenticated, service_role;

drop trigger if exists public_report_sources_invalidate_reports on public.public_report_sources;
create trigger public_report_sources_invalidate_reports
after update on public.public_report_sources
for each row execute function public.invalidate_reports_after_source_edit();

commit;
