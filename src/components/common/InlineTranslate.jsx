import { Languages } from 'lucide-react';
import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';

const languages = [
  ['hi', 'Hindi'],
  ['or', 'Odia'],
  ['bn', 'Bengali'],
  ['ta', 'Tamil'],
  ['te', 'Telugu'],
  ['mr', 'Marathi'],
  ['gu', 'Gujarati'],
  ['pa', 'Punjabi'],
  ['ur', 'Urdu'],
  ['en', 'English'],
];

function htmlToText(html = '') {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  return doc.body.textContent?.replace(/\s+/g, ' ').trim() || '';
}

function escapeHtml(text = '') {
  return text.replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[char]);
}

async function translateChunk(text, target) {
  const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${target}&dt=t&q=${encodeURIComponent(text)}`;
  const response = await fetch(url);
  if (!response.ok) throw new Error('Translation service is not responding.');
  const data = await response.json();
  return (data?.[0] || []).map((part) => part?.[0] || '').join('');
}

export async function translateLongText(text, target) {
  const chunks = [];
  for (let index = 0; index < text.length; index += 2500) {
    chunks.push(text.slice(index, index + 2500));
  }
  const translated = [];
  for (const chunk of chunks) {
    translated.push(await translateChunk(chunk, target));
  }
  return translated.join(' ');
}

function getTranslatableNodes(html = '') {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const nodes = Array.from(doc.body.querySelectorAll('h2,h3,h4,p,li,blockquote')).filter((node) => node.textContent?.trim());
  return { doc, nodes: nodes.length ? nodes : [doc.body] };
}

export async function translateHtmlPreservingFormat(html, target) {
  const { doc, nodes } = getTranslatableNodes(html);
  for (const node of nodes) {
    const original = node.textContent?.replace(/\s+/g, ' ').trim();
    if (original) node.textContent = await translateLongText(original, target);
  }
  const output = doc.body.innerHTML.trim();
  return output || `<p>${escapeHtml(await translateLongText(htmlToText(html), target))}</p>`;
}

export default function InlineTranslate({
  html,
  title = '',
  excerpt = '',
  officialOdiaTitle = '',
  officialOdiaExcerpt = '',
  officialOdiaHtml = '',
  onTranslated,
  onTitleTranslated,
  onExcerptTranslated,
  onReset,
}) {
  const [target, setTarget] = useState('hi');
  const [busy, setBusy] = useState(false);
  const selectedLabel = useMemo(() => languages.find(([code]) => code === target)?.[1] || 'Hindi', [target]);

  async function translate() {
    setBusy(true);
    try {
      if (target === 'en') {
        onReset?.();
        toast.success('Original article restored.');
        return;
      }
      if (target === 'or' && (officialOdiaTitle || officialOdiaExcerpt || officialOdiaHtml)) {
        if (officialOdiaTitle) onTitleTranslated?.(officialOdiaTitle);
        if (officialOdiaExcerpt) onExcerptTranslated?.(officialOdiaExcerpt);
        if (officialOdiaHtml) onTranslated?.(officialOdiaHtml);
        toast.success('Official Odia version loaded.');
        return;
      }
      const sourceText = htmlToText(html);
      if (!sourceText) throw new Error('No article text found.');
      const [translatedTitle, translatedExcerpt, translatedHtml] = await Promise.all([
        title ? translateLongText(title, target) : Promise.resolve(''),
        excerpt ? translateLongText(excerpt, target) : Promise.resolve(''),
        translateHtmlPreservingFormat(html, target),
      ]);
      if (translatedTitle) onTitleTranslated?.(translatedTitle);
      if (translatedExcerpt) onExcerptTranslated?.(translatedExcerpt);
      onTranslated?.(translatedHtml);
      toast.success(`Article translated to ${selectedLabel}.`);
    } catch (error) {
      toast.error(error.message || 'Translation failed.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 p-2">
      <div className="flex items-center gap-2 px-2 text-sm font-bold text-gray-700">
        <Languages size={17} className="text-brand-red" />
        Article language
      </div>
      <select className="h-10 rounded-md border border-gray-200 bg-white px-3 text-sm font-semibold outline-none" value={target} onChange={(event) => setTarget(event.target.value)}>
        {languages.map(([code, label]) => (
          <option key={code} value={code}>{label}</option>
        ))}
      </select>
      <button className="btn-primary h-10 px-4" onClick={translate} disabled={busy}>
        {busy ? 'Translating...' : target === 'en' ? 'Show Original' : 'Translate Article'}
      </button>
    </div>
  );
}
