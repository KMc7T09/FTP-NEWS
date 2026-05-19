import { useEffect, useState } from 'react';
import { getSettings } from '../supabase/api.js';

const defaults = {
  websiteName: 'FTP NEWS',
  footerText: 'Fresh Take Politics - independent reporting, clear context, and verified updates.',
  contactEmail: 'newsdesk@example.com',
  contactPhone: '',
  contactAddress: '',
  defaultSeoTitle: 'FTP NEWS',
  defaultSeoDescription: 'Fresh Take Politics, latest news, analysis, and public updates.',
  founderName: 'Founder',
  founderTitle: 'Fresh Take Politics',
  founderPhotoURL: '',
  founderBio:
    'FTP NEWS stands for Fresh Take Politics. The mission is to publish clear, independent, and useful reporting for readers across India.',
  teamText: 'Editorial Desk | News and verification\nPolitics Desk | Fresh Take Politics coverage\nCommunity Desk | Reader tips and corrections',
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
