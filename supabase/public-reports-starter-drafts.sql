-- Idempotently add three researched official-report drafts.
-- Run after public-reports.sql and public-reports-integrity.sql.
-- These remain unverified drafts and are not visible in the public archive
-- until an FTP editor reviews each original source, verifies, and publishes.
begin;

insert into public.public_report_categories (name, slug, description, is_active)
values
  ('Government & Official Reports', 'government-official-reports', 'Official publications, surveys and data released by public institutions.', true),
  ('Economy & Employment', 'economy-employment', 'Labour-market and economic measures with their source periods and methods.', true),
  ('India in the World', 'india-in-the-world', 'International comparisons with the publisher’s method and reference years.', true)
on conflict (slug) do nothing;

insert into public.public_report_sources (name, website_url, organization_type, jurisdiction, notes, is_active)
select 'NITI Aayog', 'https://www.niti.gov.in/', 'Government of India policy institution', 'India', 'Original SDG India Index 2023-24 publisher.', true
where not exists (select 1 from public.public_report_sources where name = 'NITI Aayog');

insert into public.public_report_sources (name, website_url, organization_type, jurisdiction, notes, is_active)
select 'Ministry of Statistics and Programme Implementation (MoSPI)', 'https://www.mospi.gov.in/', 'Government of India ministry / National Statistics Office', 'India', 'Publisher of the Periodic Labour Force Survey.', true
where not exists (select 1 from public.public_report_sources where name = 'Ministry of Statistics and Programme Implementation (MoSPI)');

insert into public.public_report_sources (name, website_url, organization_type, jurisdiction, notes, is_active)
select 'United Nations Development Programme (UNDP)', 'https://www.undp.org/', 'United Nations development programme', 'International', 'Publisher of the Human Development Report.', true
where not exists (select 1 from public.public_report_sources where name = 'United Nations Development Programme (UNDP)');

insert into public.public_reports (
  title, slug, summary, body, category_id, source_id, source_url, document_url,
  publication_date, reference_year, reference_period, methodology, scope_notes, limitations,
  verification_status, status
)
select
  'SDG India Index 2023-24: How the Index Measures State and UT Progress',
  'sdg-india-index-2023-24-methodology',
  'NITI Aayog’s fourth SDG India Index edition compares State and Union Territory progress across 16 Sustainable Development Goals. Its indicator set and reference periods should be read alongside the report methodology.',
  'The official report describes a framework of 113 indicators. It states that 107 indicators were used for index estimation. Five Goal 14 indicators were excluded because they applied only to nine coastal States, and one Goal 10 indicator was excluded for lack of comparability. The report says unavailable State/UT cells are marked null and receive no weight in index estimation.\n\nThis draft summarizes the report framework only; it does not reproduce a state ranking or calculate new scores.',
  (select id from public.public_report_categories where slug = 'government-official-reports'),
  (select id from public.public_report_sources where name = 'NITI Aayog' order by created_at limit 1),
  'https://www.niti.gov.in/sites/default/files/2024-07/SDA_INDIA_Publication.pdf',
  'https://www.niti.gov.in/sites/default/files/2024-07/SDA_INDIA_Publication.pdf',
  date '2024-07-15', null, 'Indicator reference periods vary by indicator.',
  'NITI Aayog selected quantitative indicators aligned to the National Indicator Framework and SDG targets, drawing on official statistical and administrative sources. The report describes direction-specific normalization to a 0–100 scale and aggregation into goal and composite scores. The indicator framework and summary counts are discussed around printed page 58; confirm the exact formulas and page references in the downloaded report before verification.',
  'Edition 2023-24 covers States and Union Territories. It is not one single observation year: indicator reference periods vary. The report notes that updated values were used for 104 of the 113 reported indicators.',
  'The indicator framework changed from earlier editions, so comparisons across editions may not be strictly comparable. Some indicators are unavailable for some geographies; missing values must not be treated as zero. This draft has not had page-by-page editorial review.',
  'unverified', 'draft'
where not exists (select 1 from public.public_reports where slug = 'sdg-india-index-2023-24-methodology')
  and exists (select 1 from public.public_report_categories where slug = 'government-official-reports')
  and exists (select 1 from public.public_report_sources where name = 'NITI Aayog');

insert into public.public_reports (
  title, slug, summary, body, category_id, source_id, source_url, document_url,
  publication_date, reference_year, reference_period, methodology, scope_notes, limitations,
  verification_status, status
)
select
  'Periodic Labour Force Survey Annual Report 2025: Reading the Employment Estimates',
  'periodic-labour-force-survey-annual-report-2025',
  'MoSPI’s PLFS Annual Report covers January–December 2025 and presents labour-force indicators for rural and urban India. Its revised survey design affects comparisons with earlier annual estimates.',
  'The report covers the calendar year January to December 2025. It presents labour-force measures including the Labour Force Participation Rate, Worker Population Ratio and Unemployment Rate using defined reference-status concepts.\n\nThe Government’s release says the sampling design was revised from January 2025, including a rotational panel, to support higher-frequency estimates. The release cautions that 2025 annual estimates may not be strictly comparable with earlier PLFS annual reports or calendar-year estimates for 2022–2024.',
  (select id from public.public_report_categories where slug = 'economy-employment'),
  (select id from public.public_report_sources where name = 'Ministry of Statistics and Programme Implementation (MoSPI)' order by created_at limit 1),
  'https://www.pib.gov.in/PressReleasePage.aspx?PRID=2246009&lang=1&reg=1',
  'https://www.mospi.gov.in/uploads/publications_reports/publications_reports1780040415321_0624fb13-fb47-40bc-b470-7c7e9635c3ef_PLFS_2025_F_REV_29052026.pdf',
  date '2026-03-27', 2025, 'January–December 2025',
  'PLFS is a household sample survey. The report distinguishes usual status, based on a longer reference period, from Current Weekly Status, based on the preceding seven days. Review the report’s conceptual framework and table notes before publishing any specific estimate. The official companion endnote describes the January 2025 sample-design change and comparability context (PDF p.11 of 14).',
  'National rural and urban estimates for the January–December 2025 survey period. This is a sample survey, not a census.',
  'MoSPI explicitly cautions that the changed sampling design and estimation procedure may affect levels and comparability with earlier annual results. Every statistic must retain its population, age group, status definition, geography and unit. This draft contains no copied rate estimates.',
  'unverified', 'draft'
where not exists (select 1 from public.public_reports where slug = 'periodic-labour-force-survey-annual-report-2025')
  and exists (select 1 from public.public_report_categories where slug = 'economy-employment')
  and exists (select 1 from public.public_report_sources where name = 'Ministry of Statistics and Programme Implementation (MoSPI)');

insert into public.public_reports (
  title, slug, summary, body, category_id, source_id, source_url, document_url,
  publication_date, reference_year, reference_period, methodology, scope_notes, limitations,
  verification_status, status
)
select
  'Human Development Report 2025: India’s HDI in the Global Context',
  'human-development-report-2025-india-hdi',
  'UNDP’s Human Development Report 2025 includes country-level HDI estimates. Its India row reports an HDI value of 0.685 and rank 130 for 2023; these are edition-specific historical observations, not current-year figures.',
  'Statistical Table 2 lists India’s Human Development Index value as 0.685 and rank as 130 for reference year 2023 (printed p.280; PDF p.294). Bangladesh shares rank 130 in this table. The rank and value belong to the 2025 edition and must not be described as a 2025 observation.',
  (select id from public.public_report_categories where slug = 'india-in-the-world'),
  (select id from public.public_report_sources where name = 'United Nations Development Programme (UNDP)' order by created_at limit 1),
  'https://hdr.undp.org/content/human-development-report-2025',
  'https://hdr.undp.org/system/files/documents/global-report-document/hdr2025reporten.pdf',
  date '2025-05-06', 2023, '2023 (HDI observation; report edition 2025)',
  'UNDP’s HDI combines normalized measures for health, education and standard of living. The technical note describes a geometric mean of the dimension indices, with education built from expected and mean years of schooling and income transformed logarithmically. India appears in Statistical Table 2, printed p.280 (PDF p.294); the overview country comparison appears on printed p.17 (PDF p.29). Check the current report and errata before verifying or quoting.',
  'India country observation in the 2025 edition; the cited HDI value and rank refer to 2023. Other indicators in the report may use other reference periods.',
  'HDI captures only selected dimensions of human development and does not by itself measure inequality, poverty, empowerment or human security. UNDP revises historical series as sources and goalposts change. The editor must check the current corrected report version and table before publication.',
  'unverified', 'draft'
where not exists (select 1 from public.public_reports where slug = 'human-development-report-2025-india-hdi')
  and exists (select 1 from public.public_report_categories where slug = 'india-in-the-world')
  and exists (select 1 from public.public_report_sources where name = 'United Nations Development Programme (UNDP)');

commit;
