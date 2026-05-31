import { Mail, MapPin, MessageSquare, Send } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import Seo from '../components/common/Seo.jsx';
import useSettings from '../hooks/useSettings.js';
import { saveContactMessage } from '../supabase/api.js';
import { useAuth } from '../context/AuthContext.jsx';

const initialForm = { name: '', email: '', type: 'general', subject: '', message: '' };

export default function ContactPage() {
  const settings = useSettings();
  const { currentUser, profile } = useAuth();
  const [form, setForm] = useState(initialForm);
  const [busy, setBusy] = useState(false);

  function setField(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function submit(event) {
    event.preventDefault();
    if (!currentUser) {
      toast.error('Please join before sending a message.');
      return;
    }
    if (!form.name.trim() || !form.message.trim()) {
      toast.error('Name and message are required.');
      return;
    }
    setBusy(true);
    try {
      await saveContactMessage({
        ...form,
        userId: currentUser.id,
        email: currentUser.email || currentUser.phone || profile?.email || '',
      });
      setForm(initialForm);
      toast.success('Message sent to THE FTP NEWS admin panel.');
    } catch (error) {
      toast.error(error.message || 'Message failed. Please email us directly.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Seo title="Contact | THE FTP NEWS" description="Contact THE FTP NEWS for news tips, corrections, partnerships, advertising, and editorial queries." />
      <section className="container-page py-10">
        <div className="max-w-3xl">
          <p className="text-sm font-extrabold uppercase tracking-wide text-brand-red">Reader Desk</p>
          <h1 className="mt-2 text-4xl font-extrabold">Contact THE FTP NEWS</h1>
          <p className="mt-4 text-lg leading-8 text-gray-600">
            Send news tips, corrections, editorial feedback, partnership queries, or advertising requests. Your message goes directly to the superadmin inbox.
          </p>
        </div>

        {!currentUser ? (
          <div className="news-card mt-8 max-w-3xl p-5">
            <h2 className="text-xl font-extrabold">Join required for contact messages</h2>
            <p className="mt-2 text-sm leading-6 text-gray-600">
              Fake email avoid karne ke liye contact form account email/phone se bind hai. Full article read karna free hai, lekin contact message, comment, like aur bookmark ke liye join required hai.
            </p>
            <Link to="/login" className="btn-primary mt-4">Join Now</Link>
          </div>
        ) : null}

        <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_380px]">
          <form onSubmit={submit} className="news-card grid gap-4 p-5 md:grid-cols-2">
            <div>
              <label className="label">Name</label>
              <input className="input mt-2" value={form.name} onChange={(event) => setField('name', event.target.value)} placeholder="Your name" />
            </div>
            <div>
              <label className="label">Email</label>
              <input className="input mt-2" value={currentUser?.email || currentUser?.phone || profile?.email || ''} readOnly />
              <p className="mt-2 text-xs text-gray-500">This comes from your joined account, so users cannot submit fake contact email here.</p>
            </div>
            <div>
              <label className="label">Message Type</label>
              <select className="input mt-2" value={form.type} onChange={(event) => setField('type', event.target.value)}>
                <option value="general">General</option>
                <option value="news_tip">News tip</option>
                <option value="correction">Correction</option>
                <option value="partnership">Partnership</option>
                <option value="advertising">Advertising</option>
              </select>
            </div>
            <div>
              <label className="label">Subject</label>
              <input className="input mt-2" value={form.subject} onChange={(event) => setField('subject', event.target.value)} placeholder="Short subject" />
            </div>
            <div className="md:col-span-2">
              <label className="label">Message</label>
              <textarea className="input mt-2 min-h-40" value={form.message} onChange={(event) => setField('message', event.target.value)} placeholder="Write your message clearly. For corrections, paste article link if possible." />
            </div>
            <div className="md:col-span-2">
              <button className="btn-primary" disabled={busy}>
                <Send size={16} /> {busy ? 'Sending...' : 'Send Message'}
              </button>
            </div>
          </form>

          <div className="space-y-4">
            <div className="news-card p-5">
              <Mail className="text-brand-red" />
              <h2 className="mt-3 font-extrabold">Email</h2>
              <a href={`mailto:${settings.contactEmail}`} className="mt-2 block break-all text-sm font-bold text-brand-blue hover:text-brand-red">
                {settings.contactEmail}
              </a>
            </div>
            <div className="news-card p-5">
              <MapPin className="text-brand-red" />
              <h2 className="mt-3 font-extrabold">Location</h2>
              <p className="mt-2 whitespace-pre-line text-sm leading-6 text-gray-600">{settings.contactAddress || 'Odisha, India'}</p>
            </div>
            <div className="news-card p-5">
              <MessageSquare className="text-brand-red" />
              <h2 className="mt-3 font-extrabold">Corrections Policy</h2>
              <p className="mt-2 text-sm leading-6 text-gray-600">
                Send the article link and explain what should be corrected. Verified corrections will be reviewed by the editorial desk.
              </p>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
