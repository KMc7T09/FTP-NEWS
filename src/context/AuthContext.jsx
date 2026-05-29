import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { supabase, supabaseReady } from '../supabase/config.js';
import { getProfile, upsertProfile } from '../supabase/api.js';

const AuthContext = createContext(null);
const bootstrapAdminEmails = (import.meta.env.VITE_BOOTSTRAP_ADMIN_EMAILS || '')
  .split(',')
  .map((email) => email.trim().toLowerCase())
  .filter(Boolean);

function withTimeout(promise, message = 'Connection took too long. Please refresh and try again.', ms = 10000) {
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      window.setTimeout(() => reject(new Error(message)), ms);
    }),
  ]);
}

function userToProfile(user, extra = {}) {
  return {
    id: user.id,
    uid: user.id,
    name: extra.name || user.user_metadata?.name || user.user_metadata?.full_name || '',
    email: user.email || user.phone || '',
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
      saved = await withTimeout(getProfile(user.id), 'Profile loading took too long.');
    } catch (error) {
      console.warn('Profile read failed:', error);
    }
    try {
      if (!saved) saved = await withTimeout(upsertProfile(userToProfile(user)), 'Profile setup took too long.');
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
    withTimeout(supabase.auth.getSession(), 'Login check took too long.').then(async ({ data, error }) => {
      if (!alive) return;
      try {
        if (error) setAuthError(error.message);
        const user = data.session?.user || null;
        setCurrentUser(user);
        if (user) await withTimeout(loadProfile(user), 'Profile loading took too long.');
      } catch (profileError) {
        setAuthError(profileError.message);
      } finally {
        if (alive) setLoading(false);
      }
    }).catch((error) => {
      if (!alive) return;
      setAuthError(error.message);
      setCurrentUser(null);
      setProfile(null);
      setLoading(false);
    });

    const { data: subscription } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const user = session?.user || null;
      setCurrentUser(user);
      try {
        if (user) await withTimeout(loadProfile(user), 'Profile loading took too long.');
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
    if (data.session?.user) await withTimeout(upsertProfile(userToProfile(data.session.user, { name })), 'Profile setup took too long.');
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
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        queryParams: {
          prompt: 'select_account',
        },
      },
    });
    if (error) throw error;
  }

  async function sendPhoneOtp(phone) {
    if (!supabaseReady) throw new Error('Supabase is not configured.');
    const { error } = await supabase.auth.signInWithOtp({ phone });
    if (error) throw error;
  }

  async function verifyPhoneOtp(phone, token) {
    if (!supabaseReady) throw new Error('Supabase is not configured.');
    const { data, error } = await supabase.auth.verifyOtp({ phone, token, type: 'sms' });
    if (error) throw error;
    if (data.user) await withTimeout(loadProfile(data.user), 'Profile loading took too long.');
    return data.user;
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
    () => {
      const email = currentUser?.email?.toLowerCase();
      const bootstrapSuperAdmin = bootstrapAdminEmails.includes(email);
      const isSuperAdmin = profile?.role === 'superadmin' || bootstrapSuperAdmin;
      return ({
      currentUser,
      profile,
      loading,
      authError,
      isSuperAdmin,
      isAdmin: ['admin', 'superadmin'].includes(profile?.role) || bootstrapSuperAdmin,
      isEditor: ['editor', 'admin', 'superadmin'].includes(profile?.role) || bootstrapSuperAdmin,
      isBanned: profile?.status === 'banned',
      signup,
      login,
      loginWithGoogle,
      sendPhoneOtp,
      verifyPhoneOtp,
      logout,
      resetPassword,
      refreshProfile: () => (currentUser ? withTimeout(loadProfile(currentUser), 'Profile refresh took too long.') : null),
    });
    },
    [currentUser, profile, loading, authError],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
}
