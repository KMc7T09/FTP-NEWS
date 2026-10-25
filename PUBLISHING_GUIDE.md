# FTP NEWS Publishing Guide

This version uses GitHub + Netlify for frontend hosting and Supabase for backend data.

## Add A New Article

1. Open this project in VS Code.
Login to the website as admin/editor and open `/admin/articles/new`.

## Example Article

```js
{
  id: 'my-new-story',
  title: 'My New Story Title',
  slug: 'my-new-story-title',
  excerpt: 'Short summary for the homepage.',
  content: '<p>Full article paragraph one.</p><p>Full article paragraph two.</p>',
  featuredImageURL: 'https://images.unsplash.com/photo-example',
  categoryId: 'politics',
  categoryName: 'Politics',
  categorySlug: 'politics',
  tags: ['politics', 'breaking'],
  authorName: 'FTP Desk',
  status: 'published',
  isFeatured: false,
  isTrending: false,
  views: 0,
  publishedAt: '2026-05-14T10:00:00.000Z',
}
```

## Hire A Writer / Editor

1. Writer signs up on the website.
2. Admin opens `/admin/users`.
3. Change writer role to `editor`.
4. Editor can login and publish articles.
5. Editor cannot manage users/settings/comments/ads.

## Netlify Setup

1. Go to Netlify.
2. Add new site from Git.
3. Connect your GitHub repo.
4. Build command: `npm run build`
5. Publish directory: `dist`
6. Deploy.

The `netlify.toml` file already contains these settings.

## Supabase Setup

1. Create a Supabase project.
2. Open SQL Editor.
3. Paste and run `supabase/schema.sql`.
4. Add env values to Netlify:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_BOOTSTRAP_ADMIN_EMAILS`

## Public Reports & Data

1. In Supabase, open **SQL Editor** and run `supabase/public-reports.sql`. This also adds the `reference_period` column safely to an earlier Public Reports installation. Next run `supabase/public-reports-integrity-preflight.sql` and review its results before applying `supabase/public-reports-integrity.sql`. Both migrations are additive; they do not replace or seed existing tables. The integrity migration is safe to re-run.
   - The preflight reports every existing non-empty publisher website, report source URL or report document URL that the integrity constraints will reject, including whitespace-only values. It creates only a session-local validator inside a transaction and ends with `ROLLBACK`; it does not update or delete existing records or leave a persistent database object.
   - If preflight returns rows, review each URL and correct it manually to a valid HTTPS URL, or clear it only when that field is genuinely optional for that record. A report's original source URL may be blank while it is a draft, but the existing publication requirements still require a source URL to publish. Do not bulk-rewrite or delete data to make the results disappear. Rerun preflight and proceed only when it returns zero rows.
2. In Netlify, confirm the existing server-only variables `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are configured for Functions. Never use the service-role key as a `VITE_` variable or commit it to Git.
3. Sign in as an active `admin` or `superadmin`, then open **Admin → Public Reports**.
4. Add a report category in **Categories**, then register the original publishing institution in **Publishers & Sources**.
5. Create a report draft with the official source URL, publication date, and the reference year only when the source states one. Add the methodology, scope and limitations; use Preview to review the public rendering.
6. Save the draft, then choose **Verify**. Verification requires a category, publisher, HTTPS source URL, publication date and methodology. A verified report remains unpublished until **Publish** is selected.
7. Published reports appear at `/reports` and `/reports/:slug`. Unpublish returns one to draft; Archive hides it without deleting the record.

The base schema does not seed records. To avoid retyping the three already researched candidates, after the report schema and integrity migrations run `supabase/public-reports-starter-drafts.sql`; these are source-linked, unverified drafts, not public posts. Review and verify them in Admin before publishing. The public archive correctly remains empty until a report is reviewed and explicitly published. Apply migrations and seed drafts in a reviewed non-production database first; then deploy through the normal Git/Netlify process.

### Report integrity rules

The database treats title, slug, summary, report body, category, publisher/source, source URL, document URL, publication date, data reference year, reporting period, methodology, scope and limitations as substantive report content. Any actual change to one of these fields clears verifier metadata and returns the record to an unverified draft, even when a direct authenticated database update also attempts to set it verified or published. New records are likewise forced to unverified drafts. Editing a registered publisher's name, website, organization type, jurisdiction or source notes also invalidates and drafts its linked reports; merely activating/deactivating the publisher does not. Ordinary publish, unpublish and archive transitions do not invalidate verification. A change from an unverified state to verified is accepted only from the server-role request used by the admin Netlify function, after that function checks the signed-in user's active database profile; authenticated browser requests cannot set verification flags.

Source publisher website URLs, report source URLs and report document URLs may be blank when optional or still being drafted. If supplied, each must be an absolute HTTPS URL with a syntactically valid hostname/IPv6 literal and a port in range; embedded usernames/passwords are rejected. The shared hostname policy is ASCII DNS only: all `xn--` labels are rejected because PostgreSQL has no built-in IDNA/WHATWG URL parser to validate punycode safely. This also rejects valid internationalized domains; use a suitable ASCII hostname instead. IPv4 must be canonical dotted decimal (for example, `127.0.0.1`); shorthand, octal/hex forms, and IPv4 with a trailing dot are rejected rather than silently normalized. Valid IPv6 is accepted.

The Netlify manager checks the raw IPv4 host before `URL` serialization, so Node cannot silently turn an input such as `127.1` into `127.0.0.1`. For accepted URLs, Node may still normalize representation, such as IPv6 compression or default-port removal; PostgreSQL validates the URL host and port but does not rewrite stored text. The integrity constraints enforce the same accepted hostname policy on direct database writes. The existing publish constraints still require a source URL and report evidence fields before publication. These URL checks apply to drafts as well as published records.

When a publisher's provenance changes, linked reports are invalidated and returned to unverified drafts. If the publisher update has no `updated_by` actor, the report's existing `updated_by` value is retained rather than cleared; a supplied publisher editor ID becomes the new report audit actor.

### Integrity smoke test

After both migrations, run `supabase/public-reports-integrity-test.sql` in Supabase SQL Editor. It creates temporary category/source/report rows inside a transaction and ends with `ROLLBACK`. It checks forged verification on insert, blocked browser-role verification, invalid HTTP/FTP/JavaScript URLs, malformed authorities/hostnames and out-of-range ports, malformed punycode, shorthand/noncanonical IPv4, accepted canonical IPv4 and IPv6 URLs, publish/unpublish transitions, report-content invalidation, publisher-metadata invalidation and preservation of an existing audit actor. Do not remove the final `ROLLBACK` or use a production report. The SQL script tests database constraints and triggers; it does not claim to test live RLS or Netlify authorization.

### Phase 2 Validation Handoff

**Not yet executed:** this checkout has no local Supabase CLI, PostgreSQL client, Docker setup, or `supabase/config.toml`. Its current local Supabase URL points to production. Do not run the migration, preflight, or smoke-test scripts against that project. No live database or Netlify authorization result is confirmed.

When an already-available, isolated non-production Supabase project is designated for testing, perform these steps in order:

1. Confirm the project is non-production and has the existing core schema/auth helpers installed. Never paste keys into chat or commit them.
2. Run `supabase/public-reports.sql`.
3. Run `supabase/public-reports-integrity-preflight.sql`. Manually investigate each returned row; correct only reviewed URLs, then rerun until there are no findings. Do not auto-rewrite or delete existing data.
4. Run `supabase/public-reports-integrity.sql`, then `supabase/public-reports-integrity-test.sql`. Confirm the SQL Editor shows the smoke-test success notice and the test transaction ends rolled back.
5. Separately test with real anon/authenticated/admin sessions that public reads expose published reports only, public writes fail, and an active admin can create, edit, verify, publish, unpublish, and archive through the Netlify function. The rollback SQL test does not replace these checks.
6. Before a later production release, confirm Netlify has `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in server-side Function environment variables, and the frontend build has `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, and `VITE_BOOTSTRAP_ADMIN_EMAILS`. Never prefix the service-role key with `VITE_`. Deploy only after explicit approval.

### First Source Candidates

These are genuine official publications represented by the starter-draft SQL. The cited facts below were checked against the linked official pages/documents for draft preparation; the records remain unverified until an FTP editor independently checks the documents, wording, tables, dates, methodology, scope and limitations in the admin workflow. Treat publication year separately from data-reference periods.

| Candidate | Official original source | Publication/reporting dates to record |
| --- | --- | --- |
| NITI Aayog, *SDG India Index 2023-24* | [Official report PDF](https://www.niti.gov.in/sites/default/files/2024-07/SDA_INDIA_Publication.pdf) | NITI's publication record gives 15 July 2024. Report summary around printed p.58 says 113 reported indicators, 107 used for estimation, five Goal 14 indicators excluded for coastal-only applicability, and one Goal 10 indicator excluded for comparability; the PDF states missing cells are null and receive no weight. Indicator reference periods vary. |
| MoSPI, *Periodic Labour Force Survey Annual Report 2025* | [Official report PDF](https://www.mospi.gov.in/uploads/publications_reports/publications_reports1780040415321_0624fb13-fb47-40bc-b470-7c7e9635c3ef_PLFS_2025_F_REV_29052026.pdf) | Official PIB release dated 27 March 2026 identifies the period as January-December 2025. The official companion [methodology/comparability endnote](https://www.mospi.gov.in/uploads/latestReleases/latest_release_1774607827733_3e8964a9-268b-4cc9-ad65-cfc8a9e32f08_Press_note_AR_PLFS_2025_23032025_V2.1_26032026_final.pdf) describes the revised design from January 2025; editor must preserve its comparability caveat. |
| UNDP, *Human Development Report 2025* | [Official report PDF](https://hdr.undp.org/system/files/documents/global-report-document/hdr2025reporten.pdf) | UNDP report page gives 6 May 2025. Statistical Table 2 (printed p.280; PDF p.294) lists India's HDI 0.685 and rank 130 for 2023; Bangladesh is tied at rank 130. The 2025 edition is not the data-reference year. |

### Public Rankings And Dataset Manager

The public rankings explorer is `/rankings`; administrators manage indicator definitions, dataset editions, CSV observations, verification and publication at **Admin → Rankings & Data** (`/admin/public-data`). This is an additive manual workflow: it does not automatically import data from government or international publishers, and it does not contain seeded rankings. Only verified, published source-backed editions appear publicly. The UI displays a publisher-supplied rank separately from the measured value and does not calculate substitute ranks.

Before using the data manager, apply the migrations in this order in a reviewed, isolated Supabase project: `supabase/public-reports.sql`, inspect `supabase/public-reports-integrity-preflight.sql`, then apply `supabase/public-reports-integrity.sql`, `supabase/public-data-rankings.sql`, and `supabase/public-representatives.sql`. Never run the rollback-only smoke test or unreviewed migrations against production. Public tables and the browser workflow rely on Supabase RLS and the existing `public.is_admin()` helper. These data and representative migrations, their SQL triggers/RLS/foreign keys, and their admin workflows have not been executed or verified against a PostgreSQL instance in this workspace. Before production release, verify them on a non-production Supabase project and test anon, ordinary user, admin and superadmin sessions. Do not claim those checks pass until performed.

To add the first real dataset, first register its publisher and (if appropriate) report in **Admin → Public Reports**. In **Admin → Rankings & Data**, define an indicator and its geography level, add a dated edition with official HTTPS URLs and methodology, then import only values transcribed from that source. The CSV template contains headers only; required columns are `geography_code`, `geography_name`, and `geography_type`. Numeric value and publisher rank are optional when the source does not provide them. Imports upsert matching geography codes and do not delete rows omitted from a later file; each import resets verification and publication to draft. Review the original source and all periods, scope, units and limitations before using Verify, then publish separately. A public empty state is expected until this process is completed.

The rankings page supports source/publisher and publication-year filters, India (state/UT/district) versus country datasets, and CSV export. The public representative directory is `/representatives`; admins manage profiles at **Admin → Representatives**. Profiles require a registered publisher and official HTTPS source URL, and all additions or substantive edits return to unverified draft. Party affiliation is dated, and optional election, asset, attendance and public-work notes must be tied to the cited source and reporting period. Do not treat declared assets as evidence of wrongdoing or include private personal information. The directory starts empty.

Apply `supabase/public-representatives.sql` after `supabase/public-reports-integrity.sql` and `supabase/public-data-rankings.sql`. It creates an additive table and source-change invalidation trigger; it does not seed records. Database migration execution and live RLS/admin-session tests are still required in an isolated non-production project before production release. Historical chart comparisons and a district boundary map are not implemented; no unsupported figures or rankings are shown.

### Official API preview and import

**Admin → Rankings & Data → Fetch from official data APIs** currently supports two real source paths:

- **World Bank Indicators API:** keyless country observations for one selected reference year. Enter the publisher's indicator code (for example, the code shown on the World Bank indicator page) and choose a country-level or mixed-geography indicator/edition. This uses the official v2 API and excludes regional/income aggregates. Missing values remain explicitly marked missing; no ranking is calculated.
- **data.gov.in:** India government resource records. Register for an API key using the official [OGD Platform help page](https://data.gov.in/help), then add `DATA_GOV_IN_API_KEY` to **Netlify → Project configuration → Environment variables** for the server-side Functions scope. Never prefix it with `VITE_`, paste it into frontend settings, or commit it. In the Admin UI, enter the exact resource ID from the official dataset page and the JSON field names for geography code, name and numeric value. Optional unit/rank fields are mapped only when the source provides them.

For either provider, first create the indicator and dataset edition with its reviewed publisher, date, original source/document URLs, methodology, scope and limitations. Then select that edition, fetch a preview and inspect the returned rows. **Fetch does not write to Supabase.** Choose Import only after checking field mapping, year, units, geography and source scope. Import uses the existing authenticated Supabase admin/RLS path, upserts by geography code and resets the edition to `draft` + `unverified`. It never verifies or publishes automatically. The edition's source URL and methodology still need the original publication/document; the API endpoint recorded on each observation is data provenance, not a replacement citation.

data.gov.in resources vary in access and schema; some may require a separate API request/access grant or may not expose a compatible numeric field. The importer deliberately accepts only resource IDs on the fixed official host, fetches at most 1,000 records per preview, rejects duplicate geography codes and does not page through a resource automatically. Use the CSV workflow for resources requiring filters/pagination, multiple observations per geography, non-numeric values or a bespoke transformation. World Bank v2 is public and does not require an API key; as with any external service, availability and coverage are not guaranteed. The official World Bank API documentation describes its no-key v2 Indicators API and JSON query format: [About the Indicators API](https://datahelpdesk.worldbank.org/knowledgebase/articles/889392) and [Basic call structures](https://datahelpdesk.worldbank.org/knowledgebase/articles/898581-api-basic-call-structures).

After setting `DATA_GOV_IN_API_KEY`, redeploy Netlify Functions so the runtime receives the variable. No API key is needed for World Bank. Existing Supabase migrations still must be applied in the documented order before the Rankings & Data admin page can read/write editions. API previews can be locally implemented and mocked, but live provider responses, project credentials, Supabase RLS and production deployment remain environment-dependent and must not be considered tested by a local build.

### Starter Records (No Retyping)

After the matching schema migrations are installed, run these re-runnable files in SQL Editor: `supabase/public-reports-starter-drafts.sql`, `supabase/public-data-starter-drafts.sql`, then `supabase/public-representatives-starter-drafts.sql`. They add three official-source report drafts (NITI Aayog SDG India Index 2023-24, MoSPI PLFS Annual Report 2025, and UNDP Human Development Report 2025), one UNDP India HDI 2023 observation (0.685; published rank 130), and one PM India profile draft. Every inserted item is `draft` + `unverified`; none becomes public automatically. Review the original documents, then use the corresponding Admin pages to verify and publish. Do not mark an item verified without the actual editorial review. These SQL files have not been executed against PostgreSQL or Supabase in this workspace, so test them in the isolated environment first.
