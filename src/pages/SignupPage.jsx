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
      <section className="container-page auth-page flex min-h-[70vh] items-center justify-center py-8 sm:py-12">
        <div className="auth-layout grid w-full max-w-4xl overflow-hidden rounded-lg border border-gray-200 bg-white shadow-soft md:grid-cols-[0.85fr_1.15fr]">
        <div className="auth-intro flex flex-col justify-between bg-gray-950 p-7 text-white sm:p-9">
          <div><p className="section-kicker text-red-300">THE FTP NEWS</p><h1 className="mt-4 font-serif text-3xl font-bold sm:text-4xl">Make your voice part of the story.</h1><p className="mt-4 text-sm leading-7 text-gray-300">Create an account to join reader discussions and save stories from Fresh Take Politics.</p></div>
          <p className="mt-8 text-xs font-bold uppercase tracking-[0.16em] text-gray-400">Independent news · Odisha and India</p>
        </div>
        <form onSubmit={submit} className="news-card border-0 p-6 sm:p-8">
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
        </div>
      </section>
    </>
  );
}
