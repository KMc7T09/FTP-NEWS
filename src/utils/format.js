import { format } from 'date-fns';

export function formatDate(value) {
  if (!value) return 'Unpublished';
  const date = value?.toDate ? value.toDate() : new Date(value);
  return Number.isNaN(date.getTime()) ? 'Unpublished' : format(date, 'MMM d, yyyy');
}

export function formatDateTime(value) {
  if (!value) return '-';
  const date = value?.toDate ? value.toDate() : new Date(value);
  return Number.isNaN(date.getTime()) ? '-' : format(date, 'MMM d, yyyy, h:mm a');
}

export function indiaDateDaysAgo(days = 0) {
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());
  const date = new Date(`${today}T00:00:00+05:30`);
  date.setUTCDate(date.getUTCDate() - Math.max(0, Number(days) || 0));
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(date);
}

export function readTime(content = '') {
  const words = String(content).replace(/<[^>]+>/g, ' ').trim().split(/\s+/).filter(Boolean).length;
  return `${Math.max(1, Math.ceil(words / 220))} min read`;
}

export function excerptFrom(content = '', max = 160) {
  const text = String(content).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  return text.length > max ? `${text.slice(0, max - 1)}...` : text;
}

export function cleanAuthorName(value = '', fallback = 'R.C. Khotei') {
  const cleaned = String(value || '')
    .replace(/\bkmc\s*7\s*t\s*09\b/gi, '')
    .replace(/\bkmc7t09\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim();

  return cleaned || fallback;
}
