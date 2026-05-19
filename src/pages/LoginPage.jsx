import { Mail } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext.jsx';
import Seo from '../components/common/Seo.jsx';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();
  const { login, loginWithGoogle, resetPassword } = useAuth();

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    try {
      await login(email, password);
      navigate('/profile');
    } catch (error) {
      toast.error(error.message);
    } finally {
      setBusy(false);
    }
  }

  async function forgotPassword() {
    if (!email) return toast.error('Enter your email first.');
    await resetPassword(email);
    toast.success('Password reset email sent.');
  }

  return (
    <>
      <Seo title="Login | FTP News / KMC News Portal" />
      <section className="container-page flex min-h-[70vh] items-center justify-center py-12">
        <form onSubmit={submit} className="news-card w-full max-w-md p-6">
          <h1 className="text-2xl font-extrabold">Login</h1>
          <label className="label mt-5 block">Email</label>
          <input className="input mt-2" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
          <label className="label mt-4 block">Password</label>
          <input className="input mt-2" type="password" value={password} onChange={(event) => setPassword(event.target.value)} required />
          <button className="btn-primary mt-5 w-full" disabled={busy}>
            <Mail size={16} /> Login
          </button>
          <button type="button" className="btn-secondary mt-3 w-full" onClick={loginWithGoogle}>
            Continue with Google
          </button>
          <button type="button" className="mt-4 text-sm font-semibold text-brand-blue" onClick={forgotPassword}>
            Forgot password?
          </button>
          <p className="mt-4 text-sm text-gray-600">
            New here? <Link to="/signup" className="font-bold text-brand-red">Create account</Link>
          </p>
        </form>
      </section>
    </>
  );
}
