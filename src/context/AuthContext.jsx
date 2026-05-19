import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { supabase, supabaseReady } from '../supabase/config.js';
import { getProfile, upsertProfile } from '../supabase/api.js';

const AuthContext = createContext(null);
const bootstrapAdminEmails = (import.meta.env.VITE_BOOTSTRAP_ADMIN_EMAILS || '')
  .split(',')
  .map((email) => email.trim().toLowerCase())
  .filter(Boolean);

function userToProfile(user, extra = {}) {
  return {
    id: user.id,
    uid: user.id,
    name: extra.name || user.user_metadata?.name || user.user_metadata?.full_name || '',
    email: user.email || '',
    photoURL: user.user_metadata?.avatar_url || '',
    role: 'user',
    status: 'active',
    bannedReason: '',
  };
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState('');

  async function loadProfile(user) {
    if (!user) {
      setProfile(null);
      return null;
    }
    let saved = null;
    try {
      saved = await getProfile(user.id);
    } catch (error) {
      console.warn('Profile read failed:', error);
    }
    try {
      if (!saved) saved = await upsertProfile(userToProfile(user));
      setProfile(saved);
      setAuthError('');
      return saved;
    } catch (error) {
      console.warn('Profile write failed:', error);
      setAuthError(error.message);
      const fallback = userToProfile(user);
      setProfile(fallback);
      return fallback;
    }
  }

  useEffect(() => {
    if (!supabaseReady || !supabase) {
      setAuthError('Supabase is not configured.');
      setLoading(false);
      return undefined;
    }

    let alive = true;
    supabase.auth.getSession().then(async ({ data, error }) => {
      if (!alive) return;
      try {
        if (error) setAuthError(error.message);
        const user = data.session?.user || null;
        setCurrentUser(user);
        if (user) await loadProfile(user);
      } catch (profileError) {
        setAuthError(profileError.message);
      } finally {
        if (alive) setLoading(false);
      }
    });

    const { data: subscription } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const user = session?.user || null;
      setCurrentUser(user);
      try {
        if (user) await loadProfile(user);
        else setProfile(null);
      } catch (profileError) {
        setAuthError(profileError.message);
      } finally {
        setLoading(false);
      }
    });

    return () => {
      alive = false;
      subscription.subscription.unsubscribe();
    };
  }, []);

  async function signup({ name, email, password }) {
    if (!supabaseReady) throw new Error('Supabase is not configured.');
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name } },
    });
    if (error) throw error;
    if (data.session?.user) await upsertProfile(userToProfile(data.session.user, { name }));
    return data.user;
  }

  async function login(email, password) {
    if (!supabaseReady) throw new Error('Supabase is not configured.');
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data.user;
  }

  async function loginWithGoogle() {
    if (!supabaseReady) throw new Error('Supabase is not configured.');
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    });
    if (error) throw error;
  }

  async function logout() {
    if (!supabaseReady) return;
    await supabase.auth.signOut();
  }

  async function resetPassword(email) {
    if (!supabaseReady) throw new Error('Supabase is not configured.');
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/login`,
    });
    if (error) throw error;
  }

  const value = useMemo(
    () => ({
      currentUser,
      profile,
      loading,
      authError,
      isAdmin: ['admin', 'superadmin'].includes(profile?.role) || bootstrapAdminEmails.includes(currentUser?.email?.toLowerCase()),
      isEditor: ['editor', 'admin', 'superadmin'].includes(profile?.role) || bootstrapAdminEmails.includes(currentUser?.email?.toLowerCase()),
      isBanned: profile?.status === 'banned',
      signup,
      login,
      loginWithGoogle,
      logout,
      resetPassword,
      refreshProfile: () => (currentUser ? loadProfile(currentUser) : null),
    }),
    [currentUser, profile, loading, authError],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
}
