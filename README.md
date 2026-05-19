# FTP NEWS

FTP NEWS is now configured for GitHub + Netlify static publishing.

Frontend runs on GitHub + Netlify. Supabase stores auth, users, articles, comments, ads, settings, and roles.

## Run Locally

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

## Publish Articles

Read `PUBLISHING_GUIDE.md`.

Short version:

Use the admin panel after Supabase setup:

1. Login as admin.
2. Open `/admin/dashboard`.
3. Create categories and articles.
4. Editors can login and publish articles.

## Netlify

The `netlify.toml` file is included.

- Build command: `npm run build`
- Publish directory: `dist`

## Supabase

Run the SQL in `supabase/schema.sql` inside Supabase SQL Editor, then add `.env` values:

```bash
VITE_SUPABASE_URL=your-project-url
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_BOOTSTRAP_ADMIN_EMAILS=your-email@example.com
```
