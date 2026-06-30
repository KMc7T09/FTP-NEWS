import { SearchCheck, X } from 'lucide-react';
import { useState } from 'react';
import toast from 'react-hot-toast';

const factCheckApiKey = import.meta.env.VITE_GOOGLE_FACTCHECK_API_KEY || '';

function htmlToText(html = '') {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  return doc.body.textContent?.replace(/\s+/g, ' ').trim() || '';
}

function getClaimText({ title = '', excerpt = '', html = '' }) {
  return [title, excerpt, htmlToText(html)].filter(Boolean).join(' ').slice(0, 280);
}

export default function ArticleFactCheckControls({ title, excerpt, html }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [results, setResults] = useState([]);

  async function checkFacts() {
    setOpen(true);
    if (!factCheckApiKey) {
      toast.error('Fact Check API key is not configured.');
      return;
    }

    setBusy(true);
    try {
      const query = getClaimText({ title, excerpt, html });
      const url = new URL('https://factchecktools.googleapis.com/v1alpha1/claims:search');
      url.searchParams.set('query', query);
      url.searchParams.set('languageCode', 'en');
      url.searchParams.set('pageSize', '5');
      url.searchParams.set('key', factCheckApiKey);

      const response = await fetch(url);
      if (!response.ok) throw new Error('Fact-check lookup failed.');
      const data = await response.json();
      setResults(data.claims || []);
      toast.success(data.claims?.length ? 'Fact-check results loaded.' : 'No matching fact-check found.');
    } catch (error) {
      toast.error(error.message || 'Fact-check lookup failed.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="w-full rounded-lg border border-gray-200 bg-gray-50 p-2 sm:w-auto">
      <button className="btn-secondary h-10 px-4" onClick={checkFacts} disabled={busy}>
        <SearchCheck size={16} /> {busy ? 'Checking...' : 'Fact Check'}
      </button>
      {open ? (
        <div className="mt-3 max-w-2xl rounded-md border border-red-100 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between gap-3">
            <p className="text-sm font-extrabold uppercase tracking-wide text-brand-red">Fact Check Lookup</p>
            <button className="rounded-md p-1 text-gray-500 hover:bg-gray-100" onClick={() => setOpen(false)} aria-label="Close fact check">
              <X size={16} />
            </button>
          </div>
          {!factCheckApiKey ? (
            <div className="rounded-lg bg-yellow-50 p-3 text-sm leading-6 text-yellow-900">
              Add <strong>VITE_GOOGLE_FACTCHECK_API_KEY</strong> in Netlify environment variables to enable free Google Fact Check Tools lookup.
            </div>
          ) : results.length ? (
            <div className="space-y-3">
              {results.map((claim) => {
                const review = claim.claimReview?.[0] || {};
                return (
                  <a
                    key={`${claim.text}-${review.url}`}
                    href={review.url}
                    target="_blank"
                    rel="noreferrer"
                    className="block rounded-lg border border-gray-200 p-3 hover:border-brand-red hover:bg-red-50/40"
                  >
                    <p className="text-sm font-extrabold text-gray-950">{claim.text}</p>
                    <p className="mt-1 text-xs font-semibold text-gray-500">
                      {review.publisher?.name || 'Fact-check source'} {review.textualRating ? `- ${review.textualRating}` : ''}
                    </p>
                    {claim.claimant ? <p className="mt-1 text-xs text-gray-500">Claimant: {claim.claimant}</p> : null}
                  </a>
                );
              })}
            </div>
          ) : (
            <p className="text-sm leading-6 text-gray-600">No matching published fact-check found for this article claim.</p>
          )}
          <p className="mt-3 text-xs text-gray-500">This checks public fact-check databases. It does not replace editorial verification.</p>
        </div>
      ) : null}
    </div>
  );
}
