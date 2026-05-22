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

export default function ArticleListenControls({ title, excerpt, html }) {
  const [target, setTarget] = useState('en');
  const [busy, setBusy] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [paused, setPaused] = useState(false);
  const queueRef = useRef([]);
  const voiceRef = useRef(null);
  const activeRef = useRef(false);
  const audioRef = useRef(null);
  const modeRef = useRef('speech');
  const lang = useMemo(() => languages.find(([code]) => code === target) || languages[0], [target]);

  useEffect(() => {
    return () => stop();
  }, []);

  async function getSpeechText() {
    const text = [title || '', excerpt || '', htmlToText(html)].filter(Boolean).join('. ');
    if (target === 'en') return text;
    return translateLongText(text, target);
  }

  function finishAudio() {
    audioRef.current = null;
    activeRef.current = false;
    setSpeaking(false);
    setPaused(false);
  }

  function playNextBrowserChunk() {
    if (!activeRef.current) return;
    const nextText = queueRef.current.shift();
    if (!nextText) {
      finishAudio();
      return;
    }

    const utterance = new SpeechSynthesisUtterance(nextText);
    utterance.lang = lang[2];
    utterance.voice = voiceRef.current;
    utterance.rate = 0.92;
    utterance.pitch = 1;
    utterance.volume = 1;
    utterance.onend = playNextBrowserChunk;
    utterance.onerror = () => {
      finishAudio();
      toast.error('Audio could not play on this device/browser.');
    };
    window.speechSynthesis.speak(utterance);
  }

  function playNextIndianLanguageChunk() {
    if (!activeRef.current) return;
    const nextText = queueRef.current.shift();
    if (!nextText) {
      finishAudio();
      return;
    }

    const audio = new Audio(`https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=${target}&q=${encodeURIComponent(nextText)}`);
    audioRef.current = audio;
    audio.onended = playNextIndianLanguageChunk;
    audio.onerror = () => {
      finishAudio();
      toast.error('This language audio is blocked here. Try Chrome or Edge.');
    };
    audio.play().catch(() => {
      finishAudio();
      toast.error('Tap Play again or allow audio in this browser.');
    });
  }

  async function play() {
    setBusy(true);
    try {
      stop();
      const text = await getSpeechText();
      queueRef.current = splitSpeechText(text, target === 'en' ? 220 : 170);
      if (!queueRef.current.length) throw new Error('No article text found for audio.');
      activeRef.current = true;
      setSpeaking(true);
      setPaused(false);

      if (target === 'en') {
        if (!('speechSynthesis' in window)) throw new Error('Audio reading is not supported in this browser.');
        modeRef.current = 'speech';
        const voices = await waitForVoices();
        voiceRef.current = chooseVoice(voices, lang[2]);
        playNextBrowserChunk();
      } else {
        modeRef.current = 'audio';
        playNextIndianLanguageChunk();
      }
      toast.success(`Playing article in ${lang[1]}.`);
    } catch (error) {
      toast.error(error.message || 'Could not start audio.');
    } finally {
      setBusy(false);
    }
  }

  function pauseResume() {
    if (modeRef.current === 'audio') {
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
