import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import Seo from '../components/common/Seo.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { listComments, upsertProfile } from '../supabase/api.js';

export default function ProfilePage() {
  const { currentUser, profile, authError, refreshProfile } = useAuth();
  const [name, setName] = useState(profile?.name || '');
  const [phone, setPhone] = useState(profile?.phone || currentUser?.phone || '');
  const [whatsappOptIn, setWhatsappOptIn] = useState(Boolean(profile?.whatsappOptIn));
  const [comments, setComments] = useState([]);
  const [busy, setBusy] = useState(false);
  const [dbError, setDbError] = useState('');

  useEffect(() => setName(profile?.name || ''), [profile]);
  useEffect(() => setPhone(profile?.phone || currentUser?.phone || ''), [profile, currentUser?.phone]);
  useEffect(() => setWhatsappOptIn(Boolean(profile?.whatsappOptIn)), [profile?.whatsappOptIn]);

  useEffect(() => {
    if (!currentUser) return;
    listComments()
      .then((items) => setComments(items.filter((item) => item.userId === currentUser.id)))
      .catch(() => setComments([]));
  }, [currentUser]);

  async function saveProfile(event) {
    event.preventDefault();
    setBusy(true);
    setDbError('');
    try {
      await upsertProfile({
        id: currentUser.id,
        name,
        email: currentUser.email || '',
        phone,
        whatsappOptIn,
        photoURL: profile?.photoURL || '',
        role: profile?.role || 'user',
        status: profile?.status || 'active',
        bannedReason: profile?.bannedReason || '',
      });
      await refreshProfile();
      toast.success('Profile updated.');
    } catch (error) {
      setDbError(error.message);
      toast.error(error.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Seo title="Profile | FTP NEWS" />
      <section className="container-page grid gap-6 py-6 md:gap-8 md:py-10 lg:grid-cols-[360px_1fr]">
        <aside className="news-card p-6">
          <img src={profile?.photoURL || 'https://api.dicebear.com/9.x/initials/svg?seed=Reader'} alt="" className="h-24 w-24 rounded-full object-cover" />
          <form onSubmit={saveProfile} className="mt-5 space-y-4">
            <div>
              <label className="label">Name</label>
              <input className="input mt-2" value={name} onChange={(event) => setName(event.target.value)} />
            </div>
            <div>
              <label className="label">Email</label>
              <input className="input mt-2" value={currentUser?.email || ''} disabled />
            </div>
            <div>
              <label className="label">Phone / WhatsApp Number</label>
              <input className="input mt-2" value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="+919876543210" />
              <p className="mt-2 text-xs leading-5 text-gray-500">Use international format. India example: +91 followed by your number.</p>
            </div>
            <label className="flex items-start gap-3 rounded-md border border-gray-200 bg-gray-50 p-3 text-sm font-semibold">
              <input type="checkbox" className="mt-1" checked={whatsappOptIn} onChange={(event) => setWhatsappOptIn(event.target.checked)} />
              <span>Send me WhatsApp updates when FTP publishes important articles.</span>
            </label>
            <div className="rounded-md bg-gray-100 p-3 text-sm font-semibold">
              <p>Account role: {profile?.role || 'user'}</p>
              <p className="mt-1">Account status: {profile?.status || 'active'}</p>
            </div>
            {(authError || dbError) && (
              <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm leading-6 text-red-700">
                {authError || dbError}
              </div>
            )}
            <button className="btn-primary w-full" disabled={busy}>{busy ? 'Saving...' : 'Save Profile'}</button>
          </form>
        </aside>
        <div className="space-y-8">
          <section>
            <h1 className="mb-4 text-2xl font-extrabold">Comment History</h1>
            <div className="space-y-3">
              {comments.map((item) => (
                <div key={item.id} className="rounded-lg border border-gray-200 bg-white p-4">
                  <span className="text-xs font-bold uppercase text-gray-500">{item.status}</span>
                  <p className="mt-2 text-sm text-gray-700">{item.text}</p>
                </div>
              ))}
            </div>
          </section>
        </div>
      </section>
    </>
  );
}
