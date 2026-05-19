import { useEffect, useState } from 'react';
import { getSettings } from '../supabase/api.js';

const defaults = {
  websiteName: 'FTP NEWS',
  footerText: 'Fresh Take Politics - independent reporting, clear context, and verified updates.',
  contactEmail: 'newsdesk@example.com',
  defaultSeoTitle: 'FTP NEWS',
  defaultSeoDescription: 'Fresh Take Politics, latest news, analysis, and public updates.',
  socialLinks: { facebook: '', x: '', instagram: '', youtube: '', whatsapp: '', telegram: '' },
  logoURL: '',
};

export default function useSettings() {
  const [settings, setSettings] = useState(defaults);

  useEffect(() => {
    getSettings()
      .then((data) => {
        if (data) setSettings({ ...defaults, ...data, socialLinks: { ...defaults.socialLinks, ...(data.socialLinks || {}) } });
      })
      .catch(() => {});
  }, []);

  return settings;
}
