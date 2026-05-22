import { Pause, Play, Square } from 'lucide-react';
import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { translateLongText } from './InlineTranslate.jsx';

const languages = [
  ['en', 'English', 'en-IN'],
  ['hi', 'Hindi', 'hi-IN'],
  ['or', 'Odia', 'or-IN'],
  ['bn', 'Bengali', 'bn-IN'],
  ['ta', 'Tamil', 'ta-IN'],
  ['te', 'Telugu', 'te-IN'],
  ['mr', 'Marathi', 'mr-IN'],
  ['gu', 'Gujarati', 'gu-IN'],
  ['pa', 'Punjabi', 'pa-IN'],
  ['ur', 'Urdu', 'ur-IN'],
];

function htmlToText(html = '') {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  return doc.body.textContent?.replace(/\s+/g, ' ').trim() || '';
}

function stopSpeech() {
  window.speechSynthesis?.cancel();
}

export default function ArticleListenControls({ title, excerpt, html, translatedTitle, translatedExcerpt, translatedHtml }) {
  const [target, setTarget] = useState('en');
  const [busy, setBusy] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const lang = useMemo(() => languages.find(([code]) => code === target) || languages[0], [target]);

  async function getSpeechText() {
    const visibleTitle = translatedTitle || title || '';
    const visibleExcerpt = translatedExcerpt || excerpt || '';
    const visibleBody = htmlToText(translatedHtml || html);
    const text = [visibleTitle, visibleExcerpt, visibleBody].filter(Boolean).join('. ');
    if (target === 'en' || translatedHtml) return text;
    return translateLongText(text, target);
  }

  async function play() {
    if (!('speechSynthesis' in window)) {
      toast.error('Audio reading is not supported in this browser.');
      return;
    }
    setBusy(true);
    try {
      stopSpeech();
      const text = await getSpeechText();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = lang[2];
      utterance.rate = 0.95;
      utterance.pitch = 1;
      utterance.onend = () => setSpeaking(false);
      utterance.onerror = () => setSpeaking(false);
      window.speechSynthesis.speak(utterance);
      setSpeaking(true);
      toast.success(`Reading in ${lang[1]}.`);
    } catch (error) {
      toast.error(error.message || 'Could not start audio.');
    } finally {
      setBusy(false);
    }
  }

  function pauseResume() {
    if (!window.speechSynthesis) return;
    if (window.speechSynthesis.paused) window.speechSynthesis.resume();
    else window.speechSynthesis.pause();
  }

  function stop() {
    stopSpeech();
    setSpeaking(false);
  }

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 p-2">
      <span className="px-2 text-sm font-bold text-gray-700">Listen</span>
      <select className="h-10 rounded-md border border-gray-200 bg-white px-3 text-sm font-semibold outline-none" value={target} onChange={(event) => setTarget(event.target.value)}>
        {languages.map(([code, label]) => (
          <option key={code} value={code}>{label}</option>
        ))}
      </select>
      <button className="btn-primary h-10 px-4" onClick={play} disabled={busy}>
        <Play size={16} /> {busy ? 'Preparing...' : 'Play'}
      </button>
      {speaking ? (
        <>
          <button className="btn-secondary h-10 px-3" onClick={pauseResume}>
            <Pause size={16} /> Pause
          </button>
          <button className="btn-secondary h-10 px-3" onClick={stop}>
            <Square size={16} /> Stop
          </button>
        </>
      ) : null}
    </div>
  );
}
