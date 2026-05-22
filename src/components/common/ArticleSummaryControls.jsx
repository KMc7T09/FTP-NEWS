import { Sparkles, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';

function htmlToText(html = '') {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  return doc.body.textContent?.replace(/\s+/g, ' ').trim() || '';
}

function splitSentences(text = '') {
  return text
    .replace(/\s+/g, ' ')
    .split(/(?<=[.!?।])\s+/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length > 35);
}

function getKeywords(text = '') {
  const stopWords = new Set([
    'about', 'after', 'again', 'also', 'because', 'before', 'being', 'between', 'could', 'from', 'have', 'into', 'more', 'over', 'said', 'that', 'their', 'there', 'these', 'this', 'through', 'under', 'were', 'what', 'when', 'where', 'which', 'while', 'with', 'would',
    'and', 'for', 'the', 'are', 'was', 'has', 'had', 'not', 'but', 'you', 'your', 'they', 'them', 'his', 'her', 'its', 'our',
  ]);
  const counts = new Map();
  text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((word) => word.length > 3 && !stopWords.has(word))
    .forEach((word) => counts.set(word, (counts.get(word) || 0) + 1));
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 14).map(([word]) => word);
}

function summarizeArticle({ title = '', excerpt = '', html = '' }) {
  const bodyText = htmlToText(html);
  const fullText = [title, excerpt, bodyText].filter(Boolean).join('. ');
  const sentences = splitSentences(fullText);
  if (!sentences.length) return [];

  const keywords = getKeywords(fullText);
  const scored = sentences.map((sentence, index) => {
    const lower = sentence.toLowerCase();
    const keywordScore = keywords.reduce((score, keyword) => score + (lower.includes(keyword) ? 2 : 0), 0);
    const positionScore = index < 3 ? 4 - index : 0;
    const lengthScore = sentence.length > 260 ? -2 : 1;
    return { sentence, index, score: keywordScore + positionScore + lengthScore };
  });

  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, 4)
    .sort((a, b) => a.index - b.index)
    .map((item) => item.sentence);
}

export default function ArticleSummaryControls({ title, excerpt, html, translatedTitle, translatedExcerpt, translatedHtml }) {
  const [open, setOpen] = useState(false);
  const [summary, setSummary] = useState([]);
  const visibleArticle = useMemo(
    () => ({
      title: translatedTitle || title,
      excerpt: translatedExcerpt || excerpt,
      html: translatedHtml || html,
    }),
    [excerpt, html, title, translatedExcerpt, translatedHtml, translatedTitle],
  );

  function createSummary() {
    const result = summarizeArticle(visibleArticle);
    if (!result.length) {
      toast.error('Article summary could not be created.');
      return;
    }
    setSummary(result);
    setOpen(true);
    toast.success('Article summary ready.');
  }

  return (
    <div className="w-full rounded-lg border border-gray-200 bg-gray-50 p-2 sm:w-auto">
      <button className="btn-secondary h-10 px-4" onClick={createSummary}>
        <Sparkles size={16} /> Summarize
      </button>
      {open ? (
        <div className="mt-3 rounded-md border border-red-100 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between gap-3">
            <p className="text-sm font-extrabold uppercase tracking-wide text-brand-red">Quick Summary</p>
            <button className="rounded-md p-1 text-gray-500 hover:bg-gray-100" onClick={() => setOpen(false)} aria-label="Close summary">
              <X size={16} />
            </button>
          </div>
          <ul className="space-y-2 text-sm leading-6 text-gray-800">
            {summary.map((point) => (
              <li key={point} className="flex gap-2">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-red" />
                <span>{point}</span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-gray-500">Free smart summary generated in your browser.</p>
        </div>
      ) : null}
    </div>
  );
}
