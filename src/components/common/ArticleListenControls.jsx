import { Pause, Play, Square } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
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

function splitSpeechText(text = '') {
  const cleanText = text.replace(/\s+/g, ' ').trim();
  if (!cleanText) return [];
  const sentences = cleanText.match(/[^.!?।]+[.!?।]?/g) || [cleanText];
  const chunks = [];
  let current = '';

  sentences.forEach((sentence) => {
    const next = `${current} ${sentence}`.trim();
    if (next.length > 220 && current) {
      chunks.push(current);
      current = sentence.trim();
    } else {
      current = next;
    }
  });

  if (current) chunks.push(current);
  return chunks;
}

function waitForVoices() {
  if (!('speechSynthesis' in window)) return Promise.resolve([]);
  const voices = window.speechSynthesis.getVoices();
  if (voices.length) return Promise.resolve(voices);

  return new Promise((resolve) => {
    const timer = window.setTimeout(() => resolve(window.speechSynthesis.getVoices()), 800);
    window.speechSynthesis.onvoiceschanged = () => {
      window.clearTimeout(timer);
      resolve(window.speechSynthesis.getVoices());
    };
  });
}

function chooseVoice(voices, langCode) {
  const prefix = langCode.split('-')[0].toLowerCase();
  return (
    voices.find((voice) => voice.lang?.toLowerCase() === langCode.toLowerCase()) ||
    voices.find((voice) => voice.lang?.toLowerCase().startsWith(prefix)) ||
    voices.find((voice) => voice.lang?.toLowerCase().startsWith('en')) ||
    voices[0] ||
    null
  );
}

export default function ArticleListenControls({ title, excerpt, html, translatedTitle, translatedExcerpt, translatedHtml }) {
  const [target, setTarget] = useState('en');
  const [busy, setBusy] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [paused, setPaused] = useState(false);
  const queueRef = useRef([]);
  const voiceRef = useRef(null);
  const activeRef = useRef(false);
  const utteranceRef = useRef(null);
  const lang = useMemo(() => languages.find(([code]) => code === target) || languages[0], [target]);

  useEffect(() => {
    return () => stop();
  }, []);

  async function getSpeechText() {
    const visibleTitle = translatedTitle || title || '';
    const visibleExcerpt = translatedExcerpt || excerpt || '';
    const visibleBody = htmlToText(translatedHtml || html);
    const text = [visibleTitle, visibleExcerpt, visibleBody].filter(Boolean).join('. ');
    if (target === 'en' || translatedHtml) return text;
    return translateLongText(text, target);
  }

  function speakNextChunk() {
    if (!activeRef.current) return;
    const nextText = queueRef.current.shift();
    if (!nextText) {
      utteranceRef.current = null;
      activeRef.current = false;
      setSpeaking(false);
      setPaused(false);
      return;
    }

    const utterance = new SpeechSynthesisUtterance(nextText);
    utterance.lang = lang[2];
    utterance.voice = voiceRef.current;
    utterance.rate = 0.92;
    utterance.pitch = 1;
    utterance.volume = 1;
    utterance.onend = speakNextChunk;
    utterance.onerror = () => {
      activeRef.current = false;
      setSpeaking(false);
      setPaused(false);
      toast.error('Audio could not play on this device/browser.');
    };
    utteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  }

  async function play() {
    if (!('speechSynthesis' in window)) {
      toast.error('Audio reading is not supported in this browser.');
      return;
    }
    setBusy(true);
    try {
      stop();
      const voices = await waitForVoices();
      voiceRef.current = chooseVoice(voices, lang[2]);
      const text = await getSpeechText();
      queueRef.current = splitSpeechText(text);
      if (!queueRef.current.length) throw new Error('No article text found for audio.');
      activeRef.current = true;
      setSpeaking(true);
      setPaused(false);
      speakNextChunk();
      toast.success(`Playing article in ${lang[1]}.`);
    } catch (error) {
      toast.error(error.message || 'Could not start audio.');
    } finally {
      setBusy(false);
    }
  }

  function pauseResume() {
    if (!window.speechSynthesis) return;
    if (window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
      setPaused(false);
    } else {
      window.speechSynthesis.pause();
      setPaused(true);
    }
  }

  function stop() {
    activeRef.current = false;
    queueRef.current = [];
    utteranceRef.current = null;
    window.speechSynthesis?.cancel();
    setSpeaking(false);
    setPaused(false);
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
            <Pause size={16} /> {paused ? 'Resume' : 'Pause'}
          </button>
          <button className="btn-secondary h-10 px-3" onClick={stop}>
            <Square size={16} /> Stop
          </button>
        </>
      ) : null}
    </div>
  );
}
