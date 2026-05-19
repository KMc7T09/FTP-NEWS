import { useEffect, useState } from 'react';
import { getFeaturedArticles, getPublishedArticles, getTrendingArticles } from '../data/demoContent.js';
import { listArticles } from '../supabase/api.js';

export function usePublishedArticles(count = 12) {
  const [state, setState] = useState({ data: getPublishedArticles().slice(0, count), loading: true, error: null });
  useEffect(() => {
    listArticles({ publishedOnly: true, limit: count })
      .then((rows) => setState({ data: rows.length ? rows : getPublishedArticles().slice(0, count), loading: false, error: null }))
      .catch((error) => setState({ data: getPublishedArticles().slice(0, count), loading: false, error }));
  }, [count]);
  return state;
}

export function useFeaturedArticles() {
  const [state, setState] = useState({ data: getFeaturedArticles().slice(0, 6), loading: true, error: null });
  useEffect(() => {
    listArticles({ publishedOnly: true, limit: 20 })
      .then((rows) => {
        const featured = rows.filter((article) => article.isFeatured).slice(0, 6);
        setState({ data: featured.length ? featured : getFeaturedArticles().slice(0, 6), loading: false, error: null });
      })
      .catch((error) => setState({ data: getFeaturedArticles().slice(0, 6), loading: false, error }));
  }, []);
  return state;
}

export function useTrendingArticles() {
  const [state, setState] = useState({ data: getTrendingArticles().slice(0, 8), loading: true, error: null });
  useEffect(() => {
    listArticles({ publishedOnly: true, limit: 20 })
      .then((rows) => {
        const trending = rows.filter((article) => article.isTrending).slice(0, 8);
        setState({ data: trending.length ? trending : getTrendingArticles().slice(0, 8), loading: false, error: null });
      })
      .catch((error) => setState({ data: getTrendingArticles().slice(0, 8), loading: false, error }));
  }, []);
  return state;
}
