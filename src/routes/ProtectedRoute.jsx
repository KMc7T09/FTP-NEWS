import { Copy, ShieldAlert } from 'lucide-react';
import toast from 'react-hot-toast';
import { Link, Navigate, useLocation } from 'react-router-dom';
import LoadingScreen from '../components/ui/LoadingScreen.jsx';
import { useAuth } from '../context/AuthContext.jsx';

function AccessDenied({ user, profile }) {
  const uid = user?.id || '';

  function copyUid() {
    navigator.clipboard?.writeText(uid);
    toast.success('UID copied.');
  }

  return (
    <section className="container-page flex min-h-[70vh] items-center justify-center py-10">
      <div className="news-card w-full max-w-2xl p-6">
        <div className="flex items-start gap-3">
          <ShieldAlert className="mt-1 shrink-0 text-brand-red" />
          <div>
            <h1 className="text-2xl font-extrabold">Admin access is not enabled yet</h1>
            <p className="mt-3 text-sm leading-6 text-gray-600">
              Your account is logged in, but Supabase role is currently <strong>{profile?.role || 'user'}</strong>.
              To publish articles and control the portal, set this user role to <strong>superadmin</strong>.
            </p>
          </div>
        </div>
        <div className="mt-5 rounded-md bg-gray-100 p-4 text-sm">
          <p><strong>Email:</strong> {user?.email}</p>
          <p className="mt-2 break-all"><strong>UID:</strong> {uid}</p>
          <button className="btn-secondary mt-3" onClick={copyUid}>
            <Copy size={16} /> Copy UID
          </button>
        </div>
        <div className="mt-5 space-y-2 text-sm leading-6 text-gray-700">
          <p>Supabase Dashboard me jao: Table Editor, then profiles, then is UID wala row.</p>
          <p>Field set karo: <strong>role</strong> = <strong>superadmin</strong> and <strong>status</strong> = <strong>active</strong>.</p>
          <p>Signup ke baad profile row automatic create hoga. Agar nahi dikhe, profile page par Save Profile click karo.</p>
        </div>
        <Link to="/profile" className="btn-primary mt-5">
          Go to Profile
        </Link>
      </div>
    </section>
  );
}

export default function ProtectedRoute({ children, roles }) {
  const { currentUser, profile, loading, authError, isAdmin } = useAuth();
  const location = useLocation();

  if (loading) return <LoadingScreen />;
  if (authError && !currentUser) {
    return (
      <section className="container-page flex min-h-[70vh] items-center justify-center py-10">
        <div className="news-card max-w-lg p-6 text-center">
          <h1 className="text-2xl font-extrabold">Login check failed</h1>
          <p className="mt-3 text-sm leading-6 text-gray-600">{authError}</p>
          <Navigate to="/login" replace state={{ from: location.pathname }} />
        </div>
      </section>
    );
  }
  if (!currentUser) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  if (roles?.length && !roles.includes(profile?.role) && !isAdmin) return <AccessDenied user={currentUser} profile={profile} />;
  return children;
}
