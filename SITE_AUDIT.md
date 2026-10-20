# THE FTP NEWS: Audit and Upgrade Notes

Audit date: 20 October 2026

This is a repository/code audit. The deployed Netlify site and live Supabase project were not accessed, so live production state is explicitly marked unverified.

## Route Inventory

Public routes in `src/App.jsx`:

| Route | Access | Page |
| --- | --- | --- |
| `/` | Public | Home/front page |
| `/about` | Public | About |
| `/article/:slug` | Public | Article detail |
| `/category/:slug` | Public | Category listing |
| `/search` | Public | Search |
| `/contact` | Public | Contact form |
| `/weather` | Public | Weather intelligence |
| `/founder` | Public | Founder profile |
| `/team` | Public | Team |
| `/privacy-policy` | Public | Privacy policy |
| `/terms` | Public | Terms |
| `/editorial-policy` | Public | Editorial policy |
| `/disclaimer` | Public | Disclaimer |
| `/login`, `/signup` | Guest-only | Authentication |
| `/auth/callback` | Public callback | OAuth return |
| `/profile` | Signed in | Profile |
| `/supabase-status` | Public | Connection diagnostics |
| `*` | Public | Not found |

Admin routes are nested under `/admin` and require editor, admin, or superadmin at the parent route. `/admin/dashboard`, `/admin/articles`, `/admin/articles/new`, and `/admin/articles/:id/edit` are editor-accessible. Categories, users, comments, contact messages, weather, ads, and settings require admin or superadmin. `/admin/visitors` requires superadmin.

## Confirmed Findings and Changes

| Severity | Finding | Evidence / status |
| --- | --- | --- |
| Critical, fixed | `generate-weather` accepted public POSTs while holding server-side service-role access. | `netlify/functions/generate-weather.js` now validates the Supabase access token and requires an active admin/superadmin profile before reading locations or writing reports. |
| High, fixed | Weather location lookup silently substituted a short hard-coded location list when Supabase failed or returned no active rows, allowing incomplete reports to appear successful. | `loadWeatherLocations` now fails visibly for missing config, schema/query errors, empty active locations, or invalid coordinates; no fallback dataset remains. Open-Meteo retries transient 429/5xx responses up to three attempts. |
| High, fixed | Admin profile/settings function checks did not consistently reject banned/inactive admin profiles. | `admin-profiles.js` and `admin-settings.js` now require active status for privileged operations. |
| High, fixed | Public and admin weather views each requested up to 10,000 records even though they show a five-day window. | `listWeatherReports` supports a lower date boundary; both views request only the last five India-calendar dates. |
| Medium, fixed | Dashboard called a sum of loaded article views plus a limited visit sample “Reach,” which was not a true unique-reach measurement. | The dashboard now labels bounded datasets honestly and displays query failures with retry controls rather than silently leaving zeroes. |
| Medium, fixed | Article manager had no search, status filter, or paging. | Added title/category/author search, publication-state filter, and 20-row client paging over its existing latest-100 query. |
| Medium, fixed | Article image frames could take inconsistent heights and move content while loading. | Reusable `ArticleCard` media now uses a 16:9 frame; image preview and publish-body validation were added to the editor. |
| Medium, fixed | Site typography depended on a remote Google Fonts CSS import; base shell had uneven control sizing and narrow content width. | Removed the render-blocking font import, use system/serif fallbacks, and aligned shared public/admin control sizing, spacing, navigation, and card surfaces. |
| Medium, fixed | SEO defaults missed a crawler sitemap, robots guidance, weather metadata, and current auth branding. | Added robots rules, a dynamic Supabase-backed published-article sitemap function, page-specific weather metadata, and THE FTP NEWS auth titles. |
| Low, fixed | `npm run lint` was unusable with ESLint 9 because the repository had no flat config. | Added `eslint.config.js`; the lint command now runs. Two hook dependency warnings found during this work were corrected. |

## Verified Architecture

- React/Vite SPA routes and lazy page imports are in `src/App.jsx`; `public/_redirects` preserves SPA fallback.
- Supabase client is initialized only with `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in `src/supabase/config.js`.
- The weather writer targets `daily_weather_reports` with conflict key `report_date,city,country`; configured locations come from active `weather_locations` rows. The schema is in `supabase/schema.sql`.
- Netlify weather schedule remains daily at 00:30 UTC, now in `generate-weather-cron.js`, which queues the protected background function. Manual admin updates use the authenticated `generate-weather` function.
- AdSense loader remains in `index.html`; ad positions/content are managed through the existing `ads` table and Admin Panel.
- The repository has no existing Supabase Storage media workflow or audit-log table, so this pass did not add pretend media management or fabricated audit history.
- Supabase service-role credentials are read only by Netlify functions and are not embedded into frontend modules.

## Remaining Risks / Not Tested Against Production

- Real Supabase login, RLS, article create/edit/publish, profile roles, comments, likes, settings, and weather persistence need a deployed authenticated session; no production credentials were available to this audit.
- The weather generator now depends on correctly populated active `weather_locations`. Coverage is exactly those configured rows; this code does not infer all Indian districts.
- Open-Meteo live availability, 429 behavior, the Netlify daily schedule, and background execution limits were not exercised against Netlify. Mocked function tests verified the request/write flow only.
- The dynamic sitemap queries published rows with the public anon key and depends on the existing public-published article RLS policy. Deploy verification is required at `/sitemap.xml`.
- The article manager intentionally searches/pages the latest 100 records because the current API call is bounded to 100; it is not a server-paginated archive yet.
- The editor supports image URL preview, not direct file upload. No existing Storage bucket integration was found.
- The visitor analytics code records IP address and user-agent via `track-visit`; confirm the published privacy notice and local data-retention requirements match the intended practice.
- Browser-console checks, live internal-link crawling, visual screenshots on physical mobile devices, and production deployment checks remain pending.

## Verification Performed

- `npm run build`: passed after the UI and runtime changes.
- `npm run lint`: passed with no warnings after configuring ESLint 9 and resolving the two reported hook warnings.
- Weather mock smoke tests: missing token returned 401 without network access; active regular user returned 403; active admin flow wrote the expected six mock report rows to the existing table shape.
- Sitemap mock smoke test: returned XML containing static routes and a published article URL.
- No production Supabase write, production Netlify function invocation, or deploy was performed.
