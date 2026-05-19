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
