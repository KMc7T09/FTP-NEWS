-- Add one official-source representative profile for editor review.
-- Run after public-representatives.sql. This is a draft, never public by default.
begin;

insert into public.public_report_sources (name, website_url, organization_type, jurisdiction, notes, is_active)
select 'Prime Minister''s Office (PM India)', 'https://www.pmindia.gov.in/', 'Government of India / Prime Minister''s Office', 'India', 'Official PM India profile source.', true
where not exists (select 1 from public.public_report_sources where name = 'Prime Minister''s Office (PM India)');

insert into public.public_representatives (
  slug, full_name, office_title, state_or_ut, term_start, summary,
  source_id, source_url, verification_status, status
)
select
  'narendra-modi-prime-minister-profile',
  'Narendra Modi',
  'Prime Minister of India',
  'India',
  date '2024-06-09',
  'The official PM India profile states that Narendra Modi was sworn in as Prime Minister for a third time on 9 June 2024. This draft contains no performance score or unsourced evaluation.',
  (select s.id from public.public_report_sources s where s.name = 'Prime Minister''s Office (PM India)' order by s.created_at limit 1),
  'https://www.pmindia.gov.in/en/pms-profile/',
  'unverified', 'draft'
where not exists (select 1 from public.public_representatives where slug = 'narendra-modi-prime-minister-profile');

commit;
