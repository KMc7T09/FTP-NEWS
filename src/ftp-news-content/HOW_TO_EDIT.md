# FTP NEWS Edit Folder

Open this folder when you want to update the website:

`src/ftp-news-content`

## Article File

Edit articles here:

`articles.js`

## Category File

Edit categories here:

`categories.js`

## Add New Article

1. Open `articles.js`.
2. Copy one full article block.
3. Paste it above the old articles.
4. Change:
   - `id`
   - `title`
   - `slug`
   - `excerpt`
   - `content`
   - `featuredImageURL`
   - `categoryId`
   - `categoryName`
   - `categorySlug`
   - `tags`
   - `authorName`
   - `publishedAt`
5. Keep `status: 'published'`.
6. Run `npm run build`.
7. Push to GitHub.
8. Netlify will update the website.

## Important

Use a different `id` and `slug` for every article.
