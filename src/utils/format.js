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

export function readTime(content = '') {
  const words = String(content).replace(/<[^>]+>/g, ' ').trim().split(/\s+/).filter(Boolean).length;
  return `${Math.max(1, Math.ceil(words / 220))} min read`;
}

export function excerptFrom(content = '', max = 160) {
  const text = String(content).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  return text.length > max ? `${text.slice(0, max - 1)}...` : text;
}
