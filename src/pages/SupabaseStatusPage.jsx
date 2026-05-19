import Seo from '../components/common/Seo.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { supabaseConfig, supabaseReady } from '../supabase/config.js';

function StatusLine({ label, ok, children }) {
  return (
    <div className="news-card p-5">
      <p className={ok ? 'font-extrabold text-green-700' : 'font-extrabold text-red-700'}>{ok ? 'OK' : 'Check'} - {label}</p>
      <div className="mt-2 text-sm leading-6 text-gray-700">{children}</div>
    </div>
  );
}

export default function SupabaseStatusPage() {
  const { currentUser, profile } = useAuth();
  return (
    <>
      <Seo title="Supabase Status | FTP NEWS" />
      <section className="container-page space-y-4 py-10">
        <h1 className="text-3xl font-extrabold">Supabase Connection Status</h1>
        <StatusLine label="Supabase config" ok={supabaseReady}>
          URL: <strong>{supabaseConfig.url || 'missing'}</strong>
        </StatusLine>
        <StatusLine label="Login state" ok={Boolean(currentUser)}>
          {currentUser ? (
            <>
              <p>Email: <strong>{currentUser.email}</strong></p>
              <p>UID: <strong>{currentUser.id}</strong></p>
            </>
          ) : (
            'Not logged in.'
          )}
        </StatusLine>
        <StatusLine label="Profile role" ok={Boolean(profile?.role)}>
          Role: <strong>{profile?.role || 'missing'}</strong> Status: <strong>{profile?.status || 'missing'}</strong>
        </StatusLine>
      </section>
    </>
  );
}
