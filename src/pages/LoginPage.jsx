import { Mail, Phone } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext.jsx';
import Seo from '../components/common/Seo.jsx';

function normalizePhone(value = '') {
  const cleaned = value.replace(/[^\d+]/g, '').trim();
  if (cleaned.startsWith('+')) return cleaned;
  if (cleaned.length === 10) return `+91${cleaned}`;
  return cleaned;
}

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();
  const { login, loginWithGoogle, resetPassword, sendPhoneOtp, verifyPhoneOtp } = useAuth();

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

  async function sendOtp(event) {
    event.preventDefault();
    setBusy(true);
    try {
      const normalized = normalizePhone(phone);
      await sendPhoneOtp(normalized);
      setPhone(normalized);
      setOtpSent(true);
      toast.success(`OTP sent to ${normalized}.`);
    } catch (error) {
      toast.error(error.message || 'Phone login needs Supabase SMS provider setup.');
    } finally {
      setBusy(false);
    }
  }

  async function verifyOtp(event) {
    event.preventDefault();
    setBusy(true);
    try {
      await verifyPhoneOtp(normalizePhone(phone), otp);
      navigate('/profile');
    } catch (error) {
      toast.error(error.message || 'OTP verification failed.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Seo title="Login | FTP News / KMC News Portal" />
      <section className="container-page flex min-h-[70vh] items-center justify-center py-12">
        <div className="grid w-full max-w-5xl gap-6 md:grid-cols-2">
        <form onSubmit={submit} className="news-card p-6">
          <h1 className="text-2xl font-extrabold">Join / Login</h1>
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
        <form onSubmit={otpSent ? verifyOtp : sendOtp} className="news-card p-6">
          <h2 className="text-2xl font-extrabold">Join with Phone</h2>
          <p className="mt-3 text-sm leading-6 text-gray-600">
            Enter 10 digit Indian number or international format. Example: 9876543210 or +919876543210.
            Phone login works only after Supabase SMS provider is enabled.
          </p>
          <label className="label mt-5 block">Phone Number</label>
          <input className="input mt-2" value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="+91..." required />
          {otpSent ? (
            <>
              <label className="label mt-4 block">OTP</label>
              <input className="input mt-2" value={otp} onChange={(event) => setOtp(event.target.value)} placeholder="Enter OTP" required />
            </>
          ) : null}
          <button className="btn-primary mt-5 w-full" disabled={busy}>
            <Phone size={16} /> {otpSent ? 'Verify OTP' : 'Send OTP'}
          </button>
          <div className="mt-4 rounded-md border border-yellow-200 bg-yellow-50 p-3 text-xs leading-5 text-yellow-900">
            If OTP is not coming, enable Supabase Authentication → Providers → Phone and connect an SMS provider. Free Supabase does not send unlimited SMS by itself.
          </div>
        </form>
        </div>
      </section>
    </>
  );
}
