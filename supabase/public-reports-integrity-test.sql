-- Rollback-only smoke test for public-reports-integrity.sql.
-- Run after both public-reports migrations in Supabase SQL Editor.
begin;

do $$
declare
  category_id uuid := gen_random_uuid();
  source_id uuid := gen_random_uuid();
  report_id uuid := gen_random_uuid();
  verifier_id uuid;
  rejected boolean;
  report_row public.public_reports%rowtype;
begin
  select id into verifier_id from auth.users limit 1;
  if verifier_id is null then
    raise exception 'Integrity smoke test needs an existing Supabase Auth user.';
  end if;

  insert into public.public_report_categories (id, name, slug)
  values (category_id, 'Integrity smoke test', 'integrity-smoke-' || replace(category_id::text, '-', ''));

  insert into public.public_report_sources (id, name, website_url)
  values (source_id, 'Integrity smoke test source', 'https://example.org/source');

  -- Client-supplied verification/publication on insert must be discarded.
  insert into public.public_reports (
    id, title, slug, summary, body, category_id, source_id, source_url,
    document_url, publication_date, methodology, verification_status, status,
    verified_by, verified_at, published_at
  ) values (
    report_id, 'Integrity smoke test report', 'integrity-smoke-' || replace(report_id::text, '-', ''),
    'Temporary test summary', 'Temporary test body', category_id, source_id,
    'https://example.org/report', 'https://example.org/report.pdf', current_date,
    'Temporary test methodology', 'verified', 'published', verifier_id, now(), now()
  );

  select * into report_row from public.public_reports where id = report_id;
  if report_row.status <> 'draft' or report_row.verification_status <> 'unverified'
     or report_row.verified_by is not null or report_row.verified_at is not null
     or report_row.published_at is not null then
    raise exception 'Insert did not normalize to an unverified draft.';
  end if;

  rejected := false;
  begin
    update public.public_reports set source_url = 'http://example.org/report' where id = report_id;
  exception when check_violation then
    rejected := true;
  end;
  if not rejected then raise exception 'HTTP report source URL was not rejected.'; end if;

  rejected := false;
  begin
    update public.public_reports set document_url = 'javascript:alert(1)' where id = report_id;
  exception when check_violation then
    rejected := true;
  end;
  if not rejected then raise exception 'Non-HTTPS report document URL was not rejected.'; end if;

  rejected := false;
  begin
    update public.public_report_sources set website_url = 'ftp://example.org' where id = source_id;
  exception when check_violation then
    rejected := true;
  end;
  if not rejected then raise exception 'Non-HTTPS publisher URL was not rejected.'; end if;

  rejected := false;
  begin
    update public.public_reports set source_url = 'https://example.org:65536/report' where id = report_id;
  exception when check_violation then
    rejected := true;
  end;
  if not rejected then raise exception 'Out-of-range HTTPS port was not rejected.'; end if;

  rejected := false;
  begin
    update public.public_reports set source_url = 'https://example.org:/report' where id = report_id;
  exception when check_violation then
    rejected := true;
  end;
  if not rejected then raise exception 'Empty explicit HTTPS port was not rejected.'; end if;

  rejected := false;
  begin
    update public.public_reports set source_url = 'https://example..org/report' where id = report_id;
  exception when check_violation then
    rejected := true;
  end;
  if not rejected then raise exception 'Malformed HTTPS hostname was not rejected.'; end if;

  rejected := false;
  begin
    update public.public_reports set source_url = 'https://xn--a.example/report' where id = report_id;
  exception when check_violation then
    rejected := true;
  end;
  if not rejected then raise exception 'Malformed punycode hostname was not rejected.'; end if;

  rejected := false;
  begin
    update public.public_reports set source_url = 'https://127.1/report' where id = report_id;
  exception when check_violation then
    rejected := true;
  end;
  if not rejected then raise exception 'Shorthand IPv4 address was not rejected.'; end if;

  update public.public_reports set source_url = 'https://127.0.0.1/report' where id = report_id;
  update public.public_reports set source_url = 'https://example.org:000000000000443/report' where id = report_id;
  update public.public_reports set source_url = 'https://[2001:db8::1]/report' where id = report_id;
  update public.public_reports set source_url = 'https://example.org/report' where id = report_id;

  if not public.is_valid_https_url('https://example.org/report?edition=1')
     or not public.is_valid_https_url('https://example.org:443/report')
     or not public.is_valid_https_url('https://example.org:000000000000443/report')
     or not public.is_valid_https_url('https://127.0.0.1/report')
     or not public.is_valid_https_url('https://[2001:db8::1]/report')
     or not public.is_valid_https_url('')
     or public.is_valid_https_url('https://:443/report')
     or public.is_valid_https_url('https://example..org/report')
     or public.is_valid_https_url('https://bad_host.example/report')
     or public.is_valid_https_url('https://example.org:65536/report')
     or public.is_valid_https_url('https://example.org:/report')
     or public.is_valid_https_url('https://xn--a.example/report')
     or public.is_valid_https_url('https://127.1/report')
     or public.is_valid_https_url('https://127.0.0.1./report')
     or public.is_valid_https_url('https://[2001:db8::zz]/report')
     or public.is_valid_https_url('http://example.org')
     or public.is_valid_https_url('https://user@example.org') then
    raise exception 'HTTPS URL validator returned an unexpected result.';
  end if;

  -- Authenticated browser claims cannot promote a draft to verified.
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  rejected := false;
  begin
    update public.public_reports
    set verification_status = 'verified', verified_by = verifier_id, verified_at = now()
    where id = report_id;
  exception when insufficient_privilege then
    rejected := true;
  end;
  if not rejected then raise exception 'Authenticated verification transition was not blocked.'; end if;

  -- Simulate the already-authorized Netlify server function's service role.
  perform set_config('request.jwt.claim.role', 'service_role', true);
  update public.public_reports
  set verification_status = 'verified', verified_by = verifier_id, verified_at = now()
  where id = report_id;
  update public.public_reports set status = 'published' where id = report_id;
  update public.public_reports set status = 'draft' where id = report_id;

  select * into report_row from public.public_reports where id = report_id;
  if report_row.status <> 'draft' or report_row.verification_status <> 'verified'
     or report_row.verified_by is null or report_row.verified_at is null
     or report_row.published_at is not null then
    raise exception 'Publish/unpublish lifecycle transition behaved unexpectedly.';
  end if;

  -- Direct content edit, even with forged verification flags, must reset state.
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  update public.public_reports
  set body = 'Edited test body', verification_status = 'verified', status = 'published',
      verified_by = verifier_id, verified_at = now()
  where id = report_id;

  select * into report_row from public.public_reports where id = report_id;
  if report_row.status <> 'draft' or report_row.verification_status <> 'unverified'
     or report_row.verified_by is not null or report_row.verified_at is not null
     or report_row.published_at is not null then
    raise exception 'Substantive content edit did not invalidate and unpublish the report.';
  end if;

  perform set_config('request.jwt.claim.role', 'service_role', true);
  update public.public_reports
  set verification_status = 'verified', verified_by = verifier_id, verified_at = now(),
      updated_by = verifier_id
  where id = report_id;
  update public.public_reports set status = 'published' where id = report_id;
  update public.public_report_sources
  set name = 'Edited test publisher', updated_by = null
  where id = source_id;

  select * into report_row from public.public_reports where id = report_id;
  if report_row.status <> 'draft' or report_row.verification_status <> 'unverified'
     or report_row.verified_by is not null or report_row.verified_at is not null
     or report_row.published_at is not null
     or report_row.updated_by is distinct from verifier_id then
    raise exception 'Publisher edit did not invalidate its report or preserve the prior audit actor.';
  end if;

  raise notice 'Public report integrity smoke test passed; transaction will roll back.';
end;
$$;

rollback;
