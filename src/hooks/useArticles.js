import { useEffect, useState } from 'react';
import { listArticles } from '../supabase/api.js';

export function usePublishedArticles(count = 12) {
  const [state, setState] = useState({ data: [], loading: true, error: null });
  useEffect(() => {
    listArticles({ publishedOnly: true, limit: count })
      .then((rows) => setState({ data: rows, loading: false, error: null }))
      .catch((error) => setState({ data: [], loading: false, error }));
  }, [count]);
  return state;
}

export function useFeaturedArticles() {
  const [state, setState] = useState({ data: [], loading: true, error: null });
  useEffect(() => {
    listArticles({ publishedOnly: true, limit: 20 })
      .then((rows) => {
        const featured = rows.filter((article) => article.isFeatured).slice(0, 6);
        setState({ data: featured, loading: false, error: null });
      })
      .catch((error) => setState({ data: [], loading: false, error }));
  }, []);
  return state;
}

export function useTrendingArticles() {
  const [state, setState] = useState({ data: [], loading: true, error: null });
  useEffect(() => {
    listArticles({ publishedOnly: true, limit: 20 })
      .then((rows) => {
        const trending = rows.filter((article) => article.isTrending).slice(0, 8);
        setState({ data: trending, loading: false, error: null });
      })
      .catch((error) => setState({ data: [], loading: false, error }));
  }, []);
  return state;
}
