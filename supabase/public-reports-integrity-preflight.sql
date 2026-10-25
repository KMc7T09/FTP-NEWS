-- Read-only preflight for public-reports-integrity.sql.
-- Run after public-reports.sql and before the integrity migration.
-- The helper is session-local and the transaction rolls it back; no rows are changed.
-- The same ASCII-only DNS, no-punycode, canonical-IPv4 and IPv6 policy is used here.
begin;

create temporary table public_reports_preflight_session (id integer) on commit drop;

create function pg_temp.is_valid_https_url(value text)
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
  if value is null or value = '' then return true; end if;
  if value <> btrim(value) or value !~* '^https://'
     or value ~ '[[:space:][:cntrl:]<>]'
     or position(chr(92) in value) > 0 then return false; end if;
  authority := substring(value from '^[hH][tT][tT][pP][sS]://([^/?#]+)');
  if authority is null or authority = '' or position('@' in authority) > 0 then return false; end if;

  if left(authority, 1) = '[' then
    closing_bracket := position(']' in authority);
    if closing_bracket < 3 then return false; end if;
    hostname := substring(authority from 2 for closing_bracket - 2);
    suffix := substring(authority from closing_bracket + 1);
    if hostname = '' or position('%' in hostname) > 0 then return false; end if;
    begin
      parsed_ip := hostname::inet;
    exception when invalid_text_representation then
      return false;
    end;
    if family(parsed_ip) <> 6 or masklen(parsed_ip) <> 128 then return false; end if;
    if suffix <> '' then
      if left(suffix, 1) <> ':' then return false; end if;
      port_text := substring(suffix from 2);
    else
      port_text := null;
    end if;
  else
    if length(authority) - length(replace(authority, ':', '')) > 1 then return false; end if;
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
    if host_without_root_dot = '' or length(host_without_root_dot) > 253 then return false; end if;
    labels := string_to_array(host_without_root_dot, '.');
    if array_length(labels, 1) is null then return false; end if;
    foreach suffix in array labels loop
      if length(suffix) > 63
         or suffix !~ '^[A-Za-z0-9]([A-Za-z0-9-]{0,61}[A-Za-z0-9])?$' then return false; end if;
      if suffix ~* '^xn--' then return false; end if;
    end loop;
    final_label := labels[array_length(labels, 1)];
    if host_without_root_dot ~ '^[0-9.]+$'
       or final_label ~* '^(0x[0-9a-f]*|0[0-7]*|[0-9]+)$' then
      if hostname <> host_without_root_dot then return false; end if;
      begin
        parsed_ip := host_without_root_dot::inet;
      exception when invalid_text_representation then
        return false;
      end;
      if family(parsed_ip) <> 4 or masklen(parsed_ip) <> 32
         or host(parsed_ip) <> host_without_root_dot then return false; end if;
    end if;
  end if;

  if port_text is not null then
    if port_text = '' or port_text !~ '^[0-9]+$' then return false; end if;
    port_text := ltrim(port_text, '0');
    if port_text = '' then port_text := '0'; end if;
    if length(port_text) > 5 or port_text::integer > 65535 then return false; end if;
  end if;
  return true;
end;
$$;

do $$
begin
  if pg_temp.is_valid_https_url('https://xn--a.example/')
     or pg_temp.is_valid_https_url('https://127.1/report')
     or pg_temp.is_valid_https_url('https://127.0.0.1./report')
     or pg_temp.is_valid_https_url('https://example.org:/report') then
    raise exception 'Preflight URL policy accepted malformed punycode or noncanonical IPv4.';
  end if;
  if not pg_temp.is_valid_https_url('https://127.0.0.1/report')
     or not pg_temp.is_valid_https_url('https://example.org:000000000000443/report')
     or not pg_temp.is_valid_https_url('https://[2001:db8::1]/report') then
    raise exception 'Preflight URL policy rejected canonical IPv4 or valid IPv6.';
  end if;
end;
$$;

select source_table, record_id, column_name, url_value
from (
  select 'public_report_sources'::text as source_table, id as record_id,
         'website_url'::text as column_name, website_url as url_value
  from public.public_report_sources
  where website_url <> ''
    and not pg_temp.is_valid_https_url(website_url)
  union all
  select 'public_reports', id, 'source_url', source_url
  from public.public_reports
  where source_url <> ''
    and not pg_temp.is_valid_https_url(source_url)
  union all
  select 'public_reports', id, 'document_url', document_url
  from public.public_reports
  where document_url <> ''
    and not pg_temp.is_valid_https_url(document_url)
) as invalid_urls
order by source_table, record_id, column_name;

rollback;
