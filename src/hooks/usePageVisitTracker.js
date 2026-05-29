import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { recordPageVisit } from '../supabase/api.js';

function getVisitorId() {
  const key = 'ftp_visitor_id';
  let id = localStorage.getItem(key);
  if (!id) {
    id = crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    localStorage.setItem(key, id);
  }
  return id;
}

export default function usePageVisitTracker() {
  const location = useLocation();
  const { currentUser } = useAuth();

  useEffect(() => {
    const timer = window.setTimeout(() => {
      recordPageVisit({
        visitorId: getVisitorId(),
        path: `${location.pathname}${location.search}`,
        title: document.title,
        referrer: document.referrer,
        userAgent: navigator.userAgent,
        language: navigator.language,
        screen: `${window.screen?.width || 0}x${window.screen?.height || 0}`,
        userId: currentUser?.id || null,
      }).catch(() => {});
    }, 1200);

    return () => window.clearTimeout(timer);
  }, [location.pathname, location.search, currentUser?.id]);
}
