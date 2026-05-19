import { Helmet } from 'react-helmet-async';

export default function Seo({ title, description, image, url, type = 'website' }) {
  const pageTitle = title || 'FTP News / KMC News Portal';
  const pageDescription = description || 'Latest news, analysis, and public interest stories.';

  return (
    <Helmet>
      <title>{pageTitle}</title>
      <meta name="description" content={pageDescription} />
      <meta property="og:title" content={pageTitle} />
      <meta property="og:description" content={pageDescription} />
      <meta property="og:type" content={type} />
      {image && <meta property="og:image" content={image} />}
      {url && <meta property="og:url" content={url} />}
      <meta name="twitter:card" content={image ? 'summary_large_image' : 'summary'} />
    </Helmet>
  );
}
