-- Add the UNDP India HDI observation as a reviewable dataset draft.
-- Run after public-reports-starter-drafts.sql and public-data-rankings.sql.
-- The row is forced to an unverified draft; it is not public until an editor
-- checks the corrected report/table and explicitly verifies and publishes it.
begin;

insert into public.public_data_indicators (
  slug, name, definition, unit, category_id, geography_level, direction, notes
)
select
  'human-development-index', 'Human Development Index (HDI)',
  'UNDP composite measure combining health, education and standard of living dimensions.',
  'index points', c.id, 'country', 'higher_better',
  'Preserve the edition and reference year; HDI is not a complete measure of human development.'
from public.public_report_categories c
where c.slug = 'india-in-the-world'
  and not exists (select 1 from public.public_data_indicators where slug = 'human-development-index');

insert into public.public_data_editions (
  indicator_id, source_id, report_id, edition_label, publication_date,
  reference_period_start, reference_period_end, source_url, document_url,
  methodology, scope_notes, limitations, verification_status, status
)
select
  i.id,
  (select s.id from public.public_report_sources s where s.name = 'United Nations Development Programme (UNDP)' order by s.created_at limit 1),
  (select r.id from public.public_reports r where r.slug = 'human-development-report-2025-india-hdi' limit 1),
  'Human Development Report 2025 (India observation, 2023)',
  date '2025-05-06', date '2023-01-01', date '2023-12-31',
  'https://hdr.undp.org/content/human-development-report-2025',
  'https://hdr.undp.org/system/files/documents/global-report-document/hdr2025reporten.pdf',
  'UNDP HDI is a composite of normalized health, education and standard-of-living dimension indices. Verify the current report, technical note and errata before publication.',
  'One country observation: India. Publication edition is 2025; the observation year is 2023.',
  'HDI captures selected dimensions only. The editor must confirm the India table row in the current corrected PDF before publication.',
  'unverified', 'draft'
from public.public_data_indicators i
where i.slug = 'human-development-index'
  and not exists (
    select 1 from public.public_data_editions e
    where e.indicator_id = i.id and e.edition_label = 'Human Development Report 2025 (India observation, 2023)'
  );

insert into public.public_data_observations (
  edition_id, geography_code, geography_name, geography_type, value,
  unit, published_rank, rank_scope, notes, source_page
)
select e.id, 'IND', 'India', 'country', 0.685, 'index points', 130,
  'UNDP published rank 130, shared with Bangladesh; rank scope and total coverage require final table-level editorial confirmation',
  'UNDP Human Development Report 2025 Statistical Table 2 reports the India HDI value and rank for 2023. India shares rank 130 with Bangladesh; editor should confirm table wording and ranking method.',
  'Statistical Table 2, printed p.280 (PDF p.294)'
from public.public_data_editions e
join public.public_data_indicators i on i.id = e.indicator_id
where i.slug = 'human-development-index'
  and e.edition_label = 'Human Development Report 2025 (India observation, 2023)'
  and not exists (
    select 1 from public.public_data_observations o
    where o.edition_id = e.id and o.geography_code = 'IND'
  );

commit;
