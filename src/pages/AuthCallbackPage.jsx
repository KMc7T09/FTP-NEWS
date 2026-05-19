import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../supabase/config.js';

export default function AuthCallbackPage() {
  const navigate = useNavigate();
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;

    async function finishLogin() {
      const params = new URLSearchParams(window.location.search);
      const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''));
      const oauthError = params.get('error_description') || params.get('error') || hash.get('error_description') || hash.get('error');
      if (oauthError) {
        setError(oauthError);
        return;
      }

      const { data, error: sessionError } = await supabase.auth.getSession();
      if (!alive) return;
      if (sessionError) {
        setError(sessionError.message);
        return;
      }
      if (data.session) navigate('/', { replace: true });
      else {
        window.setTimeout(async () => {
          const retry = await supabase.auth.getSession();
          if (!alive) return;
          if (retry.data.session) navigate('/', { replace: true });
          else setError('Google login returned without a session. Check Supabase redirect URLs.');
        }, 1200);
      }
    }

    finishLogin();
    return () => {
      alive = false;
    };
  }, [navigate]);

  return (
    <section className="container-page flex min-h-[70vh] items-center justify-center py-10">
      <div className="news-card max-w-lg p-6 text-center">
        <h1 className="text-2xl font-extrabold">{error ? 'Google Login Failed' : 'Finishing Google Login'}</h1>
        <p className="mt-3 text-sm leading-6 text-gray-600">
          {error || 'Please wait while THE FTP NEWS connects your account.'}
        </p>
        {error ? (
          <Link to="/login" className="btn-primary mt-5">
            Back to Login
          </Link>
        ) : null}
      </div>
    </section>
  );
}
