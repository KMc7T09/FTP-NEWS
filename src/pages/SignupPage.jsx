import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext.jsx';
import Seo from '../components/common/Seo.jsx';

export default function SignupPage() {
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();
  const { signup } = useAuth();

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    try {
      await signup(form);
      navigate('/profile');
    } catch (error) {
      toast.error(error.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Seo title="Signup | FTP News / KMC News Portal" />
      <section className="container-page flex min-h-[70vh] items-center justify-center py-12">
        <form onSubmit={submit} className="news-card w-full max-w-md p-6">
          <h1 className="text-2xl font-extrabold">Create Account</h1>
          <label className="label mt-5 block">Name</label>
          <input className="input mt-2" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required />
          <label className="label mt-4 block">Email</label>
          <input className="input mt-2" type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} required />
          <label className="label mt-4 block">Password</label>
          <input className="input mt-2" type="password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} required minLength={6} />
          <button className="btn-primary mt-5 w-full" disabled={busy}>
            Sign Up
          </button>
          <p className="mt-4 text-sm text-gray-600">
            Already registered? <Link to="/login" className="font-bold text-brand-red">Login</Link>
          </p>
        </form>
      </section>
    </>
  );
}
