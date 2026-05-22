import { Pause, Play, Square } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { translateHtmlPreservingFormat, translateLongText } from './InlineTranslate.jsx';

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

function splitSpeechText(text = '', maxLength = 220) {
  const cleanText = text.replace(/\s+/g, ' ').trim();
  if (!cleanText) return [];
  const sentences = cleanText.match(/[^.!?]+[.!?]?/g) || [cleanText];
  const chunks = [];
  let current = '';

  sentences.forEach((sentence) => {
    const next = `${current} ${sentence}`.trim();
    if (next.length > maxLength && current) {
      chunks.push(current);
      current = sentence.trim();
    } else {
      current = next;
    }
  });

  if (current) chunks.push(current);
  return chunks.flatMap((chunk) => {
    if (chunk.length <= maxLength) return [chunk];
    const pieces = [];
    for (let index = 0; index < chunk.length; index += maxLength) {
      pieces.push(chunk.slice(index, index + maxLength));
    }
    return pieces;
  });
}

function waitForVoices() {
  if (!('speechSynthesis' in window)) return Promise.resolve([]);
  const voices = window.speechSynthesis.getVoices();
  if (voices.length) return Promise.resolve(voices);

  return new Promise((resolve) => {
    const timer = window.setTimeout(() => resolve(window.speechSynthesis.getVoices()), 1000);
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
    null
  );
}

export default function ArticleListenControls({
  title,
  excerpt,
  html,
  translatedTitle,
  translatedExcerpt,
  translatedHtml,
  onTranslated,
  onTitleTranslated,
  onExcerptTranslated,
  onReset,
}) {
  const [target, setTarget] = useState('en');
  const [busy, setBusy] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [paused, setPaused] = useState(false);
  const [activeText, setActiveText] = useState('');
  const queueRef = useRef([]);
  const voiceRef = useRef(null);
  const activeRef = useRef(false);
  const audioRef = useRef(null);
  const modeRef = useRef('speech');
  const lang = useMemo(() => languages.find(([code]) => code === target) || languages[0], [target]);

  useEffect(() => {
    return () => stop();
  }, []);

  async function translateArticleForReading() {
    if (target === 'en') {
      onReset?.();
      return {
        speechText: [title || '', excerpt || '', htmlToText(html)].filter(Boolean).join('. '),
      };
    }

    const alreadyTranslated = translatedHtml && translatedTitle && translatedExcerpt;
    if (alreadyTranslated) {
      return {
        speechText: [translatedTitle, translatedExcerpt, htmlToText(translatedHtml)].filter(Boolean).join('. '),
      };
    }

    const [nextTitle, nextExcerpt, nextHtml] = await Promise.all([
      title ? translateLongText(title, target) : Promise.resolve(''),
      excerpt ? translateLongText(excerpt, target) : Promise.resolve(''),
      translateHtmlPreservingFormat(html, target),
    ]);
    onTitleTranslated?.(nextTitle);
    onExcerptTranslated?.(nextExcerpt);
    onTranslated?.(nextHtml);

    return {
      speechText: [nextTitle, nextExcerpt, htmlToText(nextHtml)].filter(Boolean).join('. '),
    };
  }

  function finishReading() {
    activeRef.current = false;
    setSpeaking(false);
    setPaused(false);
    setActiveText('');
  }

  function speakNextChunk() {
    if (!activeRef.current) return;
    const nextText = queueRef.current.shift();
    if (!nextText) {
      finishReading();
      return;
    }

    setActiveText(nextText);
    const utterance = new SpeechSynthesisUtterance(nextText);
    utterance.lang = lang[2];
    utterance.voice = voiceRef.current;
    utterance.rate = 0.9;
    utterance.pitch = 1;
    utterance.volume = 1;
    utterance.onend = speakNextChunk;
    utterance.onerror = () => {
      finishReading();
      toast.error('Audio could not play on this device/browser.');
    };
    window.speechSynthesis.speak(utterance);
  }

  function playNextFunctionAudioChunk() {
    if (!activeRef.current) return;
    const nextText = queueRef.current.shift();
    if (!nextText) {
      finishReading();
      return;
    }

    setActiveText(nextText);
    const audio = new Audio(`/.netlify/functions/tts?tl=${target}&q=${encodeURIComponent(nextText)}`);
    audioRef.current = audio;
    audio.onended = playNextFunctionAudioChunk;
    audio.onerror = () => {
      finishReading();
      toast.error('Odia audio could not load. Deploy latest code to Netlify and try again.');
    };
    audio.play().catch(() => {
      finishReading();
      toast.error('Tap Play again or allow audio in this browser.');
    });
  }

  async function play() {
    if (!('speechSynthesis' in window)) {
      toast.error('Audio reading is not supported in this browser.');
      return;
    }

    setBusy(true);
    try {
      stop();
      const { speechText } = await translateArticleForReading();
      queueRef.current = splitSpeechText(speechText, target === 'en' ? 210 : 170);
      if (!queueRef.current.length) throw new Error('No article text found for audio.');

      activeRef.current = true;
      setSpeaking(true);
      setPaused(false);
      if (target === 'en') {
        modeRef.current = 'speech';
        const voices = await waitForVoices();
        voiceRef.current = chooseVoice(voices, lang[2]);
        if (!voiceRef.current) throw new Error('English voice is not installed in this browser/device.');
        speakNextChunk();
      } else {
        modeRef.current = 'function-audio';
        playNextFunctionAudioChunk();
      }
      toast.success(`Playing and highlighting in ${lang[1]}.`);
    } catch (error) {
      toast.error(error.message || 'Could not start audio.');
    } finally {
      setBusy(false);
    }
  }

  function pauseResume() {
    if (modeRef.current === 'function-audio') {
      if (!audioRef.current) return;
      if (audioRef.current.paused) {
        audioRef.current.play();
        setPaused(false);
      } else {
        audioRef.current.pause();
        setPaused(true);
      }
      return;
    }

    if (window.speechSynthesis?.paused) {
      window.speechSynthesis.resume();
      setPaused(false);
    } else {
      window.speechSynthesis?.pause();
      setPaused(true);
    }
  }

  function stop() {
    activeRef.current = false;
    queueRef.current = [];
    audioRef.current?.pause();
    audioRef.current = null;
    window.speechSynthesis?.cancel();
    setSpeaking(false);
    setPaused(false);
    setActiveText('');
  }

  return (
    <div className="w-full rounded-lg border border-gray-200 bg-gray-50 p-2 sm:w-auto">
      <div className="flex flex-wrap items-center gap-2">
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
      {activeText ? (
        <div className="mt-3 rounded-md border-l-4 border-brand-red bg-white p-3 text-sm font-semibold leading-6 text-gray-800 shadow-sm">
          <span className="mr-2 text-xs font-extrabold uppercase tracking-wide text-brand-red">Now reading</span>
          {activeText}
        </div>
      ) : null}
    </div>
  );
}
