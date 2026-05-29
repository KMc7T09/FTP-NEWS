import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import useSettings from '../../hooks/useSettings.js';
import { saveSettings } from '../../supabase/api.js';

export default function SettingsPage() {
  const settings = useSettings();
  const [form, setForm] = useState(settings);
  const [busy, setBusy] = useState(false);

  useEffect(() => setForm(settings), [settings]);

  function setField(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    try {
      await saveSettings({ ...form, websiteName: form.websiteName || 'FTP NEWS', logoURL: form.logoURL || '' });
      toast.success('Settings saved.');
    } catch (error) {
      toast.error(error.message || 'Settings save failed.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section>
      <h1 className="mb-6 text-2xl font-extrabold">Website Settings</h1>
      <form onSubmit={submit} className="news-card grid gap-5 p-5 lg:grid-cols-2">
        <div>
          <label className="label">Website Name</label>
          <input className="input mt-2" value={form.websiteName || ''} onChange={(event) => setField('websiteName', event.target.value)} />
          <p className="mt-2 text-xs text-gray-500">Recommended: THE FTP NEWS. FTP means Fresh Take Politics.</p>
        </div>
        <div>
          <label className="label">Logo URL</label>
          <input className="input mt-2" value={form.logoURL || ''} onChange={(event) => setField('logoURL', event.target.value)} placeholder="Paste logo image URL" />
        </div>
        <div>
          <label className="label">Contact Email</label>
          <input className="input mt-2" value={form.contactEmail || ''} onChange={(event) => setField('contactEmail', event.target.value)} />
        </div>
        <div>
          <label className="label">Contact Phone</label>
          <input className="input mt-2" value={form.contactPhone || ''} onChange={(event) => setField('contactPhone', event.target.value)} placeholder="+91..." />
        </div>
        <div className="lg:col-span-2">
          <label className="label">Contact Address</label>
          <textarea className="input mt-2 min-h-20" value={form.contactAddress || ''} onChange={(event) => setField('contactAddress', event.target.value)} />
        </div>
        <div>
          <label className="label">Default SEO Title</label>
          <input className="input mt-2" value={form.defaultSeoTitle || ''} onChange={(event) => setField('defaultSeoTitle', event.target.value)} />
        </div>
        <div className="lg:col-span-2">
          <label className="label">Default SEO Description</label>
          <textarea className="input mt-2 min-h-24" value={form.defaultSeoDescription || ''} onChange={(event) => setField('defaultSeoDescription', event.target.value)} />
        </div>
        <div className="lg:col-span-2">
          <label className="label">Footer Text</label>
          <textarea className="input mt-2 min-h-24" value={form.footerText || ''} onChange={(event) => setField('footerText', event.target.value)} />
        </div>
        <div>
          <label className="label">Founder Name</label>
          <input className="input mt-2" value={form.founderName || ''} onChange={(event) => setField('founderName', event.target.value)} />
        </div>
        <div>
          <label className="label">Founder Title</label>
          <input className="input mt-2" value={form.founderTitle || ''} onChange={(event) => setField('founderTitle', event.target.value)} />
        </div>
        <div>
          <label className="label">Author Name</label>
          <input className="input mt-2" value={form.authorName || ''} onChange={(event) => setField('authorName', event.target.value)} placeholder="R.C. Khotei" />
        </div>
        <div>
          <label className="label">Founder Photo URL</label>
          <input className="input mt-2" value={form.founderPhotoURL || ''} onChange={(event) => setField('founderPhotoURL', event.target.value)} placeholder="Paste founder image URL" />
        </div>
        <div className="lg:col-span-2">
          <label className="label">Founder Bio</label>
          <textarea className="input mt-2 min-h-32" value={form.founderBio || ''} onChange={(event) => setField('founderBio', event.target.value)} />
        </div>
        <div className="lg:col-span-2">
          <label className="label">Team Members</label>
          <textarea
            className="input mt-2 min-h-32"
            value={form.teamText || ''}
            onChange={(event) => setField('teamText', event.target.value)}
            placeholder={'Name | Role | Photo URL | Profile Link\nName | Role | Photo URL | Profile Link'}
          />
          <p className="mt-2 text-xs leading-5 text-gray-500">
            One member per line. Example: Ramesh Chandra Khotei | Founder | https://image-link.jpg | https://instagram.com/username
          </p>
        </div>
        {['facebook', 'x', 'instagram', 'youtube', 'whatsapp', 'telegram'].map((key) => (
          <div key={key}>
            <label className="label capitalize">{key}</label>
            <input className="input mt-2" value={form.socialLinks?.[key] || ''} onChange={(event) => setField('socialLinks', { ...(form.socialLinks || {}), [key]: event.target.value })} />
          </div>
        ))}
        <div className="lg:col-span-2">
          <button className="btn-primary" disabled={busy}>{busy ? 'Saving...' : 'Save Settings'}</button>
        </div>
      </form>
    </section>
  );
}
