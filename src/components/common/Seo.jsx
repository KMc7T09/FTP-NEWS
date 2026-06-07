import { Helmet } from 'react-helmet-async';

export default function Seo({ title, description, image, url, type = 'website', jsonLd }) {
  const pageTitle = title || 'FTP | Fresh Take Politics - Independent News, Politics & Opinion';
  const pageDescription = description || 'Fresh Take Politics is an independent digital news platform covering politics, India, Odisha, public issues, youth voices, opinion and fact-check stories.';
  const canonical = url || (typeof window !== 'undefined' ? window.location.href : '');

  return (
    <Helmet>
      <title>{pageTitle}</title>
      <meta name="description" content={pageDescription} />
      {canonical && <link rel="canonical" href={canonical} />}
      <meta property="og:title" content={pageTitle} />
      <meta property="og:description" content={pageDescription} />
      <meta property="og:type" content={type} />
      {image && <meta property="og:image" content={image} />}
      {canonical && <meta property="og:url" content={canonical} />}
      <meta name="twitter:card" content={image ? 'summary_large_image' : 'summary'} />
      <meta name="twitter:title" content={pageTitle} />
      <meta name="twitter:description" content={pageDescription} />
      {image && <meta name="twitter:image" content={image} />}
      {jsonLd && <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>}
    </Helmet>
  );
}
