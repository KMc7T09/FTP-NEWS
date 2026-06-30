import { ExternalLink, SearchCheck, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';

const factCheckApiKey = import.meta.env.VITE_GOOGLE_FACTCHECK_API_KEY || '';

function htmlToText(html = '') {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  return doc.body.textContent?.replace(/\s+/g, ' ').trim() || '';
}

function cleanQuery(value = '') {
  return String(value)
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 180);
}

function getQueryCandidates({ manualClaim = '', title = '', excerpt = '', html = '' }) {
  const bodyText = htmlToText(html);
  return [
    manualClaim,
    title,
    excerpt,
    `${title} ${excerpt}`,
    bodyText.split(/[.!?।]\s+/).find((sentence) => sentence.length > 40),
  ]
    .map(cleanQuery)
    .filter(Boolean)
    .filter((query, index, all) => all.indexOf(query) === index);
}

async function searchFactChecks(query) {
  const url = new URL('https://factchecktools.googleapis.com/v1alpha1/claims:search');
  url.searchParams.set('query', query);
  url.searchParams.set('pageSize', '10');
  url.searchParams.set('key', factCheckApiKey);

  const response = await fetch(url);
  if (!response.ok) {
    const message = response.status === 403
      ? 'Fact Check API key is blocked or restricted incorrectly.'
      : 'Fact-check lookup failed.';
    throw new Error(message);
  }
  const data = await response.json();
  return data.claims || [];
}

export default function ArticleFactCheckControls({ title, excerpt, html }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [results, setResults] = useState([]);
  const [lastQuery, setLastQuery] = useState('');
  const [manualClaim, setManualClaim] = useState('');
  const defaultClaim = useMemo(() => cleanQuery(title || excerpt || htmlToText(html)), [excerpt, html, title]);

  async function checkFacts() {
    setOpen(true);
    if (!factCheckApiKey) {
      toast.error('Fact Check API key is not configured.');
      return;
    }

    setBusy(true);
    try {
      const queries = getQueryCandidates({ manualClaim: manualClaim || defaultClaim, title, excerpt, html });
      let found = [];
      let usedQuery = queries[0] || '';

      for (const query of queries) {
        found = await searchFactChecks(query);
        usedQuery = query;
        if (found.length) break;
      }

      const unique = found.filter((claim, index, all) => all.findIndex((item) => item.text === claim.text) === index);
      setResults(unique);
      setLastQuery(usedQuery);
      toast.success(unique.length ? 'Fact-check results loaded.' : 'No external match found. Try a shorter exact claim.');
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
          ) : (
            <>
              <div className="mb-4 rounded-lg border border-gray-200 bg-gray-50 p-3">
                <label className="text-xs font-extrabold uppercase tracking-wide text-gray-500">Exact claim to check</label>
                <div className="mt-2 grid gap-2 sm:grid-cols-[1fr_auto]">
                  <input
                    className="input bg-white"
                    value={manualClaim}
                    onChange={(event) => setManualClaim(event.target.value)}
                    placeholder={defaultClaim || 'Example: EVM hacked in India election'}
                  />
                  <button className="btn-primary" onClick={checkFacts} disabled={busy}>
                    <SearchCheck size={16} /> {busy ? 'Checking...' : 'Search'}
                  </button>
                </div>
                {lastQuery ? <p className="mt-2 text-xs text-gray-500">Last searched: {lastQuery}</p> : null}
              </div>

              {results.length ? (
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
                <div className="rounded-lg bg-gray-50 p-3 text-sm leading-6 text-gray-700">
                  <p>No external fact-check match found yet. Try a short exact claim, not the full article title.</p>
                  <a
                    href={`https://toolbox.google.com/factcheck/explorer/search/${encodeURIComponent(manualClaim || defaultClaim || title)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-2 inline-flex items-center gap-2 font-bold text-brand-blue hover:text-brand-red"
                  >
                    Open Google Fact Check Explorer <ExternalLink size={14} />
                  </a>
                </div>
              )}
            </>
          )}
          <p className="mt-3 text-xs text-gray-500">This checks public fact-check databases. It does not replace editorial verification.</p>
        </div>
      ) : null}
    </div>
  );
}
