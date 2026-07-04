import { Bot, Send, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';

function htmlToText(html = '') {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  return doc.body.textContent?.replace(/\s+/g, ' ').trim() || '';
}

const starterQuestions = [
  'Is this article trustworthy?',
  'What is the main claim here?',
  'Which parts need source verification?',
];

export default function ArticleAIVerifyControls({ title, excerpt, html, sourceName, sourceURL }) {
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [busy, setBusy] = useState(false);
  const articleText = useMemo(() => htmlToText(html), [html]);

  async function askAI(customQuestion = question) {
    const finalQuestion = customQuestion.trim();
    if (!finalQuestion) {
      toast.error('Type a question first.');
      return;
    }
    setOpen(true);
    setBusy(true);
    setQuestion(finalQuestion);
    setAnswer('');
    try {
      const response = await fetch('/.netlify/functions/article-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: finalQuestion,
          title,
          excerpt,
          content: articleText,
          sourceName,
          sourceURL,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'AI answer failed.');
      setAnswer(data.answer);
      toast.success('AI answer ready.');
    } catch (error) {
      toast.error(error.message || 'AI answer failed.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="w-full rounded-lg border border-gray-200 bg-gray-50 p-2 sm:w-auto">
      <button className="btn-secondary h-10 px-4" onClick={() => setOpen(true)}>
        <Bot size={16} /> Ask AI
      </button>
      {open ? (
        <div className="mt-3 max-w-2xl rounded-md border border-red-100 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-extrabold uppercase tracking-wide text-brand-red">Ask AI About This Article</p>
              <p className="mt-1 text-xs text-gray-500">Ask about claims, source, context, or what needs verification.</p>
            </div>
            <button className="rounded-md p-1 text-gray-500 hover:bg-gray-100" onClick={() => setOpen(false)} aria-label="Close AI assistant">
              <X size={16} />
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {starterQuestions.map((item) => (
              <button key={item} className="rounded-full border border-gray-200 px-3 py-1.5 text-xs font-bold text-gray-700 hover:border-brand-red hover:text-brand-red" onClick={() => askAI(item)} disabled={busy}>
                {item}
              </button>
            ))}
          </div>
          <div className="mt-4 grid gap-2 sm:grid-cols-[1fr_auto]">
            <input
              className="input bg-white"
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              placeholder="Ask: Is this news verified? What source should I check?"
            />
            <button className="btn-primary" onClick={() => askAI()} disabled={busy}>
              <Send size={16} /> {busy ? 'Asking...' : 'Ask'}
            </button>
          </div>
          {answer ? (
            <div className="mt-4 rounded-lg border border-gray-200 bg-gray-50 p-4">
              <p className="whitespace-pre-line text-sm leading-6 text-gray-800">{answer}</p>
            </div>
          ) : null}
          <p className="mt-3 text-xs leading-5 text-gray-500">
            AI can help readers understand and verify claims, but final editorial verification should still use original sources.
          </p>
        </div>
      ) : null}
    </div>
  );
}
